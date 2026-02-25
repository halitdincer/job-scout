import { Router, Request, Response } from 'express';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../auth/middleware';
import { scrapeBoard } from '../../src/scraper';
import type { PaginationConfig } from '../../src/types';

export function makeSetupRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.post('/analyze', async (req: Request, res: Response) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({ error: 'AI analysis not configured' });
      return;
    }

    const { url } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    let browser;
    let simplifiedHtml = '';
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();

      // domcontentloaded is fast; networkidle gives SPAs extra time but won't fail if they never idle
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Run DOM simplification inside the browser so we can use computed styles and real DOM APIs
      simplifiedHtml = await page.evaluate(() => {
        const SKIP_TAGS = new Set(['script', 'style', 'svg', 'noscript', 'iframe', 'canvas']);
        const ROOT_SKIP_TAGS = new Set(['nav', 'header', 'footer']);

        function isVisible(el: Element): boolean {
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')
            return false;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
          return true;
        }

        // Use full body — pagination buttons almost always live outside <main>.
        // ROOT_SKIP_TAGS (nav, header, footer) at depth ≤ 2 keeps the output clean.
        const root: Element = document.body;

        // Pass 1: count how many elements each class name appears on across the whole page.
        // Classes that appear only once are unique identifiers — not structural selectors.
        // Classes that appear 2+ times are shared structural classes (the ones we want).
        const classCount = new Map<string, number>();
        (function countClasses(el: Element) {
          const cls = el.getAttribute('class');
          if (cls) {
            for (const c of cls.split(/\s+/).filter(Boolean)) {
              classCount.set(c, (classCount.get(c) ?? 0) + 1);
            }
          }
          for (const child of Array.from(el.children)) countClasses(child);
        })(document.body);

        const KEEP_ATTRS = [
          'id', 'class', 'href', 'role', 'type',
          'data-job-id', 'data-testid', 'data-cy', 'data-qa',
          'data-automation-id', 'data-automation',
          'aria-label', 'aria-disabled', 'aria-current',
        ];

        // Pass 2: build simplified HTML
        function simplifyNode(node: Node, depth: number): string {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent ?? '').trim().slice(0, 120);
            return text ? text + ' ' : '';
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return '';

          const el = node as Element;
          const tag = el.tagName.toLowerCase();

          if (SKIP_TAGS.has(tag)) return '';
          if (depth <= 2 && ROOT_SKIP_TAGS.has(tag)) return '';
          if (!isVisible(el)) return '';

          const keepAttrs: string[] = [];
          for (const attr of KEEP_ATTRS) {
            const val = el.getAttribute(attr);
            if (!val) continue;
            if (attr === 'class') {
              const cleanClasses = val
                .split(/\s+/)
                .filter((c) => {
                  // Drop single-occurrence classes — they identify one specific element,
                  // not a repeating pattern, so they make bad selectors for job listings
                  if ((classCount.get(c) ?? 0) < 2) return false;
                  // Drop obvious CSS-in-JS hashes
                  if (/^sc-[a-z0-9]{4,}/.test(c)) return false; // styled-components
                  if (/^css-[a-z0-9]{4,}/.test(c)) return false; // emotion
                  if (/[a-f0-9]{5,}/i.test(c) && /[0-9]/.test(c)) return false; // hex hash
                  return true;
                })
                .join(' ')
                .trim();
              if (cleanClasses) keepAttrs.push(`class="${cleanClasses}"`);
            } else {
              keepAttrs.push(`${attr}="${val.slice(0, 200)}"`);
            }
          }

          const attrStr = keepAttrs.length ? ' ' + keepAttrs.join(' ') : '';
          const children = Array.from(el.childNodes)
            .map((n) => simplifyNode(n, depth + 1))
            .join('')
            .trim();

          // Keep elements with meaningful attributes even with no visible text
          // (e.g. icon-only "Next" buttons whose SVG is stripped but aria-label survives)
          if (!children && keepAttrs.length === 0) return '';
          return `<${tag}${attrStr}>${children}</${tag}>`;
        }

        return simplifyNode(root, 0).slice(0, 40000);
      });
    } catch (err) {
      res.status(422).json({ error: `Failed to load page: ${String(err)}` });
      return;
    } finally {
      if (browser) await browser.close();
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const tool: Anthropic.Tool = {
      name: 'report_selectors',
      description: 'Report the CSS selectors and pagination config needed to scrape job listings from this page.',
      input_schema: {
        type: 'object' as const,
        required: ['name', 'selectors', 'paginationType'],
        properties: {
          name: { type: 'string', description: 'Short human-readable name for this job board' },
          selectors: {
            type: 'object' as const,
            required: ['jobCard', 'title', 'link', 'nextPage'],
            properties: {
              jobCard: {
                type: 'string',
                description: 'CSS selector passed to querySelectorAll() — MUST match every job card container on the page. Look for the repeating list/grid.',
              },
              title: {
                type: 'string',
                description: 'CSS selector for job title text, relative to jobCard (used with card.querySelector)',
              },
              link: {
                type: 'string',
                description: 'CSS selector for the clickable <a> link, relative to jobCard',
              },
              nextPage: {
                type: ['string', 'null'],
                description: 'CSS selector for the "Next Page", "Next →", "Load More", or "Show More" button anywhere on the page. null ONLY if there is truly no pagination.',
              },
            },
          },
          paginationType: {
            type: ['string', 'null'],
            enum: ['show-more', 'next-click', 'next-url', null],
            description: '"show-more": clicking loads more jobs into the SAME page without navigating (Load More, Show More, infinite scroll trigger). "next-click": clicking navigates to or reloads the next page. "next-url": pages are URL-based (e.g. ?page=2, &start=25, &offset=20) — no button click needed. null: only one page of results.',
          },
          urlTemplate: {
            type: ['string', 'null'],
            description: 'For next-url only: the URL with {page} as a placeholder for the page number, e.g. "https://example.com/jobs?page={page}". null otherwise.',
          },
        },
      },
    };

    function buildPrompt(html: string, pageUrl: string, failedJobCard?: string): string {
      const retryNote = failedJobCard
        ? `\n⚠ PREVIOUS ATTEMPT FAILED: jobCard="${failedJobCard}" matched 0 job listings when tested with Playwright. That selector is wrong — try a completely different approach.\n`
        : '';

      return `You are a web scraping expert. Analyze this simplified HTML from a job board page and identify CSS selectors to extract every job listing.

URL: ${pageUrl}
${retryNote}
HOW SELECTORS ARE USED (Playwright):
  • jobCard  → page.$$( jobCard )  — selects ALL job card containers. MUST match every listing.
  • title, link → card.querySelector( field ) — scoped inside each card
  • nextPage → page.$( nextPage ) — the pagination/load-more button (anywhere on the page)

SELECTOR QUALITY RULES:
  • jobCard MUST match ALL listings — if querySelectorAll returns only 1 result, the selector is WRONG
  • The HTML has already stripped classes that appear only once (unique to a single element).
    Only classes repeated across multiple elements survive — those are the structural ones to use.
  • Prefer: tag names, [role="..."], [data-*] attrs, semantic class names shared across all cards
  • Avoid: nth-child, unique IDs, any class or attribute that identifies one specific listing
  • Child selectors (title, link) are relative to jobCard — do not repeat the jobCard prefix

PAGINATION — nextPage is required, always set it or explicitly null:
  • Look below the job list for buttons/links: "Next", "Next page", "Load More", "Show More", ">", "→"
  • They are often icon-only with aria-label="Next page" — check aria-label attributes
  • Prefer [aria-label="..."], [data-testid="..."], role="button", or readable class names

PAGINATION TYPES:
  • "show-more": a button that appends more jobs to the current page without any navigation (Load More, Show More, infinite scroll trigger)
  • "next-click": a button/link that navigates to the next page (page reloads or URL changes)
  • "next-url": no button — pages are controlled purely by a URL query param (?page=2, &start=25, &offset=20)
  • null: only one page of results, no pagination needed

Simplified HTML (main content only):
${html}`;
    }

    async function callAi(prompt: string): Promise<any> {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'report_selectors' },
        messages: [{ role: 'user', content: prompt }],
      });
      const toolUse = message.content.find((b) => b.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') throw new Error('AI did not return a tool call');
      return toolUse.input;
    }

    function buildPaginationConfig(toolInput: any): PaginationConfig | undefined {
      const pt: string | null = toolInput.paginationType;
      const nextPageSel: string | null = toolInput.selectors?.nextPage ?? null;
      if (!pt) return undefined;
      if (pt === 'next-url') {
        if (!toolInput.urlTemplate) return undefined;
        return { type: 'url', urlTemplate: toolInput.urlTemplate, maxPages: 10 };
      }
      if (!nextPageSel) return undefined;
      return {
        type: pt === 'show-more' ? 'show-more' : 'click',
        nextPageSelector: nextPageSel,
        maxPages: 10,
        delayMs: 500,
      };
    }

    let toolInput: any;
    try {
      toolInput = await callAi(buildPrompt(simplifiedHtml, url));
    } catch (err) {
      res.status(502).json({ error: `AI analysis failed: ${String(err)}` });
      return;
    }

    // Validate required selectors
    const selectors = toolInput?.selectors ?? {};
    if (!selectors.jobCard || !selectors.title || !selectors.link) {
      res.status(502).json({
        error: 'AI could not identify required selectors (jobCard, title, link). The page may require authentication or use a format Claude cannot parse.',
      });
      return;
    }

    // Test the selectors with a real scrape (page 1 only)
    async function testSelectors(input: any): Promise<number> {
      try {
        const testConfig: any = {
          name: '__ai-validate__',
          url,
          selectors: { ...input.selectors },
          // No pagination — only test page 1
        };
        const result = await scrapeBoard(testConfig);
        return result.jobs.length;
      } catch {
        return 0;
      }
    }

    let jobsFound = await testSelectors(toolInput);

    // If 0 jobs, give AI one more chance with feedback about what failed
    if (jobsFound === 0) {
      try {
        const retryInput = await callAi(buildPrompt(simplifiedHtml, url, selectors.jobCard));
        const retrySelectors = retryInput?.selectors ?? {};
        if (retrySelectors.jobCard && retrySelectors.title && retrySelectors.link) {
          const retryCount = await testSelectors(retryInput);
          if (retryCount > jobsFound) {
            toolInput = retryInput;
            jobsFound = retryCount;
          }
        }
      } catch {
        // keep original result
      }
    }

    const pagination = buildPaginationConfig(toolInput);

    res.json({
      url,
      name: toolInput.name ?? '',
      selectors: toolInput.selectors,
      pagination,
      jobsFound,
    });
  });

  router.post('/preview', async (req: Request, res: Response) => {
    const { url, selectors, pagination } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    if (!selectors || typeof selectors !== 'object') {
      res.status(400).json({ error: 'selectors is required' });
      return;
    }

    const boardConfig: any = {
      name: '__preview__',
      url,
      selectors,
      ...(pagination ? { pagination } : {}),
    };

    try {
      const result = await scrapeBoard(boardConfig);
      res.json({ jobs: result.jobs.slice(0, 10), total: result.jobs.length });
    } catch (err) {
      res.status(422).json({ error: `Preview scrape failed: ${String(err)}` });
    }
  });

  return router;
}

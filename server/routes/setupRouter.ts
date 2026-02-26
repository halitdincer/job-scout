import { Router, Request, Response } from 'express';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../auth/middleware';
import { scrapeSource } from '../../src/scraper';
import type { PaginationConfig, Job } from '../../src/types';

// ── Scoring / quality-gate constants ──────────────────────────────────────────

const MIN_JOBS_PAGE1 = 3;
const MIN_UNIQUE_URL_RATIO = 0.85;
const MIN_TITLE_NON_EMPTY_RATIO = 0.9;

// ── Scoring helpers ───────────────────────────────────────────────────────────

interface ValidationResult {
  score: number;
  status: 'pass' | 'warn' | 'fail';
  jobsFound: number;
  uniqueUrlRatio: number;
  titleNonEmptyRatio: number;
  reasons: string[];
}

function scoreJobs(jobs: Job[]): ValidationResult {
  const reasons: string[] = [];
  const total = jobs.length;

  if (total === 0) {
    return { score: 0, status: 'fail', jobsFound: 0, uniqueUrlRatio: 0, titleNonEmptyRatio: 0, reasons: ['No jobs found'] };
  }

  const uniqueUrls = new Set(jobs.map((j) => j.url));
  const uniqueUrlRatio = uniqueUrls.size / total;
  const titleNonEmptyRatio = jobs.filter((j) => j.title && j.title !== 'Unknown Title').length / total;

  let score = 0;

  // Job count score (0-40)
  if (total >= MIN_JOBS_PAGE1) {
    score += Math.min(40, total * 2);
  } else {
    reasons.push(`Only ${total} jobs found (min ${MIN_JOBS_PAGE1})`);
    score += total * 5;
  }

  // Unique URL ratio (0-30)
  if (uniqueUrlRatio >= MIN_UNIQUE_URL_RATIO) {
    score += 30;
  } else {
    reasons.push(`Low unique URL ratio: ${(uniqueUrlRatio * 100).toFixed(0)}% (min ${MIN_UNIQUE_URL_RATIO * 100}%)`);
    score += Math.round(uniqueUrlRatio * 30);
  }

  // Title quality (0-30)
  if (titleNonEmptyRatio >= MIN_TITLE_NON_EMPTY_RATIO) {
    score += 30;
  } else {
    reasons.push(`Low title quality: ${(titleNonEmptyRatio * 100).toFixed(0)}% non-empty (min ${MIN_TITLE_NON_EMPTY_RATIO * 100}%)`);
    score += Math.round(titleNonEmptyRatio * 30);
  }

  let status: 'pass' | 'warn' | 'fail';
  if (score >= 70 && reasons.length === 0) {
    status = 'pass';
  } else if (score >= 40) {
    status = 'warn';
  } else {
    status = 'fail';
  }

  return { score, status, jobsFound: total, uniqueUrlRatio, titleNonEmptyRatio, reasons };
}

// ── Router ────────────────────────────────────────────────────────────────────

export function makeSetupRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.post('/analyze', async (req: Request, res: Response) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({ error: 'AI analysis not configured' });
      return;
    }

    const { url, analyzeUrl } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    // Use analyzeUrl for discovery if provided, otherwise fall back to url
    const discoveryUrl = (typeof analyzeUrl === 'string' && analyzeUrl.trim()) ? analyzeUrl.trim() : url.trim();

    let browser;
    let simplifiedHtml = '';
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();

      await page.goto(discoveryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

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

        const root: Element = document.body;

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
                  if ((classCount.get(c) ?? 0) < 2) return false;
                  if (/^sc-[a-z0-9]{4,}/.test(c)) return false;
                  if (/^css-[a-z0-9]{4,}/.test(c)) return false;
                  if (/[a-f0-9]{5,}/i.test(c) && /[0-9]/.test(c)) return false;
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

    // Tool schema: AI returns ranked candidate sets, not single selectors
    const tool: Anthropic.Tool = {
      name: 'report_selector_candidates',
      description: 'Report ranked CSS selector candidates and pagination config for scraping job listings from this page.',
      input_schema: {
        type: 'object' as const,
        required: ['name', 'candidates', 'paginationType'],
        properties: {
          name: { type: 'string', description: 'Short human-readable name for this job source' },
          candidates: {
            type: 'object' as const,
            required: ['jobCard', 'title', 'link'],
            properties: {
              jobCard: {
                type: 'array',
                items: { type: 'string' },
                description: 'Top 3-5 CSS selectors for querySelectorAll() — each MUST match every job card container. Ranked best-first.',
              },
              title: {
                type: 'array',
                items: { type: 'string' },
                description: 'Top 3-5 CSS selectors for job title, relative to jobCard. Ranked best-first.',
              },
              link: {
                type: 'array',
                items: { type: 'string' },
                description: 'Top 3-5 CSS selectors for the <a> link, relative to jobCard. Ranked best-first.',
              },
              nextPage: {
                type: 'array',
                items: { type: 'string' },
                description: 'Top 1-3 CSS selectors for the pagination/load-more button. Empty array if no pagination.',
              },
            },
          },
          paginationType: {
            type: ['string', 'null'],
            enum: ['show-more', 'next-click', 'next-url', null],
            description: '"show-more": clicking loads more jobs into the SAME page. "next-click": clicking navigates to the next page. "next-url": pages are URL-based (?page=2). null: only one page.',
          },
          urlTemplate: {
            type: ['string', 'null'],
            description: 'For next-url only: the URL with {page} as a placeholder. null otherwise.',
          },
        },
      },
    };

    function buildPrompt(html: string, pageUrl: string, failedCandidates?: string[]): string {
      const retryNote = failedCandidates && failedCandidates.length > 0
        ? `\n⚠ PREVIOUS ATTEMPT FAILED: The following jobCard selectors were tested and matched 0 valid job listings: ${failedCandidates.map(s => `"${s}"`).join(', ')}. These are WRONG — try completely different approaches.\n`
        : '';

      return `You are a web scraping expert. Analyze this simplified HTML from a job source page and identify CSS selectors to extract every job listing.

URL: ${pageUrl}
${retryNote}
HOW SELECTORS ARE USED (Playwright):
  • jobCard  → page.$$( jobCard )  — selects ALL job card containers. MUST match every listing.
  • title, link → card.querySelector( field ) — scoped inside each card
  • nextPage → page.$( nextPage ) — the pagination/load-more button (anywhere on the page)

YOU MUST RETURN RANKED CANDIDATES (3-5 per field):
  • Return an array of 3-5 selectors per field, ranked best-first
  • The system will automatically test every combination and pick the best one
  • More candidates = higher chance of success

SELECTOR QUALITY RULES:
  • jobCard MUST match ALL listings — if querySelectorAll returns only 1 result, the selector is WRONG
  • The HTML has already stripped classes that appear only once (unique to a single element).
    Only classes repeated across multiple elements survive — those are the structural ones to use.
  • Prefer: tag names, [role="..."], [data-*] attrs, semantic class names shared across all cards
  • Avoid: nth-child, unique IDs, any class or attribute that identifies one specific listing
  • Child selectors (title, link) are relative to jobCard — do not repeat the jobCard prefix

PAGINATION — nextPage candidates are required, always set it or explicitly empty array:
  • Look below the job list for buttons/links: "Next", "Next page", "Load More", "Show More", ">", "→"
  • They are often icon-only with aria-label="Next page" — check aria-label attributes
  • Prefer [aria-label="..."], [data-testid="..."], role="button", or readable class names

PAGINATION TYPES:
  • "show-more": a button that appends more jobs to the current page without any navigation
  • "next-click": a button/link that navigates to the next page (page reloads or URL changes)
  • "next-url": no button — pages are controlled purely by a URL query param (?page=2, &start=25, &offset=20)
  • null: only one page of results, no pagination needed

Simplified HTML (main content only):
${html}`;
    }

    async function callAi(prompt: string): Promise<any> {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'report_selector_candidates' },
        messages: [{ role: 'user', content: prompt }],
      });
      const toolUse = message.content.find((b) => b.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') throw new Error('AI did not return a tool call');
      return toolUse.input;
    }

    function buildPaginationConfig(paginationType: string | null, nextPageSelector: string | null, urlTemplate?: string | null): PaginationConfig | undefined {
      if (!paginationType) return undefined;
      if (paginationType === 'next-url') {
        if (!urlTemplate) return undefined;
        return { type: 'url', urlTemplate, maxPages: 10 };
      }
      if (!nextPageSelector) return undefined;
      return {
        type: paginationType === 'show-more' ? 'show-more' : 'click',
        nextPageSelector,
        maxPages: 10,
        delayMs: 500,
      };
    }

    // Test a specific selector combination and return scored results
    async function testCandidate(
      targetUrl: string,
      jobCard: string,
      title: string,
      link: string,
    ): Promise<{ jobs: Job[]; validation: ValidationResult }> {
      try {
        const testConfig: any = {
          name: '__ai-validate__',
          url: targetUrl,
          selectors: { jobCard, title, link },
        };
        const result = await scrapeSource(testConfig);
        const validation = scoreJobs(result.jobs);
        return { jobs: result.jobs, validation };
      } catch {
        return {
          jobs: [],
          validation: { score: 0, status: 'fail', jobsFound: 0, uniqueUrlRatio: 0, titleNonEmptyRatio: 0, reasons: ['Scrape threw an error'] },
        };
      }
    }

    // Test candidate combinations and find the best one
    async function findBestCandidate(
      targetUrl: string,
      candidates: { jobCard: string[]; title: string[]; link: string[] },
    ): Promise<{ jobCard: string; title: string; link: string; validation: ValidationResult } | null> {
      let best: { jobCard: string; title: string; link: string; validation: ValidationResult } | null = null;

      // Test top jobCard candidates with top title/link candidates
      // Limit combinatorics: max 5 jobCards × top 2 titles × top 2 links = 20 combos max
      const jobCards = (candidates.jobCard || []).slice(0, 5);
      const titles = (candidates.title || []).slice(0, 2);
      const links = (candidates.link || []).slice(0, 2);

      for (const jc of jobCards) {
        for (const t of titles) {
          for (const l of links) {
            const result = await testCandidate(targetUrl, jc, t, l);
            if (!best || result.validation.score > best.validation.score) {
              best = { jobCard: jc, title: t, link: l, validation: result.validation };
            }
            // Early exit if we find a passing config
            if (result.validation.status === 'pass') {
              return best;
            }
          }
        }
      }

      return best;
    }

    let toolInput: any;
    try {
      toolInput = await callAi(buildPrompt(simplifiedHtml, discoveryUrl));
    } catch (err) {
      res.status(502).json({ error: `AI analysis failed: ${String(err)}` });
      return;
    }

    const candidates = toolInput?.candidates ?? {};
    if (!candidates.jobCard?.length || !candidates.title?.length || !candidates.link?.length) {
      res.status(502).json({
        error: 'AI could not identify required selector candidates (jobCard, title, link). The page may require authentication or use a format Claude cannot parse.',
      });
      return;
    }

    // Test the actual scrape URL (not analyzeUrl) to validate the selectors work on the target page
    const testUrl = url.trim();
    let best = await findBestCandidate(testUrl, candidates);

    // Retry: if best score is poor, ask AI again with failure feedback
    if (!best || best.validation.status === 'fail') {
      try {
        const failedJobCards = candidates.jobCard.slice(0, 3);
        const retryInput = await callAi(buildPrompt(simplifiedHtml, discoveryUrl, failedJobCards));
        const retryCandidates = retryInput?.candidates ?? {};
        if (retryCandidates.jobCard?.length && retryCandidates.title?.length && retryCandidates.link?.length) {
          const retryBest = await findBestCandidate(testUrl, retryCandidates);
          if (retryBest && (!best || retryBest.validation.score > best.validation.score)) {
            best = retryBest;
            toolInput = retryInput;
          }
        }
      } catch {
        // keep original result
      }
    }

    if (!best) {
      res.status(502).json({
        error: 'All selector candidates failed validation. The page may require authentication or use a format that cannot be scraped.',
      });
      return;
    }

    // Determine pagination config from AI suggestion + best nextPage candidate
    const nextPageCandidates: string[] = candidates.nextPage || toolInput?.candidates?.nextPage || [];
    const bestNextPage = nextPageCandidates[0] || null;
    const pagination = buildPaginationConfig(
      toolInput.paginationType,
      bestNextPage,
      toolInput.urlTemplate,
    );

    res.json({
      url,
      name: toolInput.name ?? '',
      selectors: {
        jobCard: best.jobCard,
        title: best.title,
        link: best.link,
        nextPage: bestNextPage,
      },
      pagination,
      validation: best.validation,
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

    const sourceConfig: any = {
      name: '__preview__',
      url,
      selectors,
      ...(pagination ? { pagination } : {}),
    };

    try {
      const result = await scrapeSource(sourceConfig);
      res.json({ jobs: result.jobs.slice(0, 10), total: result.jobs.length });
    } catch (err) {
      res.status(422).json({ error: `Preview scrape failed: ${String(err)}` });
    }
  });

  return router;
}

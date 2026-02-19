import { Router, Request, Response } from 'express';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../auth/middleware';
import { scrapeBoard } from '../../src/scraper';

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

        // Skip root-level chrome elements
        const ROOT_SKIP_TAGS = new Set(['nav', 'header', 'footer']);

        function isVisible(el: Element): boolean {
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')
            return false;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
          return true;
        }

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

          // Keep only stable, meaningful attributes
          const keepAttrs: string[] = [];
          for (const attr of ['id', 'class', 'href', 'role', 'data-job-id', 'data-testid', 'aria-label']) {
            const val = el.getAttribute(attr);
            if (val) {
              // Strip hashed CSS-module class names; keep semantic ones
              if (attr === 'class') {
                const cleanClasses = val
                  .split(/\s+/)
                  .filter((c) => !/^(sc-|css-|[a-z]+-[A-Za-z0-9]{6,}$)/.test(c))
                  .join(' ')
                  .trim();
                if (cleanClasses) keepAttrs.push(`class="${cleanClasses}"`);
              } else {
                keepAttrs.push(`${attr}="${val.slice(0, 200)}"`);
              }
            }
          }

          const attrStr = keepAttrs.length ? ' ' + keepAttrs.join(' ') : '';
          const children = Array.from(el.childNodes)
            .map((n) => simplifyNode(n, depth + 1))
            .join('')
            .trim();

          if (!children && !el.hasAttribute('href')) return '';
          return `<${tag}${attrStr}>${children}</${tag}>`;
        }

        // Prefer main content area; fall back to body
        const root: Element =
          document.querySelector('main, [role="main"]') ?? document.body;

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
      description: 'Report the CSS selectors needed to scrape job listings from this page.',
      input_schema: {
        type: 'object' as const,
        required: ['name', 'selectors'],
        properties: {
          name: { type: 'string', description: 'Short human-readable name for this job board' },
          selectors: {
            type: 'object' as const,
            required: ['jobCard', 'title', 'link'],
            properties: {
              jobCard:    { type: 'string', description: 'Selector for each job listing container' },
              title:      { type: 'string', description: 'Selector for job title, relative to jobCard' },
              link:       { type: 'string', description: 'Selector for the <a> link, relative to jobCard' },
              company:    { type: ['string', 'null'], description: 'Selector for company name, relative to jobCard, or null' },
              location:   { type: ['string', 'null'], description: 'Selector for location, relative to jobCard, or null' },
              postedDate: { type: ['string', 'null'], description: 'Selector for posted date, relative to jobCard, or null' },
            },
          },
          waitForSelector: {
            type: ['string', 'null'],
            description: 'A selector to wait for before scraping, or null',
          },
        },
      },
    };

    let toolInput: any;
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'report_selectors' },
        messages: [
          {
            role: 'user',
            content: `You are an expert at reverse-engineering CSS selectors for job board scrapers.

Analyze the simplified HTML below and call the report_selectors tool with the best selectors.

Rules:
- Look for **repeating list patterns** — that is where the job cards are.
- Prefer **stable selectors**: tag names, semantic class names, data-* attributes, id attributes, role attributes.
- **Avoid hashed/generated class names** (e.g. sc-abc123, css-xyz789) — they break on redeployment.
- title, company, location, link, and postedDate selectors are **relative to jobCard** (used with jobCard.querySelector(sel)).
- If a field is not present in the HTML, set it to null.

Simplified HTML (main content area only):
${simplifiedHtml}`,
          },
        ],
      });

      const toolUse = message.content.find((b) => b.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        res.status(502).json({ error: 'AI did not return a tool call' });
        return;
      }
      toolInput = toolUse.input;
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

    res.json({
      url,
      name: toolInput.name ?? '',
      selectors,
      waitForSelector: toolInput.waitForSelector ?? undefined,
    });
  });

  router.post('/preview', async (req: Request, res: Response) => {
    const { url, selectors, waitForSelector, pagination } = req.body ?? {};
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
      ...(waitForSelector ? { waitForSelector } : {}),
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

import { Router, Request, Response } from 'express';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../auth/middleware';
import { scrapeBoard } from '../../src/scraper';

function cleanHtml(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .slice(0, 15000);
}

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
    let rawHtml = '';
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      rawHtml = await page.content();
    } catch (err) {
      res.status(422).json({ error: `Failed to load page: ${String(err)}` });
      return;
    } finally {
      if (browser) await browser.close();
    }

    const html = cleanHtml(rawHtml);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let analysisText = '';
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are analyzing a job board webpage. Given the HTML below, extract CSS selectors for scraping jobs.

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "name": "<short board name>",
  "selectors": {
    "jobCard": "<CSS selector for each job listing container>",
    "title": "<CSS selector for job title within card>",
    "company": "<CSS selector for company name within card, or null>",
    "location": "<CSS selector for location within card, or null>",
    "link": "<CSS selector for the job link (a tag) within card>",
    "postedDate": "<CSS selector for posted date within card, or null>"
  },
  "waitForSelector": "<CSS selector to wait for before scraping, or null>"
}

HTML:
${html}`,
          },
        ],
      });

      analysisText = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');
    } catch (err) {
      res.status(502).json({ error: `AI analysis failed: ${String(err)}` });
      return;
    }

    // Defensive JSON extraction: find first { to last }
    const start = analysisText.indexOf('{');
    const end = analysisText.lastIndexOf('}');
    if (start === -1 || end === -1) {
      res.status(502).json({ error: 'AI returned unexpected response format' });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(analysisText.slice(start, end + 1));
    } catch {
      res.status(502).json({ error: 'AI returned invalid JSON' });
      return;
    }

    res.json({
      url,
      name: parsed.name ?? '',
      selectors: parsed.selectors ?? {},
      waitForSelector: parsed.waitForSelector ?? undefined,
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

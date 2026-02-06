import { chromium, Page } from 'playwright';
import { BoardConfig, Job, ScrapeResult } from './types';
import { extractJobsFromJsonLd } from './extractors/jsonLd';
import { extractJobsFromSelectors } from './extractors/selectors';

const DEFAULT_MAX_PAGES = 1;

function shouldStopForMaxPages(pageIndex: number, maxPages?: number) {
  const limit = maxPages && maxPages > 0 ? maxPages : DEFAULT_MAX_PAGES;
  return pageIndex >= limit;
}

async function getNextPageAction(
  page: Page,
  config: BoardConfig,
  pageIndex: number
): Promise<{ type: 'url'; url: string } | { type: 'clicked' } | null> {
  const pagination = config.pagination;

  if (pagination?.type === 'url' && pagination.urlTemplate) {
    const nextPage = pageIndex + 2;
    const nextUrl = pagination.urlTemplate.replace('{page}', String(nextPage));
    return { type: 'url', url: nextUrl };
  }

  const selector = pagination?.nextPageSelector || config.selectors?.nextPage;
  if (!selector) return null;

  const nextButton = await page.$(selector);
  if (!nextButton) return null;

  const ariaDisabled = await nextButton.getAttribute('aria-disabled');
  const disabled = await nextButton.getAttribute('disabled');
  if (ariaDisabled === 'true' || disabled !== null) return null;

  const href = await nextButton.getAttribute('href');
  if (href) {
    const url = href.startsWith('http') ? href : new URL(href, page.url()).toString();
    return { type: 'url', url };
  }

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
    nextButton.click(),
  ]);

  return { type: 'clicked' };
}

async function extractJobsOnPage(page: Page, config: BoardConfig): Promise<Job[]> {
  const jobs: Job[] = [];

  const jsonLdJobs = await extractJobsFromJsonLd(page, config);
  jobs.push(...jsonLdJobs);

  const selectorJobs = await extractJobsFromSelectors(page, config);
  const existingIds = new Set(jobs.map((job) => job.id));
  for (const job of selectorJobs) {
    if (!existingIds.has(job.id)) {
      jobs.push(job);
    }
  }

  return jobs;
}

export async function scrapeBoard(config: BoardConfig): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  const jobs: Job[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  try {
    console.log(`Searching ${config.name}...`);

    let pageIndex = 0;
    let currentUrl = config.url;
    let stayOnPage = false;

    while (true) {
      if (!stayOnPage) {
        await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 60000 });
      }

      if (config.waitForSelector) {
        await page.waitForSelector(config.waitForSelector, { timeout: 30000 });
      }

      const pageJobs = await extractJobsOnPage(page, config);
      for (const job of pageJobs) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          jobs.push(job);
        }
      }

      pageIndex += 1;
      if (shouldStopForMaxPages(pageIndex, config.pagination?.maxPages)) {
        break;
      }

      const nextAction = await getNextPageAction(page, config, pageIndex - 1);
      if (!nextAction) break;

      if (config.pagination?.delayMs && config.pagination.delayMs > 0) {
        await page.waitForTimeout(config.pagination.delayMs);
      }

      if (nextAction.type === 'url') {
        if (seenUrls.has(nextAction.url)) break;
        seenUrls.add(nextAction.url);
        currentUrl = nextAction.url;
        stayOnPage = false;
      } else {
        stayOnPage = true;
      }
    }
  } catch (error) {
    console.error(`Failed to scrape ${config.name}:`, error);
  } finally {
    await browser.close();
  }

  return { board: config.name, jobs };
}

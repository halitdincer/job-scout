import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('playwright', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockRejectedValue(new Error('timeout')),
    evaluate: vi.fn().mockResolvedValue('<div class="job-card">Job 1</div>'),
    waitForSelector: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    $$eval: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
    url: vi.fn().mockReturnValue('https://example.com/jobs'),
    $: vi.fn().mockResolvedValue(null),
    waitForNavigation: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(null),
  };
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };
  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

// Re-import scraper functions after mock
// Note: shouldStopForMaxPages and getNextPageAction are not exported
// We test them indirectly through scrapeBoard
import { scrapeBoard } from '../../src/scraper';
import { BoardConfig } from '../../src/types';

const baseConfig: BoardConfig = {
  name: 'TestBoard',
  url: 'https://example.com/jobs',
  selectors: {
    jobCard: '.job-card',
    title: '.job-title',
    link: 'a',
    location: '.location',
  },
};

describe('scrapeBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ScrapeResult with the board name', async () => {
    const result = await scrapeBoard(baseConfig);
    expect(result.board).toBe('TestBoard');
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  it('calls waitForSelector when config specifies it', async () => {
    const { chromium } = await import('playwright');
    const browser = await (chromium.launch as any)();
    const context = await browser.newContext();
    const page = await context.newPage();

    const configWithWait: BoardConfig = { ...baseConfig, waitForSelector: '.jobs-loaded' };
    await scrapeBoard(configWithWait);
    expect(page.waitForSelector).toHaveBeenCalledWith('.jobs-loaded', expect.any(Object));
  });

  it('stops at maxPages=1 by default', async () => {
    const { chromium } = await import('playwright');
    const browser = await (chromium.launch as any)();
    const context = await browser.newContext();
    const page = await context.newPage();

    await scrapeBoard(baseConfig);
    // With default maxPages=1, goto should be called exactly once
    expect(page.goto).toHaveBeenCalledTimes(1);
  });
});

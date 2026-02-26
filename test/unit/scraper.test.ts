import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPage } = vi.hoisted(() => {
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
  return { mockPage };
});

vi.mock('playwright', () => {
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

import { scrapeSource } from '../../src/scraper';
import { SourceConfig } from '../../src/types';

const baseConfig: SourceConfig = {
  name: 'TestSource',
  url: 'https://example.com/jobs',
  selectors: {
    jobCard: '.job-card',
    title: '.job-title',
    link: 'a',
  },
};

describe('scrapeSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(null);
    mockPage.waitForLoadState.mockRejectedValue(new Error('timeout'));
    mockPage.evaluate.mockResolvedValue('<div class="job-card">Job 1</div>');
    mockPage.waitForSelector.mockResolvedValue(null);
    mockPage.$$.mockResolvedValue([]);
    mockPage.$$eval.mockResolvedValue([]);
    mockPage.url.mockReturnValue('https://example.com/jobs');
    mockPage.$.mockResolvedValue(null);
    mockPage.waitForNavigation.mockResolvedValue(null);
    mockPage.waitForTimeout.mockResolvedValue(null);
  });

  it('returns a ScrapeResult with the source name', async () => {
    const result = await scrapeSource(baseConfig);
    expect(result.source).toBe('TestSource');
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  it('calls waitForSelector with the jobCard selector', async () => {
    // waitForSelector is driven by config.selectors.jobCard (commit 0d43f0d)
    await scrapeSource(baseConfig);
    expect(mockPage.waitForSelector).toHaveBeenCalledWith(
      baseConfig.selectors.jobCard,
      expect.any(Object)
    );
  });

  it('stops at maxPages=1 by default (goto called once)', async () => {
    await scrapeSource(baseConfig);
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
  });

  it('url pagination: calls goto with url-template on second page', async () => {
    const config: SourceConfig = {
      ...baseConfig,
      pagination: {
        type: 'url',
        urlTemplate: 'https://example.com/jobs?page={page}',
        maxPages: 2,
      },
    };
    await scrapeSource(config);
    // First call: original URL; second call: page 2
    expect(mockPage.goto).toHaveBeenCalledTimes(2);
    expect(mockPage.goto).toHaveBeenNthCalledWith(
      2,
      'https://example.com/jobs?page=2',
      expect.any(Object)
    );
  });

  it('url pagination: stops when seen URL repeats (de-duplicates)', async () => {
    // urlTemplate without {page} produces the same next-URL on every iteration.
    // seenUrls prevents a 3rd call: first nav = original URL (not tracked),
    // second nav = next-URL (added to seenUrls), third iteration detects duplicate.
    const config: SourceConfig = {
      ...baseConfig,
      pagination: {
        type: 'url',
        urlTemplate: 'https://example.com/jobs',
        maxPages: 10,
      },
    };
    await scrapeSource(config);
    // Two navigations: original URL + one duplicate before de-dup breaks the loop
    expect(mockPage.goto).toHaveBeenCalledTimes(2);
  });

  it('click pagination: stops when next button is aria-disabled=true', async () => {
    const disabledButton = {
      getAttribute: vi.fn().mockImplementation((attr: string) => {
        if (attr === 'aria-disabled') return Promise.resolve('true');
        return Promise.resolve(null);
      }),
      click: vi.fn(),
    };

    const config: SourceConfig = {
      ...baseConfig,
      selectors: { ...baseConfig.selectors, nextPage: '.next-btn' },
      pagination: { type: 'click', maxPages: 3 },
    };

    mockPage.$.mockResolvedValue(disabledButton);
    await scrapeSource(config);
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
  });

  it('click pagination: stops when no next button is found', async () => {
    const config: SourceConfig = {
      ...baseConfig,
      selectors: { ...baseConfig.selectors, nextPage: '.no-next' },
      pagination: { type: 'click', maxPages: 3 },
    };
    mockPage.$.mockResolvedValue(null);

    await scrapeSource(config);
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
  });

  it('delayMs: calls waitForTimeout between pages', async () => {
    const nextButton = {
      getAttribute: vi.fn().mockImplementation((attr: string) => {
        if (attr === 'aria-disabled') return Promise.resolve(null);
        if (attr === 'disabled') return Promise.resolve(null);
        if (attr === 'href') return Promise.resolve('https://example.com/jobs/page2');
        return Promise.resolve(null);
      }),
      click: vi.fn(),
    };
    // Return next button on first call; null on subsequent to stop loop
    mockPage.$.mockResolvedValueOnce(nextButton).mockResolvedValue(null);

    const config: SourceConfig = {
      ...baseConfig,
      selectors: { ...baseConfig.selectors, nextPage: '.next' },
      pagination: { type: 'click', maxPages: 3, delayMs: 100 },
    };
    await scrapeSource(config);
    expect(mockPage.waitForTimeout).toHaveBeenCalledWith(100);
  });

  it('does not throw when scraping fails (returns empty jobs)', async () => {
    mockPage.goto.mockRejectedValue(new Error('network error'));
    const result = await scrapeSource(baseConfig);
    expect(result.source).toBe('TestSource');
    expect(result.jobs).toEqual([]);
  });
});

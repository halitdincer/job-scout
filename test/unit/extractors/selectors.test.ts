import { describe, it, expect, vi } from 'vitest';
import { extractJobsFromSelectors } from '../../../src/extractors/selectors';
import { SourceConfig } from '../../../src/types';

const config: SourceConfig = {
  name: 'Test Source',
  url: 'https://example.com/jobs',
  company: 'Beta Co',
  location: 'Remote',
  selectors: {
    jobCard: '.job-card',
    title: '.job-title',
    link: 'a.job-link',
  },
};

function makeCard(opts: {
  title?: string;
  href?: string;
}) {
  return {
    $: vi.fn((sel: string) => {
      if (sel === config.selectors.title)
        return Promise.resolve({ innerText: () => Promise.resolve(opts.title ?? 'Title') });
      if (sel === config.selectors.link)
        return Promise.resolve({ getAttribute: () => Promise.resolve(opts.href ?? 'https://example.com/job') });
      return Promise.resolve(null);
    }),
  };
}

function makePage(cards: ReturnType<typeof makeCard>[]) {
  return {
    $$: vi.fn().mockResolvedValue(cards),
    url: () => 'https://example.com',
  } as any;
}

describe('extractJobsFromSelectors', () => {
  it('extracts title and link, uses source-level company and location', async () => {
    const page = makePage([makeCard({
      title: 'Frontend Engineer',
      href: 'https://example.com/jobs/2',
    })]);

    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Frontend Engineer');
    expect(jobs[0].company).toBe('Beta Co');
    expect(jobs[0].location).toBe('Remote');
    expect(jobs[0].url).toBe('https://example.com/jobs/2');
    expect(jobs[0].foundAt).toBeDefined();
  });

  it('falls back to config.name for company and "Unknown Location" when not set', async () => {
    const cfgNoDefaults: SourceConfig = {
      name: 'Test Source',
      url: 'https://example.com/jobs',
      selectors: {
        jobCard: '.job-card',
        title: '.job-title',
        link: 'a.job-link',
      },
    };
    const page = makePage([makeCard({ title: 'Dev' })]);

    const jobs = await extractJobsFromSelectors(page, cfgNoDefaults);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('Test Source');
    expect(jobs[0].location).toBe('Unknown Location');
  });

  it('resolves relative href against config.url', async () => {
    const page = makePage([makeCard({ href: '/jobs/99' })]);
    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs[0].url).toBe('https://example.com/jobs/99');
  });

  it('returns [] when no cards match jobCard selector', async () => {
    const page = makePage([]);
    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs).toHaveLength(0);
  });

  it('returns [] when jobCard selector is empty string', async () => {
    const cfg = { ...config, selectors: { ...config.selectors, jobCard: '' } };
    const page = { $$: vi.fn().mockResolvedValue([]) } as any;
    const jobs = await extractJobsFromSelectors(page, cfg);
    expect(jobs).toHaveLength(0);
  });
});

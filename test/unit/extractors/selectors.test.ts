import { describe, it, expect, vi } from 'vitest';
import { extractJobsFromSelectors } from '../../../src/extractors/selectors';
import { BoardConfig } from '../../../src/types';

const config: BoardConfig = {
  name: 'Test Board',
  url: 'https://example.com/jobs',
  selectors: {
    jobCard: '.job-card',
    title: '.job-title',
    link: 'a.job-link',
    location: '.job-location',
    company: '.job-company',
    postedDate: '.job-posted',
  },
};

function makeCard(opts: {
  title?: string;
  company?: string | null;
  location?: string;
  href?: string;
  postedDate?: string | null;
}) {
  return {
    $: vi.fn((sel: string) => {
      if (sel === config.selectors.title)
        return Promise.resolve({ innerText: () => Promise.resolve(opts.title ?? 'Title') });
      if (sel === config.selectors.company)
        return Promise.resolve(opts.company !== undefined ? { innerText: () => Promise.resolve(opts.company!) } : null);
      if (sel === config.selectors.location)
        return Promise.resolve({ innerText: () => Promise.resolve(opts.location ?? 'Unknown') });
      if (sel === config.selectors.link)
        return Promise.resolve({ getAttribute: () => Promise.resolve(opts.href ?? 'https://example.com/job') });
      if (sel === config.selectors.postedDate)
        return Promise.resolve(opts.postedDate !== undefined ? { innerText: () => Promise.resolve(opts.postedDate!) } : null);
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
  it('extracts all fields when all selectors are present', async () => {
    const page = makePage([makeCard({
      title: 'Frontend Engineer',
      company: 'Beta Co',
      location: 'Remote',
      href: 'https://example.com/jobs/2',
      postedDate: '2026-02-02',
    })]);

    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Frontend Engineer');
    expect(jobs[0].company).toBe('Beta Co');
    expect(jobs[0].location).toBe('Remote');
    expect(jobs[0].url).toBe('https://example.com/jobs/2');
    expect(jobs[0].postedDate).toBe('2026-02-02');
  });

  it('handles missing optional selectors gracefully', async () => {
    const page = makePage([makeCard({
      title: 'Dev',
      company: undefined,
      postedDate: undefined,
    })]);

    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('Test Board'); // falls back to config.name
    expect(jobs[0].postedDate).toBeUndefined();
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

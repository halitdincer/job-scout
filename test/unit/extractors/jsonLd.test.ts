import { describe, it, expect, vi } from 'vitest';
import { extractJobsFromJsonLd } from '../../../src/extractors/jsonLd';
import { BoardConfig } from '../../../src/types';

const config: BoardConfig = {
  name: 'Test Board',
  url: 'https://example.com/jobs',
  selectors: { jobCard: '.job', title: '.title', link: 'a', location: '.loc' },
};

function makePage(ldObjects: (object | null)[]) {
  return {
    $$eval: vi.fn().mockResolvedValue(ldObjects),
  } as any;
}

describe('extractJobsFromJsonLd', () => {
  it('extracts title, company, location, url, postedDate from a valid JobPosting', async () => {
    const page = makePage([{
      '@type': 'JobPosting',
      title: 'Backend Engineer',
      hiringOrganization: { name: 'Acme' },
      jobLocation: { address: { addressLocality: 'Toronto', addressRegion: 'ON' } },
      url: 'https://example.com/jobs/1',
      datePosted: '2026-02-01',
    }]);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Backend Engineer');
    expect(jobs[0].company).toBe('Acme');
    expect(jobs[0].location).toBe('Toronto, ON');
    expect(jobs[0].url).toBe('https://example.com/jobs/1');
    expect(jobs[0].postedDate).toBe('2026-02-01');
  });

  it('extracts jobs from an ItemList containing JobPosting items', async () => {
    const page = makePage([[
      {
        '@type': 'JobPosting',
        title: 'Frontend Dev',
        url: 'https://example.com/jobs/2',
      },
      {
        '@type': 'JobPosting',
        title: 'Backend Dev',
        url: 'https://example.com/jobs/3',
      },
    ]]);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.title)).toContain('Frontend Dev');
    expect(jobs.map((j) => j.title)).toContain('Backend Dev');
  });

  it('returns [] for non-JobPosting JSON-LD', async () => {
    const page = makePage([{ '@type': 'Organization', name: 'Acme' }]);
    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(0);
  });

  it('skips null entries (malformed JSON parsed as null)', async () => {
    const page = makePage([null, { '@type': 'JobPosting', title: 'Good Job', url: 'https://x.com' }]);
    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Good Job');
  });

  it('normalizes array location to "City, Region" string', async () => {
    const page = makePage([{
      '@type': 'JobPosting',
      title: 'Dev',
      jobLocation: [
        { address: { addressLocality: 'Vancouver', addressRegion: 'BC' } },
      ],
      url: 'https://example.com/jobs/4',
    }]);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs[0].location).toBe('Vancouver, BC');
  });

  it('falls back to "Unknown" when no location data', async () => {
    const page = makePage([{ '@type': 'JobPosting', title: 'Dev', url: 'https://x.com' }]);
    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs[0].location).toBe('Unknown');
  });
});

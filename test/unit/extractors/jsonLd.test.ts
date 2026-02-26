import { describe, it, expect, vi } from 'vitest';
import { extractJobsFromJsonLd } from '../../../src/extractors/jsonLd';
import { SourceConfig } from '../../../src/types';

const config: SourceConfig = {
  name: 'Test Source',
  url: 'https://example.com/jobs',
  company: 'Acme',
  location: 'Toronto, ON',
  selectors: { jobCard: '.job', title: '.title', link: 'a' },
};

function makePage(ldObjects: (object | null)[]) {
  return {
    $$eval: vi.fn().mockResolvedValue(ldObjects),
  } as any;
}

describe('extractJobsFromJsonLd', () => {
  it('extracts title and url from a valid JobPosting, uses source-level company/location', async () => {
    const page = makePage([{
      '@type': 'JobPosting',
      title: 'Backend Engineer',
      hiringOrganization: { name: 'Ignored Org' },
      jobLocation: { address: { addressLocality: 'Ignored', addressRegion: 'XX' } },
      url: 'https://example.com/jobs/1',
      datePosted: '2026-02-01',
    }]);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Backend Engineer');
    expect(jobs[0].company).toBe('Acme');
    expect(jobs[0].location).toBe('Toronto, ON');
    expect(jobs[0].url).toBe('https://example.com/jobs/1');
    // postedDate is no longer extracted
    expect((jobs[0] as any).postedDate).toBeUndefined();
  });

  it('extracts jobs from an array of JobPosting items', async () => {
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

  it('uses source-level location even when JSON-LD has jobLocation', async () => {
    const page = makePage([{
      '@type': 'JobPosting',
      title: 'Dev',
      jobLocation: [
        { address: { addressLocality: 'Vancouver', addressRegion: 'BC' } },
      ],
      url: 'https://example.com/jobs/4',
    }]);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs[0].location).toBe('Toronto, ON');
  });

  it('falls back to "Unknown Location" when source has no location', async () => {
    const cfgNoLoc: SourceConfig = {
      name: 'Test Source',
      url: 'https://example.com/jobs',
      selectors: { jobCard: '.job', title: '.title', link: 'a' },
    };
    const page = makePage([{ '@type': 'JobPosting', title: 'Dev', url: 'https://x.com' }]);
    const jobs = await extractJobsFromJsonLd(page, cfgNoLoc);
    expect(jobs[0].location).toBe('Unknown Location');
  });
});

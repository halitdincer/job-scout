import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJobsFromJsonLd } from '../src/extractors/jsonLd';
import { extractJobsFromSelectors } from '../src/extractors/selectors';
import { BoardConfig } from '../src/types';

const config: BoardConfig = {
  name: 'Fixture Board',
  url: 'https://example.com/jobs',
  selectors: {
    jobCard: '.job-card',
    title: '.job-title',
    location: '.job-location',
    link: 'a.job-link',
    company: '.job-company',
    postedDate: '.job-posted',
    nextPage: null,
  },
};

function makeJobPostingScript(data: object) {
  return JSON.stringify(data);
}

function makeMockPage(ldJsonContents: object[], cards: Array<{
  title?: string;
  company?: string;
  location?: string;
  href?: string;
  postedDate?: string;
} | null>) {
  const page: any = {
    $$eval: vi.fn((_selector: string, _fn: Function) => {
      return Promise.resolve(ldJsonContents);
    }),
    $$: vi.fn((_selector: string) => {
      return Promise.resolve(cards.map((card) => {
        if (!card) return null;
        return {
          $: vi.fn((sel: string) => {
            if (sel === config.selectors.title) return Promise.resolve({ innerText: () => Promise.resolve(card.title ?? '') });
            if (sel === config.selectors.company) return Promise.resolve(card.company !== undefined ? { innerText: () => Promise.resolve(card.company!) } : null);
            if (sel === config.selectors.location) return Promise.resolve({ innerText: () => Promise.resolve(card.location ?? '') });
            if (sel === config.selectors.link) return Promise.resolve({ getAttribute: () => Promise.resolve(card.href ?? '') });
            if (sel === config.selectors.postedDate) return Promise.resolve(card.postedDate !== undefined ? { innerText: () => Promise.resolve(card.postedDate!) } : null);
            return Promise.resolve(null);
          }),
        };
      }));
    }),
    url: () => 'https://example.com/jobs',
  };
  return page;
}

describe('extractJobsFromJsonLd', () => {
  it('extracts a valid JobPosting', async () => {
    const page = makeMockPage([{
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Backend Engineer',
      hiringOrganization: { name: 'Acme' },
      jobLocation: { address: { addressLocality: 'Toronto', addressRegion: 'ON' } },
      url: 'https://example.com/jobs/1',
      datePosted: '2026-02-01',
    }], []);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Backend Engineer');
    expect(jobs[0].company).toBe('Acme');
    expect(jobs[0].location).toBe('Toronto, ON');
    expect(jobs[0].url).toBe('https://example.com/jobs/1');
    expect(jobs[0].postedDate).toBe('2026-02-01');
  });

  it('skips non-JobPosting JSON-LD types', async () => {
    const page = makeMockPage([{
      '@type': 'Organization',
      name: 'Acme',
    }], []);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(0);
  });

  it('handles malformed JSON gracefully (returns null from $$eval)', async () => {
    const page: any = {
      $$eval: vi.fn().mockResolvedValue([null]),
      $$: vi.fn().mockResolvedValue([]),
    };

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs).toHaveLength(0);
  });

  it('normalizes array location to "City, Region" string', async () => {
    const page = makeMockPage([{
      '@type': 'JobPosting',
      title: 'Dev',
      hiringOrganization: { name: 'Corp' },
      jobLocation: [
        { address: { addressLocality: 'Vancouver', addressRegion: 'BC' } },
      ],
      url: 'https://example.com/jobs/2',
    }], []);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs[0].location).toBe('Vancouver, BC');
  });

  it('uses config.url when job url is missing', async () => {
    const page = makeMockPage([{
      '@type': 'JobPosting',
      title: 'Dev',
    }], []);

    const jobs = await extractJobsFromJsonLd(page, config);
    expect(jobs[0].url).toBe('https://example.com/jobs');
  });
});

describe('extractJobsFromSelectors', () => {
  it('extracts a job card with all fields', async () => {
    const page: any = {
      $$: vi.fn().mockResolvedValue([{
        $: vi.fn((sel: string) => {
          const map: Record<string, any> = {
            [config.selectors.title]: { innerText: () => Promise.resolve('Frontend Engineer') },
            [config.selectors.company!]: { innerText: () => Promise.resolve('Beta Co') },
            [config.selectors.location]: { innerText: () => Promise.resolve('Remote') },
            [config.selectors.link]: { getAttribute: () => Promise.resolve('https://example.com/jobs/2') },
            [config.selectors.postedDate!]: { innerText: () => Promise.resolve('2026-02-02') },
          };
          return Promise.resolve(map[sel] ?? null);
        }),
      }]),
      url: () => 'https://example.com',
    };

    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Frontend Engineer');
    expect(jobs[0].company).toBe('Beta Co');
    expect(jobs[0].location).toBe('Remote');
    expect(jobs[0].postedDate).toBe('2026-02-02');
  });

  it('returns empty array when no jobCard selector', async () => {
    const cfg = { ...config, selectors: { ...config.selectors, jobCard: '' } };
    const page: any = { $$: vi.fn().mockResolvedValue([]) };
    const jobs = await extractJobsFromSelectors(page, cfg);
    expect(jobs).toHaveLength(0);
  });

  it('resolves relative href against page URL', async () => {
    const page: any = {
      $$: vi.fn().mockResolvedValue([{
        $: vi.fn((sel: string) => {
          if (sel === config.selectors.link) return Promise.resolve({ getAttribute: () => Promise.resolve('/jobs/99') });
          if (sel === config.selectors.title) return Promise.resolve({ innerText: () => Promise.resolve('Job') });
          if (sel === config.selectors.location) return Promise.resolve({ innerText: () => Promise.resolve('NYC') });
          return Promise.resolve(null);
        }),
      }]),
      url: () => 'https://example.com',
    };

    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs[0].url).toBe('https://example.com/jobs/99');
  });

  it('returns empty array when no cards match', async () => {
    const page: any = { $$: vi.fn().mockResolvedValue([]) };
    const jobs = await extractJobsFromSelectors(page, config);
    expect(jobs).toHaveLength(0);
  });
});

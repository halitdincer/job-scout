import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

const {
  mockLaunch,
  mockCreate,
  mockScrapeBoard,
  mockPage,
} = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(null),
    evaluate: vi.fn().mockResolvedValue('<div class="job-card"><a href="/j"><h2>Eng</h2></a></div>'),
    waitForSelector: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    $$eval: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
    url: vi.fn().mockReturnValue('https://example.com/jobs'),
    $: vi.fn().mockResolvedValue(null),
  };
  const mockBrowser = { newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() };
  const mockLaunch = vi.fn().mockResolvedValue(mockBrowser);
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{
      type: 'tool_use',
      name: 'report_selectors',
      input: { name: 'Test Board', selectors: { jobCard: '.job-card', title: 'h2', link: 'a' }, waitForSelector: null },
    }],
  });
  const mockScrapeBoard = vi.fn().mockResolvedValue({
    board: '__preview__',
    jobs: [{ id: '1', title: 'Engineer', company: 'Acme', location: 'Remote', url: 'https://x.com/1', foundAt: new Date().toISOString() }],
  });
  return { mockLaunch, mockCreate, mockScrapeBoard, mockPage };
});

vi.mock('playwright', () => ({
  chromium: { launch: mockLaunch },
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

vi.mock('../../../src/scraper', () => ({
  scrapeBoard: mockScrapeBoard,
}));

describe('setup routes', () => {
  let app: any;
  let db: Database;
  let cookie: string;

  beforeEach(async () => {
    ({ app, db } = await createTestApp());
    ({ cookie } = await registerAndLogin(app));

    // Reset mocks to safe defaults
    mockLaunch.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    });
    mockCreate.mockResolvedValue({
      content: [{
        type: 'tool_use',
        name: 'report_selectors',
        input: { name: 'Test Board', selectors: { jobCard: '.job-card', title: 'h2', link: 'a' }, waitForSelector: null },
      }],
    });
    mockScrapeBoard.mockResolvedValue({
      board: '__preview__',
      jobs: [{ id: '1', title: 'Engineer', company: 'Acme', location: 'Remote', url: 'https://x.com/1', foundAt: new Date().toISOString() }],
    });
    mockPage.evaluate.mockResolvedValue('<div class="job-card"><a href="/job/1"><h2>Engineer</h2></a></div>');
  });

  afterEach(async () => {
    await db.close();
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('POST /api/setup/analyze', () => {
    it('401 — unauthenticated', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const res = await supertest(app).post('/api/setup/analyze').send({ url: 'https://example.com' });
      expect(res.status).toBe(401);
    });

    it('503 — ANTHROPIC_API_KEY not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await supertest(app)
        .post('/api/setup/analyze')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(503);
    });

    it('400 — missing url', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const res = await supertest(app)
        .post('/api/setup/analyze')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it('422 — chromium.launch throws', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockLaunch.mockRejectedValueOnce(new Error('Launch failed'));

      const res = await supertest(app)
        .post('/api/setup/analyze')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(422);
    });

    it('502 — AI response contains no tool_use block', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'no tools' }] });

      const res = await supertest(app)
        .post('/api/setup/analyze')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(502);
    });

    it('502 — required selectors are empty strings', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          name: 'report_selectors',
          input: { name: 'Board', selectors: { jobCard: '', title: '', link: '' } },
        }],
      });

      const res = await supertest(app)
        .post('/api/setup/analyze')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(502);
    });

    it('200 — happy path returns url, name, selectors, waitForSelector', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const res = await supertest(app)
        .post('/api/setup/analyze')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com/jobs' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('selectors');
      expect(res.body.selectors).toHaveProperty('jobCard');
    });
  });

  describe('POST /api/setup/preview', () => {
    it('400 — missing url', async () => {
      const res = await supertest(app)
        .post('/api/setup/preview')
        .set('Cookie', cookie)
        .send({ selectors: { jobCard: '.job' } });
      expect(res.status).toBe(400);
    });

    it('400 — missing selectors', async () => {
      const res = await supertest(app)
        .post('/api/setup/preview')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(400);
    });

    it('422 — scrapeBoard throws', async () => {
      mockScrapeBoard.mockRejectedValueOnce(new Error('Scrape failed'));

      const res = await supertest(app)
        .post('/api/setup/preview')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com', selectors: { jobCard: '.job', title: '.title', link: 'a' } });
      expect(res.status).toBe(422);
    });

    it('200 — returns first 10 jobs and total', async () => {
      const jobs = Array.from({ length: 15 }, (_, i) => ({
        id: `j${i}`, title: `Job ${i}`, company: 'Co', location: 'Remote',
        url: `https://x.com/${i}`, foundAt: new Date().toISOString(),
      }));
      mockScrapeBoard.mockResolvedValueOnce({ board: '__preview__', jobs });

      const res = await supertest(app)
        .post('/api/setup/preview')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com', selectors: { jobCard: '.job', title: '.title', link: 'a' } });

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(10);
      expect(res.body.total).toBe(15);
    });
  });
});

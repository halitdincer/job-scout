import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';
import {
  insertSource,
  createScrapeRun,
  createScrapeRunSource,
} from '../../../src/storage/db';

// Prevent actual Playwright scraping during POST /api/runs
vi.mock('../../../server/cron/scrapeAllSources', () => ({
  scrapeForUser: vi.fn().mockResolvedValue(undefined),
}));

describe('runs routes', () => {
  let app: any;
  let db: Database;
  let cookie: string;
  let userId: string;

  beforeEach(async () => {
    ({ app, db } = await createTestApp());
    ({ cookie, userId } = await registerAndLogin(app));
  });

  afterEach(async () => {
    await db.close();
  });

  describe('GET /api/runs', () => {
    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/runs');
      expect(res.status).toBe(401);
    });

    it('returns ScrapeRun[] with correct shape', async () => {
      await createScrapeRun(db, userId, 'manual');

      const res = await supertest(app).get('/api/runs').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      const run = res.body[0];
      expect(run).toHaveProperty('triggeredBy', 'manual');
      expect(run).toHaveProperty('sourcesTotal');
      expect(run).toHaveProperty('sourcesDone');
      expect(run).toHaveProperty('jobsFound');
      expect(run).toHaveProperty('jobsNew');
      expect(run).toHaveProperty('status', 'running');
    });

    it('returns empty array when user has no runs', async () => {
      const res = await supertest(app).get('/api/runs').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/runs/:id', () => {
    it('returns run detail with sources[]', async () => {
      const sourceId = await insertSource(
        db,
        { name: 'TestSource', url: 'https://example.com', selectors: {} },
        userId
      );
      const runId = await createScrapeRun(db, userId, 'cron');
      await createScrapeRunSource(db, runId, sourceId, 'TestSource');

      const res = await supertest(app)
        .get(`/api/runs/${runId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(runId);
      expect(Array.isArray(res.body.sources)).toBe(true);
      expect(res.body.sources).toHaveLength(1);
      expect(res.body.sources[0].sourceName).toBe('TestSource');
    });

    it('404 for unknown run id', async () => {
      const res = await supertest(app)
        .get('/api/runs/00000000-0000-4000-8000-000000000000')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it("404 for another user's run", async () => {
      const { cookie: cookie2 } = await registerAndLogin(
        app,
        'user2@example.com',
        'password123'
      );
      void cookie2;
      const user2 = await db.get<{ id: string }>(
        'SELECT id FROM users WHERE email = ?',
        'user2@example.com'
      );
      const runId = await createScrapeRun(db, user2!.id, 'manual');

      const res = await supertest(app)
        .get(`/api/runs/${runId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/runs', () => {
    it('returns 202 with runId', async () => {
      const res = await supertest(app)
        .post('/api/runs')
        .set('Cookie', cookie);
      expect(res.status).toBe(202);
      expect(typeof res.body.runId).toBe('string');
    });

    it('401 — unauthenticated', async () => {
      const res = await supertest(app).post('/api/runs');
      expect(res.status).toBe(401);
    });

    it('creates a scrape_run record with status=running', async () => {
      const res = await supertest(app)
        .post('/api/runs')
        .set('Cookie', cookie);
      const runId = res.body.runId;

      const row = await db.get<{ status: string; user_id: string }>(
        'SELECT status, user_id FROM scrape_runs WHERE id = ?',
        runId
      );
      expect(row?.status).toBe('running');
      expect(row?.user_id).toBe(userId);
    });
  });
});

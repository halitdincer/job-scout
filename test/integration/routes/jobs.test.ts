import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';
import { upsertJobsForUser } from '../../../src/storage/db';
import { Job } from '../../../src/types';

function makeJobs(count: number, board = 'BoardA', prefix = ''): Job[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}job-${i}`,
    title: i % 2 === 0 ? `Engineer ${i}` : `Manager ${i}`,
    company: i % 3 === 0 ? 'Acme' : 'Beta',
    location: 'Remote',
    url: `https://example.com/${prefix}${i}`,
    foundAt: new Date().toISOString(),
    board,
  }));
}

describe('jobs routes', () => {
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

  describe('GET /api/jobs', () => {
    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/jobs');
      expect(res.status).toBe(401);
    });

    it('200 — returns paginated jobs for user', async () => {
      await upsertJobsForUser(db, makeJobs(3), 'BoardA', userId);
      const res = await supertest(app).get('/api/jobs').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('jobs');
      expect(res.body.jobs).toHaveLength(3);
      expect(res.body.total).toBe(3);
    });

    it('filters by title/company/location with ?q=', async () => {
      await upsertJobsForUser(db, makeJobs(10), 'BoardA', userId);
      const res = await supertest(app).get('/api/jobs?q=Engineer').set('Cookie', cookie);

      expect(res.status).toBe(200);
      res.body.jobs.forEach((j: { title: string }) => {
        expect(j.title.toLowerCase()).toContain('engineer');
      });
    });

    it('filters by board name with ?board=', async () => {
      await upsertJobsForUser(db, makeJobs(3, 'BoardA', 'a'), 'BoardA', userId);
      await upsertJobsForUser(db, makeJobs(2, 'BoardB', 'b'), 'BoardB', userId);

      const res = await supertest(app).get('/api/jobs?board=BoardA').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(3);
    });

    it('paginates correctly with ?limit=2&page=2', async () => {
      await upsertJobsForUser(db, makeJobs(5), 'BoardA', userId);
      const res = await supertest(app).get('/api/jobs?limit=2&page=2').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(2);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.pages).toBe(3);
    });

    it('caps limit at 100', async () => {
      const res = await supertest(app).get('/api/jobs?limit=200').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(100);
    });
  });
});

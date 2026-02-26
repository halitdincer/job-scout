import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';
import { upsertJobsForUser } from '../../../src/storage/db';
import { Job } from '../../../src/types';

function makeJobs(count: number, source = 'SourceA', prefix = ''): Job[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}job-${i}`,
    title: i % 2 === 0 ? `Engineer ${i}` : `Manager ${i}`,
    company: i % 3 === 0 ? 'Acme' : 'Beta',
    location: 'Remote',
    url: `https://example.com/${prefix}${i}`,
    foundAt: new Date().toISOString(),
    source,
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
      await upsertJobsForUser(db, makeJobs(3), 'SourceA', userId);
      const res = await supertest(app).get('/api/jobs').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('jobs');
      expect(res.body.jobs).toHaveLength(3);
      expect(res.body.total).toBe(3);
    });

    it('filters by title/company/location with ?q=', async () => {
      await upsertJobsForUser(db, makeJobs(10), 'SourceA', userId);
      const res = await supertest(app).get('/api/jobs?q=Engineer').set('Cookie', cookie);

      expect(res.status).toBe(200);
      res.body.jobs.forEach((j: { title: string }) => {
        expect(j.title.toLowerCase()).toContain('engineer');
      });
    });

    it('filters by source name with ?source=', async () => {
      await upsertJobsForUser(db, makeJobs(3, 'SourceA', 'a'), 'SourceA', userId);
      await upsertJobsForUser(db, makeJobs(2, 'SourceB', 'b'), 'SourceB', userId);

      const res = await supertest(app).get('/api/jobs?source=SourceA').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(3);
    });

    it('paginates correctly with ?limit=2&page=2', async () => {
      await upsertJobsForUser(db, makeJobs(5), 'SourceA', userId);
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

  describe('DELETE /api/jobs', () => {
    it('400 — rejects missing ids', async () => {
      const res = await supertest(app).delete('/api/jobs').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
    });

    it('200 — deletes only requested jobs for the user', async () => {
      await upsertJobsForUser(db, makeJobs(3, 'SourceA', 'del-'), 'SourceA', userId);

      const res = await supertest(app)
        .delete('/api/jobs')
        .set('Cookie', cookie)
        .send({ ids: ['del-job-0', 'del-job-1'] });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.deleted).toBe(2);

      const listRes = await supertest(app).get('/api/jobs').set('Cookie', cookie);
      expect(listRes.status).toBe(200);
      expect(listRes.body.total).toBe(1);
      expect(listRes.body.jobs[0].id).toBe('del-job-2');
    });
  });
});

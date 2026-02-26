import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

const sourcePayload = {
  name: 'My Source',
  url: 'https://jobs.example.com',
  selectors: { jobCard: '.job', title: '.title', link: 'a', location: '.loc' },
};

describe('sources routes', () => {
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

  describe('GET /api/sources', () => {
    it('200 — returns only requesting user\'s sources', async () => {
      // Add a source for the authenticated user
      await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);

      // Register another user and add their source
      const { cookie: cookie2 } = await registerAndLogin(app, 'other@example.com');
      await supertest(app).post('/api/sources').set('Cookie', cookie2).send({ ...sourcePayload, name: 'Other Source' });

      const res = await supertest(app).get('/api/sources').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('My Source');
    });

    it('excludes deleted sources from main list', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      await supertest(app).delete(`/api/sources/${createRes.body.id}`).set('Cookie', cookie);

      const res = await supertest(app).get('/api/sources').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/sources');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/sources', () => {
    it('201 — creates source', async () => {
      const res = await supertest(app)
        .post('/api/sources')
        .set('Cookie', cookie)
        .send(sourcePayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('My Source');
    });

    it('400 — missing name', async () => {
      const res = await supertest(app)
        .post('/api/sources')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com', selectors: {} });
      expect(res.status).toBe(400);
    });

    it('400 — missing url', async () => {
      const res = await supertest(app)
        .post('/api/sources')
        .set('Cookie', cookie)
        .send({ name: 'Source', selectors: {} });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/sources/:id', () => {
    it('200 — updates source', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      const id = createRes.body.id;

      const res = await supertest(app)
        .put(`/api/sources/${id}`)
        .set('Cookie', cookie)
        .send({ ...sourcePayload, name: 'Updated Source' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Source');
    });

    it('404 — wrong user\'s source', async () => {
      const { cookie: cookie2 } = await registerAndLogin(app, 'other2@example.com');
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie2).send(sourcePayload);
      const id = createRes.body.id;

      const res = await supertest(app)
        .put(`/api/sources/${id}`)
        .set('Cookie', cookie)
        .send({ ...sourcePayload, name: 'Stolen' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/sources/:id', () => {
    it('200 — soft deletes source', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      const id = createRes.body.id;

      const res = await supertest(app).delete(`/api/sources/${id}`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const getSources = await supertest(app).get('/api/sources').set('Cookie', cookie);
      expect(getSources.body).toHaveLength(0);

      const deletedRes = await supertest(app).get('/api/sources/deleted').set('Cookie', cookie);
      expect(deletedRes.status).toBe(200);
      expect(deletedRes.body).toHaveLength(1);
      expect(deletedRes.body[0].name).toBe('My Source');
      expect(deletedRes.body[0].state).toBe('deleted');
    });

    it('404 — wrong user\'s source', async () => {
      const { cookie: cookie2 } = await registerAndLogin(app, 'other3@example.com');
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie2).send(sourcePayload);
      const id = createRes.body.id;

      const res = await supertest(app).delete(`/api/sources/${id}`).set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  describe('source state actions', () => {
    it('POST /api/sources/:id/toggle flips active to inactive', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      const id = createRes.body.id;

      const res = await supertest(app).post(`/api/sources/${id}/toggle`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('inactive');
    });

    it('POST /api/sources/:id/restore restores deleted source as inactive', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      const id = createRes.body.id;
      await supertest(app).delete(`/api/sources/${id}`).set('Cookie', cookie);

      const res = await supertest(app).post(`/api/sources/${id}/restore`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('inactive');
    });

    it('POST /api/sources/:id/duplicate creates a copied source', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      const id = createRes.body.id;

      const res = await supertest(app).post(`/api/sources/${id}/duplicate`).set('Cookie', cookie);
      expect(res.status).toBe(201);
      expect(res.body.id).not.toBe(id);
      expect(res.body.name).toMatch(/My Source \(Copy\)/);
    });
  });

  describe('GET /api/sources/:id/jobs', () => {
    it('returns jobs linked to source', async () => {
      const createRes = await supertest(app).post('/api/sources').set('Cookie', cookie).send(sourcePayload);
      const id = createRes.body.id;

      await db.run(
        `INSERT INTO jobs (id, title, company, location, url, source, first_seen_at, last_seen_at, user_id, source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'j1', 'Engineer', 'Acme', 'Remote', 'https://example.com/job/1',
        'My Source', new Date().toISOString(), new Date().toISOString(), userId, id
      );

      const res = await supertest(app).get(`/api/sources/${id}/jobs`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.jobs[0].id).toBe('j1');
    });
  });
});

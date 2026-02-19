import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

const boardPayload = {
  name: 'My Board',
  url: 'https://jobs.example.com',
  selectors: { jobCard: '.job', title: '.title', link: 'a', location: '.loc' },
};

describe('boards routes', () => {
  let app: any;
  let db: Database;
  let cookie: string;

  beforeEach(async () => {
    ({ app, db } = await createTestApp());
    ({ cookie } = await registerAndLogin(app));
  });

  afterEach(async () => {
    await db.close();
  });

  describe('GET /api/boards', () => {
    it('200 — returns only requesting user\'s boards', async () => {
      // Add a board for the authenticated user
      await supertest(app).post('/api/boards').set('Cookie', cookie).send(boardPayload);

      // Register another user and add their board
      const { cookie: cookie2 } = await registerAndLogin(app, 'other@example.com');
      await supertest(app).post('/api/boards').set('Cookie', cookie2).send({ ...boardPayload, name: 'Other Board' });

      const res = await supertest(app).get('/api/boards').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('My Board');
    });

    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/boards');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/boards', () => {
    it('201 — creates board', async () => {
      const res = await supertest(app)
        .post('/api/boards')
        .set('Cookie', cookie)
        .send(boardPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('My Board');
    });

    it('400 — missing name', async () => {
      const res = await supertest(app)
        .post('/api/boards')
        .set('Cookie', cookie)
        .send({ url: 'https://example.com', selectors: {} });
      expect(res.status).toBe(400);
    });

    it('400 — missing url', async () => {
      const res = await supertest(app)
        .post('/api/boards')
        .set('Cookie', cookie)
        .send({ name: 'Board', selectors: {} });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/boards/:id', () => {
    it('200 — updates board', async () => {
      const createRes = await supertest(app).post('/api/boards').set('Cookie', cookie).send(boardPayload);
      const id = createRes.body.id;

      const res = await supertest(app)
        .put(`/api/boards/${id}`)
        .set('Cookie', cookie)
        .send({ ...boardPayload, name: 'Updated Board' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Board');
    });

    it('404 — wrong user\'s board', async () => {
      const { cookie: cookie2 } = await registerAndLogin(app, 'other2@example.com');
      const createRes = await supertest(app).post('/api/boards').set('Cookie', cookie2).send(boardPayload);
      const id = createRes.body.id;

      const res = await supertest(app)
        .put(`/api/boards/${id}`)
        .set('Cookie', cookie)
        .send({ ...boardPayload, name: 'Stolen' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/boards/:id', () => {
    it('200 — removes board', async () => {
      const createRes = await supertest(app).post('/api/boards').set('Cookie', cookie).send(boardPayload);
      const id = createRes.body.id;

      const res = await supertest(app).delete(`/api/boards/${id}`).set('Cookie', cookie);
      expect(res.status).toBe(200);

      const getBoards = await supertest(app).get('/api/boards').set('Cookie', cookie);
      expect(getBoards.body).toHaveLength(0);
    });

    it('404 — wrong user\'s board', async () => {
      const { cookie: cookie2 } = await registerAndLogin(app, 'other3@example.com');
      const createRes = await supertest(app).post('/api/boards').set('Cookie', cookie2).send(boardPayload);
      const id = createRes.body.id;

      const res = await supertest(app).delete(`/api/boards/${id}`).set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

describe('tags routes', () => {
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

  describe('GET /api/tags', () => {
    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/tags');
      expect(res.status).toBe(401);
    });

    it('returns empty array when no tags', async () => {
      const res = await supertest(app).get('/api/tags').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns created tags with boardCount', async () => {
      await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'frontend', color: '#f00' });
      const res = await supertest(app).get('/api/tags').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('frontend');
      expect(res.body[0].color).toBe('#f00');
      expect(res.body[0]).toHaveProperty('boardCount');
    });
  });

  describe('POST /api/tags', () => {
    it('400 — missing name', async () => {
      const res = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ color: '#abc' });
      expect(res.status).toBe(400);
    });

    it('201 — creates tag and returns it', async () => {
      const res = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'backend', color: '#0f0' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('backend');
      expect(res.body.color).toBe('#0f0');
      expect(res.body.id).toBeDefined();
    });

    it('uses default color when color omitted', async () => {
      const res = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'default-color' });
      expect(res.status).toBe(201);
      expect(res.body.color).toBe('#6366f1');
    });

    it('409 — duplicate name for same user', async () => {
      await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'dup' });
      const res = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'dup' });
      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/tags/:id', () => {
    it('400 — missing name', async () => {
      const create = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'edit-me' });
      const res = await supertest(app).put(`/api/tags/${create.body.id}`).set('Cookie', cookie).send({ color: '#abc' });
      expect(res.status).toBe(400);
    });

    it('updates name and color', async () => {
      const create = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'old-name', color: '#000' });
      const res = await supertest(app)
        .put(`/api/tags/${create.body.id}`)
        .set('Cookie', cookie)
        .send({ name: 'new-name', color: '#fff' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('new-name');
      expect(res.body.color).toBe('#fff');
    });

    it('404 — non-existent tag id', async () => {
      const res = await supertest(app).put('/api/tags/nonexistent').set('Cookie', cookie).send({ name: 'x', color: '#000' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('deletes a tag and returns ok', async () => {
      const create = await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'to-delete' });
      const res = await supertest(app).delete(`/api/tags/${create.body.id}`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const list = await supertest(app).get('/api/tags').set('Cookie', cookie);
      expect(list.body).toHaveLength(0);
    });
  });

  it('user isolation — tags are not visible to another user', async () => {
    await supertest(app).post('/api/tags').set('Cookie', cookie).send({ name: 'user1-tag' });

    const { cookie: cookie2 } = await registerAndLogin(app, 'other@example.com', 'password123');
    const res = await supertest(app).get('/api/tags').set('Cookie', cookie2);
    expect(res.body).toHaveLength(0);
  });
});

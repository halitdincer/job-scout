import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

describe('companies routes', () => {
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

  describe('GET /api/companies', () => {
    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/companies');
      expect(res.status).toBe(401);
    });

    it('returns empty array when no companies', async () => {
      const res = await supertest(app).get('/api/companies').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all companies with boardCount and jobCount', async () => {
      await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'Acme' });
      const res = await supertest(app).get('/api/companies').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Acme');
      expect(res.body[0]).toHaveProperty('boardCount');
      expect(res.body[0]).toHaveProperty('jobCount');
    });

    it('?q= filters by name (search mode)', async () => {
      await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'Acme Corp' });
      await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'Beta LLC' });

      const res = await supertest(app).get('/api/companies?q=acme').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.some((c: any) => c.name === 'Acme Corp')).toBe(true);
      expect(res.body.every((c: any) => c.name !== 'Beta LLC')).toBe(true);
    });
  });

  describe('POST /api/companies', () => {
    it('400 — missing name', async () => {
      const res = await supertest(app).post('/api/companies').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
    });

    it('201 — creates company and returns it', async () => {
      const res = await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'NewCo' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('NewCo');
      expect(res.body.id).toBeDefined();
    });

    it('returns existing company if name already exists (upsert)', async () => {
      const first = await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'Dup' });
      const second = await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'Dup' });
      expect(second.status).toBe(201);
      expect(second.body.id).toBe(first.body.id);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('deletes a company and returns ok', async () => {
      const create = await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'ToDelete' });
      const res = await supertest(app).delete(`/api/companies/${create.body.id}`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const list = await supertest(app).get('/api/companies').set('Cookie', cookie);
      expect(list.body).toHaveLength(0);
    });

    it('401 — unauthenticated', async () => {
      const res = await supertest(app).delete('/api/companies/some-id');
      expect(res.status).toBe(401);
    });
  });

  it('user isolation — companies not visible to another user', async () => {
    await supertest(app).post('/api/companies').set('Cookie', cookie).send({ name: 'User1Co' });
    const { cookie: cookie2 } = await registerAndLogin(app, 'other@example.com', 'password123');
    const res = await supertest(app).get('/api/companies').set('Cookie', cookie2);
    expect(res.body).toHaveLength(0);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

describe('auth routes', () => {
  let app: any;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await createTestApp());
  });

  afterEach(async () => {
    await db.close();
  });

  describe('POST /api/auth/register', () => {
    it('201 — returns id and email', async () => {
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('new@example.com');
    });

    it('409 — duplicate email', async () => {
      await supertest(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'password123' });
      const res = await supertest(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'password123' });
      expect(res.status).toBe(409);
    });

    it('400 — password shorter than 8 chars', async () => {
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ email: 'short@example.com', password: 'abc' });
      expect(res.status).toBe(400);
    });

    it('400 — missing email', async () => {
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('400 — missing password', async () => {
      const res = await supertest(app)
        .post('/api/auth/register')
        .send({ email: 'x@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await supertest(app).post('/api/auth/register').send({ email: 'login@example.com', password: 'password123' });
    });

    it('200 — sets token cookie', async () => {
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as string[] | string | undefined;
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : (cookies ?? '');
      expect(cookieStr).toContain('token=');
    });

    it('401 — wrong password', async () => {
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('401 — unknown email', async () => {
      const res = await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('200 — returns authenticated: true and id when logged in', async () => {
      const { cookie, userId } = await registerAndLogin(app);
      const res = await supertest(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.id).toBe(userId);
    });

    it('returns authenticated: false with no cookie', async () => {
      const res = await supertest(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('200 — clears cookie', async () => {
      const { cookie } = await registerAndLogin(app);
      const res = await supertest(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'] as string[] | string | undefined;
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie ?? '');
      expect(cookieStr).toContain('token=;');
    });
  });
});

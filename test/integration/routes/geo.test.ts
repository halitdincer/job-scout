import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';

describe('geo routes', () => {
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

  describe('GET /api/geo/search', () => {
    it('401 — unauthenticated', async () => {
      const res = await supertest(app).get('/api/geo/search?q=Canada');
      expect(res.status).toBe(401);
    });

    it('returns empty array for missing q', async () => {
      const res = await supertest(app).get('/api/geo/search').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns GeoResult array for ?q=Canada', async () => {
      const res = await supertest(app).get('/api/geo/search?q=Canada').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const canada = res.body.find((r: any) => r.key === 'CA');
      expect(canada).toBeDefined();
      expect(canada.type).toBe('country');
    });

    it('each result has key, label, type', async () => {
      const res = await supertest(app).get('/api/geo/search?q=Toronto').set('Cookie', cookie);
      expect(res.status).toBe(200);
      for (const r of res.body) {
        expect(r).toHaveProperty('key');
        expect(r).toHaveProperty('label');
        expect(r).toHaveProperty('type');
      }
    });

    it('respects ?limit= parameter', async () => {
      const res = await supertest(app).get('/api/geo/search?q=a&limit=3').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(3);
    });

    it('caps limit at 20', async () => {
      const res = await supertest(app).get('/api/geo/search?q=a&limit=100').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(20);
    });
  });
});

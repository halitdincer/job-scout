import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { Database } from 'sqlite';
import { createTestApp, registerAndLogin } from '../helpers';
import { insertBoard, createRun, finishRun } from '../../../src/storage/db';

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

    it('200 — returns runs for user', async () => {
      const boardId = await insertBoard(
        db,
        { name: 'TestBoard', url: 'https://example.com', selectors: {} },
        userId
      );
      const runId = await createRun(db, boardId, userId);
      await finishRun(db, runId, 5, 2, 'success');

      const res = await supertest(app).get('/api/runs').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('success');
    });

    it('filters by boardId with ?boardId=', async () => {
      const boardId1 = await insertBoard(
        db,
        { name: 'Board1', url: 'https://example.com', selectors: {} },
        userId
      );
      const boardId2 = await insertBoard(
        db,
        { name: 'Board2', url: 'https://example.com', selectors: {} },
        userId
      );

      const run1 = await createRun(db, boardId1, userId);
      const run2 = await createRun(db, boardId2, userId);
      await finishRun(db, run1, 0, 0, 'success');
      await finishRun(db, run2, 0, 0, 'success');

      const res = await supertest(app).get(`/api/runs?boardId=${boardId1}`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].boardId).toBe(boardId1);
    });
  });
});

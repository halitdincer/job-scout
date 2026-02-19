import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'sqlite';
import {
  openDb,
  upsertJobs,
  upsertJobsForUser,
  insertBoard,
  loadBoardsForUser,
  getBoardById,
  deleteBoardById,
  createRun,
  finishRun,
  listRunsForUser,
} from '../../src/storage/db';
import { Job } from '../../src/types';

function makeJob(id: string, url?: string): Job {
  return {
    id,
    title: `Title ${id}`,
    company: 'Acme',
    location: 'Remote',
    url: url ?? `https://example.com/${id}`,
    foundAt: new Date().toISOString(),
  };
}

function makeBoard() {
  return {
    name: 'Test Board',
    url: 'https://example.com/jobs',
    selectors: { jobCard: '.job', title: '.title', link: 'a', location: '.loc' },
  };
}

describe('db integration', () => {
  let db: Database;

  beforeEach(async () => {
    db = await openDb({ dbPath: ':memory:' });
    // Insert test users
    await db.run(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      'u1', 'user1@test.com', 'hash1', new Date().toISOString()
    );
    await db.run(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      'u2', 'user2@test.com', 'hash2', new Date().toISOString()
    );
  });

  afterEach(async () => {
    await db.close();
  });

  describe('upsertJobsForUser', () => {
    it('isolates job results by userId — user2 cannot see user1 jobs via query', async () => {
      // Each user has different jobs (different IDs)
      const job1 = makeJob('j-u1-1', 'https://example.com/job/u1/1');
      const job2 = makeJob('j-u2-1', 'https://example.com/job/u2/1');

      await upsertJobsForUser(db, [job1], 'BoardA', 'u1');
      await upsertJobsForUser(db, [job2], 'BoardA', 'u2');

      // Each user only sees their own jobs when queried via user_id
      const u1Jobs = await db.all<{ id: string }[]>('SELECT id FROM jobs WHERE user_id = ?', 'u1');
      const u2Jobs = await db.all<{ id: string }[]>('SELECT id FROM jobs WHERE user_id = ?', 'u2');
      expect(u1Jobs.map((r) => r.id)).toContain('j-u1-1');
      expect(u2Jobs.map((r) => r.id)).toContain('j-u2-1');
      expect(u1Jobs.map((r) => r.id)).not.toContain('j-u2-1');
    });

    it('returns only new jobs (existing job returns empty)', async () => {
      const job = makeJob('j2');
      const first = await upsertJobsForUser(db, [job], 'BoardA', 'u1');
      expect(first).toHaveLength(1);

      const second = await upsertJobsForUser(db, [job], 'BoardA', 'u1');
      expect(second).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const result = await upsertJobsForUser(db, [], 'BoardA', 'u1');
      expect(result).toHaveLength(0);
    });
  });

  describe('boards CRUD', () => {
    it('insertBoard / loadBoardsForUser / getBoardById round-trip', async () => {
      const id = await insertBoard(db, makeBoard(), 'u1');
      expect(typeof id).toBe('string');

      const boards = await loadBoardsForUser(db, 'u1');
      expect(boards).toHaveLength(1);
      expect(boards[0].name).toBe('Test Board');

      const board = await getBoardById(db, id, 'u1');
      expect(board).not.toBeNull();
      expect(board.id).toBe(id);
    });

    it('getBoardById returns null for wrong userId', async () => {
      const id = await insertBoard(db, makeBoard(), 'u1');
      const result = await getBoardById(db, id, 'u2');
      expect(result).toBeNull();
    });

    it('deleteBoardById removes board and returns true', async () => {
      const id = await insertBoard(db, makeBoard(), 'u1');
      const deleted = await deleteBoardById(db, id, 'u1');
      expect(deleted).toBe(true);

      const boards = await loadBoardsForUser(db, 'u1');
      expect(boards).toHaveLength(0);
    });

    it('deleteBoardById returns false for wrong userId', async () => {
      const id = await insertBoard(db, makeBoard(), 'u1');
      const deleted = await deleteBoardById(db, id, 'u2');
      expect(deleted).toBe(false);
    });
  });

  describe('runs', () => {
    let boardId: string;

    beforeEach(async () => {
      boardId = await insertBoard(db, makeBoard(), 'u1');
    });

    it('createRun + finishRun success + listRunsForUser', async () => {
      const runId = await createRun(db, boardId, 'u1');
      await finishRun(db, runId, 10, 5, 'success');

      const runs = await listRunsForUser(db, 'u1');
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe('success');
      expect(runs[0].jobsFound).toBe(10);
      expect(runs[0].jobsNew).toBe(5);
      expect(runs[0].finishedAt).not.toBeNull();
    });

    it('finishRun error persists error_msg', async () => {
      const runId = await createRun(db, boardId, 'u1');
      await finishRun(db, runId, 0, 0, 'error', 'Something went wrong');

      const runs = await listRunsForUser(db, 'u1');
      expect(runs[0].status).toBe('error');
      expect(runs[0].errorMsg).toBe('Something went wrong');
    });

    it('listRunsForUser with boardId filter returns subset', async () => {
      const boardId2 = await insertBoard(db, { ...makeBoard(), name: 'Board2' }, 'u1');
      const run1 = await createRun(db, boardId, 'u1');
      const run2 = await createRun(db, boardId2, 'u1');
      await finishRun(db, run1, 0, 0, 'success');
      await finishRun(db, run2, 0, 0, 'success');

      const filtered = await listRunsForUser(db, 'u1', boardId);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].boardId).toBe(boardId);
    });
  });
});

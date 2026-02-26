import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'sqlite';
import {
  openDb,
  upsertJobsForUser,
  insertBoard,
  loadBoardsForUser,
  getBoardById,
  deleteBoardById,
  createScrapeRun,
  updateScrapeRunProgress,
  finishScrapeRun,
  createScrapeRunBoard,
  finishScrapeRunBoard,
  listScrapeRunsForUser,
  getScrapeRunDetail,
  listCompaniesForUser,
  upsertCompany,
  deleteCompany,
  searchCompanies,
  listTagsForUser,
  createTag,
  updateTag,
  deleteTag,
  setBoardTags,
  listJobsForUser,
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

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Board',
    url: 'https://example.com/jobs',
    selectors: { jobCard: '.job', title: '.title', link: 'a', location: '.loc' },
    ...overrides,
  };
}

describe('db integration', () => {
  let db: Database;

  beforeEach(async () => {
    db = await openDb({ dbPath: ':memory:' });
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
    it('isolates job results by userId', async () => {
      const job1 = makeJob('j-u1-1', 'https://example.com/job/u1/1');
      const job2 = makeJob('j-u2-1', 'https://example.com/job/u2/1');

      await upsertJobsForUser(db, [job1], 'BoardA', 'u1');
      await upsertJobsForUser(db, [job2], 'BoardA', 'u2');

      const u1Jobs = await db.all<{ id: string }[]>('SELECT id FROM jobs WHERE user_id = ?', 'u1');
      const u2Jobs = await db.all<{ id: string }[]>('SELECT id FROM jobs WHERE user_id = ?', 'u2');
      expect(u1Jobs.map((r) => r.id)).toContain('j-u1-1');
      expect(u2Jobs.map((r) => r.id)).toContain('j-u2-1');
      expect(u1Jobs.map((r) => r.id)).not.toContain('j-u2-1');
    });

    it('returns only new jobs on second upsert', async () => {
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

  describe('scrape sessions', () => {
    it('createScrapeRun returns a string ID and creates row', async () => {
      const id = await createScrapeRun(db, 'u1', 'manual');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      const row = await db.get('SELECT * FROM scrape_runs WHERE id = ?', id);
      expect(row).not.toBeNull();
    });

    it('createScrapeRun default status is running', async () => {
      const id = await createScrapeRun(db, 'u1', 'cron');
      const row = await db.get<{ status: string }>('SELECT status FROM scrape_runs WHERE id = ?', id);
      expect(row?.status).toBe('running');
    });

    it('updateScrapeRunProgress updates counts', async () => {
      const id = await createScrapeRun(db, 'u1', 'cron');
      await updateScrapeRunProgress(db, id, 1, 5, 2);

      const row = await db.get<{ boards_done: number; jobs_found: number; jobs_new: number }>(
        'SELECT boards_done, jobs_found, jobs_new FROM scrape_runs WHERE id = ?', id
      );
      expect(row?.boards_done).toBe(1);
      expect(row?.jobs_found).toBe(5);
      expect(row?.jobs_new).toBe(2);
    });

    it('finishScrapeRun sets status=success and finished_at', async () => {
      const id = await createScrapeRun(db, 'u1', 'cron');
      await finishScrapeRun(db, id, 'success');

      const row = await db.get<{ status: string; finished_at: string | null }>(
        'SELECT status, finished_at FROM scrape_runs WHERE id = ?', id
      );
      expect(row?.status).toBe('success');
      expect(row?.finished_at).not.toBeNull();
    });

    it('finishScrapeRun sets status=partial', async () => {
      const id = await createScrapeRun(db, 'u1', 'cron');
      await finishScrapeRun(db, id, 'partial');

      const row = await db.get<{ status: string }>('SELECT status FROM scrape_runs WHERE id = ?', id);
      expect(row?.status).toBe('partial');
    });

    it('finishScrapeRun sets status=error', async () => {
      const id = await createScrapeRun(db, 'u1', 'cron');
      await finishScrapeRun(db, id, 'error');

      const row = await db.get<{ status: string }>('SELECT status FROM scrape_runs WHERE id = ?', id);
      expect(row?.status).toBe('error');
    });

    it('createScrapeRunBoard returns ID with status=running', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const boardRunId = await createScrapeRunBoard(db, runId, 'b1', 'My Board');

      expect(typeof boardRunId).toBe('string');
      const row = await db.get<{ status: string }>(
        'SELECT status FROM scrape_run_boards WHERE id = ?', boardRunId
      );
      expect(row?.status).toBe('running');
    });

    it('finishScrapeRunBoard updates counts and finished_at on success', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const boardRunId = await createScrapeRunBoard(db, runId, 'b1', 'My Board');
      await finishScrapeRunBoard(db, boardRunId, 'success', 10, 4);

      const row = await db.get<{
        status: string; jobs_found: number; jobs_new: number; finished_at: string | null;
      }>('SELECT status, jobs_found, jobs_new, finished_at FROM scrape_run_boards WHERE id = ?', boardRunId);
      expect(row?.status).toBe('success');
      expect(row?.jobs_found).toBe(10);
      expect(row?.jobs_new).toBe(4);
      expect(row?.finished_at).not.toBeNull();
    });

    it('finishScrapeRunBoard persists error_msg on error', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const boardRunId = await createScrapeRunBoard(db, runId, 'b1', 'My Board');
      await finishScrapeRunBoard(db, boardRunId, 'error', 0, 0, 'Timeout exceeded');

      const row = await db.get<{ status: string; error_msg: string | null }>(
        'SELECT status, error_msg FROM scrape_run_boards WHERE id = ?', boardRunId
      );
      expect(row?.status).toBe('error');
      expect(row?.error_msg).toBe('Timeout exceeded');
    });

    it('listScrapeRunsForUser returns runs ordered by started_at DESC', async () => {
      await createScrapeRun(db, 'u1', 'cron');
      await new Promise((r) => setTimeout(r, 5)); // ensure different timestamps
      await createScrapeRun(db, 'u1', 'manual');

      const runs = await listScrapeRunsForUser(db, 'u1');
      expect(runs).toHaveLength(2);
      // Most recent first
      expect(runs[0].triggeredBy).toBe('manual');
      expect(runs[1].triggeredBy).toBe('cron');
    });

    it('listScrapeRunsForUser respects limit param', async () => {
      for (let i = 0; i < 5; i++) await createScrapeRun(db, 'u1', 'cron');

      const runs = await listScrapeRunsForUser(db, 'u1', 2);
      expect(runs).toHaveLength(2);
    });

    it('listScrapeRunsForUser only returns own user runs', async () => {
      await createScrapeRun(db, 'u1', 'cron');
      await createScrapeRun(db, 'u2', 'cron');

      const u1Runs = await listScrapeRunsForUser(db, 'u1');
      expect(u1Runs).toHaveLength(1);
      expect(u1Runs[0].userId).toBe('u1');
    });

    it('getScrapeRunDetail returns run with boards[]', async () => {
      const runId = await createScrapeRun(db, 'u1', 'manual');
      const boardRunId = await createScrapeRunBoard(db, runId, 'b1', 'Acme Jobs');
      await finishScrapeRunBoard(db, boardRunId, 'success', 10, 3);
      await finishScrapeRun(db, runId, 'success');

      const detail = await getScrapeRunDetail(db, runId, 'u1');
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(runId);
      expect(detail!.boards).toHaveLength(1);
      expect(detail!.boards[0].boardName).toBe('Acme Jobs');
      expect(detail!.boards[0].jobsFound).toBe(10);
    });

    it('getScrapeRunDetail returns null for wrong userId', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const result = await getScrapeRunDetail(db, runId, 'u2');
      expect(result).toBeNull();
    });

    it('getScrapeRunDetail returns null for unknown id', async () => {
      const result = await getScrapeRunDetail(
        db, '00000000-0000-4000-8000-000000000000', 'u1'
      );
      expect(result).toBeNull();
    });

    it('loadBoardsForUser includes lastRun from most recent board run', async () => {
      const boardId = await insertBoard(db, makeBoard(), 'u1');
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const runBoardId = await createScrapeRunBoard(db, runId, boardId, 'Test Board');
      await finishScrapeRunBoard(db, runBoardId, 'success', 5, 2);

      const boards = await loadBoardsForUser(db, 'u1');
      expect(boards).toHaveLength(1);
      expect(boards[0].lastRun).not.toBeNull();
      expect(boards[0].lastRun.status).toBe('success');
    });

    it('loadBoardsForUser has lastRun=null when no runs exist', async () => {
      await insertBoard(db, makeBoard(), 'u1');

      const boards = await loadBoardsForUser(db, 'u1');
      expect(boards[0].lastRun).toBeNull();
    });

    it('loadBoardsForUser lastRun uses most recent, not oldest', async () => {
      const boardId = await insertBoard(db, makeBoard(), 'u1');

      // First run — error
      const runId1 = await createScrapeRun(db, 'u1', 'cron');
      const rb1 = await createScrapeRunBoard(db, runId1, boardId, 'Test Board');
      await finishScrapeRunBoard(db, rb1, 'error', 0, 0, 'fail');
      await finishScrapeRun(db, runId1, 'error');

      await new Promise((r) => setTimeout(r, 5));

      // Second run — success
      const runId2 = await createScrapeRun(db, 'u1', 'cron');
      const rb2 = await createScrapeRunBoard(db, runId2, boardId, 'Test Board');
      await finishScrapeRunBoard(db, rb2, 'success', 5, 2);
      await finishScrapeRun(db, runId2, 'success');

      const boards = await loadBoardsForUser(db, 'u1');
      // Most recent run was 'success'
      expect(boards[0].lastRun.status).toBe('success');
    });
  });

  describe('companies', () => {
    it('upsertCompany creates a new company and returns id', async () => {
      const id = await upsertCompany(db, 'u1', 'Acme Corp');
      expect(id).toBeTruthy();
    });

    it('upsertCompany returns existing id for duplicate name', async () => {
      const id1 = await upsertCompany(db, 'u1', 'Same');
      const id2 = await upsertCompany(db, 'u1', 'Same');
      expect(id1).toBe(id2);
    });

    it('listCompaniesForUser returns created companies', async () => {
      await upsertCompany(db, 'u1', 'Alpha');
      await upsertCompany(db, 'u1', 'Beta');
      const list = await listCompaniesForUser(db, 'u1');
      expect(list.map((c) => c.name).sort()).toEqual(['Alpha', 'Beta']);
      expect(list[0]).toHaveProperty('boardCount');
      expect(list[0]).toHaveProperty('jobCount');
    });

    it('listCompaniesForUser is user-isolated', async () => {
      await upsertCompany(db, 'u1', 'U1Co');
      const list = await listCompaniesForUser(db, 'u2');
      expect(list).toHaveLength(0);
    });

    it('deleteCompany removes it from the list', async () => {
      const id = await upsertCompany(db, 'u1', 'ToDelete');
      await deleteCompany(db, 'u1', id);
      const list = await listCompaniesForUser(db, 'u1');
      expect(list).toHaveLength(0);
    });

    it('searchCompanies filters by name substring', async () => {
      await upsertCompany(db, 'u1', 'Acme Corp');
      await upsertCompany(db, 'u1', 'Beta LLC');
      const results = await searchCompanies(db, 'u1', 'acme');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Acme Corp');
    });
  });

  describe('tags', () => {
    it('createTag creates a tag and listTagsForUser returns it', async () => {
      const id = await createTag(db, 'u1', 'frontend', '#ff0000');
      const tags = await listTagsForUser(db, 'u1');
      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe(id);
      expect(tags[0].name).toBe('frontend');
      expect(tags[0].color).toBe('#ff0000');
      expect(tags[0].boardCount).toBe(0);
    });

    it('updateTag changes name and color', async () => {
      const id = await createTag(db, 'u1', 'old', '#000');
      await updateTag(db, 'u1', id, 'new', '#fff');
      const tags = await listTagsForUser(db, 'u1');
      expect(tags[0].name).toBe('new');
      expect(tags[0].color).toBe('#fff');
    });

    it('deleteTag removes the tag', async () => {
      const id = await createTag(db, 'u1', 'gone', '#abc');
      await deleteTag(db, 'u1', id);
      expect(await listTagsForUser(db, 'u1')).toHaveLength(0);
    });

    it('listTagsForUser is user-isolated', async () => {
      await createTag(db, 'u1', 'u1tag', '#111');
      expect(await listTagsForUser(db, 'u2')).toHaveLength(0);
    });

    it('setBoardTags assigns tags to a board', async () => {
      const boardId = await insertBoard(db, makeBoard(), 'u1');
      const tagId = await createTag(db, 'u1', 'react', '#00f');
      await setBoardTags(db, boardId, 'u1', [tagId]);

      const boards = await loadBoardsForUser(db, 'u1');
      expect(boards[0].tags).toHaveLength(1);
      expect(boards[0].tags[0].name).toBe('react');
    });

    it('setBoardTags replaces existing tags', async () => {
      const boardId = await insertBoard(db, makeBoard(), 'u1');
      const tag1 = await createTag(db, 'u1', 'tag1', '#111');
      const tag2 = await createTag(db, 'u1', 'tag2', '#222');
      await setBoardTags(db, boardId, 'u1', [tag1]);
      await setBoardTags(db, boardId, 'u1', [tag2]);

      const boards = await loadBoardsForUser(db, 'u1');
      expect(boards[0].tags).toHaveLength(1);
      expect(boards[0].tags[0].name).toBe('tag2');
    });

    it('boardCount reflects how many boards use a tag', async () => {
      const tagId = await createTag(db, 'u1', 'shared', '#abc');
      const b1 = await insertBoard(db, makeBoard({ name: 'B1' }), 'u1');
      const b2 = await insertBoard(db, makeBoard({ name: 'B2' }), 'u1');
      await setBoardTags(db, b1, 'u1', [tagId]);
      await setBoardTags(db, b2, 'u1', [tagId]);
      const tags = await listTagsForUser(db, 'u1');
      expect(tags[0].boardCount).toBe(2);
    });
  });

  describe('listJobsForUser', () => {
    it('returns all jobs for user when no filters', async () => {
      const boardId = await insertBoard(db, makeBoard(), 'u1');
      await upsertJobsForUser(db, [makeJob('j1'), makeJob('j2')], 'Test Board', 'u1');
      const { jobs, total } = await listJobsForUser(db, 'u1');
      expect(total).toBe(2);
      expect(jobs).toHaveLength(2);
    });

    it('filters by boardIds', async () => {
      const b1 = await insertBoard(db, makeBoard({ name: 'B1' }), 'u1');
      await insertBoard(db, makeBoard({ name: 'B2' }), 'u1');
      await upsertJobsForUser(db, [makeJob('j1')], 'B1', 'u1');
      await upsertJobsForUser(db, [makeJob('j2')], 'B2', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { boardIds: [b1] });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].board).toBe('B1');
    });

    it('filters by tagIds', async () => {
      const b1 = await insertBoard(db, makeBoard({ name: 'Tagged' }), 'u1');
      await insertBoard(db, makeBoard({ name: 'Untagged' }), 'u1');
      const tagId = await createTag(db, 'u1', 'special', '#abc');
      await setBoardTags(db, b1, 'u1', [tagId]);
      await upsertJobsForUser(db, [makeJob('j1')], 'Tagged', 'u1');
      await upsertJobsForUser(db, [makeJob('j2')], 'Untagged', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { tagIds: [tagId] });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].board).toBe('Tagged');
    });

    it('filters by locationKey prefix', async () => {
      await insertBoard(db, makeBoard({ name: 'CA Board', locationKey: 'CA-ON-Toronto' }), 'u1');
      await insertBoard(db, makeBoard({ name: 'US Board', locationKey: 'US-NY-New York' }), 'u1');
      await upsertJobsForUser(db, [makeJob('j1')], 'CA Board', 'u1');
      await upsertJobsForUser(db, [makeJob('j2')], 'US Board', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { locationKey: 'CA' });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].board).toBe('CA Board');
    });

    it('filters by text query q', async () => {
      await insertBoard(db, makeBoard(), 'u1');
      await upsertJobsForUser(db, [
        { ...makeJob('j1'), title: 'Senior Engineer' },
        { ...makeJob('j2'), title: 'Product Manager' },
      ], 'Test Board', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { q: 'engineer' });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].board).toBeDefined();
    });

    it('paginates correctly', async () => {
      await insertBoard(db, makeBoard(), 'u1');
      await upsertJobsForUser(db, [makeJob('j1'), makeJob('j2'), makeJob('j3')], 'Test Board', 'u1');
      const { jobs, total } = await listJobsForUser(db, 'u1', { page: 2, limit: 2 });
      expect(total).toBe(3);
      expect(jobs).toHaveLength(1);
    });
  });
});

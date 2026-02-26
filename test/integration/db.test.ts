import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'sqlite';
import {
  openDb,
  upsertJobsForUser,
  insertSource,
  loadSourcesForUser,
  getSourceById,
  deleteSourceById,
  createScrapeRun,
  updateScrapeRunProgress,
  finishScrapeRun,
  createScrapeRunSource,
  finishScrapeRunSource,
  listScrapeRunsForUser,
  getScrapeRunDetail,
  listTagsForUser,
  createTag,
  updateTag,
  deleteTag,
  setSourceTags,
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

function makeSource(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Source',
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

      await upsertJobsForUser(db, [job1], 'SourceA', 'u1');
      await upsertJobsForUser(db, [job2], 'SourceA', 'u2');

      const u1Jobs = await db.all<{ id: string }[]>('SELECT id FROM jobs WHERE user_id = ?', 'u1');
      const u2Jobs = await db.all<{ id: string }[]>('SELECT id FROM jobs WHERE user_id = ?', 'u2');
      expect(u1Jobs.map((r) => r.id)).toContain('j-u1-1');
      expect(u2Jobs.map((r) => r.id)).toContain('j-u2-1');
      expect(u1Jobs.map((r) => r.id)).not.toContain('j-u2-1');
    });

    it('returns only new jobs on second upsert', async () => {
      const job = makeJob('j2');
      const first = await upsertJobsForUser(db, [job], 'SourceA', 'u1');
      expect(first).toHaveLength(1);

      const second = await upsertJobsForUser(db, [job], 'SourceA', 'u1');
      expect(second).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const result = await upsertJobsForUser(db, [], 'SourceA', 'u1');
      expect(result).toHaveLength(0);
    });
  });

  describe('sources CRUD', () => {
    it('insertSource / loadSourcesForUser / getSourceById round-trip', async () => {
      const id = await insertSource(db, makeSource(), 'u1');
      expect(typeof id).toBe('string');

      const sources = await loadSourcesForUser(db, 'u1');
      expect(sources).toHaveLength(1);
      expect(sources[0].name).toBe('Test Source');

      const source = await getSourceById(db, id, 'u1');
      expect(source).not.toBeNull();
      expect(source.id).toBe(id);
    });

    it('getSourceById returns null for wrong userId', async () => {
      const id = await insertSource(db, makeSource(), 'u1');
      const result = await getSourceById(db, id, 'u2');
      expect(result).toBeNull();
    });

    it('deleteSourceById soft-deletes source and returns true', async () => {
      const id = await insertSource(db, makeSource(), 'u1');
      const deleted = await deleteSourceById(db, id, 'u1');
      expect(deleted).toBe(true);

      const row = await db.get<{ state: string; deleted_at: string | null }>(
        'SELECT state, deleted_at FROM sources WHERE id = ? AND user_id = ?',
        id,
        'u1'
      );
      expect(row?.state).toBe('deleted');
      expect(row?.deleted_at).not.toBeNull();
    });

    it('deleteSourceById returns false for wrong userId', async () => {
      const id = await insertSource(db, makeSource(), 'u1');
      const deleted = await deleteSourceById(db, id, 'u2');
      expect(deleted).toBe(false);
    });

    it('new sources default to active state', async () => {
      const id = await insertSource(db, makeSource(), 'u1');
      const row = await db.get<{ state: string }>('SELECT state FROM sources WHERE id = ?', id);
      expect(row?.state).toBe('active');
    });

    it('deleted sources can still be edited', async () => {
      const id = await insertSource(db, makeSource(), 'u1');
      await deleteSourceById(db, id, 'u1');

      const result = await db.run(
        'UPDATE sources SET name = ? WHERE id = ? AND user_id = ?',
        'Edited While Deleted',
        id,
        'u1'
      );
      expect((result.changes ?? 0) > 0).toBe(true);

      const row = await db.get<{ name: string }>('SELECT name FROM sources WHERE id = ?', id);
      expect(row?.name).toBe('Edited While Deleted');
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

      const row = await db.get<{ sources_done: number; jobs_found: number; jobs_new: number }>(
        'SELECT sources_done, jobs_found, jobs_new FROM scrape_runs WHERE id = ?', id
      );
      expect(row?.sources_done).toBe(1);
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

    it('createScrapeRunSource returns ID with status=running', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const sourceRunId = await createScrapeRunSource(db, runId, 'b1', 'My Source');

      expect(typeof sourceRunId).toBe('string');
      const row = await db.get<{ status: string }>(
        'SELECT status FROM scrape_run_sources WHERE id = ?', sourceRunId
      );
      expect(row?.status).toBe('running');
    });

    it('finishScrapeRunSource updates counts and finished_at on success', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const sourceRunId = await createScrapeRunSource(db, runId, 'b1', 'My Source');
      await finishScrapeRunSource(db, sourceRunId, 'success', 10, 4);

      const row = await db.get<{
        status: string; jobs_found: number; jobs_new: number; finished_at: string | null;
      }>('SELECT status, jobs_found, jobs_new, finished_at FROM scrape_run_sources WHERE id = ?', sourceRunId);
      expect(row?.status).toBe('success');
      expect(row?.jobs_found).toBe(10);
      expect(row?.jobs_new).toBe(4);
      expect(row?.finished_at).not.toBeNull();
    });

    it('finishScrapeRunSource persists error_msg on error', async () => {
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const sourceRunId = await createScrapeRunSource(db, runId, 'b1', 'My Source');
      await finishScrapeRunSource(db, sourceRunId, 'error', 0, 0, 'Timeout exceeded');

      const row = await db.get<{ status: string; error_msg: string | null }>(
        'SELECT status, error_msg FROM scrape_run_sources WHERE id = ?', sourceRunId
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

    it('getScrapeRunDetail returns run with sources[]', async () => {
      const runId = await createScrapeRun(db, 'u1', 'manual');
      const sourceRunId = await createScrapeRunSource(db, runId, 'b1', 'Acme Jobs');
      await finishScrapeRunSource(db, sourceRunId, 'success', 10, 3);
      await finishScrapeRun(db, runId, 'success');

      const detail = await getScrapeRunDetail(db, runId, 'u1');
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(runId);
      expect(detail!.sources).toHaveLength(1);
      expect(detail!.sources[0].sourceName).toBe('Acme Jobs');
      expect(detail!.sources[0].jobsFound).toBe(10);
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

    it('loadSourcesForUser includes lastRun from most recent source run', async () => {
      const sourceId = await insertSource(db, makeSource(), 'u1');
      const runId = await createScrapeRun(db, 'u1', 'cron');
      const runSourceId = await createScrapeRunSource(db, runId, sourceId, 'Test Source');
      await finishScrapeRunSource(db, runSourceId, 'success', 5, 2);

      const sources = await loadSourcesForUser(db, 'u1');
      expect(sources).toHaveLength(1);
      expect(sources[0].lastRun).not.toBeNull();
      expect(sources[0].lastRun.status).toBe('success');
    });

    it('loadSourcesForUser has lastRun=null when no runs exist', async () => {
      await insertSource(db, makeSource(), 'u1');

      const sources = await loadSourcesForUser(db, 'u1');
      expect(sources[0].lastRun).toBeNull();
    });

    it('loadSourcesForUser lastRun uses most recent, not oldest', async () => {
      const sourceId = await insertSource(db, makeSource(), 'u1');

      // First run — error
      const runId1 = await createScrapeRun(db, 'u1', 'cron');
      const rb1 = await createScrapeRunSource(db, runId1, sourceId, 'Test Source');
      await finishScrapeRunSource(db, rb1, 'error', 0, 0, 'fail');
      await finishScrapeRun(db, runId1, 'error');

      await new Promise((r) => setTimeout(r, 5));

      // Second run — success
      const runId2 = await createScrapeRun(db, 'u1', 'cron');
      const rb2 = await createScrapeRunSource(db, runId2, sourceId, 'Test Source');
      await finishScrapeRunSource(db, rb2, 'success', 5, 2);
      await finishScrapeRun(db, runId2, 'success');

      const sources = await loadSourcesForUser(db, 'u1');
      // Most recent run was 'success'
      expect(sources[0].lastRun.status).toBe('success');
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
      expect(tags[0].sourceCount).toBe(0);
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

    it('setSourceTags assigns tags to a source', async () => {
      const sourceId = await insertSource(db, makeSource(), 'u1');
      const tagId = await createTag(db, 'u1', 'react', '#00f');
      await setSourceTags(db, sourceId, 'u1', [tagId]);

      const sources = await loadSourcesForUser(db, 'u1');
      expect(sources[0].tags).toHaveLength(1);
      expect(sources[0].tags[0].name).toBe('react');
    });

    it('setSourceTags replaces existing tags', async () => {
      const sourceId = await insertSource(db, makeSource(), 'u1');
      const tag1 = await createTag(db, 'u1', 'tag1', '#111');
      const tag2 = await createTag(db, 'u1', 'tag2', '#222');
      await setSourceTags(db, sourceId, 'u1', [tag1]);
      await setSourceTags(db, sourceId, 'u1', [tag2]);

      const sources = await loadSourcesForUser(db, 'u1');
      expect(sources[0].tags).toHaveLength(1);
      expect(sources[0].tags[0].name).toBe('tag2');
    });

    it('sourceCount reflects how many sources use a tag', async () => {
      const tagId = await createTag(db, 'u1', 'shared', '#abc');
      const b1 = await insertSource(db, makeSource({ name: 'B1' }), 'u1');
      const b2 = await insertSource(db, makeSource({ name: 'B2' }), 'u1');
      await setSourceTags(db, b1, 'u1', [tagId]);
      await setSourceTags(db, b2, 'u1', [tagId]);
      const tags = await listTagsForUser(db, 'u1');
      expect(tags[0].sourceCount).toBe(2);
    });
  });

  describe('listJobsForUser', () => {
    it('returns all jobs for user when no filters', async () => {
      const sourceId = await insertSource(db, makeSource(), 'u1');
      await upsertJobsForUser(db, [makeJob('j1'), makeJob('j2')], 'Test Source', 'u1');
      const { jobs, total } = await listJobsForUser(db, 'u1');
      expect(total).toBe(2);
      expect(jobs).toHaveLength(2);
    });

    it('filters by sourceIds', async () => {
      const b1 = await insertSource(db, makeSource({ name: 'B1' }), 'u1');
      await insertSource(db, makeSource({ name: 'B2' }), 'u1');
      await upsertJobsForUser(db, [makeJob('j1')], 'B1', 'u1');
      await upsertJobsForUser(db, [makeJob('j2')], 'B2', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { sourceIds: [b1] });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].source).toBe('B1');
    });

    it('filters by tagIds', async () => {
      const b1 = await insertSource(db, makeSource({ name: 'Tagged' }), 'u1');
      await insertSource(db, makeSource({ name: 'Untagged' }), 'u1');
      const tagId = await createTag(db, 'u1', 'special', '#abc');
      await setSourceTags(db, b1, 'u1', [tagId]);
      await upsertJobsForUser(db, [makeJob('j1')], 'Tagged', 'u1');
      await upsertJobsForUser(db, [makeJob('j2')], 'Untagged', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { tagIds: [tagId] });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].source).toBe('Tagged');
    });

    it('filters by text query q', async () => {
      await insertSource(db, makeSource(), 'u1');
      await upsertJobsForUser(db, [
        { ...makeJob('j1'), title: 'Senior Engineer' },
        { ...makeJob('j2'), title: 'Product Manager' },
      ], 'Test Source', 'u1');
      const { jobs } = await listJobsForUser(db, 'u1', { q: 'engineer' });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].source).toBeDefined();
    });

    it('paginates correctly', async () => {
      await insertSource(db, makeSource(), 'u1');
      await upsertJobsForUser(db, [makeJob('j1'), makeJob('j2'), makeJob('j3')], 'Test Source', 'u1');
      const { jobs, total } = await listJobsForUser(db, 'u1', { page: 2, limit: 2 });
      expect(total).toBe(3);
      expect(jobs).toHaveLength(1);
    });
  });
});

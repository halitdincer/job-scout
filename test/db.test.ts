import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb, upsertJobs } from '../src/storage/db';
import { Job } from '../src/types';
import { Database } from 'sqlite';

function createJob(id: string, url?: string): Job {
  return {
    id,
    title: `Title ${id}`,
    company: 'Acme',
    location: 'Remote',
    url: url ?? `https://example.com/${id}`,
    foundAt: new Date().toISOString(),
  };
}

describe('upsertJobs', () => {
  let db: Database;

  beforeEach(async () => {
    db = await openDb({ dbPath: ':memory:' });
  });

  afterEach(async () => {
    await db.close();
  });

  it('returns only new jobs on first insert', async () => {
    const jobs = [createJob('1'), createJob('2')];
    const result = await upsertJobs(db, jobs, 'BoardA');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when all jobs already exist', async () => {
    const jobs = [createJob('1'), createJob('2')];
    await upsertJobs(db, jobs, 'BoardA');
    const second = await upsertJobs(db, jobs, 'BoardA');
    expect(second).toHaveLength(0);
  });

  it('persists all rows in the database', async () => {
    const jobs = [createJob('1'), createJob('2')];
    await upsertJobs(db, jobs, 'BoardA');
    const rows = await db.all<{ id: string }[]>('SELECT id FROM jobs');
    expect(rows).toHaveLength(2);
  });

  it('returns empty array when called with empty list', async () => {
    const result = await upsertJobs(db, [], 'BoardA');
    expect(result).toHaveLength(0);
  });

  it('updates existing job fields on re-insert', async () => {
    const job = createJob('x');
    await upsertJobs(db, [job], 'BoardA');
    const updated = { ...job, title: 'Updated Title' };
    await upsertJobs(db, [updated], 'BoardA');
    const row = await db.get<{ title: string }>('SELECT title FROM jobs WHERE id = ?', 'x');
    expect(row?.title).toBe('Updated Title');
  });
});

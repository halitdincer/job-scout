import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, upsertJobs } from '../src/storage/db';
import { Job } from '../src/types';

function createJob(id: string): Job {
  return {
    id,
    title: `Title ${id}`,
    company: 'Acme',
    location: 'Remote',
    url: `https://example.com/${id}`,
    foundAt: new Date().toISOString(),
  };
}

test('upsertJobs returns only new jobs', async () => {
  const db = await openDb({ dbPath: ':memory:' });

  const jobs = [createJob('1'), createJob('2')];
  const first = await upsertJobs(db, jobs, 'BoardA');
  assert.equal(first.length, 2);

  const second = await upsertJobs(db, jobs, 'BoardA');
  assert.equal(second.length, 0);

  const rows = await db.all<{ id: string }[]>('SELECT id FROM jobs');
  assert.equal(rows.length, 2);

  await db.close();
});

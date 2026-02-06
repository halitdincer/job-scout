import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJobId } from '../src/utils/jobId';
import { Job } from '../src/types';

const baseJob: Job = {
  id: '',
  title: 'Engineer',
  company: 'Acme',
  location: 'Remote',
  url: 'https://example.com/jobs/1',
  foundAt: new Date().toISOString(),
};

test('buildJobId uses URL when available', () => {
  const id1 = buildJobId(baseJob, 'BoardA');
  const id2 = buildJobId({ ...baseJob }, 'BoardA');
  assert.equal(id1, id2);
});

test('buildJobId falls back to content when URL missing', () => {
  const job = { ...baseJob, url: '' };
  const id1 = buildJobId(job, 'BoardA');
  const id2 = buildJobId({ ...job, location: 'Remote' }, 'BoardA');
  assert.equal(id1, id2);

  const id3 = buildJobId({ ...job, location: 'Toronto' }, 'BoardA');
  assert.notEqual(id1, id3);
});

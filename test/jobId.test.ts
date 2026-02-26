import { describe, it, expect } from 'vitest';
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

describe('buildJobId', () => {
  it('uses URL when available', () => {
    const id1 = buildJobId(baseJob, 'SourceA');
    const id2 = buildJobId({ ...baseJob }, 'SourceA');
    expect(id1).toBe(id2);
  });

  it('falls back to content when URL missing', () => {
    const job = { ...baseJob, url: '' };
    const id1 = buildJobId(job, 'SourceA');
    const id2 = buildJobId({ ...job, location: 'Remote' }, 'SourceA');
    expect(id1).toBe(id2);

    const id3 = buildJobId({ ...job, location: 'Toronto' }, 'SourceA');
    expect(id1).not.toBe(id3);
  });

  it('produces different ids for same content on different sources when url is empty', () => {
    const job = { ...baseJob, url: '' };
    const idA = buildJobId(job, 'SourceA');
    const idB = buildJobId(job, 'SourceB');
    expect(idA).not.toBe(idB);
  });

  it('empty title+company+location+source with no url produces a stable id', () => {
    const job = { ...baseJob, url: '', title: '', company: '', location: '' };
    const id1 = buildJobId(job, '');
    const id2 = buildJobId(job, '');
    expect(id1).toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });
});

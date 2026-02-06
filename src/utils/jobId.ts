import crypto from 'crypto';
import { Job } from '../types';

export function buildJobId(job: Pick<Job, 'url' | 'title' | 'company' | 'location'>, board: string) {
  if (job.url && job.url.trim().length > 0) {
    return crypto.createHash('sha1').update(job.url.trim()).digest('hex');
  }

  const fallback = `${job.title}|${job.company}|${job.location}|${board}`;
  return crypto.createHash('sha1').update(fallback).digest('hex');
}

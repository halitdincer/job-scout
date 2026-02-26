import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/scraper', () => ({
  scrapeSource: vi.fn(),
}));

import { scrapeSource } from '../../../src/scraper';
import { scrapeAllSources, scrapeForUser } from '../../../server/cron/scrapeAllSources';
import { openDb, createScrapeRun } from '../../../src/storage/db';
import { Database } from 'sqlite';

async function setupDb() {
  const db = await openDb({ dbPath: ':memory:' });
  await db.run(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    'u1', 'test@example.com', 'hash', new Date().toISOString()
  );
  // Insert source with flat columns so loadSourcesForUser returns it correctly
  await db.run(
    `INSERT INTO sources (id, name, url, config_json, updated_at, user_id,
       sel_job_card, sel_title, sel_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'b1', 'TestSource', 'https://example.com/jobs',
    JSON.stringify({ name: 'TestSource', url: 'https://example.com/jobs', selectors: { jobCard: '.job', title: '.title', link: 'a' } }),
    new Date().toISOString(), 'u1',
    '.job', '.title', 'a'
  );
  return db;
}

async function setupDbTwoSources() {
  const db = await openDb({ dbPath: ':memory:' });
  await db.run(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    'u1', 'test@example.com', 'hash', new Date().toISOString()
  );
  await db.run(
    `INSERT INTO sources (id, name, url, config_json, updated_at, user_id,
       sel_job_card, sel_title, sel_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'b1', 'Source One', 'https://example.com/jobs',
    JSON.stringify({ name: 'Source One', url: 'https://example.com/jobs', selectors: {} }),
    new Date().toISOString(), 'u1', '.job', '.title', 'a'
  );
  await db.run(
    `INSERT INTO sources (id, name, url, config_json, updated_at, user_id,
       sel_job_card, sel_title, sel_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'b2', 'Source Two', 'https://example.com/jobs2',
    JSON.stringify({ name: 'Source Two', url: 'https://example.com/jobs2', selectors: {} }),
    new Date().toISOString(), 'u1', '.job', '.title', 'a'
  );
  return db;
}

describe('scrapeAllSources', () => {
  let db: Database;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = await setupDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it('calls scrapeSource once per source per user', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });
    await scrapeAllSources(db);
    expect(scrapeSource).toHaveBeenCalledOnce();
  });

  it('creates a scrape_run record and finishes with success', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });
    await scrapeAllSources(db);

    const run = await db.get<{ status: string; finished_at: string | null }>(
      'SELECT status, finished_at FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('success');
    expect(run?.finished_at).not.toBeNull();
  });

  it('creates a scrape_run_sources record for each source', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });
    await scrapeAllSources(db);

    const run = await db.get<{ id: string }>(
      'SELECT id FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    const sources = await db.all(
      'SELECT * FROM scrape_run_sources WHERE run_id = ?', run!.id
    );
    expect(sources).toHaveLength(1);
  });

  it('marks run as error when all sources fail', async () => {
    vi.mocked(scrapeSource).mockRejectedValue(new Error('Network failure'));
    await scrapeAllSources(db);

    const run = await db.get<{ status: string }>(
      'SELECT status FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('error');
  });

  it('does not throw when scrapeSource rejects', async () => {
    vi.mocked(scrapeSource).mockRejectedValue(new Error('fail'));
    await expect(scrapeAllSources(db)).resolves.toBeUndefined();
  });

  it('increments sources_done after each source', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });
    await scrapeAllSources(db);

    const run = await db.get<{ sources_done: number; sources_total: number }>(
      'SELECT sources_done, sources_total FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.sources_done).toBe(1);
    expect(run?.sources_total).toBe(1);
  });

  it('skips inactive and deleted sources', async () => {
    await db.run(
      `INSERT INTO sources (id, name, url, config_json, updated_at, user_id, sel_job_card, sel_title, sel_link, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'b2', 'Inactive Source', 'https://example.com/inactive',
      JSON.stringify({ name: 'Inactive Source', url: 'https://example.com/inactive', selectors: {} }),
      new Date().toISOString(), 'u1', '.job', '.title', 'a', 'inactive'
    );
    await db.run(
      `INSERT INTO sources (id, name, url, config_json, updated_at, user_id, sel_job_card, sel_title, sel_link, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'b3', 'Deleted Source', 'https://example.com/deleted',
      JSON.stringify({ name: 'Deleted Source', url: 'https://example.com/deleted', selectors: {} }),
      new Date().toISOString(), 'u1', '.job', '.title', 'a', 'deleted'
    );

    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });
    await scrapeAllSources(db);
    expect(scrapeSource).toHaveBeenCalledTimes(1);

    const run = await db.get<{ sources_total: number; sources_done: number }>(
      'SELECT sources_total, sources_done FROM scrape_runs WHERE user_id = ? ORDER BY started_at DESC LIMIT 1',
      'u1'
    );
    expect(run?.sources_total).toBe(1);
    expect(run?.sources_done).toBe(1);
  });
});

describe('scrapeAllSources — partial status', () => {
  let db: Database;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = await setupDbTwoSources();
  });

  afterEach(async () => {
    await db.close();
  });

  it('status is partial when one of two sources fails', async () => {
    vi.mocked(scrapeSource)
      .mockResolvedValueOnce({ source: 'Source One', jobs: [] })
      .mockRejectedValueOnce(new Error('fail'));
    await scrapeAllSources(db);

    const run = await db.get<{ status: string }>(
      'SELECT status FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('partial');
  });

  it('creates two scrape_run_sources entries for two sources', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'Source', jobs: [] });
    await scrapeAllSources(db);

    const run = await db.get<{ id: string }>(
      'SELECT id FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    const sources = await db.all(
      'SELECT * FROM scrape_run_sources WHERE run_id = ?', run!.id
    );
    expect(sources).toHaveLength(2);
  });
});

describe('scrapeForUser', () => {
  let db: Database;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = await setupDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it('creates scrape_run_sources for the given run', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });

    const runId = await createScrapeRun(db, 'u1', 'manual');
    await scrapeForUser(db, 'u1', runId);

    const sources = await db.all(
      'SELECT * FROM scrape_run_sources WHERE run_id = ?', runId
    );
    expect(sources).toHaveLength(1);
    expect((sources[0] as any).status).toBe('success');
  });

  it('finishes the run after scraping', async () => {
    vi.mocked(scrapeSource).mockResolvedValue({ source: 'TestSource', jobs: [] });

    const runId = await createScrapeRun(db, 'u1', 'manual');
    await scrapeForUser(db, 'u1', runId);

    const run = await db.get<{ status: string; finished_at: string | null }>(
      'SELECT status, finished_at FROM scrape_runs WHERE id = ?', runId
    );
    expect(run?.status).toBe('success');
    expect(run?.finished_at).not.toBeNull();
  });
});

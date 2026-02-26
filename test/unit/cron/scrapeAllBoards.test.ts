import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/scraper', () => ({
  scrapeBoard: vi.fn(),
}));

import { scrapeBoard } from '../../../src/scraper';
import { scrapeAllBoards, scrapeForUser } from '../../../server/cron/scrapeAllBoards';
import { openDb, createScrapeRun } from '../../../src/storage/db';
import { Database } from 'sqlite';

async function setupDb() {
  const db = await openDb({ dbPath: ':memory:' });
  await db.run(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    'u1', 'test@example.com', 'hash', new Date().toISOString()
  );
  // Insert board with flat columns so loadBoardsForUser returns it correctly
  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id,
       sel_job_card, sel_title, sel_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'b1', 'TestBoard', 'https://example.com/jobs',
    JSON.stringify({ name: 'TestBoard', url: 'https://example.com/jobs', selectors: { jobCard: '.job', title: '.title', link: 'a' } }),
    new Date().toISOString(), 'u1',
    '.job', '.title', 'a'
  );
  return db;
}

async function setupDbTwoBoards() {
  const db = await openDb({ dbPath: ':memory:' });
  await db.run(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    'u1', 'test@example.com', 'hash', new Date().toISOString()
  );
  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id,
       sel_job_card, sel_title, sel_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'b1', 'Board One', 'https://example.com/jobs',
    JSON.stringify({ name: 'Board One', url: 'https://example.com/jobs', selectors: {} }),
    new Date().toISOString(), 'u1', '.job', '.title', 'a'
  );
  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id,
       sel_job_card, sel_title, sel_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'b2', 'Board Two', 'https://example.com/jobs2',
    JSON.stringify({ name: 'Board Two', url: 'https://example.com/jobs2', selectors: {} }),
    new Date().toISOString(), 'u1', '.job', '.title', 'a'
  );
  return db;
}

describe('scrapeAllBoards', () => {
  let db: Database;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = await setupDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it('calls scrapeBoard once per board per user', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });
    await scrapeAllBoards(db);
    expect(scrapeBoard).toHaveBeenCalledOnce();
  });

  it('creates a scrape_run record and finishes with success', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });
    await scrapeAllBoards(db);

    const run = await db.get<{ status: string; finished_at: string | null }>(
      'SELECT status, finished_at FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('success');
    expect(run?.finished_at).not.toBeNull();
  });

  it('creates a scrape_run_boards record for each board', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });
    await scrapeAllBoards(db);

    const run = await db.get<{ id: string }>(
      'SELECT id FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    const boards = await db.all(
      'SELECT * FROM scrape_run_boards WHERE run_id = ?', run!.id
    );
    expect(boards).toHaveLength(1);
  });

  it('marks run as error when all boards fail', async () => {
    vi.mocked(scrapeBoard).mockRejectedValue(new Error('Network failure'));
    await scrapeAllBoards(db);

    const run = await db.get<{ status: string }>(
      'SELECT status FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('error');
  });

  it('does not throw when scrapeBoard rejects', async () => {
    vi.mocked(scrapeBoard).mockRejectedValue(new Error('fail'));
    await expect(scrapeAllBoards(db)).resolves.toBeUndefined();
  });

  it('increments boards_done after each board', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });
    await scrapeAllBoards(db);

    const run = await db.get<{ boards_done: number; boards_total: number }>(
      'SELECT boards_done, boards_total FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.boards_done).toBe(1);
    expect(run?.boards_total).toBe(1);
  });

  it('skips inactive and deleted boards', async () => {
    await db.run(
      `INSERT INTO boards (id, name, url, config_json, updated_at, user_id, sel_job_card, sel_title, sel_link, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'b2', 'Inactive Board', 'https://example.com/inactive',
      JSON.stringify({ name: 'Inactive Board', url: 'https://example.com/inactive', selectors: {} }),
      new Date().toISOString(), 'u1', '.job', '.title', 'a', 'inactive'
    );
    await db.run(
      `INSERT INTO boards (id, name, url, config_json, updated_at, user_id, sel_job_card, sel_title, sel_link, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'b3', 'Deleted Board', 'https://example.com/deleted',
      JSON.stringify({ name: 'Deleted Board', url: 'https://example.com/deleted', selectors: {} }),
      new Date().toISOString(), 'u1', '.job', '.title', 'a', 'deleted'
    );

    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });
    await scrapeAllBoards(db);
    expect(scrapeBoard).toHaveBeenCalledTimes(1);

    const run = await db.get<{ boards_total: number; boards_done: number }>(
      'SELECT boards_total, boards_done FROM scrape_runs WHERE user_id = ? ORDER BY started_at DESC LIMIT 1',
      'u1'
    );
    expect(run?.boards_total).toBe(1);
    expect(run?.boards_done).toBe(1);
  });
});

describe('scrapeAllBoards — partial status', () => {
  let db: Database;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = await setupDbTwoBoards();
  });

  afterEach(async () => {
    await db.close();
  });

  it('status is partial when one of two boards fails', async () => {
    vi.mocked(scrapeBoard)
      .mockResolvedValueOnce({ board: 'Board One', jobs: [] })
      .mockRejectedValueOnce(new Error('fail'));
    await scrapeAllBoards(db);

    const run = await db.get<{ status: string }>(
      'SELECT status FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('partial');
  });

  it('creates two scrape_run_boards entries for two boards', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'Board', jobs: [] });
    await scrapeAllBoards(db);

    const run = await db.get<{ id: string }>(
      'SELECT id FROM scrape_runs WHERE user_id = ?', 'u1'
    );
    const boards = await db.all(
      'SELECT * FROM scrape_run_boards WHERE run_id = ?', run!.id
    );
    expect(boards).toHaveLength(2);
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

  it('creates scrape_run_boards for the given run', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });

    const runId = await createScrapeRun(db, 'u1', 'manual');
    await scrapeForUser(db, 'u1', runId);

    const boards = await db.all(
      'SELECT * FROM scrape_run_boards WHERE run_id = ?', runId
    );
    expect(boards).toHaveLength(1);
    expect((boards[0] as any).status).toBe('success');
  });

  it('finishes the run after scraping', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });

    const runId = await createScrapeRun(db, 'u1', 'manual');
    await scrapeForUser(db, 'u1', runId);

    const run = await db.get<{ status: string; finished_at: string | null }>(
      'SELECT status, finished_at FROM scrape_runs WHERE id = ?', runId
    );
    expect(run?.status).toBe('success');
    expect(run?.finished_at).not.toBeNull();
  });
});

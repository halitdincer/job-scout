import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/scraper', () => ({
  scrapeBoard: vi.fn(),
}));

import { scrapeBoard } from '../../../src/scraper';
import { scrapeAllBoards } from '../../../server/cron/scrapeAllBoards';
import { openDb } from '../../../src/storage/db';
import { Database } from 'sqlite';

async function setupDb() {
  const db = await openDb({ dbPath: ':memory:' });
  // Insert a test user
  await db.run(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    'u1', 'test@example.com', 'hash', new Date().toISOString()
  );
  // Insert a test board
  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
    'b1', 'TestBoard', 'https://example.com/jobs',
    JSON.stringify({ name: 'TestBoard', url: 'https://example.com/jobs', selectors: { jobCard: '.job', title: '.title', link: 'a' } }),
    new Date().toISOString(), 'u1'
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

  it('creates a run record before scraping and finishes with success', async () => {
    vi.mocked(scrapeBoard).mockResolvedValue({ board: 'TestBoard', jobs: [] });
    await scrapeAllBoards(db);

    const run = await db.get<{ status: string; finished_at: string | null }>(
      'SELECT status, finished_at FROM runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('success');
    expect(run?.finished_at).not.toBeNull();
  });

  it('marks run as error when scrapeBoard rejects', async () => {
    vi.mocked(scrapeBoard).mockRejectedValue(new Error('Network failure'));
    await scrapeAllBoards(db);

    const run = await db.get<{ status: string; error_msg: string | null }>(
      'SELECT status, error_msg FROM runs WHERE user_id = ?', 'u1'
    );
    expect(run?.status).toBe('error');
    expect(run?.error_msg).toContain('Network failure');
  });

  it('does not throw when scrapeBoard rejects', async () => {
    vi.mocked(scrapeBoard).mockRejectedValue(new Error('fail'));
    await expect(scrapeAllBoards(db)).resolves.toBeUndefined();
  });
});

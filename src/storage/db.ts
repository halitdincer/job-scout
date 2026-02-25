import fs from 'fs-extra';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Job } from '../types';

export interface DbOptions {
  dbPath: string;
}

export interface RunRow {
  id: string;
  boardId: string;
  userId: string;
  startedAt: string;
  finishedAt: string | null;
  jobsFound: number;
  jobsNew: number;
  status: 'running' | 'success' | 'error';
  errorMsg: string | null;
}

export interface ScrapeRunRow {
  id: string;
  userId: string;
  triggeredBy: 'cron' | 'manual';
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'partial' | 'error';
  boardsTotal: number;
  boardsDone: number;
  jobsFound: number;
  jobsNew: number;
}

export interface ScrapeRunBoardRow {
  id: string;
  runId: string;
  boardId: string;
  boardName: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'pending' | 'running' | 'success' | 'error';
  jobsFound: number;
  jobsNew: number;
  errorMsg: string | null;
}

export async function openDb({ dbPath }: DbOptions): Promise<Database> {
  await fs.ensureDir(path.dirname(dbPath));

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      url TEXT NOT NULL,
      posted_date TEXT,
      board TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      name TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Schema migration
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);`);

  const versionRow = await db.get<{ version: number } | undefined>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion < 1) {
    await db.exec('BEGIN');
    try {
      // Add id column to boards if missing
      const boardCols = await db.all<{ name: string }[]>('PRAGMA table_info(boards)');
      const boardColNames = boardCols.map((c) => c.name);
      if (!boardColNames.includes('id')) {
        await db.exec(`ALTER TABLE boards ADD COLUMN id TEXT`);
      }
      if (!boardColNames.includes('user_id')) {
        await db.exec(`ALTER TABLE boards ADD COLUMN user_id TEXT`);
      }

      // Add user_id column to jobs if missing
      const jobCols = await db.all<{ name: string }[]>('PRAGMA table_info(jobs)');
      const jobColNames = jobCols.map((c) => c.name);
      if (!jobColNames.includes('user_id')) {
        await db.exec(`ALTER TABLE jobs ADD COLUMN user_id TEXT`);
      }

      // Populate id for boards that don't have one
      await db.exec(`UPDATE boards SET id = lower(hex(randomblob(16))) WHERE id IS NULL`);

      // Create users table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id   TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      await db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (1)`);
      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  if (currentVersion < 2) {
    await db.exec('BEGIN');
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          jobs_found INTEGER NOT NULL DEFAULT 0,
          jobs_new INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'running',
          error_msg TEXT
        );
      `);

      const jobCols2 = await db.all<{ name: string }[]>('PRAGMA table_info(jobs)');
      const jobColNames2 = jobCols2.map((c) => c.name);
      if (!jobColNames2.includes('found_in_run_id')) {
        await db.exec(`ALTER TABLE jobs ADD COLUMN found_in_run_id TEXT`);
      }

      await db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (2)`);
      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  if (currentVersion < 3) {
    await db.exec('BEGIN');
    try {
      // Add flat columns to boards
      const boardCols3 = await db.all<{ name: string }[]>('PRAGMA table_info(boards)');
      const boardColNames3 = boardCols3.map((c) => c.name);

      const newBoardCols: [string, string][] = [
        ['company', 'TEXT'],
        ['location', 'TEXT'],
        ['sel_job_card', 'TEXT'],
        ['sel_title', 'TEXT'],
        ['sel_link', 'TEXT'],
        ['sel_next_page', 'TEXT'],
        ['pag_type', 'TEXT'],
        ['pag_url_template', 'TEXT'],
        ['pag_max_pages', 'INTEGER'],
        ['pag_delay_ms', 'INTEGER'],
        ['created_at', 'TEXT'],
      ];

      for (const [col, type] of newBoardCols) {
        if (!boardColNames3.includes(col)) {
          await db.exec(`ALTER TABLE boards ADD COLUMN ${col} ${type}`);
        }
      }

      // Migrate data from config_json into flat columns using SQLite's json_extract
      await db.exec(`
        UPDATE boards SET
          company          = json_extract(config_json, '$.company'),
          location         = json_extract(config_json, '$.location'),
          sel_job_card     = json_extract(config_json, '$.selectors.jobCard'),
          sel_title        = json_extract(config_json, '$.selectors.title'),
          sel_link         = json_extract(config_json, '$.selectors.link'),
          sel_next_page    = json_extract(config_json, '$.selectors.nextPage'),
          pag_type         = json_extract(config_json, '$.pagination.type'),
          pag_url_template = json_extract(config_json, '$.pagination.urlTemplate'),
          pag_max_pages    = CAST(json_extract(config_json, '$.pagination.maxPages') AS INTEGER),
          pag_delay_ms     = CAST(json_extract(config_json, '$.pagination.delayMs') AS INTEGER),
          created_at       = COALESCE(created_at, updated_at)
        WHERE sel_job_card IS NULL
      `);

      // Create scrape_runs table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS scrape_runs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          triggered_by TEXT NOT NULL DEFAULT 'cron',
          started_at TEXT NOT NULL,
          finished_at TEXT,
          status TEXT NOT NULL DEFAULT 'running',
          boards_total INTEGER NOT NULL DEFAULT 0,
          boards_done INTEGER NOT NULL DEFAULT 0,
          jobs_found INTEGER NOT NULL DEFAULT 0,
          jobs_new INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Create scrape_run_boards table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS scrape_run_boards (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          board_id TEXT NOT NULL,
          board_name TEXT NOT NULL,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          jobs_found INTEGER NOT NULL DEFAULT 0,
          jobs_new INTEGER NOT NULL DEFAULT 0,
          error_msg TEXT
        );
      `);

      await db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (3)`);
      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  return db;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ── Legacy run functions (kept for historical data) ───────────────────────────

export async function createRun(db: Database, boardId: string, userId: string): Promise<string> {
  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO runs (id, board_id, user_id, started_at, jobs_found, jobs_new, status)
     VALUES (?, ?, ?, ?, 0, 0, 'running')`,
    id,
    boardId,
    userId,
    now
  );
  return id;
}

export async function finishRun(
  db: Database,
  runId: string,
  jobsFound: number,
  jobsNew: number,
  status: 'success' | 'error',
  errorMsg?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE runs SET finished_at = ?, jobs_found = ?, jobs_new = ?, status = ?, error_msg = ?
     WHERE id = ?`,
    now,
    jobsFound,
    jobsNew,
    status,
    errorMsg ?? null,
    runId
  );
}

export async function listRunsForUser(
  db: Database,
  userId: string,
  boardId?: string
): Promise<RunRow[]> {
  const conditions = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (boardId) {
    conditions.push('board_id = ?');
    params.push(boardId);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = await db.all<{
    id: string;
    board_id: string;
    user_id: string;
    started_at: string;
    finished_at: string | null;
    jobs_found: number;
    jobs_new: number;
    status: string;
    error_msg: string | null;
  }[]>(
    `SELECT id, board_id, user_id, started_at, finished_at, jobs_found, jobs_new, status, error_msg
     FROM runs ${where}
     ORDER BY started_at DESC
     LIMIT 100`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    boardId: r.board_id,
    userId: r.user_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    jobsFound: r.jobs_found,
    jobsNew: r.jobs_new,
    status: r.status as RunRow['status'],
    errorMsg: r.error_msg,
  }));
}

// ── Scrape session functions ───────────────────────────────────────────────────

export async function createScrapeRun(
  db: Database,
  userId: string,
  triggeredBy: 'cron' | 'manual'
): Promise<string> {
  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO scrape_runs (id, user_id, triggered_by, started_at, status, boards_total, boards_done, jobs_found, jobs_new)
     VALUES (?, ?, ?, ?, 'running', 0, 0, 0, 0)`,
    id,
    userId,
    triggeredBy,
    now
  );
  return id;
}

export async function updateScrapeRunProgress(
  db: Database,
  runId: string,
  boardsDone: number,
  jobsFound: number,
  jobsNew: number
): Promise<void> {
  await db.run(
    `UPDATE scrape_runs SET boards_done = ?, jobs_found = ?, jobs_new = ? WHERE id = ?`,
    boardsDone,
    jobsFound,
    jobsNew,
    runId
  );
}

export async function finishScrapeRun(
  db: Database,
  runId: string,
  status: 'success' | 'partial' | 'error'
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE scrape_runs SET finished_at = ?, status = ? WHERE id = ?`,
    now,
    status,
    runId
  );
}

export async function createScrapeRunBoard(
  db: Database,
  runId: string,
  boardId: string,
  boardName: string
): Promise<string> {
  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO scrape_run_boards (id, run_id, board_id, board_name, started_at, status, jobs_found, jobs_new)
     VALUES (?, ?, ?, ?, ?, 'running', 0, 0)`,
    id,
    runId,
    boardId,
    boardName,
    now
  );
  return id;
}

export async function finishScrapeRunBoard(
  db: Database,
  runBoardId: string,
  status: 'success' | 'error',
  jobsFound: number,
  jobsNew: number,
  errorMsg?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE scrape_run_boards SET finished_at = ?, status = ?, jobs_found = ?, jobs_new = ?, error_msg = ?
     WHERE id = ?`,
    now,
    status,
    jobsFound,
    jobsNew,
    errorMsg ?? null,
    runBoardId
  );
}

export async function listScrapeRunsForUser(
  db: Database,
  userId: string,
  limit = 50
): Promise<ScrapeRunRow[]> {
  const rows = await db.all<{
    id: string;
    user_id: string;
    triggered_by: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    boards_total: number;
    boards_done: number;
    jobs_found: number;
    jobs_new: number;
  }[]>(
    `SELECT id, user_id, triggered_by, started_at, finished_at, status,
            boards_total, boards_done, jobs_found, jobs_new
     FROM scrape_runs
     WHERE user_id = ?
     ORDER BY started_at DESC
     LIMIT ?`,
    userId,
    limit
  );

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    triggeredBy: r.triggered_by as 'cron' | 'manual',
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status as ScrapeRunRow['status'],
    boardsTotal: r.boards_total,
    boardsDone: r.boards_done,
    jobsFound: r.jobs_found,
    jobsNew: r.jobs_new,
  }));
}

export async function getScrapeRunDetail(
  db: Database,
  runId: string,
  userId: string
): Promise<(ScrapeRunRow & { boards: ScrapeRunBoardRow[] }) | null> {
  const run = await db.get<{
    id: string;
    user_id: string;
    triggered_by: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    boards_total: number;
    boards_done: number;
    jobs_found: number;
    jobs_new: number;
  } | undefined>(
    `SELECT id, user_id, triggered_by, started_at, finished_at, status,
            boards_total, boards_done, jobs_found, jobs_new
     FROM scrape_runs
     WHERE id = ? AND user_id = ?`,
    runId,
    userId
  );

  if (!run) return null;

  const boardRows = await db.all<{
    id: string;
    run_id: string;
    board_id: string;
    board_name: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    jobs_found: number;
    jobs_new: number;
    error_msg: string | null;
  }[]>(
    `SELECT id, run_id, board_id, board_name, started_at, finished_at,
            status, jobs_found, jobs_new, error_msg
     FROM scrape_run_boards
     WHERE run_id = ?
     ORDER BY started_at ASC`,
    runId
  );

  return {
    id: run.id,
    userId: run.user_id,
    triggeredBy: run.triggered_by as 'cron' | 'manual',
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    status: run.status as ScrapeRunRow['status'],
    boardsTotal: run.boards_total,
    boardsDone: run.boards_done,
    jobsFound: run.jobs_found,
    jobsNew: run.jobs_new,
    boards: boardRows.map((b) => ({
      id: b.id,
      runId: b.run_id,
      boardId: b.board_id,
      boardName: b.board_name,
      startedAt: b.started_at,
      finishedAt: b.finished_at,
      status: b.status as ScrapeRunBoardRow['status'],
      jobsFound: b.jobs_found,
      jobsNew: b.jobs_new,
      errorMsg: b.error_msg,
    })),
  };
}

// ── Board CRUD ────────────────────────────────────────────────────────────────

function rowToBoard(row: {
  id: string;
  name: string;
  url: string;
  company: string | null;
  location: string | null;
  sel_job_card: string | null;
  sel_title: string | null;
  sel_link: string | null;
  sel_next_page: string | null;
  pag_type: string | null;
  pag_url_template: string | null;
  pag_max_pages: number | null;
  pag_delay_ms: number | null;
}): any {
  const pagination = row.pag_type
    ? {
        type: row.pag_type,
        ...(row.pag_url_template ? { urlTemplate: row.pag_url_template } : {}),
        ...(row.pag_max_pages != null ? { maxPages: row.pag_max_pages } : {}),
        ...(row.pag_delay_ms != null ? { delayMs: row.pag_delay_ms } : {}),
      }
    : undefined;

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    ...(row.company ? { company: row.company } : {}),
    ...(row.location ? { location: row.location } : {}),
    selectors: {
      jobCard: row.sel_job_card ?? '',
      title: row.sel_title ?? '',
      link: row.sel_link ?? '',
      nextPage: row.sel_next_page ?? null,
    },
    ...(pagination ? { pagination } : {}),
  };
}

export async function loadBoardsForUser(db: Database, userId: string): Promise<any[]> {
  const rows = await db.all<{
    id: string;
    name: string;
    url: string;
    company: string | null;
    location: string | null;
    sel_job_card: string | null;
    sel_title: string | null;
    sel_link: string | null;
    sel_next_page: string | null;
    pag_type: string | null;
    pag_url_template: string | null;
    pag_max_pages: number | null;
    pag_delay_ms: number | null;
    last_run_status: string | null;
    last_run_finished_at: string | null;
  }[]>(
    `SELECT b.id, b.name, b.url, b.company, b.location,
            b.sel_job_card, b.sel_title, b.sel_link, b.sel_next_page,
            b.pag_type, b.pag_url_template, b.pag_max_pages, b.pag_delay_ms,
            srb.status AS last_run_status,
            srb.finished_at AS last_run_finished_at
     FROM boards b
     LEFT JOIN scrape_run_boards srb ON srb.id = (
       SELECT srb2.id
       FROM scrape_run_boards srb2
       JOIN scrape_runs sr ON sr.id = srb2.run_id
       WHERE srb2.board_id = b.id AND sr.user_id = ?
       ORDER BY srb2.started_at DESC
       LIMIT 1
     )
     WHERE b.user_id = ?
     ORDER BY b.name`,
    userId,
    userId
  );

  return rows.map((row) => ({
    ...rowToBoard(row),
    lastRun: row.last_run_status
      ? { status: row.last_run_status, finishedAt: row.last_run_finished_at }
      : null,
  }));
}

export async function listBoardNames(db: Database): Promise<string[]> {
  const rows = await db.all<{ name: string }[]>('SELECT name FROM boards ORDER BY name');
  return rows.map((row) => row.name);
}

export async function upsertBoard(db: Database, board: any): Promise<void> {
  const now = new Date().toISOString();
  const name = board?.name ?? '';
  const url = board?.url ?? '';

  await db.run(
    `
    INSERT INTO boards (name, url, config_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      url = excluded.url,
      config_json = excluded.config_json,
      updated_at = excluded.updated_at
    `,
    name,
    url,
    JSON.stringify(board),
    now
  );
}

export async function insertBoard(db: Database, board: any, userId: string): Promise<string> {
  const now = new Date().toISOString();
  const id = generateUuid();

  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id,
       company, location, sel_job_card, sel_title, sel_link, sel_next_page,
       pag_type, pag_url_template, pag_max_pages, pag_delay_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    board?.name ?? '',
    board?.url ?? '',
    JSON.stringify(board),
    now,
    userId,
    board?.company ?? null,
    board?.location ?? null,
    board?.selectors?.jobCard ?? null,
    board?.selectors?.title ?? null,
    board?.selectors?.link ?? null,
    board?.selectors?.nextPage ?? null,
    board?.pagination?.type ?? null,
    board?.pagination?.urlTemplate ?? null,
    board?.pagination?.maxPages ?? null,
    board?.pagination?.delayMs ?? null,
    now
  );

  return id;
}

export async function updateBoardById(
  db: Database,
  id: string,
  board: any,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await db.run(
    `UPDATE boards SET
       name = ?, url = ?, config_json = ?, updated_at = ?,
       company = ?, location = ?,
       sel_job_card = ?, sel_title = ?, sel_link = ?, sel_next_page = ?,
       pag_type = ?, pag_url_template = ?, pag_max_pages = ?, pag_delay_ms = ?
     WHERE id = ? AND user_id = ?`,
    board?.name ?? '',
    board?.url ?? '',
    JSON.stringify(board),
    now,
    board?.company ?? null,
    board?.location ?? null,
    board?.selectors?.jobCard ?? null,
    board?.selectors?.title ?? null,
    board?.selectors?.link ?? null,
    board?.selectors?.nextPage ?? null,
    board?.pagination?.type ?? null,
    board?.pagination?.urlTemplate ?? null,
    board?.pagination?.maxPages ?? null,
    board?.pagination?.delayMs ?? null,
    id,
    userId
  );

  return (result.changes ?? 0) > 0;
}

export async function deleteBoardById(
  db: Database,
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db.run(
    'DELETE FROM boards WHERE id = ? AND user_id = ?',
    id,
    userId
  );
  return (result.changes ?? 0) > 0;
}

export async function getBoardById(
  db: Database,
  id: string,
  userId: string
): Promise<any | null> {
  const row = await db.get<{
    id: string;
    name: string;
    url: string;
    company: string | null;
    location: string | null;
    sel_job_card: string | null;
    sel_title: string | null;
    sel_link: string | null;
    sel_next_page: string | null;
    pag_type: string | null;
    pag_url_template: string | null;
    pag_max_pages: number | null;
    pag_delay_ms: number | null;
  } | undefined>(
    `SELECT id, name, url, company, location,
            sel_job_card, sel_title, sel_link, sel_next_page,
            pag_type, pag_url_template, pag_max_pages, pag_delay_ms
     FROM boards WHERE id = ? AND user_id = ?`,
    id,
    userId
  );
  if (!row) return null;
  return rowToBoard(row);
}

export async function deleteBoard(db: Database, name: string): Promise<number> {
  const result = await db.run('DELETE FROM boards WHERE name = ?', name);
  return result.changes ?? 0;
}

export async function loadBoards(db: Database): Promise<any[]> {
  const rows = await db.all<{ config_json: string }[]>('SELECT config_json FROM boards ORDER BY name');
  return rows.map((row) => JSON.parse(row.config_json));
}

// ── Job upsert ────────────────────────────────────────────────────────────────

export async function upsertJobs(db: Database, jobs: Job[], board: string): Promise<Job[]> {
  if (jobs.length === 0) return [];

  const now = new Date().toISOString();
  const ids = jobs.map((job) => job.id);
  const existing = new Set<string>();

  const chunks = chunkArray(ids, 900);
  for (const chunk of chunks) {
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await db.all<{ id: string }[]>(
      `SELECT id FROM jobs WHERE id IN (${placeholders})`,
      chunk
    );
    for (const row of rows) {
      existing.add(row.id);
    }
  }

  const newJobs: Job[] = [];

  await db.exec('BEGIN');
  try {
    const insertStmt = await db.prepare(`
      INSERT INTO jobs (
        id, title, company, location, url, posted_date, board, first_seen_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = await db.prepare(`
      UPDATE jobs
      SET title = ?, company = ?, location = ?, url = ?, posted_date = ?, board = ?, last_seen_at = ?
      WHERE id = ?
    `);

    for (const job of jobs) {
      if (!existing.has(job.id)) {
        await insertStmt.run(
          job.id,
          job.title,
          job.company,
          job.location,
          job.url,
          job.postedDate ?? null,
          board,
          now,
          now
        );
        newJobs.push(job);
      } else {
        await updateStmt.run(
          job.title,
          job.company,
          job.location,
          job.url,
          job.postedDate ?? null,
          board,
          now,
          job.id
        );
      }
    }

    await insertStmt.finalize();
    await updateStmt.finalize();
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return newJobs;
}

export async function upsertJobsForUser(
  db: Database,
  jobs: Job[],
  board: string,
  userId: string,
  runId?: string
): Promise<Job[]> {
  if (jobs.length === 0) return [];

  const now = new Date().toISOString();
  const ids = jobs.map((job) => job.id);
  const existing = new Set<string>();

  const chunks = chunkArray(ids, 900);
  for (const chunk of chunks) {
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await db.all<{ id: string }[]>(
      `SELECT id FROM jobs WHERE id IN (${placeholders}) AND user_id = ?`,
      [...chunk, userId]
    );
    for (const row of rows) {
      existing.add(row.id);
    }
  }

  const newJobs: Job[] = [];

  await db.exec('BEGIN');
  try {
    const insertStmt = await db.prepare(`
      INSERT INTO jobs (
        id, title, company, location, url, posted_date, board, first_seen_at, last_seen_at, user_id, found_in_run_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = await db.prepare(`
      UPDATE jobs
      SET title = ?, company = ?, location = ?, url = ?, posted_date = ?, board = ?, last_seen_at = ?
      WHERE id = ? AND user_id = ?
    `);

    for (const job of jobs) {
      if (!existing.has(job.id)) {
        await insertStmt.run(
          job.id,
          job.title,
          job.company,
          job.location,
          job.url,
          job.postedDate ?? null,
          board,
          now,
          now,
          userId,
          runId ?? null
        );
        newJobs.push(job);
      } else {
        await updateStmt.run(
          job.title,
          job.company,
          job.location,
          job.url,
          job.postedDate ?? null,
          board,
          now,
          job.id,
          userId
        );
      }
    }

    await insertStmt.finalize();
    await updateStmt.finalize();
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return newJobs;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

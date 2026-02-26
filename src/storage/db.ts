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

  if (currentVersion < 4) {
    await db.exec('BEGIN');
    try {
      // Create companies table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS companies (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL,
          user_id    TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(name, user_id)
        );
      `);

      // Create tags table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL,
          color      TEXT NOT NULL DEFAULT '#6366f1',
          user_id    TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(name, user_id)
        );
      `);

      // Create board_tags junction table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS board_tags (
          board_id TEXT NOT NULL,
          tag_id   TEXT NOT NULL,
          user_id  TEXT NOT NULL,
          PRIMARY KEY (board_id, tag_id)
        );
      `);

      // Add new columns to boards
      const boardCols4 = await db.all<{ name: string }[]>('PRAGMA table_info(boards)');
      const boardColNames4 = boardCols4.map((c) => c.name);

      const v4BoardCols: [string, string][] = [
        ['company_id', 'TEXT'],
        ['location_key', 'TEXT'],
        ['location_label', 'TEXT'],
      ];

      for (const [col, type] of v4BoardCols) {
        if (!boardColNames4.includes(col)) {
          await db.exec(`ALTER TABLE boards ADD COLUMN ${col} ${type}`);
        }
      }

      // Seed companies from existing boards.company text values
      await db.exec(`
        INSERT OR IGNORE INTO companies (id, name, user_id, created_at)
        SELECT lower(hex(randomblob(16))), company, user_id, datetime('now')
        FROM boards WHERE company IS NOT NULL AND company != '' AND user_id IS NOT NULL
      `);

      // Link boards to newly created company rows
      await db.exec(`
        UPDATE boards SET company_id = (
          SELECT id FROM companies WHERE name = boards.company AND user_id = boards.user_id
        ) WHERE company IS NOT NULL AND company != '' AND company_id IS NULL
      `);

      await db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (4)`);
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
  company_id?: string | null;
  company_name?: string | null;
  location_key?: string | null;
  location_label?: string | null;
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
    ...(row.company_id ? { companyId: row.company_id } : {}),
    ...(row.company_name ? { companyName: row.company_name } : {}),
    ...(row.location_key ? { locationKey: row.location_key } : {}),
    ...(row.location_label ? { locationLabel: row.location_label } : {}),
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
    company_id: string | null;
    company_name: string | null;
    location_key: string | null;
    location_label: string | null;
    last_run_status: string | null;
    last_run_finished_at: string | null;
  }[]>(
    `SELECT b.id, b.name, b.url, b.company, b.location,
            b.sel_job_card, b.sel_title, b.sel_link, b.sel_next_page,
            b.pag_type, b.pag_url_template, b.pag_max_pages, b.pag_delay_ms,
            b.company_id, c.name AS company_name,
            b.location_key, b.location_label,
            srb.status AS last_run_status,
            srb.finished_at AS last_run_finished_at
     FROM boards b
     LEFT JOIN companies c ON c.id = b.company_id
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

  // Load tags for all boards in one query
  const boardIds = rows.map((r) => r.id);
  const tagsByBoard = new Map<string, { id: string; name: string; color: string }[]>();

  if (boardIds.length > 0) {
    const placeholders = boardIds.map(() => '?').join(',');
    const tagRows = await db.all<{
      board_id: string;
      tag_id: string;
      tag_name: string;
      tag_color: string;
    }[]>(
      `SELECT bt.board_id, t.id AS tag_id, t.name AS tag_name, t.color AS tag_color
       FROM board_tags bt
       JOIN tags t ON t.id = bt.tag_id
       WHERE bt.board_id IN (${placeholders})
       ORDER BY t.name`,
      boardIds
    );
    for (const tr of tagRows) {
      if (!tagsByBoard.has(tr.board_id)) tagsByBoard.set(tr.board_id, []);
      tagsByBoard.get(tr.board_id)!.push({ id: tr.tag_id, name: tr.tag_name, color: tr.tag_color });
    }
  }

  return rows.map((row) => ({
    ...rowToBoard(row),
    tags: tagsByBoard.get(row.id) ?? [],
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

export async function insertBoard(
  db: Database,
  board: any,
  userId: string,
  tagIds?: string[]
): Promise<string> {
  const now = new Date().toISOString();
  const id = generateUuid();

  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id,
       company, location, sel_job_card, sel_title, sel_link, sel_next_page,
       pag_type, pag_url_template, pag_max_pages, pag_delay_ms, created_at,
       company_id, location_key, location_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    now,
    board?.companyId ?? null,
    board?.locationKey ?? null,
    board?.locationLabel ?? null
  );

  if (tagIds && tagIds.length > 0) {
    await setBoardTags(db, id, userId, tagIds);
  }

  return id;
}

export async function updateBoardById(
  db: Database,
  id: string,
  board: any,
  userId: string,
  tagIds?: string[]
): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await db.run(
    `UPDATE boards SET
       name = ?, url = ?, config_json = ?, updated_at = ?,
       company = ?, location = ?,
       sel_job_card = ?, sel_title = ?, sel_link = ?, sel_next_page = ?,
       pag_type = ?, pag_url_template = ?, pag_max_pages = ?, pag_delay_ms = ?,
       company_id = ?, location_key = ?, location_label = ?
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
    board?.companyId ?? null,
    board?.locationKey ?? null,
    board?.locationLabel ?? null,
    id,
    userId
  );

  if ((result.changes ?? 0) > 0 && tagIds !== undefined) {
    await setBoardTags(db, id, userId, tagIds);
  }

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
    company_id: string | null;
    company_name: string | null;
    location_key: string | null;
    location_label: string | null;
  } | undefined>(
    `SELECT b.id, b.name, b.url, b.company, b.location,
            b.sel_job_card, b.sel_title, b.sel_link, b.sel_next_page,
            b.pag_type, b.pag_url_template, b.pag_max_pages, b.pag_delay_ms,
            b.company_id, c.name AS company_name, b.location_key, b.location_label
     FROM boards b
     LEFT JOIN companies c ON c.id = b.company_id
     WHERE b.id = ? AND b.user_id = ?`,
    id,
    userId
  );
  if (!row) return null;

  const tagRows = await db.all<{ id: string; name: string; color: string }[]>(
    `SELECT t.id, t.name, t.color
     FROM board_tags bt
     JOIN tags t ON t.id = bt.tag_id
     WHERE bt.board_id = ?
     ORDER BY t.name`,
    id
  );

  return { ...rowToBoard(row), tags: tagRows };
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

// ── Companies ─────────────────────────────────────────────────────────────────

export async function listCompaniesForUser(
  db: Database,
  userId: string
): Promise<{ id: string; name: string; boardCount: number; jobCount: number }[]> {
  const rows = await db.all<{
    id: string;
    name: string;
    board_count: number;
    job_count: number;
  }[]>(
    `SELECT c.id, c.name,
            COUNT(DISTINCT b.id) AS board_count,
            COUNT(DISTINCT j.id) AS job_count
     FROM companies c
     LEFT JOIN boards b ON b.company_id = c.id AND b.user_id = c.user_id
     LEFT JOIN jobs j ON j.board = b.name AND j.user_id = c.user_id
     WHERE c.user_id = ?
     GROUP BY c.id, c.name
     ORDER BY c.name`,
    userId
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    boardCount: r.board_count,
    jobCount: r.job_count,
  }));
}

export async function upsertCompany(
  db: Database,
  userId: string,
  name: string
): Promise<string> {
  const existing = await db.get<{ id: string } | undefined>(
    'SELECT id FROM companies WHERE name = ? AND user_id = ?',
    name,
    userId
  );
  if (existing) return existing.id;

  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    'INSERT INTO companies (id, name, user_id, created_at) VALUES (?, ?, ?, ?)',
    id,
    name,
    userId,
    now
  );
  return id;
}

export async function deleteCompany(
  db: Database,
  userId: string,
  companyId: string
): Promise<void> {
  await db.run('DELETE FROM companies WHERE id = ? AND user_id = ?', companyId, userId);
}

export async function searchCompanies(
  db: Database,
  userId: string,
  q: string,
  limit = 10
): Promise<{ id: string; name: string }[]> {
  const rows = await db.all<{ id: string; name: string }[]>(
    `SELECT id, name FROM companies WHERE user_id = ? AND name LIKE ? ORDER BY name LIMIT ?`,
    userId,
    `%${q}%`,
    limit
  );
  return rows;
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function listTagsForUser(
  db: Database,
  userId: string
): Promise<{ id: string; name: string; color: string; boardCount: number }[]> {
  const rows = await db.all<{
    id: string;
    name: string;
    color: string;
    board_count: number;
  }[]>(
    `SELECT t.id, t.name, t.color, COUNT(bt.board_id) AS board_count
     FROM tags t
     LEFT JOIN board_tags bt ON bt.tag_id = t.id AND bt.user_id = t.user_id
     WHERE t.user_id = ?
     GROUP BY t.id, t.name, t.color
     ORDER BY t.name`,
    userId
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    boardCount: r.board_count,
  }));
}

export async function createTag(
  db: Database,
  userId: string,
  name: string,
  color: string
): Promise<string> {
  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    'INSERT INTO tags (id, name, color, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    name,
    color,
    userId,
    now
  );
  return id;
}

export async function updateTag(
  db: Database,
  userId: string,
  tagId: string,
  name: string,
  color: string
): Promise<void> {
  await db.run(
    'UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?',
    name,
    color,
    tagId,
    userId
  );
}

export async function deleteTag(
  db: Database,
  userId: string,
  tagId: string
): Promise<void> {
  await db.run('DELETE FROM tags WHERE id = ? AND user_id = ?', tagId, userId);
}

export async function setBoardTags(
  db: Database,
  boardId: string,
  userId: string,
  tagIds: string[]
): Promise<void> {
  await db.run('DELETE FROM board_tags WHERE board_id = ? AND user_id = ?', boardId, userId);
  for (const tagId of tagIds) {
    await db.run(
      'INSERT OR IGNORE INTO board_tags (board_id, tag_id, user_id) VALUES (?, ?, ?)',
      boardId,
      tagId,
      userId
    );
  }
}

// ── Jobs list with filters ────────────────────────────────────────────────────

export interface ListJobsParams {
  q?: string;
  boardIds?: string[];
  companyIds?: string[];
  tagIds?: string[];
  locationKey?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'title';
}

export async function listJobsForUser(
  db: Database,
  userId: string,
  params: ListJobsParams = {}
): Promise<{ jobs: any[]; total: number }> {
  const {
    q = '',
    boardIds = [],
    companyIds = [],
    tagIds = [],
    locationKey = '',
    dateFrom = '',
    dateTo = '',
    page = 1,
    limit = 25,
    sortBy = 'newest',
  } = params;

  const orderBy =
    sortBy === 'oldest' ? 'j.first_seen_at ASC' :
    sortBy === 'title'  ? 'j.title ASC, j.first_seen_at DESC' :
    'j.first_seen_at DESC';

  const conditions: string[] = ['j.user_id = ?'];
  const countParams: unknown[] = [userId];

  const needsBoardJoin = companyIds.length > 0 || tagIds.length > 0 || locationKey;
  let joinClause = '';

  if (needsBoardJoin) {
    joinClause = 'JOIN boards b ON b.name = j.board AND b.user_id = j.user_id';
  }

  if (boardIds.length > 0) {
    if (!needsBoardJoin) {
      joinClause = 'JOIN boards b ON b.name = j.board AND b.user_id = j.user_id';
    }
    const ph = boardIds.map(() => '?').join(',');
    conditions.push(`b.id IN (${ph})`);
    countParams.push(...boardIds);
  }

  if (companyIds.length > 0) {
    const ph = companyIds.map(() => '?').join(',');
    conditions.push(`b.company_id IN (${ph})`);
    countParams.push(...companyIds);
  }

  if (tagIds.length > 0) {
    const ph = tagIds.map(() => '?').join(',');
    conditions.push(
      `EXISTS (SELECT 1 FROM board_tags bt WHERE bt.board_id = b.id AND bt.tag_id IN (${ph}))`
    );
    countParams.push(...tagIds);
  }

  if (locationKey) {
    conditions.push(`b.location_key LIKE ?`);
    countParams.push(`${locationKey}%`);
  }

  if (q) {
    conditions.push(`(j.title LIKE ? OR j.company LIKE ? OR j.location LIKE ?)`);
    const like = `%${q}%`;
    countParams.push(like, like, like);
  }

  if (dateFrom) {
    conditions.push(`j.first_seen_at >= ?`);
    countParams.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`j.first_seen_at <= ?`);
    countParams.push(dateTo + 'T23:59:59.999Z');
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (Math.max(1, page) - 1) * limit;

  const countRow = await db.get<{ total: number }>(
    `SELECT COUNT(*) as total FROM jobs j ${joinClause} ${where}`,
    countParams
  );
  const total = countRow?.total ?? 0;

  const selectParams = [...countParams, limit, offset];
  const jobs = await db.all(
    `SELECT j.id, j.title, j.company, j.location, j.url,
            j.posted_date AS postedDate, j.board,
            j.first_seen_at AS firstSeenAt, j.last_seen_at AS lastSeenAt
     FROM jobs j ${joinClause} ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    selectParams
  );

  return { jobs, total };
}

export async function deleteJobsByIds(
  db: Database,
  userId: string,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;
  const ph = ids.map(() => '?').join(',');
  const result = await db.run(
    `DELETE FROM jobs WHERE id IN (${ph}) AND user_id = ?`,
    [...ids, userId]
  );
  return result.changes ?? 0;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

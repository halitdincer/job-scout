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

  return db;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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

export async function loadBoards(db: Database): Promise<any[]> {
  const rows = await db.all<{ config_json: string }[]>('SELECT config_json FROM boards ORDER BY name');
  return rows.map((row) => JSON.parse(row.config_json));
}

export async function loadBoardsForUser(db: Database, userId: string): Promise<any[]> {
  const rows = await db.all<{ id: string; config_json: string }[]>(
    'SELECT id, config_json FROM boards WHERE user_id = ? ORDER BY name',
    userId
  );
  return rows.map((row) => ({ id: row.id, ...JSON.parse(row.config_json) }));
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
  const name = board?.name ?? '';
  const url = board?.url ?? '';

  await db.run(
    `INSERT INTO boards (id, name, url, config_json, updated_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    name,
    url,
    JSON.stringify(board),
    now,
    userId
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
  const name = board?.name ?? '';
  const url = board?.url ?? '';

  const result = await db.run(
    `UPDATE boards SET name = ?, url = ?, config_json = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    name,
    url,
    JSON.stringify(board),
    now,
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
  const row = await db.get<{ id: string; config_json: string } | undefined>(
    'SELECT id, config_json FROM boards WHERE id = ? AND user_id = ?',
    id,
    userId
  );
  if (!row) return null;
  return { id: row.id, ...JSON.parse(row.config_json) };
}

export async function deleteBoard(db: Database, name: string): Promise<number> {
  const result = await db.run('DELETE FROM boards WHERE name = ?', name);
  return result.changes ?? 0;
}

function generateUuid(): string {
  // Simple UUID v4 without external deps
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

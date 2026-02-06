import fs from 'fs-extra';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Job } from '../types';

export interface DbOptions {
  dbPath: string;
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

  return db;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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

export async function loadBoards(db: Database): Promise<any[]> {
  const rows = await db.all<{ config_json: string }[]>('SELECT config_json FROM boards ORDER BY name');
  return rows.map((row) => JSON.parse(row.config_json));
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

export async function deleteBoard(db: Database, name: string): Promise<number> {
  const result = await db.run('DELETE FROM boards WHERE name = ?', name);
  return result.changes ?? 0;
}

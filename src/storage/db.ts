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
  sourceId: string;
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
  sourcesTotal: number;
  sourcesDone: number;
  jobsFound: number;
  jobsNew: number;
}

export interface ScrapeRunSourceRow {
  id: string;
  runId: string;
  sourceId: string;
  sourceName: string;
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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      analyze_url TEXT,
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      user_id TEXT,
      company TEXT,
      location TEXT,
      sel_job_card TEXT,
      sel_title TEXT,
      sel_link TEXT,
      sel_next_page TEXT,
      pag_type TEXT,
      pag_url_template TEXT,
      pag_max_pages INTEGER,
      pag_delay_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      state TEXT NOT NULL DEFAULT 'active',
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      url TEXT NOT NULL,
      posted_date TEXT,
      source TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      user_id TEXT,
      found_in_run_id TEXT,
      source_id TEXT
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      jobs_found INTEGER NOT NULL DEFAULT 0,
      jobs_new INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running',
      error_msg TEXT
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'cron',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      sources_total INTEGER NOT NULL DEFAULT 0,
      sources_done INTEGER NOT NULL DEFAULT 0,
      jobs_found INTEGER NOT NULL DEFAULT 0,
      jobs_new INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scrape_run_sources (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      jobs_found INTEGER NOT NULL DEFAULT 0,
      jobs_new INTEGER NOT NULL DEFAULT 0,
      error_msg TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(name, user_id)
    );

    CREATE TABLE IF NOT EXISTS source_tags (
      source_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (source_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sources_user_id ON sources(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);
    CREATE INDEX IF NOT EXISTS idx_scrape_runs_user_id ON scrape_runs(user_id);
    CREATE INDEX IF NOT EXISTS idx_scrape_run_sources_run_id ON scrape_run_sources(run_id);
    CREATE INDEX IF NOT EXISTS idx_source_tags_source_id ON source_tags(source_id);
  `);

  await runMigrations(db);

  return db;
}

type TableColumn = { name: string };

async function hasColumn(db: Database, tableName: string, columnName: string): Promise<boolean> {
  const columns = await db.all<TableColumn[]>(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
}

async function ensureColumn(
  db: Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  if (await hasColumn(db, tableName, columnName)) return;
  await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
}

async function runMigrations(db: Database): Promise<void> {
  // Sources columns expected by current API responses and CRUD.
  await ensureColumn(db, 'sources', 'analyze_url', 'analyze_url TEXT');
  await ensureColumn(db, 'sources', 'company', 'company TEXT');
  await ensureColumn(db, 'sources', 'location', 'location TEXT');
  await ensureColumn(db, 'sources', 'sel_job_card', 'sel_job_card TEXT');
  await ensureColumn(db, 'sources', 'sel_title', 'sel_title TEXT');
  await ensureColumn(db, 'sources', 'sel_link', 'sel_link TEXT');
  await ensureColumn(db, 'sources', 'sel_next_page', 'sel_next_page TEXT');
  await ensureColumn(db, 'sources', 'pag_type', 'pag_type TEXT');
  await ensureColumn(db, 'sources', 'pag_url_template', 'pag_url_template TEXT');
  await ensureColumn(db, 'sources', 'pag_max_pages', 'pag_max_pages INTEGER');
  await ensureColumn(db, 'sources', 'pag_delay_ms', 'pag_delay_ms INTEGER');
  await ensureColumn(db, 'sources', 'created_at', 'created_at TEXT');
  await ensureColumn(db, 'sources', 'state', "state TEXT NOT NULL DEFAULT 'active'");
  await ensureColumn(db, 'sources', 'deleted_at', 'deleted_at TEXT');

  // Jobs columns used by multi-run tracking and source linking.
  await ensureColumn(db, 'jobs', 'found_in_run_id', 'found_in_run_id TEXT');
  await ensureColumn(db, 'jobs', 'source_id', 'source_id TEXT');
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ── Legacy run functions (kept for historical data) ───────────────────────────

export async function createRun(db: Database, sourceId: string, userId: string): Promise<string> {
  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO runs (id, source_id, user_id, started_at, jobs_found, jobs_new, status)
     VALUES (?, ?, ?, ?, 0, 0, 'running')`,
    id,
    sourceId,
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
  sourceId?: string
): Promise<RunRow[]> {
  const conditions = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (sourceId) {
    conditions.push('source_id = ?');
    params.push(sourceId);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = await db.all<{
    id: string;
    source_id: string;
    user_id: string;
    started_at: string;
    finished_at: string | null;
    jobs_found: number;
    jobs_new: number;
    status: string;
    error_msg: string | null;
  }[]>(
    `SELECT id, source_id, user_id, started_at, finished_at, jobs_found, jobs_new, status, error_msg
     FROM runs ${where}
     ORDER BY started_at DESC
     LIMIT 100`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    sourceId: r.source_id,
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
    `INSERT INTO scrape_runs (id, user_id, triggered_by, started_at, status, sources_total, sources_done, jobs_found, jobs_new)
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
  sourcesDone: number,
  jobsFound: number,
  jobsNew: number
): Promise<void> {
  await db.run(
    `UPDATE scrape_runs SET sources_done = ?, jobs_found = ?, jobs_new = ? WHERE id = ?`,
    sourcesDone,
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

export async function createScrapeRunSource(
  db: Database,
  runId: string,
  sourceId: string,
  sourceName: string
): Promise<string> {
  const id = generateUuid();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO scrape_run_sources (id, run_id, source_id, source_name, started_at, status, jobs_found, jobs_new)
     VALUES (?, ?, ?, ?, ?, 'running', 0, 0)`,
    id,
    runId,
    sourceId,
    sourceName,
    now
  );
  return id;
}

export async function finishScrapeRunSource(
  db: Database,
  runSourceId: string,
  status: 'success' | 'error',
  jobsFound: number,
  jobsNew: number,
  errorMsg?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE scrape_run_sources SET finished_at = ?, status = ?, jobs_found = ?, jobs_new = ?, error_msg = ?
     WHERE id = ?`,
    now,
    status,
    jobsFound,
    jobsNew,
    errorMsg ?? null,
    runSourceId
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
    sources_total: number;
    sources_done: number;
    jobs_found: number;
    jobs_new: number;
  }[]>(
    `SELECT id, user_id, triggered_by, started_at, finished_at, status,
            sources_total, sources_done, jobs_found, jobs_new
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
    sourcesTotal: r.sources_total,
    sourcesDone: r.sources_done,
    jobsFound: r.jobs_found,
    jobsNew: r.jobs_new,
  }));
}

export async function getScrapeRunDetail(
  db: Database,
  runId: string,
  userId: string
): Promise<(ScrapeRunRow & { sources: ScrapeRunSourceRow[] }) | null> {
  const run = await db.get<{
    id: string;
    user_id: string;
    triggered_by: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    sources_total: number;
    sources_done: number;
    jobs_found: number;
    jobs_new: number;
  } | undefined>(
    `SELECT id, user_id, triggered_by, started_at, finished_at, status,
            sources_total, sources_done, jobs_found, jobs_new
     FROM scrape_runs
     WHERE id = ? AND user_id = ?`,
    runId,
    userId
  );

  if (!run) return null;

  const sourceRows = await db.all<{
    id: string;
    run_id: string;
    source_id: string;
    source_name: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    jobs_found: number;
    jobs_new: number;
    error_msg: string | null;
  }[]>(
    `SELECT id, run_id, source_id, source_name, started_at, finished_at,
            status, jobs_found, jobs_new, error_msg
     FROM scrape_run_sources
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
    sourcesTotal: run.sources_total,
    sourcesDone: run.sources_done,
    jobsFound: run.jobs_found,
    jobsNew: run.jobs_new,
    sources: sourceRows.map((b) => ({
      id: b.id,
      runId: b.run_id,
      sourceId: b.source_id,
      sourceName: b.source_name,
      startedAt: b.started_at,
      finishedAt: b.finished_at,
      status: b.status as ScrapeRunSourceRow['status'],
      jobsFound: b.jobs_found,
      jobsNew: b.jobs_new,
      errorMsg: b.error_msg,
    })),
  };
}

// ── Source CRUD ────────────────────────────────────────────────────────────────

function rowToSource(row: {
  id: string;
  name: string;
  url: string;
  analyze_url?: string | null;
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
  state?: string | null;
  deleted_at?: string | null;
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
    ...(row.analyze_url ? { analyzeUrl: row.analyze_url } : {}),
    ...(row.company ? { company: row.company } : {}),
    ...(row.location ? { location: row.location } : {}),
    state: row.state ?? 'active',
    deletedAt: row.deleted_at ?? null,
    selectors: {
      jobCard: row.sel_job_card ?? '',
      title: row.sel_title ?? '',
      link: row.sel_link ?? '',
      nextPage: row.sel_next_page ?? null,
    },
    ...(pagination ? { pagination } : {}),
  };
}

export async function loadSourcesForUser(db: Database, userId: string): Promise<any[]> {
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
    state: string | null;
    deleted_at: string | null;
    last_run_status: string | null;
    last_run_finished_at: string | null;
  }[]>(
    `SELECT b.id, b.name, b.url, b.analyze_url, b.company, b.location,
            b.sel_job_card, b.sel_title, b.sel_link, b.sel_next_page,
            b.pag_type, b.pag_url_template, b.pag_max_pages, b.pag_delay_ms,
            b.state, b.deleted_at,
            srb.status AS last_run_status,
            srb.finished_at AS last_run_finished_at
     FROM sources b
     LEFT JOIN scrape_run_sources srb ON srb.id = (
       SELECT srb2.id
       FROM scrape_run_sources srb2
       JOIN scrape_runs sr ON sr.id = srb2.run_id
       WHERE srb2.source_id = b.id AND sr.user_id = ?
       ORDER BY srb2.started_at DESC
       LIMIT 1
     )
     WHERE b.user_id = ? AND COALESCE(b.state, 'active') != 'deleted'
     ORDER BY b.name`,
    userId,
    userId
  );

  // Load tags for all sources in one query
  const sourceIds = rows.map((r) => r.id);
  const tagsBySource = new Map<string, { id: string; name: string; color: string }[]>();

  if (sourceIds.length > 0) {
    const placeholders = sourceIds.map(() => '?').join(',');
    const tagRows = await db.all<{
      source_id: string;
      tag_id: string;
      tag_name: string;
      tag_color: string;
    }[]>(
      `SELECT bt.source_id, t.id AS tag_id, t.name AS tag_name, t.color AS tag_color
       FROM source_tags bt
       JOIN tags t ON t.id = bt.tag_id
       WHERE bt.source_id IN (${placeholders})
       ORDER BY t.name`,
      sourceIds
    );
    for (const tr of tagRows) {
      if (!tagsBySource.has(tr.source_id)) tagsBySource.set(tr.source_id, []);
      tagsBySource.get(tr.source_id)!.push({ id: tr.tag_id, name: tr.tag_name, color: tr.tag_color });
    }
  }

  return rows.map((row) => ({
    ...rowToSource(row),
    tags: tagsBySource.get(row.id) ?? [],
    lastRun: row.last_run_status
      ? { status: row.last_run_status, finishedAt: row.last_run_finished_at }
      : null,
  }));
}

export async function loadDeletedSourcesForUser(db: Database, userId: string): Promise<any[]> {
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
    state: string | null;
    deleted_at: string | null;
  }[]>(
    `SELECT b.id, b.name, b.url, b.analyze_url, b.company, b.location,
            b.sel_job_card, b.sel_title, b.sel_link, b.sel_next_page,
            b.pag_type, b.pag_url_template, b.pag_max_pages, b.pag_delay_ms,
            b.state, b.deleted_at
     FROM sources b
     WHERE b.user_id = ? AND COALESCE(b.state, 'active') = 'deleted'
     ORDER BY b.deleted_at DESC, b.name`,
    userId
  );

  return rows.map((row) => ({ ...rowToSource(row), tags: [], lastRun: null }));
}

export async function loadRunnableSourcesForUser(db: Database, userId: string): Promise<any[]> {
  const sources = await loadSourcesForUser(db, userId);
  return sources.filter((b) => b.state === 'active');
}

export async function listSourceNames(db: Database): Promise<string[]> {
  const rows = await db.all<{ name: string }[]>('SELECT name FROM sources ORDER BY name');
  return rows.map((row) => row.name);
}

export async function upsertSource(db: Database, source: any): Promise<void> {
  const now = new Date().toISOString();
  const name = source?.name ?? '';
  const url = source?.url ?? '';

  await db.run(
    `
    INSERT INTO sources (name, url, config_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      url = excluded.url,
      config_json = excluded.config_json,
      updated_at = excluded.updated_at
    `,
    name,
    url,
    JSON.stringify(source),
    now
  );
}

export async function insertSource(
  db: Database,
  source: any,
  userId: string,
  tagIds?: string[]
): Promise<string> {
  const now = new Date().toISOString();
  const id = generateUuid();

  await db.run(
     `INSERT INTO sources (id, name, url, analyze_url, config_json, updated_at, user_id,
       company, location, sel_job_card, sel_title, sel_link, sel_next_page,
       pag_type, pag_url_template, pag_max_pages, pag_delay_ms, created_at,
       state, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    source?.name ?? '',
    source?.url ?? '',
    source?.analyzeUrl ?? null,
    JSON.stringify(source),
    now,
    userId,
    source?.company ?? null,
    source?.location ?? null,
    source?.selectors?.jobCard ?? null,
    source?.selectors?.title ?? null,
    source?.selectors?.link ?? null,
    source?.selectors?.nextPage ?? null,
    source?.pagination?.type ?? null,
    source?.pagination?.urlTemplate ?? null,
    source?.pagination?.maxPages ?? null,
    source?.pagination?.delayMs ?? null,
    now,
    source?.state ?? 'active',
    null
  );

  if (tagIds && tagIds.length > 0) {
    await setSourceTags(db, id, userId, tagIds);
  }

  return id;
}

export async function updateSourceById(
  db: Database,
  id: string,
  source: any,
  userId: string,
  tagIds?: string[]
): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await db.run(
    `UPDATE sources SET
       name = ?, url = ?, analyze_url = ?, config_json = ?, updated_at = ?,
       company = ?, location = ?,
       sel_job_card = ?, sel_title = ?, sel_link = ?, sel_next_page = ?,
       pag_type = ?, pag_url_template = ?, pag_max_pages = ?, pag_delay_ms = ?
     WHERE id = ? AND user_id = ?`,
    source?.name ?? '',
    source?.url ?? '',
    source?.analyzeUrl ?? null,
    JSON.stringify(source),
    now,
    source?.company ?? null,
    source?.location ?? null,
    source?.selectors?.jobCard ?? null,
    source?.selectors?.title ?? null,
    source?.selectors?.link ?? null,
    source?.selectors?.nextPage ?? null,
    source?.pagination?.type ?? null,
    source?.pagination?.urlTemplate ?? null,
    source?.pagination?.maxPages ?? null,
    source?.pagination?.delayMs ?? null,
    id,
    userId
  );

  if ((result.changes ?? 0) > 0 && tagIds !== undefined) {
    await setSourceTags(db, id, userId, tagIds);
  }

  return (result.changes ?? 0) > 0;
}

export async function deleteSourceById(
  db: Database,
  id: string,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db.run(
    `UPDATE sources
     SET state = 'deleted', deleted_at = ?
     WHERE id = ? AND user_id = ? AND COALESCE(state, 'active') != 'deleted'`,
    now,
    id,
    userId
  );
  return (result.changes ?? 0) > 0;
}

export async function toggleSourceStateById(
  db: Database,
  id: string,
  userId: string
): Promise<boolean> {
  const row = await db.get<{ state: string | null }>(
    'SELECT state FROM sources WHERE id = ? AND user_id = ?',
    id,
    userId
  );
  if (!row) return false;
  const current = row.state ?? 'active';
  if (current === 'deleted') return false;
  const next = current === 'active' ? 'inactive' : 'active';
  const result = await db.run(
    `UPDATE sources SET state = ?, deleted_at = NULL WHERE id = ? AND user_id = ?`,
    next,
    id,
    userId
  );
  return (result.changes ?? 0) > 0;
}

export async function restoreSourceById(
  db: Database,
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db.run(
    `UPDATE sources SET state = 'inactive', deleted_at = NULL
     WHERE id = ? AND user_id = ? AND COALESCE(state, 'active') = 'deleted'`,
    id,
    userId
  );
  return (result.changes ?? 0) > 0;
}

export async function getSourceById(
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
    state: string | null;
    deleted_at: string | null;
  } | undefined>(
    `SELECT b.id, b.name, b.url, b.analyze_url, b.company, b.location,
            b.sel_job_card, b.sel_title, b.sel_link, b.sel_next_page,
            b.pag_type, b.pag_url_template, b.pag_max_pages, b.pag_delay_ms,
            b.state, b.deleted_at
     FROM sources b
     WHERE b.id = ? AND b.user_id = ?`,
    id,
    userId
  );
  if (!row) return null;

  const tagRows = await db.all<{ id: string; name: string; color: string }[]>(
    `SELECT t.id, t.name, t.color
     FROM source_tags bt
     JOIN tags t ON t.id = bt.tag_id
     WHERE bt.source_id = ?
     ORDER BY t.name`,
    id
  );

  return { ...rowToSource(row), tags: tagRows };
}

async function nextCopyName(db: Database, userId: string, baseName: string): Promise<string> {
  const first = `${baseName} (Copy)`;
  const firstExists = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM sources WHERE user_id = ? AND name = ?',
    userId,
    first
  );
  if ((firstExists?.count ?? 0) === 0) return first;

  let i = 2;
  while (i < 5000) {
    const candidate = `${baseName} (Copy ${i})`;
    const exists = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM sources WHERE user_id = ? AND name = ?',
      userId,
      candidate
    );
    if ((exists?.count ?? 0) === 0) return candidate;
    i++;
  }
  return `${baseName} (Copy ${Date.now()})`;
}

export async function duplicateSourceById(
  db: Database,
  id: string,
  userId: string
): Promise<string | null> {
  const source = await getSourceById(db, id, userId);
  if (!source) return null;

  const name = await nextCopyName(db, userId, source.name);
  const tagIds = (source.tags ?? []).map((t: { id: string }) => t.id);
  const cloned = {
    ...source,
    name,
    state: 'inactive',
  };
  delete cloned.id;

  return insertSource(db, cloned, userId, tagIds);
}

export async function listJobsForSourceIdForUser(
  db: Database,
  sourceId: string,
  userId: string,
  page = 1,
  limit = 25
): Promise<{ jobs: any[]; total: number }> {
  const source = await db.get<{ id: string; name: string }>(
    'SELECT id, name FROM sources WHERE id = ? AND user_id = ?',
    sourceId,
    userId
  );
  if (!source) return { jobs: [], total: 0 };

  const offset = (Math.max(1, page) - 1) * limit;
  const count = await db.get<{ total: number }>(
    `SELECT COUNT(*) as total
     FROM jobs
     WHERE user_id = ? AND (source_id = ? OR (source_id IS NULL AND source = ?))`,
    userId,
    sourceId,
    source.name
  );

  const jobs = await db.all(
    `SELECT id, title, company, location, url, source,
            first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt
     FROM jobs
     WHERE user_id = ? AND (source_id = ? OR (source_id IS NULL AND source = ?))
     ORDER BY first_seen_at DESC
     LIMIT ? OFFSET ?`,
    userId,
    sourceId,
    source.name,
    limit,
    offset
  );

  return { jobs, total: count?.total ?? 0 };
}

export async function deleteSource(db: Database, name: string): Promise<number> {
  const result = await db.run('DELETE FROM sources WHERE name = ?', name);
  return result.changes ?? 0;
}

export async function loadSources(db: Database): Promise<any[]> {
  const rows = await db.all<{ config_json: string }[]>('SELECT config_json FROM sources ORDER BY name');
  return rows.map((row) => JSON.parse(row.config_json));
}

// ── Job upsert ────────────────────────────────────────────────────────────────

export async function upsertJobs(db: Database, jobs: Job[], source: string): Promise<Job[]> {
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
        id, title, company, location, url, posted_date, source, first_seen_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = await db.prepare(`
      UPDATE jobs
      SET title = ?, company = ?, location = ?, url = ?, source = ?, last_seen_at = ?
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
          null,
          source,
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
          source,
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
  source: string,
  userId: string,
  runId?: string,
  sourceId?: string
): Promise<Job[]> {
  if (jobs.length === 0) return [];

  const now = new Date().toISOString();
  let resolvedSourceId = sourceId;

  if (!resolvedSourceId) {
    const sourceRow = await db.get<{ id: string }>(
      `SELECT id FROM sources WHERE user_id = ? AND name = ? ORDER BY updated_at DESC LIMIT 1`,
      userId,
      source
    );
    resolvedSourceId = sourceRow?.id;
  }
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
        id, title, company, location, url, posted_date, source, first_seen_at, last_seen_at, user_id, found_in_run_id, source_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = await db.prepare(`
      UPDATE jobs
      SET title = ?, company = ?, location = ?, url = ?, source = ?, last_seen_at = ?, source_id = COALESCE(?, source_id)
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
          null,
          source,
          now,
          now,
          userId,
          runId ?? null,
          resolvedSourceId ?? null
        );
        newJobs.push(job);
      } else {
        await updateStmt.run(
          job.title,
          job.company,
          job.location,
          job.url,
          source,
          now,
          resolvedSourceId ?? null,
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

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function listTagsForUser(
  db: Database,
  userId: string
): Promise<{ id: string; name: string; color: string; sourceCount: number }[]> {
  const rows = await db.all<{
    id: string;
    name: string;
    color: string;
    source_count: number;
  }[]>(
    `SELECT t.id, t.name, t.color, COUNT(bt.source_id) AS source_count
     FROM tags t
     LEFT JOIN source_tags bt ON bt.tag_id = t.id AND bt.user_id = t.user_id
     WHERE t.user_id = ?
     GROUP BY t.id, t.name, t.color
     ORDER BY t.name`,
    userId
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    sourceCount: r.source_count,
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

export async function setSourceTags(
  db: Database,
  sourceId: string,
  userId: string,
  tagIds: string[]
): Promise<void> {
  await db.run('DELETE FROM source_tags WHERE source_id = ? AND user_id = ?', sourceId, userId);
  for (const tagId of tagIds) {
    await db.run(
      'INSERT OR IGNORE INTO source_tags (source_id, tag_id, user_id) VALUES (?, ?, ?)',
      sourceId,
      tagId,
      userId
    );
  }
}

// ── Jobs list with filters ────────────────────────────────────────────────────

export interface ListJobsParams {
  q?: string;
  sourceIds?: string[];
  tagIds?: string[];
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
    sourceIds = [],
    tagIds = [],
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

  const needsSourceJoin = tagIds.length > 0;
  let joinClause = '';

  if (needsSourceJoin) {
    joinClause = `JOIN sources b
      ON b.user_id = j.user_id
     AND (b.id = j.source_id OR (j.source_id IS NULL AND b.name = j.source))`;
  }

  if (sourceIds.length > 0) {
    if (!needsSourceJoin) {
      joinClause = `JOIN sources b
        ON b.user_id = j.user_id
       AND (b.id = j.source_id OR (j.source_id IS NULL AND b.name = j.source))`;
    }
    const ph = sourceIds.map(() => '?').join(',');
    conditions.push(`b.id IN (${ph})`);
    countParams.push(...sourceIds);
  }

  if (tagIds.length > 0) {
    const ph = tagIds.map(() => '?').join(',');
    conditions.push(
      `EXISTS (SELECT 1 FROM source_tags bt WHERE bt.source_id = b.id AND bt.tag_id IN (${ph}))`
    );
    countParams.push(...tagIds);
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
    `SELECT j.id, j.title, j.company, j.location, j.url, j.source,
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

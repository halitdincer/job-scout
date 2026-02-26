import { Database } from 'sqlite';
import { scrapeSource } from '../../src/scraper';
import {
  loadRunnableSourcesForUser,
  upsertJobsForUser,
  createScrapeRun,
  updateScrapeRunProgress,
  finishScrapeRun,
  createScrapeRunSource,
  finishScrapeRunSource,
} from '../../src/storage/db';

interface UserRow {
  id: string;
  email: string;
}

async function runScrapeSession(
  db: Database,
  userId: string,
  sources: any[],
  runId: string
): Promise<void> {
  await db.run(
    'UPDATE scrape_runs SET sources_total = ? WHERE id = ?',
    sources.length,
    runId
  );

  let sourcesDone = 0;
  let totalJobsFound = 0;
  let totalJobsNew = 0;
  let errorCount = 0;

  for (const source of sources) {
    const runSourceId = await createScrapeRunSource(db, runId, source.id, source.name);
    try {
      const result = await scrapeSource(source);
      const newJobs = await upsertJobsForUser(
        db,
        result.jobs,
        source.name,
        userId,
        runId,
        source.id
      );
      await finishScrapeRunSource(db, runSourceId, 'success', result.jobs.length, newJobs.length);
      totalJobsFound += result.jobs.length;
      totalJobsNew += newJobs.length;
      console.log(
        `[scrape] ${source.name}: ${result.jobs.length} found, ${newJobs.length} new`
      );
    } catch (err) {
      await finishScrapeRunSource(db, runSourceId, 'error', 0, 0, String(err));
      errorCount++;
      console.error(`[scrape] Failed to scrape source ${source.name}:`, err);
    }

    sourcesDone++;
    await updateScrapeRunProgress(db, runId, sourcesDone, totalJobsFound, totalJobsNew);
  }

  const status =
    errorCount === 0 ? 'success' : errorCount === sources.length ? 'error' : 'partial';
  await finishScrapeRun(db, runId, status);
}

export async function scrapeAllSources(
  db: Database,
  triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<void> {
  console.log('[cron] scrapeAllSources started at', new Date().toISOString());

  let users: UserRow[];
  try {
    users = await db.all<UserRow[]>('SELECT id, email FROM users');
  } catch (err) {
    console.error('[cron] Failed to load users:', err);
    return;
  }

  for (const user of users) {
    let sources: any[];
    try {
      sources = await loadRunnableSourcesForUser(db, user.id);
    } catch (err) {
      console.error(`[cron] Failed to load sources for user ${user.email}:`, err);
      continue;
    }

    if (sources.length === 0) continue;

    console.log(`[cron] Scraping ${sources.length} source(s) for user ${user.email}`);

    const runId = await createScrapeRun(db, user.id, triggeredBy);
    try {
      await runScrapeSession(db, user.id, sources, runId);
    } catch (err) {
      await finishScrapeRun(db, runId, 'error');
      console.error(`[cron] Scrape session failed for user ${user.email}:`, err);
    }
  }

  console.log('[cron] scrapeAllSources finished at', new Date().toISOString());
}

export async function scrapeForUser(
  db: Database,
  userId: string,
  runId: string
): Promise<void> {
  const sources = await loadRunnableSourcesForUser(db, userId);
  await runScrapeSession(db, userId, sources, runId);
}

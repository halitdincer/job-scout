import { Database } from 'sqlite';
import { scrapeBoard } from '../../src/scraper';
import {
  loadRunnableBoardsForUser,
  upsertJobsForUser,
  createScrapeRun,
  updateScrapeRunProgress,
  finishScrapeRun,
  createScrapeRunBoard,
  finishScrapeRunBoard,
} from '../../src/storage/db';

interface UserRow {
  id: string;
  email: string;
}

async function runScrapeSession(
  db: Database,
  userId: string,
  boards: any[],
  runId: string
): Promise<void> {
  await db.run(
    'UPDATE scrape_runs SET boards_total = ? WHERE id = ?',
    boards.length,
    runId
  );

  let boardsDone = 0;
  let totalJobsFound = 0;
  let totalJobsNew = 0;
  let errorCount = 0;

  for (const board of boards) {
    const runBoardId = await createScrapeRunBoard(db, runId, board.id, board.name);
    try {
      const result = await scrapeBoard(board);
      const newJobs = await upsertJobsForUser(
        db,
        result.jobs,
        board.name,
        userId,
        runId,
        board.id,
        board.companyId ?? null
      );
      await finishScrapeRunBoard(db, runBoardId, 'success', result.jobs.length, newJobs.length);
      totalJobsFound += result.jobs.length;
      totalJobsNew += newJobs.length;
      console.log(
        `[scrape] ${board.name}: ${result.jobs.length} found, ${newJobs.length} new`
      );
    } catch (err) {
      await finishScrapeRunBoard(db, runBoardId, 'error', 0, 0, String(err));
      errorCount++;
      console.error(`[scrape] Failed to scrape board ${board.name}:`, err);
    }

    boardsDone++;
    await updateScrapeRunProgress(db, runId, boardsDone, totalJobsFound, totalJobsNew);
  }

  const status =
    errorCount === 0 ? 'success' : errorCount === boards.length ? 'error' : 'partial';
  await finishScrapeRun(db, runId, status);
}

export async function scrapeAllBoards(
  db: Database,
  triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<void> {
  console.log('[cron] scrapeAllBoards started at', new Date().toISOString());

  let users: UserRow[];
  try {
    users = await db.all<UserRow[]>('SELECT id, email FROM users');
  } catch (err) {
    console.error('[cron] Failed to load users:', err);
    return;
  }

  for (const user of users) {
    let boards: any[];
    try {
      boards = await loadRunnableBoardsForUser(db, user.id);
    } catch (err) {
      console.error(`[cron] Failed to load boards for user ${user.email}:`, err);
      continue;
    }

    if (boards.length === 0) continue;

    console.log(`[cron] Scraping ${boards.length} board(s) for user ${user.email}`);

    const runId = await createScrapeRun(db, user.id, triggeredBy);
    try {
      await runScrapeSession(db, user.id, boards, runId);
    } catch (err) {
      await finishScrapeRun(db, runId, 'error');
      console.error(`[cron] Scrape session failed for user ${user.email}:`, err);
    }
  }

  console.log('[cron] scrapeAllBoards finished at', new Date().toISOString());
}

export async function scrapeForUser(
  db: Database,
  userId: string,
  runId: string
): Promise<void> {
  const boards = await loadRunnableBoardsForUser(db, userId);
  await runScrapeSession(db, userId, boards, runId);
}

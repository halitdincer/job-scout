import { Database } from 'sqlite';
import { scrapeBoard } from '../../src/scraper';
import { loadBoardsForUser, upsertJobsForUser, createRun, finishRun } from '../../src/storage/db';

interface UserRow {
  id: string;
  email: string;
}

export async function scrapeAllBoards(db: Database): Promise<void> {
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
      boards = await loadBoardsForUser(db, user.id);
    } catch (err) {
      console.error(`[cron] Failed to load boards for user ${user.email}:`, err);
      continue;
    }

    if (boards.length === 0) continue;

    console.log(`[cron] Scraping ${boards.length} board(s) for user ${user.email}`);

    for (const board of boards) {
      const runId = await createRun(db, board.id, user.id);
      try {
        const result = await scrapeBoard(board);
        const newJobs = await upsertJobsForUser(db, result.jobs, board.name, user.id, runId);
        await finishRun(db, runId, result.jobs.length, newJobs.length, 'success');
        console.log(
          `[cron] ${board.name}: ${result.jobs.length} found, ${newJobs.length} new (user: ${user.email})`
        );
      } catch (err) {
        await finishRun(db, runId, 0, 0, 'error', String(err));
        console.error(`[cron] Failed to scrape board ${board.name} for user ${user.email}:`, err);
      }
    }
  }

  console.log('[cron] scrapeAllBoards finished at', new Date().toISOString());
}

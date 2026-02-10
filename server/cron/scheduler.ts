import cron from 'node-cron';
import { Database } from 'sqlite';
import { scrapeAllBoards } from './scrapeAllBoards';

export function startScheduler(db: Database): void {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await scrapeAllBoards(db);
    } catch (err) {
      console.error('[cron] Unhandled error in scrapeAllBoards:', err);
    }
  });

  console.log('[cron] Scheduler started — runs every 6 hours');
}

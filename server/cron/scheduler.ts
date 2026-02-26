import cron from 'node-cron';
import { Database } from 'sqlite';
import { scrapeAllSources } from './scrapeAllSources';

export function startScheduler(db: Database): void {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await scrapeAllSources(db);
    } catch (err) {
      console.error('[cron] Unhandled error in scrapeAllSources:', err);
    }
  });

  console.log('[cron] Scheduler started — runs every 6 hours');
}

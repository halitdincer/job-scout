import 'dotenv/config';
import { openDb } from '../src/storage/db';
import { createApp } from './app';
import { startScheduler } from './cron/scheduler';

const DB_PATH = process.env.DB_PATH ?? './data/jobscout.sqlite';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const db = await openDb({ dbPath: DB_PATH });
  console.log(`[server] Database opened at ${DB_PATH}`);

  const app = createApp(db);

  startScheduler(db);

  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});

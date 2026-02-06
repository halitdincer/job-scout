import fs from 'fs-extra';
import path from 'path';
import { scrapeBoard } from '../src/scraper';
import { BoardConfig, Job } from '../src/types';
import { loadBoards, openDb, upsertJobs } from '../src/storage/db';

const DEFAULT_DB = path.join(__dirname, '../data/jobscout.sqlite');
const OUTPUT_DIR = path.join(__dirname, '../web/public/data');

async function main() {
  const db = await openDb({ dbPath: DEFAULT_DB });
  const boards: BoardConfig[] = await loadBoards(db);

  if (boards.length === 0) {
    console.error('No boards found in SQLite. Use --add-board to add one.');
    await db.close();
    process.exit(1);
  }

  const allJobs: Job[] = [];

  for (const board of boards) {
    const result = await scrapeBoard(board);
    const newJobs = await upsertJobs(db, result.jobs, board.name);

    const withBoard = result.jobs.map((job) => ({ ...job, board: board.name }));
    allJobs.push(...withBoard);

    if (newJobs.length > 0) {
      console.log(`New jobs on ${board.name}: ${newJobs.length}`);
    }
  }

  await db.close();

  allJobs.sort((a, b) => (a.postedDate || '').localeCompare(b.postedDate || '')).reverse();

  await fs.ensureDir(OUTPUT_DIR);

  await fs.writeJson(
    path.join(OUTPUT_DIR, 'jobs.json'),
    {
      generatedAt: new Date().toISOString(),
      jobs: allJobs,
    },
    { spaces: 2 }
  );

  await fs.writeJson(
    path.join(OUTPUT_DIR, 'boards.json'),
    {
      generatedAt: new Date().toISOString(),
      boards,
    },
    { spaces: 2 }
  );

  console.log('Static data updated.');
}

main().catch((error) => {
  console.error('Data build failed:', error);
  process.exit(1);
});

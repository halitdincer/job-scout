import fs from 'fs-extra';
import path from 'path';
import { scrapeBoard } from './scraper';
import { BoardConfig, Job } from './types';
import { deleteBoard, listBoardNames, loadBoards, openDb, upsertBoard, upsertJobs } from './storage/db';

const DEFAULT_DB = path.join(__dirname, '../data/jobscout.sqlite');

type CliArgs = {
  dbPath: string;
  help: boolean;
  days?: number;
  addBoardPath?: string;
  listBoards?: boolean;
  removeBoard?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {
    dbPath: DEFAULT_DB,
    help: false,
    days: undefined,
    addBoardPath: undefined,
    listBoards: false,
    removeBoard: undefined,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--db' && args[i + 1]) {
      result.dbPath = args[i + 1];
      i += 1;
    } else if (arg === '--days' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        result.days = parsed;
      }
      i += 1;
    } else if (arg === '--add-board' && args[i + 1]) {
      result.addBoardPath = args[i + 1];
      i += 1;
    } else if (arg === '--list-boards') {
      result.listBoards = true;
    } else if (arg === '--remove-board' && args[i + 1]) {
      result.removeBoard = args[i + 1];
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

function printHelp() {
  console.log('JobScout - run once job scraper');
  console.log('');
  console.log('Usage:');
  console.log('  node dist/index.js --db data/jobscout.sqlite');
  console.log('');
  console.log('Options:');
  console.log('  --db <path>       Path to SQLite database');
  console.log('  --days <number>   Only show jobs posted within the last N days (if postedDate is available)');
  console.log('  --add-board <path>  Add or update a board from a JSON file');
  console.log('  --list-boards       List board names stored in SQLite');
  console.log('  --remove-board <name>  Remove a board by name');
  console.log('  -h, --help        Show this help');
}

function printNewJobs(jobs: Job[], board: string) {
  for (const job of jobs) {
    const posted = job.postedDate ? ` | Posted: ${job.postedDate}` : '';
    console.log(`[${board}] ${job.title} @ ${job.company} — ${job.location}`);
    console.log(`${job.url}${posted}`);
    console.log('');
  }
}

function isWithinDays(postedDate: string, days: number) {
  const parsed = Date.parse(postedDate);
  if (Number.isNaN(parsed)) return false;
  const diffMs = Date.now() - parsed;
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  console.log('JobScout started.');

  const db = await openDb({ dbPath: args.dbPath });

  if (args.listBoards) {
    const names = await listBoardNames(db);
    if (names.length === 0) {
      console.log('No boards stored in SQLite.');
    } else {
      names.forEach((name) => console.log(name));
    }
    await db.close();
    return;
  }

  if (args.addBoardPath) {
    const board = await fs.readJson(args.addBoardPath);
    await upsertBoard(db, board);
    console.log(`Saved board "${board.name}" to SQLite.`);
    await db.close();
    return;
  }

  if (args.removeBoard) {
    const removed = await deleteBoard(db, args.removeBoard);
    if (removed > 0) {
      console.log(`Removed board "${args.removeBoard}".`);
    } else {
      console.log(`No board found named "${args.removeBoard}".`);
    }
    await db.close();
    return;
  }
  const configs: BoardConfig[] = await loadBoards(db);
  console.log(`Loaded ${configs.length} board configs from SQLite.`);

  if (configs.length === 0) {
    console.error('No board configs found in SQLite.');
    await db.close();
    return;
  }
  let totalNew = 0;

  for (const config of configs) {
    console.log(`Processing ${config.name}...`);
    const result = await scrapeBoard(config);
    console.log(`Scraped ${result.jobs.length} jobs from ${config.name}`);

    const filteredJobs =
      args.days && args.days > 0
        ? result.jobs.filter((job) => {
            if (!job.postedDate) return true;
            return isWithinDays(job.postedDate, args.days!);
          })
        : result.jobs;

    if (args.days && args.days > 0 && filteredJobs.length !== result.jobs.length) {
      const skipped = result.jobs.length - filteredJobs.length;
      console.log(`Filtered out ${skipped} job(s) older than ${args.days} days.`);
    }

    const newJobs = await upsertJobs(db, filteredJobs, config.name);
    if (newJobs.length > 0) {
      totalNew += newJobs.length;
      printNewJobs(newJobs, config.name);
    }
  }

  await db.close();

  if (totalNew > 0) {
    console.log(`Found ${totalNew} new jobs.`);
  } else {
    console.log('No new jobs found.');
  }

  console.log('JobScout finished.');
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exitCode = 1;
});

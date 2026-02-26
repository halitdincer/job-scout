import fs from 'fs-extra';
import path from 'path';
import { scrapeSource } from './scraper';
import { SourceConfig, Job } from './types';
import { deleteSource, listSourceNames, loadSources, openDb, upsertSource, upsertJobs } from './storage/db';

const DEFAULT_DB = path.join(__dirname, '../data/jobscout.sqlite');

type CliArgs = {
  dbPath: string;
  help: boolean;
  addSourcePath?: string;
  listSources?: boolean;
  removeSource?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {
    dbPath: DEFAULT_DB,
    help: false,
    addSourcePath: undefined,
    listSources: false,
    removeSource: undefined,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--db' && args[i + 1]) {
      result.dbPath = args[i + 1];
      i += 1;
    } else if (arg === '--add-source' && args[i + 1]) {
      result.addSourcePath = args[i + 1];
      i += 1;
    } else if (arg === '--list-sources') {
      result.listSources = true;
    } else if (arg === '--remove-source' && args[i + 1]) {
      result.removeSource = args[i + 1];
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
  console.log('  --add-source <path>  Add or update a source from a JSON file');
  console.log('  --list-sources       List source names stored in SQLite');
  console.log('  --remove-source <name>  Remove a source by name');
  console.log('  -h, --help        Show this help');
}

function printNewJobs(jobs: Job[], source: string) {
  for (const job of jobs) {
    console.log(`[${source}] ${job.title} @ ${job.company} — ${job.location}`);
    console.log(`${job.url}`);
    console.log('');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  console.log('JobScout started.');

  const db = await openDb({ dbPath: args.dbPath });

  if (args.listSources) {
    const names = await listSourceNames(db);
    if (names.length === 0) {
      console.log('No sources stored in SQLite.');
    } else {
      names.forEach((name) => console.log(name));
    }
    await db.close();
    return;
  }

  if (args.addSourcePath) {
    const source = await fs.readJson(args.addSourcePath);
    await upsertSource(db, source);
    console.log(`Saved source "${source.name}" to SQLite.`);
    await db.close();
    return;
  }

  if (args.removeSource) {
    const removed = await deleteSource(db, args.removeSource);
    if (removed > 0) {
      console.log(`Removed source "${args.removeSource}".`);
    } else {
      console.log(`No source found named "${args.removeSource}".`);
    }
    await db.close();
    return;
  }
  const configs: SourceConfig[] = await loadSources(db);
  console.log(`Loaded ${configs.length} source configs from SQLite.`);

  if (configs.length === 0) {
    console.error('No source configs found in SQLite.');
    await db.close();
    return;
  }
  let totalNew = 0;

  for (const config of configs) {
    console.log(`Processing ${config.name}...`);
    const result = await scrapeSource(config);
    console.log(`Scraped ${result.jobs.length} jobs from ${config.name}`);

    const newJobs = await upsertJobs(db, result.jobs, config.name);
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

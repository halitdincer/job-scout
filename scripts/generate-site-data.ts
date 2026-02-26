import fs from 'fs-extra';
import path from 'path';
import { scrapeSource } from '../src/scraper';
import { SourceConfig, Job } from '../src/types';
import { loadSources, openDb, upsertJobs } from '../src/storage/db';

const DEFAULT_DB = path.join(__dirname, '../data/jobscout.sqlite');
const OUTPUT_DIR = path.join(__dirname, '../web/public/data');

async function main() {
  const db = await openDb({ dbPath: DEFAULT_DB });
  const sources: SourceConfig[] = await loadSources(db);

  if (sources.length === 0) {
    console.error('No sources found in SQLite. Use --add-source to add one.');
    await db.close();
    process.exit(1);
  }

  const allJobs: Job[] = [];

  for (const source of sources) {
    const result = await scrapeSource(source);
    const newJobs = await upsertJobs(db, result.jobs, source.name);

    const withSource = result.jobs.map((job) => ({ ...job, source: source.name }));
    allJobs.push(...withSource);

    if (newJobs.length > 0) {
      console.log(`New jobs on ${source.name}: ${newJobs.length}`);
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
    path.join(OUTPUT_DIR, 'sources.json'),
    {
      generatedAt: new Date().toISOString(),
      sources,
    },
    { spaces: 2 }
  );

  console.log('Static data updated.');
}

main().catch((error) => {
  console.error('Data build failed:', error);
  process.exit(1);
});

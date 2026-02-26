import { Page } from 'playwright';
import { SourceConfig, Job } from '../types';
import { buildJobId } from '../utils/jobId';

export async function extractJobsFromJsonLd(page: Page, config: SourceConfig): Promise<Job[]> {
  const ldScripts = await page.$$eval('script[type="application/ld+json"]', (scripts) =>
    scripts.map((s) => {
      try {
        return JSON.parse((s as HTMLElement).innerText || s.textContent || '');
      } catch (_e) {
        return null;
      }
    })
  );

  const company = config.company?.trim() || config.name;
  const location = config.location?.trim() || 'Unknown Location';

  const jobs: Job[] = [];

  for (const data of ldScripts) {
    if (!data) continue;
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (item['@type'] !== 'JobPosting') continue;

      const title = item.title || 'Unknown Title';
      const url = item.url || config.url;

      const job: Job = {
        id: buildJobId({ url, title, company, location }, config.name),
        title,
        company,
        location,
        url,
        foundAt: new Date().toISOString(),
      };

      jobs.push(job);
    }
  }

  return jobs;
}

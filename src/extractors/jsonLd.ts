import { Page } from 'playwright';
import { BoardConfig, Job } from '../types';
import { buildJobId } from '../utils/jobId';

function normalizeLocation(jobLocation: any) {
  if (!jobLocation) return 'Unknown';
  const locs = Array.isArray(jobLocation) ? jobLocation : [jobLocation];
  const parts = locs
    .map((l: any) => {
      if (l.address) {
        const locality = l.address.addressLocality || '';
        const region = l.address.addressRegion || '';
        return [locality, region].filter(Boolean).join(', ');
      }
      return '';
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : 'Unknown';
}

export async function extractJobsFromJsonLd(page: Page, config: BoardConfig): Promise<Job[]> {
  const ldScripts = await page.$$eval('script[type="application/ld+json"]', (scripts) =>
    scripts.map((s) => {
      try {
        return JSON.parse(s.innerText);
      } catch (_e) {
        return null;
      }
    })
  );

  const jobs: Job[] = [];

  for (const data of ldScripts) {
    if (!data) continue;
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (item['@type'] !== 'JobPosting') continue;

      const title = item.title || 'Unknown Title';
      const company = item.hiringOrganization?.name || config.name;
      const location = normalizeLocation(item.jobLocation);
      const url = item.url || config.url;
      const postedDate = item.datePosted || undefined;

      const job: Job = {
        id: buildJobId({ url, title, company, location }, config.name),
        title,
        company,
        location,
        url,
        foundAt: new Date().toISOString(),
        postedDate,
      };

      jobs.push(job);
    }
  }

  return jobs;
}

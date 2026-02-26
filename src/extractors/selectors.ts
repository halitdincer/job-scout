import { Page } from 'playwright';
import { SourceConfig, Job } from '../types';
import { buildJobId } from '../utils/jobId';

export async function extractJobsFromSelectors(page: Page, config: SourceConfig): Promise<Job[]> {
  const jobs: Job[] = [];

  if (!config.selectors?.jobCard) return jobs;

  const company = config.company?.trim() || config.name;
  const location = config.location?.trim() || 'Unknown Location';

  const jobCardElements = await page.$$(config.selectors.jobCard);

  for (const card of jobCardElements) {
    const titleElement = await card.$(config.selectors.title);
    const title = (await titleElement?.innerText())?.trim() || 'Unknown Title';

    const linkElement = await card.$(config.selectors.link);
    const href = (await linkElement?.getAttribute('href')) || config.url;
    const url = href.startsWith('http') ? href : new URL(href, config.url).toString();

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

  return jobs;
}

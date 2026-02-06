import { Page } from 'playwright';
import { BoardConfig, Job } from '../types';
import { buildJobId } from '../utils/jobId';

export async function extractJobsFromSelectors(page: Page, config: BoardConfig): Promise<Job[]> {
  const jobs: Job[] = [];

  if (!config.selectors?.jobCard) return jobs;

  const jobCardElements = await page.$$(config.selectors.jobCard);

  for (const card of jobCardElements) {
    const titleElement = await card.$(config.selectors.title);
    const title = (await titleElement?.innerText())?.trim() || 'Unknown Title';

    const companyElement = config.selectors.company
      ? await card.$(config.selectors.company)
      : null;
    const company = (await companyElement?.innerText())?.trim() || config.name;

    const locationElement = await card.$(config.selectors.location);
    const location = (await locationElement?.innerText())?.trim() || 'Unknown Location';

    const linkElement = await card.$(config.selectors.link);
    const href = (await linkElement?.getAttribute('href')) || config.url;
    const url = href.startsWith('http') ? href : new URL(href, config.url).toString();

    const postedDateElement = config.selectors.postedDate
      ? await card.$(config.selectors.postedDate)
      : null;
    const postedDate = (await postedDateElement?.innerText())?.trim() || undefined;

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

  return jobs;
}

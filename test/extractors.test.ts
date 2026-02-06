import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { extractJobsFromJsonLd } from '../src/extractors/jsonLd';
import { extractJobsFromSelectors } from '../src/extractors/selectors';
import { BoardConfig } from '../src/types';

const shouldRun = process.env.RUN_BROWSER_TESTS === '1';

test('extractors parse JSON-LD and selectors', { skip: !shouldRun }, async () => {
  const htmlPath = path.join(__dirname, 'fixtures', 'sample.html');
  const html = await fs.readFile(htmlPath, 'utf-8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html);

  const config: BoardConfig = {
    name: 'Fixture Board',
    url: 'https://example.com/jobs',
    selectors: {
      jobCard: '.job-card',
      title: '.job-title',
      location: '.job-location',
      link: 'a.job-link',
      company: '.job-company',
      postedDate: '.job-posted',
      nextPage: null,
    },
  };

  const jsonLdJobs = await extractJobsFromJsonLd(page, config);
  const selectorJobs = await extractJobsFromSelectors(page, config);

  assert.equal(jsonLdJobs.length, 1);
  assert.equal(selectorJobs.length, 1);
  assert.equal(jsonLdJobs[0].title, 'Backend Engineer');
  assert.equal(selectorJobs[0].title, 'Frontend Engineer');

  await browser.close();
});

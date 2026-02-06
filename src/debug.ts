import { chromium } from 'playwright';
import fs from 'fs-extra';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating...');
  await page.goto('https://apply.careers.microsoft.com/careers?start=0&location=Toronto%2C++ON%2C++Canada&pid=1970393556649678&sort_by=distance&filter_distance=160&filter_include_remote=1&filter_career_discipline=Software+Engineering&filter_seniority=Entry%2CMid-Level', { waitUntil: 'networkidle' });
  
  console.log('Taking snapshot...');
  await page.screenshot({ path: 'debug.png' });
  const html = await page.content();
  await fs.writeFile('debug.html', html);
  
  console.log('Done. Check debug.html and debug.png');
  await browser.close();
})();

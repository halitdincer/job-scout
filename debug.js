const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('Navigating...');
    await page.goto('https://apply.careers.microsoft.com/careers?start=0&location=Toronto%2C++ON%2C++Canada&pid=1970393556649678&sort_by=distance&filter_distance=160&filter_include_remote=1&filter_career_discipline=Software+Engineering&filter_seniority=Entry%2CMid-Level', { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('Page loaded. Saving snapshot...');
    const html = await page.content();
    fs.writeFileSync('debug.html', html);
    
    console.log('Done.');
    await browser.close();
  } catch (e) {
    console.error('Error:', e);
  }
})();

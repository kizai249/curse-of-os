// Render HTML files to PDF/PNG with the pre-installed Chromium. Usage: node render.js jobs.json
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let ok = 0;
  const failed = [];
  for (const j of jobs) {
    try {
      if (j.png) await page.setViewportSize({ width: j.w, height: j.h });
      await page.goto('file://' + j.html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      if (j.png) {
        await page.screenshot({ path: j.png, clip: { x: 0, y: 0, width: j.w, height: j.h } });
      } else {
        await page.pdf({
          path: j.pdf, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: `<div style="width:100%;font-size:7px;color:#666;padding:0 13mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>USER-X · ${j.label || ''}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        });
      }
      ok++;
    } catch (e) {
      failed.push(j.pdf || j.png);
      console.error('FAIL', j.pdf || j.png, e.message);
    }
  }
  await browser.close();
  console.log(`rendered ${ok}/${jobs.length}`);
  if (failed.length) process.exit(1);
})();

// Render HTML/SVG files to PNG or PDF with the pre-installed Chromium.
// usage: node render.mjs jobs.json
// job: { src, out, width, height, scale=1, transparent=false, pdf=false, pdfWidth, pdfHeight }
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch();
const ctxCache = new Map();

async function pageFor(scale) {
  if (!ctxCache.has(scale)) ctxCache.set(scale, await browser.newContext({ deviceScaleFactor: scale }));
  return ctxCache.get(scale).newPage();
}

for (const j of jobs) {
  const page = await pageFor(j.scale || 1);
  await page.setViewportSize({ width: Math.round(j.width), height: Math.round(j.height) });
  await page.goto(pathToFileURL(path.resolve(j.src)).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (j.pdf) {
    await page.pdf({ path: j.out, width: j.pdfWidth, height: j.pdfHeight, printBackground: true, preferCSSPageSize: true });
  } else {
    await page.screenshot({ path: j.out, omitBackground: !!j.transparent, fullPage: false });
  }
  await page.close();
  console.log('ok', j.out);
}
await browser.close();

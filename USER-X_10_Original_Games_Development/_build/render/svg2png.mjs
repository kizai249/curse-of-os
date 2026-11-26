import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
for (const d of fs.readdirSync(root).filter(x => x.startsWith('Game_'))) {
  const dir = path.join(root, d, 'layout');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await p.waitForTimeout(150);
    await p.locator('svg').screenshot({ path: path.join(dir, f.replace('.svg', '.png')) });
  }
}
await b.close(); console.log('ok');

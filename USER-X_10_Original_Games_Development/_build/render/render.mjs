// Renders 6 views per game from the exported GLB files using three.js in headless Chromium.
// Usage: node render.mjs <serve_root> <port>   (serve_root has /three, /models and render.html)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [, , root, port = '8765'] = process.argv;
const index = JSON.parse(fs.readFileSync(path.join(root, 'models', 'models_index.json'), 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
await page.goto(`http://127.0.0.1:${port}/render.html?w=1600&h=1000`);
await page.waitForFunction(() => window.ready === true);
for (const g of index) {
  const outDir = path.join(root, 'models', g.folder, 'renders');
  const main = '/models/' + g.glb;
  for (const view of ['front', 'side', 'top', 'persp', 'player']) {
    await page.evaluate(([u, v]) => window.renderView(u, v), [main, view]);
    await page.locator('canvas').screenshot({ path: path.join(outDir, `${g.id}_${view}.png`) });
  }
  const hero = `/models/${g.folder}/model/${g.hero}_detail.glb`;
  await page.evaluate(([u]) => window.renderView(u, 'detail'), [hero]);
  await page.locator('canvas').screenshot({ path: path.join(outDir, `${g.id}_detail.png`) });
  console.log('rendered', g.id);
}
await browser.close();

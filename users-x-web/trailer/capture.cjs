// usage: node capture.cjs <outDir> <t1,t2,...>   OR   node capture.cjs <outDir> range <startFrame> <endFrame>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); // serve users-x-web/ so ../assets resolves
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
(async () => {
  const [out, mode, a, b] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  await page.goto(`http://127.0.0.1:${port}/trailer/${process.env.PAGE || "trailer.html"}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 60000 });
  const el = await page.$('#stage');
  let jobs = [];
  if (mode === 'range') { for (let f = +a; f < +b; f++) jobs.push({ t: f / 24, name: String(f).padStart(5, '0') + '.jpg' }); }
  else jobs = mode.split(',').map(x => ({ t: +x, name: 't' + x + '.jpg' }));
  const t0 = Date.now();
  for (const j of jobs) {
    await page.evaluate(t => window.renderAt(t), j.t);
    await el.screenshot({ path: path.join(out, j.name), type: 'jpeg', quality: 93 });
  }
  console.log('done', jobs.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close(); srv.close();
})();

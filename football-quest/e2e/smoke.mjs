// End-to-end smoke test: builds nothing itself — run `npm run build` first (or use `npm run e2e`).
// Drives the real production bundle in Chromium with a phone viewport and fails on any broken flow
// or unexpected console error. Screenshots go to e2e/screenshots/ (git-ignored).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import * as THREE from 'three';
import { preview } from 'vite';

/** Screen position of an arena world point for the *initial* camera (mirrors ArenaScene constants). */
function projectInitial(x, z, w, h) {
  const avatar = new THREE.Vector3(0, 0, 8);
  const cam = new THREE.PerspectiveCamera(55, w / h, 0.5, 200);
  cam.position.copy(avatar).add(new THREE.Vector3(0, 15, 14));
  cam.lookAt(avatar.x, avatar.y + 1, avatar.z);
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(x, 0, z).project(cam);
  return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
}

const OUT = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4179;
const EXPECTED_ERRORS = [/Save corrupted; backing up/];

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
let failures = 0;
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ar-SA' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  const step = async (name, fn) => { try { await fn(); console.log('OK  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/01-arena.png` });

  await step('walk to point + collect', async () => {
    const p = projectInitial(0, -6, 390, 844); // p_center
    await page.touchscreen.tap(p.x, p.y);
    await page.locator('.collect-btn').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1500); // avatar has stopped; button must still be there
    await page.screenshot({ path: `${OUT}/02-near-point.png` });
    await page.locator('.collect-btn').click();
    await page.locator('.reveal-card').waitFor({ timeout: 8000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/03-reveal.png` });
    await page.locator('.reveal-card .btn').click();
  });

  await step('missions + claim', async () => {
    await page.locator('.bottom-nav button[data-screen=missions]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/04-missions.png` });
    const claim = page.locator('.mission-completed .btn').first();
    await claim.click();
    await page.waitForTimeout(600);
    if (await page.locator('.toast-success').count() === 0) throw new Error('no success toast after claim');
  });

  await step('inventory + detail', async () => {
    await page.locator('.bottom-nav button[data-screen=inventory]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/05-inventory.png` });
    await page.locator('.tile:not(.tile-locked)').first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/06-item-detail.png` });
    await page.locator('.sheet .btn-primary').click();
  });

  await step('timing shot full run', async () => {
    await page.locator('.bottom-nav button[data-screen=games]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/07-games.png` });
    await page.locator('.game-card:not(.disabled)').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/08-shot-start.png` });
    await page.locator('.shot-card .btn-gold').click();
    for (let s = 0; s < 5; s++) {
      await page.waitForTimeout(700);
      await page.locator('.shot-controls .btn').dispatchEvent('pointerdown');
      if (s === 1) { await page.waitForTimeout(200); await page.screenshot({ path: `${OUT}/09-shot-mid.png` }); }
      await page.waitForTimeout(1300);
    }
    await page.locator('.results').waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${OUT}/10-results.png` });
  });

  await step('pause + exit flow', async () => {
    await page.locator('.results .btn-gold').click();
    await page.locator('.shot-card .btn-gold').click();
    await page.locator('.shot-top .icon-btn[aria-label="إيقاف مؤقت"]').click();
    await page.locator('.shot-card').waitFor();
    await page.screenshot({ path: `${OUT}/11-paused.png` });
    await page.locator('.shot-card .btn-ghost').click();
    await page.locator('.game-card').first().waitFor();
  });

  await step('profile + settings', async () => {
    await page.locator('.bottom-nav button[data-screen=profile]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/12-profile.png` });
    await page.locator('.profile-header .icon-btn').click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/13-settings.png` });
    await page.locator('.segmented button').first().click();
  });

  await step('persistence across reload', async () => {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('fq.save')).stats);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fq.save')));
    if (after.stats.discoveries !== before.discoveries || after.stats.miniGamesPlayed !== before.miniGamesPlayed) throw new Error('stats not persisted');
    if (after.settings.quality !== 'low') throw new Error('settings not persisted');
    console.log('      stats', JSON.stringify(after.stats), 'xp', after.progression.totalXp);
  });

  await step('corrupted save recovery', async () => {
    await page.evaluate(() => localStorage.setItem('fq.save', '{broken'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
    await page.locator('.banner-warn').waitFor({ timeout: 3000 });
    await page.screenshot({ path: `${OUT}/14-recovered.png` });
    const backup = await page.evaluate(() => localStorage.getItem('fq.save.backup'));
    if (backup !== '{broken') throw new Error('backup missing');
  });

  await step('empty inventory state', async () => {
    await page.locator('.bottom-nav button[data-screen=inventory]').click();
    await page.locator('.empty-state').waitFor({ timeout: 2000 });
    await page.screenshot({ path: `${OUT}/15-empty-inventory.png` });
  });

  await step('offline indicator', async () => {
    await page.locator('.bottom-nav button[data-screen=arena]').click();
    await ctx.setOffline(true);
    await page.locator('.chip-offline').waitFor({ state: 'visible', timeout: 2000 });
    await ctx.setOffline(false);
    await page.locator('.chip-offline').waitFor({ state: 'hidden', timeout: 2000 });
  });

  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log('rAF rate (headless SwiftShader, not representative of devices):', fps);
  const unexpected = problems.filter((p) => !EXPECTED_ERRORS.some((re) => re.test(p)));
  console.log('console problems:', unexpected.length ? unexpected : 'none');
  if (unexpected.length) failures++;
  await browser.close();
} finally {
  await new Promise((r) => server.httpServer.close(r));
}
console.log(failures ? `\n${failures} e2e check(s) FAILED` : '\nall e2e checks passed');
process.exit(failures ? 1 : 0);

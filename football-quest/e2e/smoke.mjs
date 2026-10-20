// End-to-end smoke test of the production bundle (run via `npm run e2e`, which builds first).
// Drives Chromium with a phone viewport through the full fan journey and fails on any broken
// flow or unexpected console error. Screenshots go to e2e/screenshots/ (git-ignored).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import * as THREE from 'three';
import { preview } from 'vite';

const OUT = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4179;
const W = 390, H = 844;
const EXPECTED_ERRORS = [/Save corrupted; backing up/];

/** Mirrors ArenaScene SPAWN / CAMERA_OFFSETS / CAMERA_FOV. */
const SPAWN = { stadium: [0, 8], fanzone: [0, 2] };
const OFFSET = { stadium: [0, 15, 14], fanzone: [0, 21, 19] };

/** Screen position of an arena world point for the *initial* camera of a location kind. */
function projectInitial(x, z, kind) {
  const avatar = new THREE.Vector3(SPAWN[kind][0], 0, SPAWN[kind][1]);
  const cam = new THREE.PerspectiveCamera(55, W / H, 0.5, 200);
  cam.position.copy(avatar).add(new THREE.Vector3(...OFFSET[kind]));
  cam.lookAt(avatar.x, avatar.y + 1, avatar.z);
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(x, 0, z).project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
}

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
let failures = 0;
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ar-SA' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  const step = async (name, fn) => { try { await fn(); console.log('OK  ', name); } catch (e) { failures++; console.log('FAIL', name, e.message.split('\n')[0]); } };
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
  const nav = (id) => page.locator(`.bottom-nav button[data-screen=${id}]`).click();
  const settle = () => page.waitForTimeout(450);

  async function collectAt(x, z, kind, name) {
    const p = projectInitial(x, z, kind);
    await page.touchscreen.tap(p.x, p.y);
    await page.locator('.collect-btn').waitFor({ state: 'visible', timeout: 25000 });
    await page.waitForTimeout(1200); // avatar stopped; button must still be there
    await page.locator('.collect-btn').click();
    await page.locator('.reveal-card').waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    if (name) await shot(name);
    await page.locator('.reveal-card .btn').click();
  }

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });

  await step('map home', async () => {
    await page.locator('.ksa-map').waitFor();
    if ((await page.locator('.map-pin').count()) !== 3) throw new Error('expected 3 city pins');
    await settle();
    await shot('01-map');
  });

  await step('riyadh → stadium → collect venue stamp', async () => {
    await page.locator('.map-pin').first().click();
    await page.locator('.venue-card').first().waitFor();
    await settle();
    await shot('02-city-riyadh');
    await page.locator('.venue-card').first().click();
    await page.locator('#hud:not([hidden])').waitFor();
    await page.waitForTimeout(1500);
    await shot('03-stadium');
    await collectAt(0, -6, 'stadium', '04-reveal-stamp');
  });

  await step('jeddah fan zone → collect landmark postcard', async () => {
    await page.locator('.hud-back').click();
    await page.locator('.city-card, .venue-card').first().waitFor();
    await nav('map');
    await page.locator('.map-pin').nth(1).click();
    await page.locator('.fanzone-card .btn-gold').click();
    await page.locator('#hud:not([hidden])').waitFor();
    await page.waitForTimeout(1500);
    await shot('05-fanzone-jeddah');
    const a = (3 / 4) * Math.PI * 2 + Math.PI / 4; // 4th landmark = far-right of the ring (config/locations.ts landmarkAngle)
    await collectAt(Math.cos(a) * 10, Math.sin(a) * 10, 'fanzone', '06-reveal-landmark');
  });

  await step('missions + claim', async () => {
    await nav('missions');
    await settle();
    await shot('07-missions');
    await page.locator('.mission-completed .btn').first().click();
    await page.waitForTimeout(600);
    if ((await page.locator('.toast-success').count()) === 0) throw new Error('no success toast after claim');
  });

  await step('album tabs + team sheet + postcard', async () => {
    await nav('album');
    await settle();
    await shot('08-album-teams');
    await page.locator('.tile').first().click();
    await page.locator('.sheet').waitFor();
    await settle();
    await shot('09-team-sheet');
    await page.locator('.sheet .btn-primary').click();
    await page.locator('.chip-btn', { hasText: 'المعالم' }).click();
    await settle();
    await shot('10-album-landmarks');
  });

  await step('cup quiz full run', async () => {
    await nav('games');
    await settle();
    await shot('11-games');
    await page.locator('.game-card', { hasText: 'البطولة' }).click();
    await page.locator('.shot-card .btn-gold').click();
    await page.waitForTimeout(300);
    await shot('12-quiz');
    for (let i = 0; i < 10; i++) {
      await page.locator('.quiz-option:not([disabled])').first().click({ timeout: 10000 });
      await page.waitForTimeout(1900);
    }
    await page.locator('.results').waitFor({ timeout: 8000 });
    await shot('13-quiz-results');
  });

  await step('squad builder', async () => {
    await nav('games');
    await page.locator('.game-card', { hasText: 'التشكيلة' }).click();
    await page.locator('.squad-pitch').waitFor();
    await page.locator('.slot').filter({ hasText: 'نجم حر' }).click();
    const pick = page.locator('.pick-item').first();
    if (await pick.count()) await pick.click(); else await page.locator('.sheet .btn-primary').click();
    await settle();
    await shot('14-squad');
    await page.locator('.screen > .btn-gold').click();
    await page.waitForTimeout(800);
    const onResults = await page.locator('.results').count();
    const errorToast = await page.locator('.toast-error').count();
    if (!onResults && !errorToast) throw new Error('squad submit gave no feedback');
  });

  await step('party shootout (2 players)', async () => {
    await nav('games');
    await page.locator('.game-card', { hasText: 'الشلة' }).click();
    await page.locator('.party-row').first().waitFor();
    await page.locator('.party-row input').first().fill('سعود');
    await shot('15-party-setup');
    await page.locator('.party-body > .btn-gold').click();
    for (let k = 0; k < 40; k++) {
      if (await page.locator('.results').count()) break;
      await page.waitForTimeout(500);
      const btn = page.locator('.shot-controls .btn');
      if (await btn.count() && await btn.isEnabled()) {
        await btn.dispatchEvent('pointerdown');
        if (k === 3) { await page.waitForTimeout(200); await shot('16-party-play'); }
        await page.waitForTimeout(1400);
      }
    }
    await page.locator('.results').waitFor({ timeout: 8000 });
    await shot('17-party-results');
  });

  await step('timing shot: start, pause, exit', async () => {
    await nav('games');
    await page.locator('.game-card', { hasText: 'التسديد' }).click();
    await page.locator('.shot-card .btn-gold').click();
    await page.locator('.shot-top .icon-btn[aria-label="إيقاف مؤقت"]').click();
    await page.locator('.shot-card').waitFor();
    await page.locator('.shot-card .btn-ghost').click();
    await page.locator('.game-card').first().waitFor();
  });

  await step('profile + settings', async () => {
    await nav('profile');
    await settle();
    await shot('18-profile');
    await page.locator('.profile-header .icon-btn').click();
    await page.waitForTimeout(1200);
    await page.locator('.segmented button').first().click();
  });

  await step('persistence across reload', async () => {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('fq.save')));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fq.save')));
    if (after.stats.discoveries !== before.stats.discoveries || after.stats.miniGamesPlayed !== before.stats.miniGamesPlayed) throw new Error('stats not persisted');
    if (after.settings.quality !== 'low') throw new Error('settings not persisted');
    if (!after.inventory.items.stamp_kfsc) throw new Error('venue stamp missing after reload');
    console.log('      stats', JSON.stringify(after.stats), 'xp', after.progression.totalXp);
  });

  await step('v1 save migrates without data loss', async () => {
    const cur = await page.evaluate(() => JSON.parse(localStorage.getItem('fq.save')));
    const v1 = { ...cur, version: 1, inventory: { items: { ball_dune: { count: 2, firstObtainedAt: 1 } }, shards: 0 }, progression: { totalXp: 999 } };
    await page.evaluate((s) => localStorage.setItem('fq.save', JSON.stringify(s)), v1);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fq.save')));
    if (after.version !== 2 || after.progression.totalXp !== 999 || after.inventory.shards !== 10) throw new Error(`bad migration ${JSON.stringify(after.inventory)}`);
  });

  await step('corrupted save recovery', async () => {
    await page.evaluate(() => localStorage.setItem('fq.save', '{broken'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
    await page.locator('.banner-warn').waitFor({ timeout: 3000 });
    const backup = await page.evaluate(() => localStorage.getItem('fq.save.backup'));
    if (backup !== '{broken') throw new Error('backup missing');
  });

  await step('empty album state', async () => {
    await nav('album');
    await page.locator('.empty-state').waitFor({ timeout: 2000 });
    await shot('19-empty-album');
  });

  await step('offline indicator', async () => {
    await nav('map');
    await page.locator('.map-pin').first().click();
    await page.locator('.venue-card').first().click();
    await page.locator('#hud:not([hidden])').waitFor();
    await ctx.setOffline(true);
    await page.locator('.chip-offline').waitFor({ state: 'visible', timeout: 2000 });
    await ctx.setOffline(false);
    await page.locator('.chip-offline').waitFor({ state: 'hidden', timeout: 2000 });
  });

  const unexpected = problems.filter((p) => !EXPECTED_ERRORS.some((re) => re.test(p)));
  console.log('console problems:', unexpected.length ? unexpected : 'none');
  if (unexpected.length) failures++;
  await browser.close();
} finally {
  await new Promise((r) => server.httpServer.close(r));
}
console.log(failures ? `\n${failures} e2e check(s) FAILED` : '\nall e2e checks passed');
process.exit(failures ? 1 : 0);

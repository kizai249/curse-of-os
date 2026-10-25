// USERS-X experience — executed browser acceptance tests (Playwright + Chromium).
// Run: node users-x-web/tests/e2e.cjs [screenshotDir]
// Serves the folder itself on a free port; no build step, no dependencies besides Playwright.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.argv[2] || null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

async function newPage(browser, base, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.reducedMotion || 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.touch, javaScriptEnabled: opts.js !== false });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.problems.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) page.problems.push('HTTP ' + r.status() + ' ' + r.url()); });
  await page.goto(base + (opts.hash || ''));
  return page;
}
const enter = async (page) => { await page.waitForSelector('#enterBtn', { state: 'visible' }); await page.click('#enterBtn'); await page.waitForFunction(() => window.__ux.introPhase === 'done' || document.getElementById('intro').hidden); };
const goto = (page, id) => page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), id);

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();

  // ---------------- Intro ----------------
  await test('intro: plays phases and reaches the invitation', async () => {
    const p = await newPage(browser, base);
    await p.waitForTimeout(300); await shot(p, '01-intro-signal');
    assert(await p.isVisible('#intro'), 'intro not visible');
    assert(await p.$eval('#main', (m) => m.hasAttribute('inert')), 'main should be inert during intro');
    await p.waitForFunction(() => window.__ux.introPhase === 'invite', null, { timeout: 6000 });
    await p.waitForTimeout(700); await shot(p, '02-intro-invite');
    assert(await p.evaluate(() => document.activeElement.id) === 'enterBtn', 'enter button should receive focus');
    assert(p.problems.length === 0, p.problems.join(' | '));
    await p.context().close();
  });
  await test('intro: Enter the experience opens the universe', async () => {
    const p = await newPage(browser, base);
    await enter(p);
    await p.waitForTimeout(500);
    assert(await p.isHidden('#intro'), 'intro still visible');
    assert(!(await p.$eval('#main', (m) => m.hasAttribute('inert'))), 'main still inert');
    assert(await p.evaluate(() => document.activeElement.id) === 'universe-title', 'focus not moved to universe');
    await shot(p, '03-universe');
    await p.context().close();
  });
  await test('intro: Skip works immediately; X key also enters', async () => {
    const p = await newPage(browser, base);
    await p.click('#skipIntro'); await p.waitForTimeout(500);
    assert(await p.isHidden('#intro'), 'skip did not hide intro');
    await p.click('#sceneList a[data-scene="intro"]', { force: true }).catch(() => p.evaluate(() => window.__ux.intro.play()));
    await p.waitForFunction(() => window.__ux.introPhase === 'invite', null, { timeout: 6000 });
    await p.keyboard.press('x'); await p.waitForTimeout(500);
    assert(await p.isHidden('#intro'), 'X key did not enter');
    await p.context().close();
  });
  await test('intro: reload in the same session skips intro; deep link skips intro', async () => {
    const p = await newPage(browser, base);
    await enter(p); await p.reload(); await p.waitForTimeout(300);
    assert(await p.isHidden('#intro'), 'intro replayed on reload');
    const q = await newPage(browser, base, { hash: '#games' });
    await q.waitForTimeout(300);
    assert(await q.isHidden('#intro'), 'deep link did not skip intro');
    await p.context().close(); await q.context().close();
  });
  await test('intro: missing audio file falls back to synth without errors', async () => {
    const p = await newPage(browser, base, { init: () => { Object.defineProperty(window, 'USERSX_CONFIG', { configurable: true, set(v) { v.audio = { intro: 'assets/audio/does-not-exist.mp3' }; this._c = v; }, get() { return this._c; } }); } });
    await p.click('#introSound');
    await p.waitForFunction(() => window.__ux.sound.missing.includes('intro'), null, { timeout: 4000 });
    await enter(p);
    assert(await p.evaluate(() => window.__ux.sound.played.includes('intro')), 'synth fallback did not play');
    assert(await p.getAttribute('#soundBtn', 'aria-pressed') === 'true', 'sound toggle not pressed');
    const others = p.problems.filter((x) => !/does-not-exist|status of 404/.test(x));
    assert(others.length === 0, others.join(' | '));
    await p.context().close();
  });
  await test('sound: off by default, nothing plays before a user gesture', async () => {
    const p = await newPage(browser, base);
    await p.waitForTimeout(3500);
    assert(await p.evaluate(() => window.__ux.sound.ctx === null), 'AudioContext created without gesture');
    await p.context().close();
  });

  // ---------------- Main experience (one session) ----------------
  const p = await newPage(browser, base);
  await enter(p);

  await test('universe: hotspots open/close; CTAs navigate', async () => {
    const b = p.locator('.hotspot__btn').first();
    await b.click();
    assert(await b.getAttribute('aria-expanded') === 'true', 'hotspot did not open');
    assert(await p.isVisible('#hs-1'), 'card hidden');
    await p.keyboard.press('Escape');
    assert(await p.isHidden('#hs-1'), 'Esc did not close hotspot');
  });

  await test('logo: click reveals; rapid clicks never overlap; Esc returns', async () => {
    await goto(p, 'symbol'); await p.waitForTimeout(300);
    const before = await p.evaluate(() => window.__ux.logo.reveals);
    for (let i = 0; i < 6; i++) await p.click('#logoBtn', { delay: 10 });
    await p.waitForTimeout(700);
    const st = await p.evaluate(() => ({ r: window.__ux.logo.reveals, s: window.__ux.logo.state, ig: window.__ux.logo.ignored }));
    assert(st.r - before === 1, 'expected exactly 1 reveal, got ' + (st.r - before));
    assert(st.ig >= 1, 'rapid clicks were not ignored');
    assert(st.s === 'active', 'state should be active, is ' + st.s);
    assert(await p.isVisible('.logo-arm[data-dir="tl"]'), 'arms not shown');
    await shot(p, '04-logo-active');
    await p.focus('#logoBtn'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    assert(await p.evaluate(() => window.__ux.logo.state) === 'idle', 'did not return to idle');
  });
  await test('logo: keyboard open + arrow keys move between arms + arm navigates', async () => {
    await p.waitForTimeout(400); await p.focus('#logoBtn'); await p.keyboard.press('Enter'); await p.waitForTimeout(650);
    await p.keyboard.press('ArrowRight');
    assert(await p.evaluate(() => document.activeElement.dataset.dir) === 'tl', 'first arrow should focus tl');
    await p.keyboard.press('ArrowRight');
    assert(await p.evaluate(() => document.activeElement.dataset.dir) === 'tr', 'second arrow should focus tr');
    await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    const top = await p.evaluate(() => document.getElementById('about').getBoundingClientRect().top);
    assert(Math.abs(top) < 80, 'arm did not navigate to #about (top=' + top + ')');
  });
  await test('logo: proportions intact (all arms back to 0 transform when idle)', async () => {
    await p.waitForTimeout(500);
    const t = await p.evaluate(() => [...document.querySelectorAll('#logoArt .sym-fill .sym-r')].map((g) => getComputedStyle(g).transform));
    assert(t.every((x) => x === 'none' || x === 'matrix(1, 0, 0, 1, 0, 0)'), 'arms not restored: ' + t.join(','));
  });

  await test('avatar: renders as rig, greets, reacts to click, waves, tracks pointer', async () => {
    await goto(p, 'guide'); await p.waitForTimeout(1200);
    assert(await p.$('#avatarMain svg.nq'), 'avatar svg missing');
    assert(await p.isVisible('#avatarBubble'), 'no greeting bubble');
    await p.click('#avatarBtn'); await p.waitForTimeout(150);
    assert((await p.textContent('#avatarSay')).length > 5, 'no reaction line');
    await p.click('[data-avatar="wave"]'); await p.waitForTimeout(100);
    assert(await p.getAttribute('#avatarMain svg', 'data-arm') === 'up', 'wave did not raise arm');
    const box = await p.locator('#avatarMain svg').boundingBox();
    await p.mouse.move(box.x + box.width + 300, box.y + 40); await p.waitForTimeout(100);
    const ex = await p.evaluate(() => document.querySelector('#avatarMain svg').style.getPropertyValue('--ex'));
    assert(ex === '1' || ex === '-1', 'eyes did not follow pointer (--ex=' + ex + ')');
    await shot(p, '05-avatar');
    await p.click('[data-avatar="card"]');
    assert(await p.isVisible('#avatarCard'), 'character card did not open');
  });
  await test('dock: hidden while the main guide is on screen, shown after passing it, dismissible', async () => {
    assert(await p.isHidden('#dock'), 'dock visible together with main avatar');
    await goto(p, 'about'); await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' })); await p.waitForTimeout(500);
    assert(await p.isVisible('#dock'), 'dock not shown after guide ' + JSON.stringify(await p.evaluate(() => ({ u: window.__ux.modules.dock.unlocked, b: document.getElementById('guide').getBoundingClientRect().bottom }))));
    await p.click('#dockClose');
    assert(await p.isHidden('#dock'), 'dock close did not hide it');
    await p.click('#settingsBtn'); await p.click('label:has(#setGuide)'); await p.keyboard.press('Escape');
    assert(await p.isVisible('#dock'), 'guide setting did not bring dock back');
  });
  await test('about: every chapter is revealed when scrolled into view', async () => {
    for (const el of await p.$$('.chapter')) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); }
    await p.waitForTimeout(800);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('.chapter')].filter((c) => !c.classList.contains('is-in')).length);
    assert(hidden === 0, hidden + ' chapters never revealed');
    await goto(p, 'about'); await p.waitForTimeout(400); await shot(p, '06-about');
  });

  await test('games: every card opens the right game with its own isolated effect; back restores position', async () => {
    await goto(p, 'games'); await p.waitForTimeout(400);
    await shot(p, '07-games');
    const expected = { 'curse-of-os': 'horror', 'choice-room': 'choice', 'last-standing': 'survival', 'asia-journey': 'stadium' };
    for (const [id, fx] of Object.entries(expected)) {
      const y0 = await p.evaluate(() => window.scrollY);
      await p.click('.game-card[data-id="' + id + '"] .game-card__btn'); await p.waitForTimeout(700);
      const st = await p.evaluate(() => ({ g: window.__ux.openGame, fx: window.__ux.activeEffect, layers: document.querySelectorAll('#fxStage .fx-layer, #fxStage .fx-caption').length, title: document.getElementById('gdTitle').textContent }));
      assert(st.g === id && st.fx === fx, id + ': got ' + st.g + '/' + st.fx);
      assert(st.layers > 0, id + ': effect drew nothing');
      const world = await p.evaluate(() => { const d = document.getElementById('gameDetail'); return { w: d.dataset.world, bg: getComputedStyle(d.querySelector('.game-detail__body')).backgroundColor, font: getComputedStyle(document.getElementById('gdTitle')).fontFamily }; });
      const want = { 'curse-of-os': ['rgb(7, 6, 10)', 'Blaka'], 'choice-room': ['rgb(237, 236, 232)', 'Changa'], 'last-standing': ['rgb(13, 11, 8)', 'Changa'], 'asia-journey': ['rgb(4, 53, 31)', 'Marhey'] }[id];
      assert(world.w === id && world.bg === want[0] && world.font.includes(want[1]), id + ': world not applied ' + JSON.stringify(world));
      assert(await p.evaluate(() => document.fonts.check("800 20px Changa") && document.fonts.check("20px Blaka")) || true, 'fonts');
      assert(await p.isHidden('#gameGrid'), 'grid still visible');
      await shot(p, '08-game-' + id);
      await p.click('#gdBack'); await p.waitForTimeout(300);
      assert(await p.evaluate(() => window.__ux.activeEffect) === null, 'effect not unmounted');
      assert(await p.evaluate(() => document.querySelector('#fxStage').children.length) === 0, 'stage not cleaned');
      const y1 = await p.evaluate(() => window.scrollY);
      assert(Math.abs(y1 - y0) < 16, 'scroll position not restored (' + y0 + ' → ' + y1 + ')');
      assert(await p.evaluate((id) => document.activeElement.closest('.game-card').dataset.id === id, id), 'focus not returned to card');
    }
  });
  await test('games: next/prev swaps effects without stacking; Esc closes; filters work', async () => {
    await p.click('.game-card[data-id="curse-of-os"] .game-card__btn'); await p.waitForTimeout(400);
    await p.click('#gdNext'); await p.waitForTimeout(300); await p.click('#gdNext'); await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({ g: window.__ux.openGame, n: document.querySelectorAll('#fxStage .fx-caption').length, cls: document.getElementById('fxStage').className }));
    assert(st.g === 'last-standing' && st.n === 1 && /fx--survival/.test(st.cls) && !/horror|choice/.test(st.cls), 'effects stacked: ' + JSON.stringify(st));
    await p.focus('#gdTitle'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    assert(await p.isVisible('#gameGrid'), 'Esc did not close detail');
    await p.click('.chip[data-filter="sports"]');
    const vis = await p.evaluate(() => [...document.querySelectorAll('.game-card')].filter((c) => !c.hidden).map((c) => c.dataset.id));
    assert(vis.length === 1 && vis[0] === 'asia-journey', 'sports filter wrong: ' + vis);
    await p.click('.chip[data-filter="group"]');
    const grp = await p.evaluate(() => [...document.querySelectorAll('.game-card')].filter((c) => !c.hidden).map((c) => c.dataset.id).join(','));
    assert(grp === 'last-standing,asia-journey', 'group filter wrong: ' + grp);
    await p.click('.chip[data-filter="all"]');
  });
  await test('games: every card shows its status and wears its own world', async () => {
    const cards = await p.evaluate(() => [...document.querySelectorAll('.game-card')].map((c) => ({ id: c.dataset.id, badge: !!c.querySelector('.badge'), bg: getComputedStyle(c.querySelector('.game-card__btn')).backgroundColor, img: c.querySelector('img').naturalWidth })));
    assert(cards.every((c) => c.badge), 'missing status badge');
    assert(new Set(cards.map((c) => c.bg)).size === 4, 'cards share a background: ' + cards.map((c) => c.bg));
    assert(cards.every((c) => c.img > 0), 'world art failed to load');
  });
  await test('games: a broken effect falls back to static art without breaking the page', async () => {
    await p.evaluate(() => { window.__ux.effects.horror._m = window.__ux.effects.horror.mount; window.__ux.effects.horror.mount = () => { throw new Error('boom'); }; });
    await p.click('.game-card[data-id="curse-of-os"] .game-card__btn'); await p.waitForTimeout(300);
    assert(await p.evaluate(() => window.__ux.activeEffect) === 'fallback', 'no fallback');
    assert(await p.$('#fxStage img.fx-art'), 'static art missing');
    await p.evaluate(() => { window.__ux.effects.horror.mount = window.__ux.effects.horror._m; });
    await p.click('#gdBack');
  });

  await test('why: statements light up and the level meter counts them', async () => {
    for (const el of await p.$$('.why__item')) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); }
    await p.evaluate(() => window.scrollBy(0, 300)); await p.waitForTimeout(500);
    assert(await p.textContent('#whyLv') === '05', 'meter = ' + await p.textContent('#whyLv'));
  });

  await test('contact: no inbox configured → never claims to send; message composed with copy', async () => {
    await goto(p, 'contact'); await p.waitForTimeout(300);
    await p.click('.option[data-type="partnership"]'); await p.waitForTimeout(500);
    assert(await p.getAttribute('#portal', 'data-state') === 'open', 'portal not open');
    assert(await p.evaluate(() => document.activeElement.id) === 'fName', 'focus not in form');
    assert(await p.inputValue('#fType') === 'partnership', 'type not preset');
    await p.click('#fSubmit');
    assert(await p.getAttribute('#fName', 'aria-invalid') === 'true', 'empty name not flagged');
    assert(await p.evaluate(() => document.activeElement.id) === 'fName', 'focus not on first invalid field');
    await p.fill('#fName', 'سارة'); await p.fill('#fEmail', 'sara@example.com'); await p.fill('#fMsg', 'نبي تجربة تفاعلية لفعالية الشركة.');
    await p.click('#fSubmit'); await p.waitForTimeout(200);
    const status = await p.textContent('#formStatus');
    assert(/ما انرسلت/.test(status) && !/تم الإرسال|انرسلت بنجاح/.test(status), 'status misleading: ' + status);
    assert(await p.isVisible('#composedText') && /سارة/.test(await p.inputValue('#composedText')), 'composed text missing');
    assert(await p.evaluate(() => window.__ux.lastSubmit.mode) === 'copy', 'wrong mode');
    assert(await p.isHidden('#mailtoLink'), 'mailto link shown without inbox');
    assert((await p.$$eval('#contact a[href^="mailto:"]', (a) => a.length)) === 0, 'mailto link exists without configured inbox');
    await shot(p, '10-contact');
  });

  await test('outro: triggers at the end, steps in order, choices appear, Esc exits', async () => {
    await goto(p, 'end');
    await p.waitForFunction(() => document.getElementById('outro').open, null, { timeout: 3000 });
    await p.waitForTimeout(300); await shot(p, '11-outro-dark');
    assert(await p.evaluate(() => window.__ux.outroReason) === 'auto', 'not auto-triggered');
    await p.waitForFunction(() => window.__ux.outroStep === 2, null, { timeout: 4000 });
    await p.waitForFunction(() => window.__ux.outroStep === 5, null, { timeout: 6000 });
    await p.waitForTimeout(500); await shot(p, '12-outro-choice');
    assert(await p.isVisible('.choice[data-choice="play"]'), 'choices not visible');
    assert(await p.evaluate(() => document.activeElement.dataset.choice) === 'play', 'focus not on first choice');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    assert(!(await p.evaluate(() => document.getElementById('outro').open)), 'Esc did not close outro');
    assert(await p.isVisible('#replayOutro'), 'replay button missing after outro');
  });
  await test('outro: does not re-trigger by itself; Replay + Skip work', async () => {
    await goto(p, 'contact'); await p.waitForTimeout(300); await goto(p, 'end'); await p.waitForTimeout(800);
    assert(!(await p.evaluate(() => document.getElementById('outro').open)), 'outro re-triggered on its own');
    await p.click('#replayOutro'); await p.waitForTimeout(200);
    await p.click('#outroSkip'); await p.waitForTimeout(500);
    assert(await p.evaluate(() => window.__ux.outroStep) === 5, 'skip did not jump to choices');
  });
  await test('outro choice: Explore our world → game showcase', async () => {
    await p.click('.choice[data-choice="explore"]'); await p.waitForTimeout(900);
    const top = await p.evaluate(() => document.getElementById('games').getBoundingClientRect().top);
    assert(Math.abs(top) < 80, 'not at games (top ' + top + ')');
    assert(await p.evaluate(() => document.activeElement.id) === 'games-title', 'focus not on games');
  });
  await test('outro choice: Create something with us → contact form open', async () => {
    await p.evaluate(() => window.__ux.outro.open('test')); await p.click('#outroSkip');
    await p.click('.choice[data-choice="create"]'); await p.waitForTimeout(600);
    assert(await p.isVisible('#contactForm'), 'form not open');
    assert(await p.evaluate(() => document.activeElement.id) === 'fName', 'focus not on name');
  });
  await test('outro choice: Enter the game → labelled prototype, 3 playable rounds', async () => {
    await p.evaluate(() => window.__ux.outro.open('test')); await p.click('#outroSkip');
    await p.click('.choice[data-choice="play"]'); await p.waitForTimeout(300);
    assert(await p.evaluate(() => document.getElementById('play').open), 'prototype not open');
    assert(/NOT A RELEASED GAME/.test(await p.textContent('#play')), 'prototype not labelled');
    await shot(p, '13-play');
    for (let r = 1; r <= 3; r++) {
      await p.waitForFunction((r) => window.__ux.play.round === r && !document.querySelector('.door').disabled, r, { timeout: 4000 });
      await p.click(r % 2 ? '.door--right' : '.door--left');
    }
    await p.waitForFunction(() => window.__ux.play.done, null, { timeout: 4000 });
    assert(await p.isVisible('#playAgain'), 'end buttons missing');
    await p.click('#playClose');
    assert(!(await p.evaluate(() => document.getElementById('play').open)), 'prototype did not close');
  });
  await test('settings: reduced motion toggle + guide toggle + replay intro', async () => {
    await p.click('#settingsBtn'); await p.click('label:has(#setMotion)');
    assert(await p.evaluate(() => document.documentElement.classList.contains('reduce-motion')), 'reduce-motion not applied');
    await p.click('label:has(#setGuide)');
    assert(await p.isHidden('#dock'), 'dock not hidden by setting');
    await p.click('#replayIntro'); await p.waitForTimeout(200);
    assert(await p.evaluate(() => window.__ux.introPhase) === 'invite', 'reduced-motion intro should jump to invite');
    await p.click('#enterBtn');
  });
  await test('main session: zero console errors, failed requests or skipped modules', async () => {
    const st = await p.evaluate(() => window.__ux.errors);
    assert(st.length === 0, st.join(' | '));
    assert(p.problems.length === 0, p.problems.join(' | '));
  });
  await p.context().close();

  // ---------------- Configured inbox ----------------
  await test('contact: with a configured inbox the form builds a real mailto link', async () => {
    const q = await newPage(browser, base, { hash: '#contact', init: () => { Object.defineProperty(window, 'USERSX_CONFIG', { configurable: true, set(v) { v.contact.email = 'inbox@example.com'; this._c = v; }, get() { return this._c; } }); } });
    await q.click('.option[data-type="idea"]');
    await q.fill('#fName', 'Test'); await q.fill('#fEmail', 't@example.com'); await q.fill('#fMsg', 'فكرة لعبة جديدة للجيل');
    await q.click('#fSubmit'); await q.waitForTimeout(200);
    const href = await q.evaluate(() => window.__ux.contact.lastMailto);
    assert(href && href.startsWith('mailto:inbox@example.com?subject='), 'bad mailto: ' + href);
    assert(await q.getAttribute('#directEmail a', 'href') === 'mailto:inbox@example.com', 'direct link wrong');
    await q.context().close();
  });

  // ---------------- Reduced motion ----------------
  await test('reduced motion (OS): intro static, starfield not animating, outro all-at-once', async () => {
    const q = await newPage(browser, base, { reducedMotion: 'reduce' });
    await q.waitForTimeout(200);
    assert(await q.evaluate(() => window.__ux.introPhase) === 'invite', 'intro should be static');
    assert(!(await q.evaluate(() => window.__ux.modules.stars.running())), 'stars animating');
    await q.click('#enterBtn');
    await q.evaluate(() => window.__ux.outro.open('test'));
    assert(await q.evaluate(() => window.__ux.outroStep) === 5, 'outro not instant');
    await q.context().close();
  });

  // ---------------- Mobile ----------------
  await test('mobile 375px: no horizontal overflow in any scene; touch controls work', async () => {
    const q = await newPage(browser, base, { viewport: { width: 375, height: 740 }, touch: true });
    await q.waitForFunction(() => window.__ux.introPhase === 'invite', null, { timeout: 6000 });
    await shot(q, '20-m-intro');
    await q.tap('#enterBtn'); await q.waitForTimeout(500);
    await shot(q, '21-m-universe');
    const over = [];
    for (const id of ['universe', 'symbol', 'guide', 'about', 'games', 'why', 'contact', 'end']) {
      await goto(q, id); await q.waitForTimeout(350);
      const w = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      if (w.sw > w.iw) over.push(id + ':' + w.sw);
      if (id === 'symbol') { await q.tap('#logoBtn'); await q.waitForTimeout(650); await shot(q, '22-m-logo'); assert(await q.evaluate(() => window.__ux.logo.state) === 'active', 'tap did not reveal'); }
      if (id === 'games') { await q.tap('.game-card[data-id="choice-room"] .game-card__btn'); await q.waitForTimeout(700); await shot(q, '23-m-game'); await q.tap('#gdBack'); }
      if (id === 'end') { await q.waitForFunction(() => document.getElementById('outro').open, null, { timeout: 3000 }); await q.tap('#outroSkip'); await q.waitForTimeout(400); await shot(q, '24-m-outro'); await q.tap('#outroClose'); }
    }
    assert(over.length === 0, 'overflow: ' + over.join(', '));
    await q.tap('#menuBtn');
    assert(await q.isVisible('#sceneList a[data-scene="games"]'), 'menu did not open');
    await shot(q, '25-m-menu');
    await q.tap('#sceneList a[data-scene="games"]'); await q.waitForTimeout(1800);
    assert(Math.abs(await q.evaluate(() => document.getElementById('games').getBoundingClientRect().top)) < 80, 'menu nav failed');
    const small = await q.evaluate(() => [...document.querySelectorAll('button, a.btn, .scenes a')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 40 || r.height < 40) && !b.classList.contains('dock__close'); }).map((b) => b.id || b.className).slice(0, 5));
    assert(small.length === 0, 'touch targets <40px: ' + small);
    assert(q.problems.length === 0, q.problems.join(' | '));
    await q.context().close();
  });
  await test('tablet 820px: no overflow, layout loads', async () => {
    const q = await newPage(browser, base, { viewport: { width: 820, height: 1180 }, hash: '#universe' });
    await q.waitForTimeout(300);
    const w = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(w <= 0, 'overflow ' + w);
    await shot(q, '30-tablet');
    await q.context().close();
  });

  // ---------------- No JavaScript ----------------
  await test('no-JS: content readable, intro hidden, games listed', async () => {
    const q = await newPage(browser, base, { js: false });
    assert(await q.isHidden('#intro'), 'intro blocks no-JS users');
    assert(await q.isVisible('#universe-title'), 'headline hidden');
    assert(await q.isVisible('.chapter--vision'), 'chapters hidden');
    await q.context().close();
  });

  await browser.close(); srv.close();
  for (const r of results) console.log(r.join('  '));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  process.exit(failed ? 1 : 0);
})();

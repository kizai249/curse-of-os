// Real-browser tests (Playwright + Chromium, phone and desktop). Run: node tests/e2e.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const jsQR = require('jsqr');
const { create } = require('../tools/serve.cjs');
const cfg = require('../config/card.config.js');
const vcard = require('../src/js/vcard.js');

const results = [];
async function test(name, fn) { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); }

(async () => {
  const srv = create(); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  const PHONE = devices['iPhone 13'];

  async function open(opts = {}) {
    const ctx = await browser.newContext({ ...(opts.desk ? { viewport: { width: 1280, height: 800 } } : PHONE), reducedMotion: opts.reduced ? 'reduce' : 'no-preference', acceptDownloads: true, ...(opts.ctx || {}) });
    if (opts.init) await ctx.addInitScript(opts.init);
    const p = await ctx.newPage();
    p.errs = []; p.reqs = [];
    p.on('pageerror', (e) => p.errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
    p.on('request', (r) => p.reqs.push(r.url()));
    await p.goto(base + (opts.q || ''));
    await p.waitForFunction(() => window.__card && window.__card.ready);
    if (opts.skip !== false) { await p.click('#skipBtn'); await p.waitForSelector('#cardScene:not([hidden])'); await p.waitForTimeout(950); } // let the deal-in animation land
    return p;
  }
  const close = (p) => p.context().close();
  // in-page player: taps Nuqta/gold after `ms`, never the red block
  const autoplay = (p, ms) => p.evaluate((ms) => new Promise((done) => {
    const seen = new WeakMap();
    const iv = setInterval(() => {
      document.querySelectorAll('.tgt--nuqta.is-in:not([disabled]), .tgt--gold.is-in:not([disabled])').forEach((t) => {
        if (!seen.has(t)) seen.set(t, performance.now());
        if (performance.now() - seen.get(t) >= ms && !t.dataset.tapped) { t.dataset.tapped = '1'; t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
      });
      if (!document.getElementById('resultScene').hidden) { clearInterval(iv); done(); }
    }, 25);
  }), ms);

  await test('opens with the cinematic entrance, no errors, and the intro can be skipped at once', async () => {
    const p = await open({ skip: false });
    assert(await p.isVisible('#boot'), 'boot visible');
    await p.waitForTimeout(400);
    assert(await p.locator('#bootSymbol rect').count() > 100, 'symbol pixels built');
    await p.click('#skipBtn');
    await p.waitForSelector('#cardScene:not([hidden])', { timeout: 2000 });
    assert(!p.errs.length, p.errs.join(' | '));
    await close(p);
  });

  await test('the intro continues by itself — the visitor never has to wait or tap', async () => {
    const p = await open({ skip: false });
    await p.waitForSelector('#cardScene:not([hidden])', { timeout: cfg.introAutoContinueMs + 2500 });
    await close(p);
  });

  await test('card shows the verified identity in Arabic (RTL) by default', async () => {
    const p = await open();
    assert(await p.getAttribute('html', 'dir') === 'rtl', 'rtl');
    const t = await p.textContent('#cardScene');
    for (const s of ['خالد حميدة', 'Khalid Hamida', 'شريك مؤسس ومدير العمليات', 'جدة، المملكة العربية السعودية']) assert(t.includes(s), 'missing ' + s);
    assert(await p.isVisible('.wordmark'), 'USER-X logo');
    await close(p);
  });

  await test('English (LTR) via the switch and via ?lang=en; the choice is remembered', async () => {
    const p = await open();
    await p.click('#langBtn');
    assert(await p.getAttribute('html', 'dir') === 'ltr', 'ltr');
    assert((await p.textContent('.title')).includes('Co-Founder & Operation Manager'), 'en title');
    assert((await p.textContent('#playBtn')).includes('12-second'), 'en ui');
    await p.reload(); await p.waitForFunction(() => window.__card && window.__card.ready);
    assert(await p.getAttribute('html', 'lang') === 'en', 'remembered');
    await close(p);
    const q = await open({ q: '?lang=en' });
    assert(await q.getAttribute('html', 'dir') === 'ltr', 'query param');
    await close(q);
  });

  await test('3D tilt follows the mouse; touch drag tilts; the card flips both ways', async () => {
    const p = await open({ desk: true });
    const box = await p.locator('#card').boundingBox();
    await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
    await p.waitForTimeout(120);
    const ry = await p.evaluate(() => getComputedStyle(document.getElementById('cardInner')).getPropertyValue('--ry'));
    assert(parseFloat(ry) > 3, 'tilt ' + ry);
    await p.click('#flipBtn', { force: true });
    assert(await p.getAttribute('#card', 'data-face') === 'back', 'back');
    await p.waitForTimeout(700);
    await p.click('#flipBackBtn', { force: true });
    assert(await p.getAttribute('#card', 'data-face') === 'front', 'front');
    await close(p);
    const m = await open();
    const b = await m.locator('#card').boundingBox();
    await m.dispatchEvent('#card', 'pointerdown', { pointerType: 'touch', clientX: b.x + 100, clientY: b.y + 100, pointerId: 7 });
    await m.dispatchEvent('#card', 'pointermove', { pointerType: 'touch', clientX: b.x + 220, clientY: b.y + 100, pointerId: 7 });
    await m.waitForTimeout(80);
    const ry2 = await m.evaluate(() => getComputedStyle(document.getElementById('cardInner')).getPropertyValue('--ry'));
    assert(Math.abs(parseFloat(ry2)) > 5, 'touch tilt ' + ry2);
    await m.dispatchEvent('#card', 'pointerup', { pointerType: 'touch', pointerId: 7 });
    await close(m);
  });

  await test('game: countdown, live score and timer, ends by itself in ~12 s with a tiered result', async () => {
    const p = await open();
    await p.click('#playBtn');
    await p.waitForFunction(() => /^[0-9]$/.test(document.getElementById('countdown').textContent), null, { timeout: 2000 });
    const t0 = Date.now();
    await p.waitForSelector('.tgt', { timeout: 5000 });
    await autoplay(p, 450);
    const took = Date.now() - t0;
    assert(took > 11000 && took < 16000, 'duration ' + took);
    await p.waitForTimeout(900); // the score counts up for 0.7 s
    const score = +(await p.textContent('#resultScore'));
    const title = await p.textContent('#resultTitle');
    assert(score > 0, 'scored ' + score);
    assert(title.length > 3, 'tier title');
    assert(await p.evaluate(() => +localStorage.getItem('card.best')) >= score, 'best saved');
    await close(p);
  });

  await test('game: Nuqta adds points, the red block takes points, restart and quit work', async () => {
    const p = await open();
    await p.click('#playBtn');
    await p.waitForSelector('.tgt--nuqta.is-in', { timeout: 6000 });
    await p.dispatchEvent('.tgt--nuqta.is-in', 'pointerdown');
    await p.waitForTimeout(50);
    const s1 = +(await p.textContent('#hudScore'));
    assert(s1 >= 10, 'nuqta points ' + s1);
    await p.evaluate(() => window.__card.game.place('bad'));
    await p.waitForSelector('.tgt--bad.is-in:not([disabled])', { timeout: 2000 });
    const [before, after] = await p.evaluate(() => { const b = +document.getElementById('hudScore').textContent; document.querySelector('.tgt--bad.is-in:not([disabled])').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return [b, window.__card && 0]; });
    await p.waitForTimeout(80);
    const s2 = +(await p.textContent('#hudScore'));
    assert(s2 === Math.max(0, before - 15), 'bad block: ' + before + ' -> ' + s2); void after;
    await p.click('#quitGame');
    assert(await p.isVisible('#cardScene'), 'quit → card');
    assert(await p.locator('.tgt').count() === 0, 'targets cleared');
    await p.click('#playBtn'); await p.waitForSelector('.tgt', { timeout: 6000 });
    await autoplay(p, 300);
    await p.click('#againBtn');
    await p.waitForFunction(() => /^[0-9]$/.test(document.getElementById('countdown').textContent), null, { timeout: 2000 });
    await close(p);
  });

  await test('scoring: a faster player lands in a higher tier than a slow one', async () => {
    const p = await open();
    const play = async (ms) => { await p.click(await p.isVisible('#playBtn') ? '#playBtn' : '#againBtn'); await p.waitForSelector('.tgt', { timeout: 6000 }); await autoplay(p, ms); await p.waitForTimeout(800); return +(await p.textContent('#resultScore')); };
    const fast = await play(250), slow = await play(1150);
    assert(fast > slow + 60, `fast ${fast} vs slow ${slow}`);
    const tier = (s) => cfg.game.tiers.filter((t) => s >= t).length - 1;
    assert(tier(fast) >= 2, 'fast tier ' + fast);
    await close(p);
  });

  await test('contact: save-contact downloads the real .vcf; WhatsApp and call use the verified number', async () => {
    const p = await open();
    await p.click('#quickContact');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#saveBtn')]);
    const file = fs.readFileSync(await dl.path(), 'utf8');
    assert(file === vcard.build(cfg), 'vcf content');
    assert(/\.vcf$/.test(dl.suggestedFilename()), 'name ' + dl.suggestedFilename());
    const wa = await p.getAttribute('#waBtn', 'href');
    assert(wa.startsWith('https://wa.me/966565952065?text='), wa);
    assert(await p.getAttribute('#callBtn', 'href') === 'tel:+966565952065', 'tel');
    assert(await p.locator('li[data-needs="email"]').isHidden(), 'email hidden until configured');
    assert(await p.locator('li[data-needs="linkedin"]').isHidden(), 'linkedin hidden until configured');
    await close(p);
  });

  await test('contact: configured email / LinkedIn / personal WhatsApp appear without code changes', async () => {
    const p = await open({ init: () => { Object.defineProperty(window, 'CARD_CONFIG', { configurable: true, set(v) { v.contact.email = 'k@example.sa'; v.contact.linkedin = 'https://www.linkedin.com/in/example'; v.contact.personalWhatsapp = '966500000000'; Object.defineProperty(window, 'CARD_CONFIG', { value: v, writable: true }); } }); } });
    await p.click('#quickContact');
    assert(await p.getAttribute('#mailBtn', 'href') === 'mailto:k@example.sa', 'mail');
    assert(await p.getAttribute('#liBtn', 'href') === 'https://www.linkedin.com/in/example', 'li');
    assert((await p.getAttribute('#waBtn', 'href')).startsWith('https://wa.me/966500000000'), 'personal wa');
    await close(p);
  });

  await test('share: native share sheet when available, copy-link fallback otherwise', async () => {
    const p = await open({ init: () => { window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; } });
    await p.click('#quickContact'); await p.click('#shareBtn');
    const d = await p.evaluate(() => window.__shared);
    assert(d && /127\.0\.0\.1/.test(d.url) && d.text.length > 10, JSON.stringify(d));
    await close(p);
    const q = await open({ ctx: { permissions: ['clipboard-read', 'clipboard-write'] }, init: () => { delete Navigator.prototype.share; } });
    await q.click('#quickContact'); await q.click('#shareBtn');
    await q.waitForFunction(() => document.getElementById('toast').textContent.length > 3);
    const clip = await q.evaluate(() => navigator.clipboard.readText());
    assert(clip.includes(base), 'copied ' + clip);
    await close(q);
  });

  await test('QR panel: the code on screen scans to the card URL; preview addresses are flagged; PNG downloads', async () => {
    const p = await open();
    await p.click('#quickContact'); await p.click('#qrBtn');
    assert(await p.isVisible('#qrSheet'), 'open');
    const px = await p.evaluate(() => new Promise((res) => {
      const svg = document.querySelector('#qrBox svg').outerHTML, img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 600; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 600, 600); res(Array.from(g.getImageData(0, 0, 600, 600).data)); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }));
    const code = jsQR(new Uint8ClampedArray(px), 600, 600);
    assert(code && code.data === base, 'scanned ' + (code && code.data));
    assert(await p.isVisible('#qrWarn'), 'localhost flagged as preview');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#qrPng')]);
    assert(/\.png$/.test(dl.suggestedFilename()), 'png');
    await p.click('#qrClose');
    await close(p);
  });

  await test('secret level: 5 quick taps on the logo (or ↑↑↓↓) — optional and closable', async () => {
    const p = await open();
    for (let i = 0; i < 5; i++) await p.click('#logoTap', { force: true });
    assert(await p.isVisible('#secret'), 'secret open');
    await p.click('#secretClose');
    assert(!(await p.isVisible('#secret')), 'closed');
    await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
    assert(await p.isVisible('#secret'), 'keys open it');
    await close(p);
  });

  await test('sound: off by default (no audio context), toggle works and is remembered', async () => {
    const p = await open({ init: () => { window.__ac = 0; const A = window.AudioContext; window.AudioContext = function () { window.__ac++; return new A(); }; } });
    assert(await p.getAttribute('#soundBtn', 'aria-pressed') === 'false', 'off');
    await p.click('#playBtn'); await p.waitForTimeout(1500);
    assert(await p.evaluate(() => window.__ac) === 0, 'no audio before opting in');
    await p.click('#quitGame');
    await p.click('#soundBtn');
    assert(await p.getAttribute('#soundBtn', 'aria-pressed') === 'true', 'on');
    assert(await p.evaluate(() => window.__ac) === 1, 'audio created on tap');
    assert(await p.evaluate(() => JSON.parse(localStorage.getItem('card.sound'))) === true, 'remembered');
    await close(p);
  });

  await test('reduced motion: calm mode on, entrance shortens, game still playable', async () => {
    const p = await open({ reduced: true, skip: false });
    assert(await p.evaluate(() => document.documentElement.classList.contains('calm')), 'calm');
    await p.waitForSelector('#cardScene:not([hidden])', { timeout: 3000 });
    await p.click('#playBtn'); await p.waitForSelector('.tgt', { timeout: 6000 });
    await autoplay(p, 400);
    await p.waitForTimeout(900);
    assert(+(await p.textContent('#resultScore')) > 0, 'played');
    await close(p);
  });

  await test('analytics: anonymous events recorded locally; nothing sent without an endpoint', async () => {
    const p = await open();
    await p.click('#quickContact');
    await p.click('#langBtn');
    const ev = await p.evaluate(() => window.__card.events.map((e) => e.event));
    for (const e of ['landing', 'card_opened', 'contact_opened', 'language_changed']) assert(ev.includes(e), 'missing ' + e);
    const ext = p.reqs.filter((u) => !u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:'));
    assert(!ext.length, 'external requests: ' + ext.join(', '));
    await close(p);
  });

  await test('analytics: with an endpoint, events carry no personal data', async () => {
    const sent = [];
    const p = await open({ init: () => { Object.defineProperty(window, 'CARD_CONFIG', { configurable: true, set(v) { v.analytics.endpoint = 'https://stats.example/collect'; Object.defineProperty(window, 'CARD_CONFIG', { value: v, writable: true }); } }); } });
    await p.route('https://stats.example/**', (r) => { sent.push(r.request().postData()); r.fulfill({ status: 204 }); });
    await p.click('#langBtn');
    await p.waitForTimeout(400);
    const rows = (sent.length ? sent : await p.evaluate(() => window.__card.events.map((e) => JSON.stringify(e))));
    assert(rows.length, 'events');
    for (const r of rows) assert(!/966|@|Khalid|خالد/.test(r), 'personal data in ' + r);
    await close(p);
  });

  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await test(`layout ${vp.width}px: no sideways scroll in any scene; card text fits`, async () => {
      const p = await open({ ctx: { viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 700 } });
      const over = async (where) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, where + ' overflow ' + o); };
      await over('card');
      await p.click('#playBtn'); await over('game'); await p.click('#quitGame');
      await p.click('#quickContact'); await over('contact');
      const clipped = await p.evaluate(() => [...document.querySelectorAll('.name__ar,.name__en,.title')].some((e) => e.scrollWidth > e.clientWidth + 1));
      assert(!clipped, 'name or title clipped');
      await close(p);
    });
  }

  await test('every local link, script, style, font and image loads (no broken links)', async () => {
    const p = await open();
    await p.click('#quickContact');
    const urls = await p.evaluate(() => [...document.querySelectorAll('a[href], script[src], link[href], img[src]')].map((e) => e.href || e.src).filter((u) => u.startsWith(location.origin)));
    for (const u of new Set(urls)) { const r = await p.request.get(u.split('#')[0]); assert(r.status() === 200, u + ' → ' + r.status()); }
    const fonts = await p.evaluate(() => document.fonts.ready.then(() => [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family)));
    assert(!fonts.length, 'fonts failed: ' + fonts);
    await close(p);
  });

  await test('accessibility basics: every button and link has a name, images have alt, one h1', async () => {
    const p = await open();
    const r = await p.evaluate(() => {
      const nameless = [...document.querySelectorAll('button, a')].filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim())).map((e) => e.id || e.className);
      return { nameless, noAlt: [...document.querySelectorAll('img:not([alt])')].length, h1: document.querySelectorAll('h1').length };
    });
    assert(!r.nameless.length && !r.noAlt && r.h1 === 1, JSON.stringify(r));
    await close(p);
  });

  await browser.close(); srv.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] ? '→ ' + r[2] : '');
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

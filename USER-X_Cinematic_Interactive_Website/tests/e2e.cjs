// USER-X cinematic site — browser acceptance tests (Playwright + Chromium, real server).
// Run: npm run test:e2e   [optional screenshot dir as first argument]
// Three servers: offline (no keys), AI (stubbed Claude reply) and AI-failing (upstream error).
'use strict';
const { chromium } = require('playwright');
const { createApp } = require('../server/server');
const kb = require('../server/lib/kb').load();

const SHOTS = process.argv[2] || null;
const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, String(e.message).split('\n')[0]]); }
}
function assert(c, m) { if (!c) throw new Error(m); }
const listen = (app) => new Promise((r) => app.listen(0, '127.0.0.1', () => r(app)));
const url = (app) => `http://127.0.0.1:${app.address().port}/`;
const quiet = () => {};

(async () => {
  const offline = await listen(createApp({ env: {}, kb, log: quiet }));
  const aiCalls = [];
  const aiStub = { enabled: true, reply: async (m, context) => (aiCalls.push(context), { reply: 'هلا! هذا رد من الذكاء الاصطناعي. تبي أجهّز لك طلب؟', lang: 'ar', intent: 'player', action: 'open_booking', game_id: 'choice-room', mood: 'excited' }) };
  const ai = await listen(createApp({ env: {}, kb, ai: aiStub, log: quiet }));
  const broken = await listen(createApp({ env: {}, kb, ai: { enabled: true, reply: async () => { throw new Error('upstream down'); } }, log: quiet }));
  const browser = await chromium.launch();

  async function open(app, opts = {}) {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 860 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', locale: 'ar-SA' });
    const page = await ctx.newPage();
    page.errs = [];
    page.on('pageerror', (e) => page.errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') page.errs.push('console: ' + m.text()); });
    page.requests = [];
    page.on('request', (r) => page.requests.push(r.url()));
    await page.goto(url(app) + (opts.hash || ''), { waitUntil: 'networkidle' });
    if (!opts.keepIntro) { await page.click('#skipIntro').catch(() => {}); await page.waitForTimeout(500); }
    await page.waitForFunction(() => window.__nuqta && window.__nuqta.ready);
    return page;
  }
  const close = (p) => p.context().close();

  await test('loads with no errors; every module starts', async () => {
    const p = await open(offline);
    await p.waitForTimeout(800);
    const st = await p.evaluate(() => ({ ux: window.__ux.errors, nq: window.__nuqta.errors, mods: Object.entries(window.__ux.modules).filter(([, v]) => v === false).map(([k]) => k) }));
    assert(!p.errs.length, p.errs.join(' | '));
    assert(!st.ux.length && !st.nq.length && !st.mods.length, JSON.stringify(st));
    if (SHOTS) await p.screenshot({ path: SHOTS + '/01-universe.png' });
    await close(p);
  });

  await test('intro: the film starts by itself, ends by itself and lands on the site (no click)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url(offline), { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('#cinema canvas'), null, { timeout: 4000 });
    assert(!(await p.locator('#intro').isHidden()), 'film visible on entry');
    assert(await p.locator('#enterBtn').count() === 0, 'no enter button any more');
    assert(!(await p.locator('#introHint').isHidden()), 'tap-for-sound hint shown while silent');
    await p.waitForFunction(() => document.querySelector('#intro').dataset.shot === '3' || document.querySelector('#cinema').dataset.shot === '3', null, { timeout: 6000 });
    await p.waitForFunction(() => window.__ux.introPhase === 'done', null, { timeout: 16000 });
    assert(await p.locator('#intro').isHidden(), 'film closed itself');
    assert(!errs.length, errs.join(' | '));
    // same tab reload: straight in; a new visit (new session) plays it again
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(300);
    assert(await p.locator('#intro').isHidden(), 'no replay on reload in the same tab');
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p2 = await ctx2.newPage();
    await p2.goto(url(offline), { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(400);
    assert(!(await p2.locator('#intro').isHidden()), 'a new visit opens with the film again');
    await ctx.close(); await ctx2.close();
  });

  await test('intro: first tap turns the score on; skip leaves at once; Escape skips', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(url(offline), { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('#cinema canvas'));
    await p.mouse.click(640, 400);
    await p.waitForFunction(() => document.getElementById('introHint').hidden, null, { timeout: 3000 });
    assert(await p.getAttribute('#introSound', 'aria-pressed') === 'true', 'sound on after the first tap');
    assert(await p.evaluate(() => window.__ux.introPhase) !== 'done', 'a tap does not skip the film');
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => window.__ux.introPhase === 'done', null, { timeout: 2000 });
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await ctx2.newPage();
    await p2.goto(url(offline), { waitUntil: 'domcontentloaded' });
    await p2.click('#skipIntro');
    await p2.waitForFunction(() => window.__ux.introPhase === 'done', null, { timeout: 2000 });
    await ctx.close(); await ctx2.close();
  });

  await test('intro: reduced motion shows a still logo and still enters by itself', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(url(offline), { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('.cin__logo.is-static'), null, { timeout: 3000 });
    await p.waitForFunction(() => window.__ux.introPhase === 'done', null, { timeout: 6000 });
    await ctx.close();
  });

  await test('scene navigation covers all 12 scenes and updates the counter', async () => {
    const p = await open(offline);
    const n = await p.locator('#sceneList a').count();
    assert(n === 12, 'scenes: ' + n);
    await p.evaluate(() => document.getElementById('brands').scrollIntoView({ behavior: 'instant' }));
    await p.waitForFunction(() => document.getElementById('sceneCounter').textContent === '07/12', null, { timeout: 4000 }).catch(() => {});
    const c = await p.textContent('#sceneCounter');
    assert(c === '07/12', 'counter ' + c);
    await close(p);
  });

  await test('contact: direct WhatsApp and phone links use the real number', async () => {
    const p = await open(offline);
    const wa = await p.getAttribute('#waDirect', 'href');
    assert(wa.startsWith('https://wa.me/966565952065?text='), wa);
    assert(await p.locator('a[href="tel:+966565952065"]').count() >= 1, 'tel link');
    const city = await p.textContent('.direct-city');
    assert(/جدة/.test(city), city);
    await close(p);
  });

  await test('booking form: validates, normalises Arabic-digit phones, builds a WhatsApp message, never claims a confirmed booking', async () => {
    const p = await open(offline);
    await p.click('.contact-options .option[data-type="booking"]');
    await p.waitForSelector('#contactForm:not([hidden])');
    await p.click('#fSubmit');
    assert(await p.getAttribute('#fName', 'aria-invalid') === 'true', 'name error');
    assert(await p.getAttribute('#fPhone', 'aria-invalid') === 'true', 'phone error');
    await p.fill('#fName', 'سارة');
    await p.fill('#fPhone', '٠٥٥١٢٣٤٥٦٧');
    await p.selectOption('#fExp', 'choice-room');
    await p.fill('#fCount', '6');
    await p.click('#fSubmit');
    const href = await p.getAttribute('#waLink', 'href');
    assert(href.startsWith('https://wa.me/966565952065?text='), href);
    const text = decodeURIComponent(href.split('text=')[1]);
    assert(text.includes('سارة') && text.includes('+966551234567') && text.includes('غرفة الاختيار') && text.includes('عدد المشاركين: 6'), text);
    const status = await p.textContent('#formStatus');
    assert(/يتأكد لما يردون/.test(status) && !/تم تأكيد/.test(status), status);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/05-booking.png' });
    await close(p);
  });

  await test('brand CTA opens the corporate form with the company field', async () => {
    const p = await open(offline);
    await p.click('[data-book="corporate"]');
    await p.waitForSelector('#contactForm:not([hidden])');
    assert(await p.inputValue('#fType') === 'corporate', 'type');
    assert(await p.locator('#fOrg').isVisible(), 'org field visible');
    assert(!(await p.locator('#fEventType').isVisible()), 'event type hidden for corporate');
    await close(p);
  });

  await test('game detail CTA preselects the game in the request form', async () => {
    const p = await open(offline);
    await p.evaluate(() => document.getElementById('games').scrollIntoView());
    await p.waitForTimeout(500);
    await p.click('.game-card__btn >> nth=1');
    await p.waitForSelector('#gameDetail:not([hidden])');
    await p.click('#gdCta');
    await p.waitForSelector('#contactForm:not([hidden])');
    assert(await p.inputValue('#fExp') === 'choice-room', 'exp ' + await p.inputValue('#fExp'));
    await close(p);
  });

  await test('Nuqta chat (offline): greets, answers price honestly, action button opens the form', async () => {
    const p = await open(offline);
    await p.click('#nqLaunch');
    await p.waitForSelector('#nqChat:not([hidden])');
    assert(await p.evaluate(() => document.activeElement.id) === 'nqText', 'input focused');
    assert(/المعلومات المؤكدة/.test(await p.textContent('#nqMode')), 'offline mode label');
    await p.fill('#nqText', 'كم الأسعار؟'); await p.press('#nqText', 'Enter');
    await p.waitForFunction(() => window.__nuqta.log.length >= 3);
    const reply = await p.evaluate(() => window.__nuqta.log[2].text);
    assert(/ما فيه أسعار منشورة/.test(reply), reply);
    await p.click('.nq-msg--nuqta .nq-action >> nth=-1');
    await p.waitForSelector('#contactForm:not([hidden])');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/08-chat-offline.png' });
    await close(p);
  });

  await test('Nuqta chat (offline): unknown fact -> admits it and offers a prefilled WhatsApp link', async () => {
    const p = await open(offline);
    await p.click('#nqLaunch');
    await p.fill('#nqText', 'مين أكبر عملاءكم؟'); await p.press('#nqText', 'Enter');
    await p.waitForFunction(() => window.__nuqta.log.length >= 3);
    const last = await p.evaluate(() => window.__nuqta.log[2]);
    assert(/ما عندي معلومات مؤكدة|ما راح أخترع/.test(last.text), last.text);
    const href = await p.getAttribute('.nq-msg--nuqta a.nq-action', 'href');
    assert(href.startsWith('https://wa.me/966565952065?text=') && decodeURIComponent(href).includes('عملاءكم'), href);
    await close(p);
  });

  await test('Nuqta chat (AI): uses the server, shows the AI mode, renders the action', async () => {
    const p = await open(ai);
    await p.click('#nqLaunch');
    assert(/ذكاء اصطناعي/.test(await p.textContent('#nqMode')) && !/بدون/.test(await p.textContent('#nqMode')), 'ai label');
    await p.click('#nqQuick [data-q] >> nth=1');
    await p.waitForFunction(() => window.__nuqta.log.length >= 3);
    const last = await p.evaluate(() => window.__nuqta.last);
    assert(last.mode === 'ai' && /الذكاء الاصطناعي/.test(last.reply), JSON.stringify(last));
    assert(await p.locator('.nq-msg--nuqta .nq-action').count() >= 1, 'action button');
    await close(p);
  });

  await test('Nuqta chat (AI failing): falls back to the knowledge base without breaking', async () => {
    const p = await open(broken);
    await p.click('#nqLaunch');
    await p.fill('#nqText', 'وين مكانكم؟'); await p.press('#nqText', 'Enter');
    await p.waitForFunction(() => window.__nuqta.log.length >= 3);
    const last = await p.evaluate(() => window.__nuqta.last);
    assert(last.mode === 'offline' && /جدة/.test(last.reply), JSON.stringify(last));
    assert(!p.errs.filter((e) => !/502/.test(e)).length, p.errs.join(' | '));
    await close(p);
  });

  await test('chat: Escape closes and returns focus to the launcher; keyboard opens it', async () => {
    const p = await open(offline);
    await p.focus('#nqLaunch'); await p.keyboard.press('Enter');
    await p.waitForSelector('#nqChat:not([hidden])');
    await p.keyboard.press('Escape');
    assert(await p.locator('#nqChat').isHidden(), 'closed');
    assert(await p.evaluate(() => document.activeElement.id) === 'nqLaunch', 'focus back');
    await close(p);
  });

  await test('English question gets an English answer', async () => {
    const p = await open(offline);
    await p.click('#nqLaunch');
    await p.fill('#nqText', 'How much does it cost?'); await p.press('#nqText', 'Enter');
    await p.waitForFunction(() => window.__nuqta.log.length >= 3);
    const last = await p.evaluate(() => window.__nuqta.last);
    assert(last.lang === 'en' && /No published prices/.test(last.reply), last.reply);
    assert(await p.getAttribute('.nq-msg--nuqta >> nth=-1 >> p', 'dir') === 'ltr', 'ltr bubble');
    await close(p);
  });

  await test('FAQ renders from the knowledge base; "ask" sends the question to Nuqta', async () => {
    const p = await open(offline);
    await p.waitForFunction(() => document.querySelectorAll('#faqList details').length >= 10);
    await p.evaluate(() => document.getElementById('faq').scrollIntoView());
    await p.click('#faqList details >> nth=2 >> summary');
    assert(await p.locator('#faqList details >> nth=2').getAttribute('open') !== null, 'opens');
    await p.fill('#faqInput', 'فيه حد للعمر؟'); await p.press('#faqInput', 'Enter');
    await p.waitForFunction(() => window.__nuqta.log.length >= 3);
    assert(/١٥/.test(await p.evaluate(() => window.__nuqta.last.reply)), 'age answer');
    await close(p);
  });

  await test('process tabs switch by click and arrow keys', async () => {
    const p = await open(offline);
    await p.click('#tabB2B');
    assert(await p.locator('#trackB2B').isVisible() && await p.locator('#trackPlayers').isHidden(), 'b2b shown');
    await p.focus('#tabB2B'); await p.keyboard.press('ArrowRight');
    assert(await p.locator('#trackPlayers').isVisible(), 'arrow back to players');
    await close(p);
  });

  await test('roaming Nuqta: appears after the intro, never intercepts clicks, runs on scene change (lively)', async () => {
    const p = await open(offline);
    await p.selectOption('#setAntics', 'lively').catch(async () => { await p.click('#settingsBtn'); await p.selectOption('#setAntics', 'lively'); });
    await p.waitForTimeout(300);
    assert(await p.locator('#roam').isVisible(), 'roam visible');
    assert(await p.evaluate(() => getComputedStyle(document.getElementById('roam')).pointerEvents) === 'none', 'no pointer events');
    await p.evaluate(() => { window.__nuqta.roam.busy = false; window.__nuqta.roam.lastRun = 0; document.getElementById('process').scrollIntoView(); });
    await p.waitForTimeout(900);
    const antics = await p.evaluate(() => window.__nuqta.antics.slice());
    assert(antics.includes('run'), 'ran: ' + antics.join(','));
    await close(p);
  });

  await test('roaming Nuqta: "off" hides it; setting persists across reloads', async () => {
    const p = await open(offline);
    await p.click('#settingsBtn');
    await p.selectOption('#setAntics', 'off');
    assert(await p.locator('#roam').isHidden(), 'hidden');
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForFunction(() => window.__nuqta && window.__nuqta.ready);
    await p.waitForTimeout(600);
    assert(await p.locator('#roam').isHidden(), 'still hidden after reload');
    await close(p);
  });

  await test('reduced motion: html gets reduce-motion and Nuqta never runs', async () => {
    const p = await open(offline, { reduced: true });
    assert(await p.evaluate(() => document.documentElement.classList.contains('reduce-motion')), 'class');
    await p.evaluate(() => { window.__nuqta.prefs.antics = 'lively'; window.__nuqta.roam.apply(); window.__nuqta.roam.lap('x'); });
    await p.waitForTimeout(300);
    assert(!(await p.evaluate(() => window.__nuqta.antics.includes('run'))), 'no run under reduced motion');
    await close(p);
  });

  await test('voice: toggle persists; stop button hidden when silent; site works with sound off', async () => {
    const p = await open(offline);
    await p.click('#nqLaunch');
    assert(await p.getAttribute('#nqVoice', 'aria-pressed') === 'true', 'on by default');
    await p.click('#nqVoice');
    assert(await p.getAttribute('#nqVoice', 'aria-pressed') === 'false', 'off');
    assert(await p.evaluate(() => JSON.parse(localStorage.getItem('ux.nq.voiceOn'))) === false, 'stored');
    assert(await p.locator('#nqStop').isHidden(), 'stop hidden');
    await close(p);
  });

  await test('old trailer is gone: no button, no dialog, no video requests', async () => {
    const p = await open(offline);
    assert(await p.locator('#trailerBtn, #trailer, video').count() === 0, 'trailer markup removed');
    assert(!p.requests.some((u) => /\.(mp4|webm)(\?|$)/.test(u)), 'no video requested');
    await close(p);
  });

  await test('Nuqta: walks off and comes back; walks to a game card the visitor lingers on', async () => {
    const p = await open(offline);
    await p.waitForFunction(() => window.__nuqta.roam.visible());
    await p.waitForFunction(() => !window.__nuqta.roam.busy, null, { timeout: 8000 }); // entrance run done
    await p.evaluate(() => window.__nuqta.roam.wander());
    await p.waitForFunction(() => document.getElementById('roamBody').classList.contains('is-walk'), null, { timeout: 2000 });
    await p.waitForFunction(() => !window.__nuqta.roam.busy, null, { timeout: 20000 });
    const home = await p.evaluate(() => Math.abs(window.__nuqta.roam.x - window.__nuqta.roam.home) < 2);
    assert(home, 'came back home');
    await p.evaluate(() => { const d = window.__nuqta.directorApi; d.lastAt = 0; document.getElementById('games').scrollIntoView({ behavior: 'instant' }); });
    await p.waitForSelector('.game-card[data-id="curse-of-os"]');
    await p.hover('.game-card[data-id="curse-of-os"]');
    await p.waitForFunction(() => window.__nuqta.director.includes('game:curse-of-os'), null, { timeout: 3000 });
    assert(await p.evaluate(() => window.__nuqta.antics.includes('goto')), 'walked to the card');
    await p.waitForFunction(() => /لعنة أوس/.test(document.querySelector('#roamBubble .bubble__text').textContent), null, { timeout: 8000 });
    await close(p);
  });

  await test('Nuqta: idle tip, one per section; poking him reacts; he never blocks the page', async () => {
    const p = await open(offline);
    await p.waitForFunction(() => window.__nuqta.roam.visible());
    await p.waitForFunction(() => !window.__nuqta.roam.busy, null, { timeout: 8000 });
    await p.evaluate(() => { const d = window.__nuqta.directorApi; clearTimeout(d.idleId); d.remark('tip:faq', 'x'); d.lastAt = 0; d.remark('tip:faq', 'again'); });
    assert(await p.evaluate(() => window.__nuqta.director.filter((k) => k === 'tip:faq').length) === 1, 'tip once');
    await p.evaluate(() => { window.__nuqta.roam.busy = false; });
    const box = await p.locator('#roamAvatar').boundingBox();
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert(await p.evaluate(() => window.__nuqta.director.includes('poke')), 'poke registered');
    assert(await p.evaluate(() => getComputedStyle(document.getElementById('roam')).pointerEvents) === 'none', 'strip never takes clicks');
    await close(p);
  });

  await test('Nuqta voice: on by default, silent until the first gesture, never during the intro', async () => {
    const p = await open(offline);
    assert(await p.evaluate(() => window.__nuqta.prefs.voice) === true, 'voice default on');
    assert(await p.evaluate(() => { const t = window.__nuqta.talk; t.lastSpoken = 0; return window.__ux.introPhase === 'done' && t.canSpeak(); }), 'can speak after the skip click');
    await p.evaluate(() => { window.__nuqta.talk.lastSpoken = Date.now(); });
    assert(!(await p.evaluate(() => window.__nuqta.talk.canSpeak())), 'throttled right after speaking');
    await close(p);
  });

  await test('chat sends page context; the server only accepts allowlisted values', async () => {
    aiCalls.length = 0;
    const p = await open(ai);
    await p.evaluate(() => { const d = window.__nuqta.directorApi; d.scene = 'games'; d.visited = ['universe', 'games']; d.game = 'curse-of-os'; });
    await p.click('#nqLaunch');
    await p.fill('#nqText', 'وش تنصحني؟');
    await p.press('#nqText', 'Enter');
    await p.waitForFunction(() => window.__nuqta.last && window.__nuqta.last.mode === 'ai', null, { timeout: 5000 });
    const c = aiCalls[aiCalls.length - 1] || '';
    assert(/"games" section/.test(c) && /curse-of-os/.test(c) && /universe, games/.test(c), 'context reached the model: ' + c);
    await close(p);
  });

  await test('no old brand name anywhere in the visible page', async () => {
    const p = await open(offline);
    const t = await p.evaluate(() => document.body.innerText);
    assert(!/USERS-X|USERSX|يوزرز/.test(t), 'old name found');
    await close(p);
  });

  await test('accessibility basics: one h1, named buttons and links, images have alt', async () => {
    const p = await open(offline);
    const r = await p.evaluate(() => {
      const named = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim() || el.getAttribute('title');
      return {
        h1: document.querySelectorAll('h1').length,
        unnamedButtons: [...document.querySelectorAll('button')].filter((b) => !named(b)).map((b) => b.id || b.className),
        unnamedLinks: [...document.querySelectorAll('a[href]')].filter((a) => !named(a)).map((a) => a.href),
        noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src)
      };
    });
    assert(r.h1 === 1 && !r.unnamedButtons.length && !r.unnamedLinks.length && !r.noAlt.length, JSON.stringify(r));
    await close(p);
  });

  for (const [label, vp] of [['phone 390', { width: 390, height: 844 }], ['tablet 820', { width: 820, height: 1180 }]]) {
    await test(`${label}: no horizontal overflow in any scene; chat fits the screen`, async () => {
      const p = await open(offline, { viewport: vp });
      for (const id of ['universe', 'games', 'brands', 'process', 'faq', 'contact', 'end']) {
        await p.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), id);
        await p.waitForTimeout(250);
        const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(o <= 0, `${id} overflows by ${o}px`);
        if (SHOTS && vp.width === 390) await p.screenshot({ path: `${SHOTS}/m-${id}.png` });
      }
      // reaching the end opens the outro scene (modal); close it like a visitor would
      if (await p.locator('#outro[open]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      await p.click('#nqLaunch');
      const box = await p.locator('#nqChat').boundingBox();
      assert(box.x >= 0 && box.x + box.width <= vp.width + 1, 'chat inside viewport');
      if (SHOTS && vp.width === 390) await p.screenshot({ path: `${SHOTS}/m-chat.png` });
      await close(p);
    });
  }

  await browser.close();
  [offline, ai, broken].forEach((s) => s.close());
  for (const r of results) console.log(r[0], '-', r[1], r[2] ? '→ ' + r[2] : '');
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

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
  const aiStub = { enabled: true, reply: async (m) => ({ reply: 'هلا! هذا رد من الذكاء الاصطناعي. تبي أجهّز لك طلب؟', lang: 'ar', intent: 'player', action: 'open_booking', game_id: 'choice-room', mood: 'excited' }) };
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

  await test('intro plays on first visit, skips on a returning visit (no tracking beyond local storage)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(url(offline), { waitUntil: 'networkidle' });
    assert(!(await p.locator('#intro').isHidden()), 'intro visible on first visit');
    await p.click('#skipIntro'); await p.waitForTimeout(400);
    const p2 = await ctx.newPage();
    await p2.goto(url(offline), { waitUntil: 'networkidle' });
    await p2.waitForTimeout(300);
    assert(await p2.locator('#intro').isHidden(), 'intro skipped for a returning visitor');
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
    await p.click('#nqVoice');
    assert(await p.getAttribute('#nqVoice', 'aria-pressed') === 'true', 'on');
    assert(await p.evaluate(() => JSON.parse(localStorage.getItem('ux.nq.voice'))) === true, 'stored');
    await p.click('#nqVoice');
    assert(await p.locator('#nqStop').isHidden(), 'stop hidden');
    await close(p);
  });

  await test('trailer: video is not downloaded until opened; dialog opens and closes', async () => {
    const p = await open(offline);
    assert(!p.requests.some((u) => /\.mp4/.test(u)), 'no mp4 before click');
    await p.click('#trailerBtn');
    assert(await p.locator('#trailer').isVisible(), 'dialog open');
    assert(/user-x-trailer-960\.mp4$/.test(await p.getAttribute('#trailerVideo', 'src')), 'desktop source');
    await p.click('#trailerClose');
    assert(await p.locator('#trailer').isHidden(), 'closed');
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

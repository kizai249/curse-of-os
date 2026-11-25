// Visual walk-through: screenshots of every scene on a phone and a desktop. node tests/shots.cjs <outDir>
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');
const { create } = require('../tools/serve.cjs');

(async () => {
  const out = process.argv[2] || path.join(__dirname, '..', '.shots');
  fs.mkdirSync(out, { recursive: true });
  const srv = create(); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  for (const [tag, opts] of [['phone', devices['iPhone 13']], ['desk', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(base + (tag === 'desk' ? '?lang=en' : ''));
    await p.waitForTimeout(450); await p.screenshot({ path: `${out}/${tag}-1-boot-a.png` });
    await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${tag}-2-boot-b.png` });
    await p.click('#startBtn'); await p.waitForTimeout(1100); await p.screenshot({ path: `${out}/${tag}-3-card.png`, fullPage: true });
    await p.click('#flipBtn', { force: true }); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${tag}-4-back.png` });
    await p.click('#flipBackBtn', { force: true }); await p.waitForTimeout(700);
    await p.click('#playBtn'); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${tag}-5-countdown.png` });
    await p.waitForTimeout(2200);
    // play like a decent human: tap Nuqta/gold after ~420 ms, never the red block
    const until = Date.now() + 12500;
    while (Date.now() < until) {
      const t = await p.$('.tgt--nuqta.is-in:not([disabled]), .tgt--gold.is-in:not([disabled])');
      if (t) { await p.waitForTimeout(420); try { await t.click({ timeout: 300, force: true }); } catch (e) { /* gone */ } }
      if (Date.now() > until - 7000 && !fs.existsSync(`${out}/${tag}-6-game.png`)) await p.screenshot({ path: `${out}/${tag}-6-game.png` });
      await p.waitForTimeout(60);
    }
    await p.waitForSelector('#resultScene:not([hidden])', { timeout: 5000 });
    await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${tag}-7-result.png`, fullPage: true });
    console.log(tag, 'score', await p.textContent('#resultScore'), await p.textContent('#resultTitle'));
    await p.click('#toContact'); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${tag}-8-contact.png`, fullPage: true });
    await p.click('#qrBtn'); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${tag}-9-qr.png` });
    await p.click('#qrClose');
    await p.click('#backToCard'); await p.waitForTimeout(500);
    for (let i = 0; i < 5; i++) await p.click('#logoTap', { force: true });
    await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${tag}-10-secret.png` });
    console.log(tag, 'errors:', errs.length ? errs : 'none');
    await ctx.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });

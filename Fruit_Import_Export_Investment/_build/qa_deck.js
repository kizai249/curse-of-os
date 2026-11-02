// QA: open the deck in Chromium, check JS errors, navigation, every slide, control panel recompute, scenarios, responsive sizes.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../01_Investor_Pitch_Deck/index.html');
function fail(msg) { console.error(`qa_deck: ${msg}`); process.exit(1); }
const shots = path.join(__dirname, 'shots');
try { fs.mkdirSync(shots, { recursive: true }); } catch (err) { fail(`could not create ${shots}: ${err.message}`); }
(async () => {
  const b = await chromium.launch(); const out = { errors: [], checks: {} };
  const page = await b.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => out.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') out.errors.push('console: ' + m.text()); });
  await page.goto(url); await page.waitForFunction(() => window.__deck && window.__deck.ready);
  await page.waitForTimeout(600);
  const n = await page.$$eval('.slide', s => s.length); out.checks.slides = n;
  for (let i = 0; i < n; i++) {
    await page.evaluate(i => window.__deck.go(i, true), i); await page.waitForTimeout(i === 0 ? 900 : 1300);
    await page.screenshot({ path: path.join(shots, `slide_${String(i + 1).padStart(2, '0')}.png`) });
    const ov = await page.evaluate(() => { const s = document.querySelector('.slide.active'); const bad = []; s.querySelectorAll('.card, .kpi, table').forEach(el => { if (el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflow !== 'visible') bad.push(el.className); }); const r = s.getBoundingClientRect(); let maxB = 0; s.querySelectorAll('.body, .head').forEach(el => maxB = Math.max(maxB, el.getBoundingClientRect().bottom)); return { bad, overflowBottom: maxB > r.bottom - 50 }; });
    if (ov.overflowBottom) out.errors.push(`slide ${i + 1}: content reaches bottom edge`);
    const missing = await page.$$eval('.slide.active [data-k]', els => els.filter(e => /…|NaN|undefined/.test(e.textContent)).map(e => e.dataset.k));
    if (missing.length) out.errors.push(`slide ${i + 1}: unresolved binds ${missing.join(',')}`);
  }
  // keyboard navigation
  await page.evaluate(() => window.__deck.go(0, true));
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.press('PageDown'); await page.waitForTimeout(300);
  out.checks.keyboardNext = await page.$eval('#counter', e => e.textContent);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  out.checks.keyboardPrev = await page.$eval('#counter', e => e.textContent);
  await page.keyboard.press('End'); await page.waitForTimeout(300); out.checks.end = await page.$eval('#counter', e => e.textContent);
  // buttons
  await page.click('#btnPrev'); await page.waitForTimeout(300); out.checks.btnPrev = await page.$eval('#counter', e => e.textContent);
  await page.click('#btnGrid'); out.checks.gridOpen = await page.$eval('#overview', e => e.classList.contains('open'));
  await page.click('#overview button[data-i="12"]'); await page.waitForTimeout(400); out.checks.gridJump = await page.$eval('#counter', e => e.textContent);
  // control panel → recompute
  const before = await page.evaluate(() => window.__deck.res.metrics.totalNI5y);
  await page.click('#btnPanel'); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shots, 'panel.png') });
  await page.$eval('input[data-key="shipment.sellPricePerCarton"]', el => { el.value = 45; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__deck.res.metrics.totalNI5y);
  const panelText = await page.$eval('.panel .live', e => e.textContent);
  out.checks.panelRecompute = { before: Math.round(before), after: Math.round(after), changed: before !== after, panelShowsNew: panelText.length > 0 };
  // engine parity: deck run with price 45 equals node engine
  const E = require('../01_Investor_Pitch_Deck/engine.js'); const p = E.scenarioParams('base'); p.shipment.sellPricePerCarton = 45;
  out.checks.panelMatchesEngine = Math.abs(E.run(p).metrics.totalNI5y - after) < 0.01;
  await page.$eval('input[data-key="finance.initialInvestment"]', el => { el.value = 60000; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(400); out.checks.fundingWarningShown = await page.$eval('#warn', e => e.classList.contains('show'));
  await page.screenshot({ path: path.join(shots, 'panel_warning.png') });
  await page.click('#reset'); await page.waitForTimeout(300); await page.click('#panelDone');
  // scenarios
  for (const s of ['conservative', 'optimistic', 'base']) {
    await page.click(`#scenarioPill button[data-scn="${s}"]`); await page.waitForTimeout(300);
    out.checks['scenario_' + s] = Math.round(await page.evaluate(() => window.__deck.res.metrics.totalNI5y));
  }
  // responsive
  for (const [w, h, name] of [[1280, 720, 'laptop'], [1920, 1080, 'fullhd'], [1024, 768, 'tablet'], [390, 844, 'phone']]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    pg.on('pageerror', e => out.errors.push(name + ' pageerror: ' + e.message));
    await pg.goto(url + '#13'); await pg.waitForTimeout(1500);
    await pg.screenshot({ path: path.join(shots, `resp_${name}.png`), fullPage: name !== 'phone' });
    const hscroll = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    out.checks['resp_' + name] = { reader: await pg.evaluate(() => document.body.classList.contains('reader')), horizontalScroll: hscroll };
    if (name === 'phone') { await pg.evaluate(() => window.scrollTo(0, 2600)); await pg.waitForTimeout(500); await pg.screenshot({ path: path.join(shots, 'resp_phone_2.png') }); }
    await pg.close();
  }
  // PDF export of the deck (print mode)
  const pp = await b.newPage({ viewport: { width: 1600, height: 900 } });
  pp.on('pageerror', e => out.errors.push('print pageerror: ' + e.message));
  await pp.goto(url + '?print=1'); await pp.waitForTimeout(1500);
  const pdfPath = path.resolve(__dirname, '../04_Investor_Materials/Investor_Pitch_Deck.pdf');
  await pp.pdf({ path: pdfPath, width: '1600px', height: '900px', printBackground: true, preferCSSPageSize: true });
  out.checks.pdfBytes = fs.statSync(pdfPath).size;
  await b.close();
  const resPath = path.join(__dirname, 'qa_deck_result.json');
  try { fs.writeFileSync(resPath, JSON.stringify(out, null, 1)); } catch (err) { fail(`could not write ${resPath}: ${err.message}`); }
  console.log(JSON.stringify(out, null, 1));
})().catch(err => fail(`browser test or PDF export failed: ${err.message}`));

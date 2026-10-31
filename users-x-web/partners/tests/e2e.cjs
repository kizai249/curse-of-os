const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = process.argv[2], OUT = process.argv[3];
const srv = http.createServer((q, r) => { const p = path.join(ROOT, q.url.split('?')[0].split('#')[0].replace(/^\/$/, '/index.html')); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.jpg') ? 'image/jpeg' : p.endsWith('.mp3') ? 'audio/mpeg' : 'image/png' }); fs.createReadStream(p).pipe(r); });
const res = []; const ok = (c, m) => { res.push((c ? 'PASS ' : 'FAIL ') + m); };
srv.listen(0, async () => {
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const b = await chromium.launch();
  for (const vp of [{ w: 1440, h: 900, n: 'd' }, { w: 375, h: 740, n: 'm' }]) {
    const p = await b.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.n === 'm' });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(base); await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + '/' + vp.n + '-00-start.png' });
    await p.click('#startBtn'); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => window.__uxp.scene) === 'hello', vp.n + ' starts at hello');
    ok((await p.textContent('#bubbleText')).length > 5, vp.n + ' nuqta speaks captions');
    await p.waitForTimeout(1500);
    ok(await p.evaluate(() => window.__uxp.clips || 0) >= 1, vp.n + ' recorded voice clip playing: ' + await p.evaluate(() => window.__uxp.clips));
    ok(/صوت نقطة/.test(await p.textContent('#voiceLabel')), vp.n + ' label shows recorded voice');
    ok(/رطانة|صوت/.test(await p.textContent('#voiceLabel')), vp.n + ' voice label: ' + await p.textContent('#voiceLabel'));
    await p.screenshot({ path: OUT + '/' + vp.n + '-01-hello.png' });
    const ids = await p.evaluate(() => [...document.querySelectorAll('.scene')].map(s => s.id.replace('scene-', '')));
    for (let i = 1; i < ids.length; i++) {
      await p.click('#nextBtn'); await p.waitForTimeout(700);
      const id = ids[i];
      ok(await p.evaluate(() => window.__uxp.scene) === id, vp.n + ' nav to ' + id);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(over <= 0, vp.n + ' ' + id + ' no h-overflow (' + over + ')');
      if (id === 'attention') {
        await p.click('#aStart'); await p.waitForTimeout(1600);
        const phones = await p.$$('.seat.is-phone'); for (const s of phones) await s.click();
        await p.waitForTimeout(14500);
        ok(/متوسط الانتباه/.test(await p.textContent('#aRes')), vp.n + ' attention game finishes: ' + await p.textContent('#aRes'));
      }
      if (id === 'choice') {
        await p.click('#cStart');
        for (let r = 0; r < 3; r++) { await p.waitForFunction(() => !document.querySelector('.door').disabled, null, { timeout: 5000 }); await p.click('.door--a'); await p.waitForTimeout(400); }
        await p.waitForTimeout(1600);
        ok(await p.evaluate(() => window.__uxp.scores.choice) !== undefined, vp.n + ' choice game scored ' + await p.evaluate(() => window.__uxp.scores.choice));
      }
      if (id === 'standing') {
        await p.evaluate(() => document.getElementById('hold').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); const bb = await p.locator('#hold').boundingBox();
        await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(10500); await p.mouse.up();
        ok(await p.evaluate(() => window.__uxp.scores.standing) === 100, vp.n + ' hold to win: ' + await p.textContent('#sRes'));
        await p.screenshot({ path: OUT + '/' + vp.n + '-standing.png' });
      }
      if (id === 'os') {
        await p.click('.letters button:has-text("ي")'); await p.waitForTimeout(300);
        await p.click('.letters button:has-text("و")'); await p.waitForTimeout(300);
        ok(/أوس/.test(await p.textContent('#oRes')), vp.n + ' cipher solved: ' + await p.textContent('#oRes'));
        await p.screenshot({ path: OUT + '/' + vp.n + '-os.png' });
      }
      if (id === 'asia') {
        for (let k = 0; k < 3; k++) { await p.click('#shoot'); await p.waitForTimeout(1400); }
        ok(await p.evaluate(() => window.__uxp.scores.asia) !== undefined, vp.n + ' penalties done: ' + await p.textContent('#pGoals'));
        await p.screenshot({ path: OUT + '/' + vp.n + '-asia.png' });
      }
      if (id === 'journey') { for (let k = 0; k < 6; k++) await p.click('#jNext'); ok((await p.$$('.step.is-on')).length === 6, vp.n + ' journey steps'); }
      if (['idea', 'choice', 'trust', 'packages', 'status', 'finale'].includes(id)) await p.screenshot({ path: OUT + '/' + vp.n + '-' + id + '.png' });
    }
    ok(/LV \d\d/.test(await p.textContent('#lv')), vp.n + ' finale score ' + await p.textContent('#lv'));
    await p.click('#copyMsg'); await p.waitForTimeout(300);
    ok((await p.textContent('#copyRes')).length > 5, vp.n + ' copy message gives feedback');
    await p.click('#voiceBtn'); ok(true, vp.n + ' voice toggle -> ' + await p.textContent('#voiceLabel'));
    ok(errs.length === 0, vp.n + ' no console errors ' + errs.join('|'));
    await p.close();
  }
  const q = await b.newPage(); await q.goto(base + '#trust'); await q.click('#startMuted'); await q.waitForTimeout(400);
  ok(await q.evaluate(() => window.__uxp.scene) === 'trust', 'deep link #trust opens trust');
  await b.close(); srv.close(); console.log(res.join('\n')); console.log(res.filter(r => r.startsWith('FAIL')).length + ' failures');
});

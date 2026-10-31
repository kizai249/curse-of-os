const { chromium } = require('playwright');
(async () => {
  const file = 'file://' + process.argv[2]; const res = []; const ok = (c, m) => res.push((c ? 'PASS ' : 'FAIL ') + m);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ w: 1440, h: 900, n: 'd' }, { w: 375, h: 740, n: 'm' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.n === 'm', offline: true });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.addInitScript(() => { // count simultaneous voice sources
      const orig = AudioBufferSourceNode.prototype.start; window.__live = 0; window.__maxLive = 0;
      AudioBufferSourceNode.prototype.start = function () { const n = this; if (n.buffer && n.buffer.duration > 1) { window.__live++; window.__maxLive = Math.max(window.__maxLive, window.__live); let done = false; const dec = () => { if (!done) { done = true; window.__live--; } }; n.addEventListener('ended', dec); const st = n.stop.bind(n); n.stop = function () { dec(); try { st(); } catch (e) {} }; } return orig.apply(this, arguments); };
    });
    await p.goto(file); await p.click('#startBtn'); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => window.__uxp.clips) >= 1, vp.n + ' clip played');
    // bubble height must stay put while a line types out
    const hs = []; await p.click('#replayLine'); for (let i = 0; i < 12; i++) { hs.push(await p.evaluate(() => Math.round(document.getElementById('bubble').getBoundingClientRect().height))); await p.waitForTimeout(150); }
    ok(new Set(hs).size === 1, vp.n + ' bubble stable while typing ' + [...new Set(hs)].join(','));
    // hammer the next button
    for (let i = 0; i < 11; i++) { await p.click('#nextBtn'); await p.waitForTimeout(120); }
    await p.waitForTimeout(2500);
    for (let i = 0; i < 6; i++) { await p.click('#prevBtn'); await p.waitForTimeout(90); }
    await p.waitForTimeout(3000);
    ok(await p.evaluate(() => window.__maxLive) <= 1, vp.n + ' never two voices at once (max ' + await p.evaluate(() => window.__maxLive) + ')');
    ok(await p.evaluate(() => window.__uxp.scene) === 'os', vp.n + ' ends on the right scene: ' + await p.evaluate(() => window.__uxp.scene));
    const bubble = await p.textContent('#bubbleText');
    ok(await p.evaluate(t => (window.__uxp.log.slice(-3).some(l => l.startsWith(t.slice(0, 8)))), bubble), vp.n + ' bubble shows the current line');
    // host never covers the last control of a scene once scrolled to the bottom
    await p.evaluate(() => { location.hash = 'standing'; }); await p.waitForTimeout(800);
    await p.evaluate(() => { const sc = document.querySelector('.scene:not([hidden])'); sc.scrollTop = sc.scrollHeight; }); await p.waitForTimeout(300);
    const cover = await p.evaluate(() => { const h = document.getElementById('host').getBoundingClientRect(), b = document.getElementById('hold').getBoundingClientRect(); return b.bottom > h.top && b.top < h.bottom && b.left < h.right && b.right > h.left; });
    ok(!cover, vp.n + ' hold button clear of the host when scrolled down');
    const dotsRows = await p.evaluate(() => { const ys = [...document.querySelectorAll('.dots button')].map(b => Math.round(b.getBoundingClientRect().top)); return new Set(ys).size; });
    ok(dotsRows === 1, vp.n + ' scene dots on one row (' + dotsRows + ')');
    ok(errs.length === 0, vp.n + ' no errors ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close(); console.log(res.join('\n')); console.log(res.filter(r => r.startsWith('FAIL')).length + ' failures');
})();

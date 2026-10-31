const { chromium } = require('playwright');
(async () => {
  const file = 'file://' + process.argv[2], out = process.argv[3]; const res = []; const ok = (c, m) => res.push((c ? 'PASS ' : 'FAIL ') + m);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ w: 1440, h: 900, n: 'd' }, { w: 375, h: 740, n: 'm' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.n === 'm', offline: true });
    const p = await ctx.newPage(); const errs = []; const net = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
    await p.goto(file); await p.click('#startBtn'); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => window.__uxp.clips || 0) >= 1, vp.n + ' voice clip plays offline');
    const s = []; for (let i = 0; i < 25; i++) { s.push(await p.evaluate(() => document.querySelector('#avatar svg').getAttribute('data-mouth'))); await p.waitForTimeout(100); }
    ok(s.filter((v, i) => i && v !== s[i - 1]).length >= 4, vp.n + ' mouth moves while talking');
    ok(await p.evaluate(() => document.fonts.check('800 40px Kufam') && document.fonts.check('400 20px "IBM Plex Sans Arabic"')), vp.n + ' brand fonts available offline');
    await p.screenshot({ path: out + '/single-' + vp.n + '-hello.png' });
    for (const id of ['choice', 'os', 'asia', 'finale']) {
      await p.evaluate(id => { location.hash = id; }, id); await p.waitForTimeout(900);
      const img = await p.evaluate(() => { const i = document.querySelector('.scene:not([hidden]) img'); return i ? i.naturalWidth : -1; });
      ok(img !== 0, vp.n + ' ' + id + ' image loaded (' + img + ')');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), vp.n + ' ' + id + ' no overflow');
    }
    await p.screenshot({ path: out + '/single-' + vp.n + '-finale.png' });
    ok(/966565952065/.test(await p.textContent('#cPhone')), vp.n + ' phone shown');
    ok(net.length === 0, vp.n + ' no network requests ' + net.slice(0, 3).join(' '));
    ok(errs.length === 0, vp.n + ' no errors ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close(); console.log(res.join('\n')); console.log(res.filter(r => r.startsWith('FAIL')).length + ' failures');
})();

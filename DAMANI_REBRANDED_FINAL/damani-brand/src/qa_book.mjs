// Report elements that spill outside their page (into the footer zone or past the edges).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1123, height: 794 } });
await p.goto(pathToFileURL(process.argv[2]).href); await p.evaluate(() => document.fonts.ready);
const res = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('section.page').forEach((s, i) => {
    const r = s.getBoundingClientRect(); const bad = [];
    s.querySelectorAll('*').forEach(el => {
      if (el.closest('.rh,.ft') || el.tagName === 'path' || el.tagName === 'svg' && el.closest('[style*="opacity"]')) return;
      const st = getComputedStyle(el); if (st.position === 'absolute' && el.closest('[style*="overflow:hidden"]') !== s) return;
      const e = el.getBoundingClientRect(); if (!e.width || !e.height) return;
      if (s.querySelector('.ft') && (e.bottom > r.bottom - 44 || e.left < r.left - 1 || e.right > r.right + 1)) {
        if (getComputedStyle(s).backgroundColor !== 'rgb(255, 255, 255)') return;
        bad.push(`${el.tagName}.${el.className} b=${Math.round(e.bottom - r.top)} "${(el.textContent || '').trim().slice(0, 30)}"`);
      }
    });
    if (bad.length) out.push(`page ${i + 1}: ${bad.slice(0, 3).join(' | ')}`);
  });
  return out;
});
console.log(res.join('\n') || 'no overflow');
await b.close();

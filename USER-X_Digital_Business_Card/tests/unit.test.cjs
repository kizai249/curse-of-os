// Contact file + QR export tests (no browser). Run: node --test tests/unit.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const jsQR = require('jsqr');

const root = path.resolve(__dirname, '..');
const cfg = require('../config/card.config.js');
const vcard = require('../src/js/vcard.js');
const qr = require('../tools/make-qr.cjs');

// decode the 8-bit greyscale PNGs written by tools/make-qr.cjs (filter type 0 rows)
function readGreyPng(buf) {
  let off = 8, w = 0, h = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); assert.equal(data[8], 8); assert.equal(data[9], 0); }
    if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) { assert.equal(raw[y * (w + 1)], 0); for (let x = 0; x < w; x++) { const v = raw[y * (w + 1) + 1 + x], i = (y * w + x) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = v; rgba[i + 3] = 255; } }
  return { w, h, rgba };
}

test('contact file: verified fields only, valid vCard 3.0 framing and folding', () => {
  const v = vcard.build(cfg);
  assert.match(v, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
  assert.match(v, /\r\nEND:VCARD\r\n$/);
  assert.match(v, /FN;CHARSET=UTF-8:Khalid Hamida\r\n/);
  assert.match(v, /N;CHARSET=UTF-8:Hamida;Khalid;;;/);
  assert.match(v, /ORG;CHARSET=UTF-8:USER-X/);
  assert.match(v, /TITLE;CHARSET=UTF-8:Co-Founder & Operation Manager/);
  assert.match(v, /item1\.TEL;TYPE=WORK,VOICE:\+966565952065/);
  assert.match(v, /ADR;TYPE=WORK;CHARSET=UTF-8:;;;Jeddah;;;Saudi Arabia/);
  // nothing unconfirmed is invented
  if (!cfg.contact.email) assert.doesNotMatch(v, /EMAIL/);
  if (!cfg.contact.personalPhone) assert.doesNotMatch(v, /TYPE=CELL/);
  if (!cfg.contact.linkedin) assert.doesNotMatch(v, /linkedin/i);
  for (const line of v.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, 'line too long: ' + line);
  // unfolded NOTE keeps the Arabic text intact
  assert.match(v.replace(/\r\n /g, ''), /NOTE;CHARSET=UTF-8:خالد حميدة — شريك مؤسس ومدير العمليات/);
});

test('contact file: the shipped .vcf matches the config (run `npm run build` after edits)', () => {
  const file = fs.readFileSync(path.join(root, cfg.vcfFile), 'utf8');
  assert.equal(file, vcard.build(cfg));
});

test('contact file: optional fields appear once configured', () => {
  const c = JSON.parse(JSON.stringify(cfg));
  Object.assign(c.contact, { personalPhone: '+966500000000', email: 'k@example.sa', linkedin: 'https://www.linkedin.com/in/example', website: 'https://example.sa' });
  c.cardUrl = 'https://card.example.sa/';
  const v = vcard.build(c);
  assert.match(v, /TEL;TYPE=CELL,VOICE:\+966500000000/);
  assert.match(v, /EMAIL;TYPE=INTERNET,WORK:k@example\.sa/);
  assert.match(v, /X-SOCIALPROFILE;TYPE=linkedin:https:\/\/www\.linkedin\.com\/in\/example/);
  assert.match(v, /item2\.URL:https:\/\/card\.example\.sa\//);
});

test('QR export: refuses local, preview and non-HTTPS destinations', () => {
  for (const bad of ['', 'http://localhost:8090/', 'https://127.0.0.1/', 'http://card.example.sa/', 'https://claude.ai/artifact/x', 'file:///tmp/a.html']) {
    assert.ok(qr.checkUrl(bad), 'should refuse: ' + bad);
  }
  assert.equal(qr.checkUrl('https://card.user-x.example/?src=qr'), '');
});

test('QR export: PNG (2048 & 4096) and SVG are written and the PNGs scan back to the exact URL', () => {
  const url = 'https://card.user-x.example/khalid?src=qr&lang=ar';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'userx-qr-'));
  try {
    const r = qr.write(url, dir);
    for (const f of [r.name + '.png', r.name + '-print.png']) {
      const img = readGreyPng(fs.readFileSync(path.join(dir, f)));
      assert.ok(img.w >= 2000, f + ' size ' + img.w);
      const res = jsQR(img.rgba, img.w, img.h);
      assert.ok(res, f + ' did not scan');
      assert.equal(res.data, url, f);
    }
    const svg = fs.readFileSync(path.join(dir, r.name + '.svg'), 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+"/);
    assert.equal(fs.readFileSync(path.join(dir, 'destination.txt'), 'utf8').trim(), url);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('config: no invented personal details; game tiers are ascending', () => {
  assert.equal(cfg.contact.companyWhatsapp, '966565952065');
  assert.equal(cfg.contact.companyPhone, '+966565952065');
  const t = cfg.game.tiers;
  assert.equal(t[0], 0);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
  assert.ok(cfg.game.durationMs >= 10000 && cfg.game.durationMs <= 20000);
});

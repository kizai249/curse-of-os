/*
 * QR export for print and screens.
 *   npm run qr                                        → uses cardUrl from config/card.config.js
 *   npm run qr -- https://card.example.sa/?src=qr     → any public HTTPS destination you pass
 * Writes, into qr/:
 *   userx-khalid-hamida-qr.svg        vector — print-ready at any size
 *   userx-khalid-hamida-qr.png        2048 px — screens, slides, social
 *   userx-khalid-hamida-qr-print.png  4096 px — print shops that ask for a raster file
 *   destination.txt                   the exact address encoded
 * Refuses local or preview addresses so a printed card never points to a dead link.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const cfg = require(path.join(root, 'config/card.config.js'));
const qrcode = require(path.join(root, 'assets/vendor/qrcode-generator.js'));

const LOCAL = /^(file:|https?:\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|\[::1\])|https?:\/\/[^/]*claude\.ai\/)/i;

function matrix(text) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'Q'); // error correction Q (25%): still scans when slightly scratched or printed small
  q.addData(text, 'Byte'); q.make();
  return q;
}
function svg(q, quiet, title) {
  const n = q.getModuleCount(), s = n + quiet * 2;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  const t = String(title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s * 10}" height="${s * 10}" shape-rendering="crispEdges"><title>${t}</title><rect width="100%" height="100%" fill="#FFFFFF"/><path fill="#0B0B0F" d="${d}"/></svg>\n`;
}
// minimal PNG writer (8-bit greyscale) — no image library needed
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(q, quiet, target) {
  const n = q.getModuleCount(), cells = n + quiet * 2, scale = Math.max(1, Math.floor(target / cells)), size = cells * scale;
  const raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0;
    const my = Math.floor(y / scale) - quiet;
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - quiet;
      const dark = my >= 0 && my < n && mx >= 0 && mx < n && q.isDark(my, mx);
      raw[y * (size + 1) + 1 + x] = dark ? 0x0B : 0xFF;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; // depth 8, colour type 0 (grey)
  return { size, buf: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]) };
}
function checkUrl(url) {
  if (!url) return 'No destination. Set cardUrl in config/card.config.js (or pass a URL).';
  if (!/^https:\/\//i.test(url) || LOCAL.test(url)) return `Refusing "${url}": the QR must point to the public HTTPS address of the deployed card.`;
  return '';
}
function write(url, dir) {
  const q = matrix(url), name = 'userx-khalid-hamida-qr';
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.svg'), svg(q, 4, url));
  const a = png(q, 4, 2048), b = png(q, 4, 4096);
  fs.writeFileSync(path.join(dir, name + '.png'), a.buf);
  fs.writeFileSync(path.join(dir, name + '-print.png'), b.buf);
  fs.writeFileSync(path.join(dir, 'destination.txt'), url + '\n');
  return { q, a, b, name };
}

module.exports = { matrix, png, svg, checkUrl, write };

if (require.main === module) {
  const url = process.argv[2] || cfg.cardUrl;
  const err = checkUrl(url);
  if (err) { console.error(err); process.exit(1); }
  const r = write(url, path.join(root, 'qr'));
  console.log(`QR (version ${r.q.getTypeNumber()}, ${r.q.getModuleCount()}×${r.q.getModuleCount()} modules, error correction Q) → ${url}`);
  console.log(`  qr/${r.name}.svg   qr/${r.name}.png (${r.a.size}px)   qr/${r.name}-print.png (${r.b.size}px)`);
}

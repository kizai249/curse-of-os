// Tiny static server for local testing: node tools/serve.cjs [port]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.vcf': 'text/vcard; charset=utf-8',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8'
};

function create() {
  return http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.statusCode = 400; return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    const rel = f.slice(root.length);
    if (!f.startsWith(root + path.sep) || /[\\/](node_modules|tests|tools)[\\/]|[\\/]\./.test(rel)) { res.statusCode = 404; return res.end('not found'); }
    fs.stat(f, (err, st) => {
      if (err || !st.isFile()) { res.statusCode = 404; return res.end('not found'); }
      res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      fs.createReadStream(f).on('error', () => res.destroy()).pipe(res);
    });
  });
}

module.exports = { create };
if (require.main === module) {
  const port = +(process.argv[2] || process.env.PORT || 8090);
  create().listen(port, () => console.log(`USER-X card → http://localhost:${port}/`));
}

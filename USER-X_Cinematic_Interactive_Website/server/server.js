'use strict';
/*
 * USER-X cinematic site server — zero framework, one dependency (@anthropic-ai/sdk).
 *   GET  /                 static site from ../public (security headers, caching)
 *   GET  /api/health       which optional services are configured (no secrets)
 *   POST /api/nuqta        { messages:[{role,content}], context? } -> Nuqta's reply (Claude)
 *   POST /api/tts          { text } -> audio/mpeg (ElevenLabs, optional)
 * Every key stays here; the browser never sees one. Without keys the site runs in
 * offline mode: Nuqta answers from the knowledge base in the browser.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { NuqtaAI } = require('./lib/nuqta-ai');
const kbLib = require('./lib/kb');
const { RateLimiter, DailyCap, cleanMessages, cleanContext } = require('./lib/guards');
const { makeTTS } = require('./lib/tts');

const PUBLIC = path.join(__dirname, '..', 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

function loadEnv(file = path.join(__dirname, '..', '.env')) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[USER-X] could not read .env:', err.message);
  }
}

function createApp(opts = {}) {
  const env = opts.env || process.env;
  const kb = opts.kb || kbLib.load();
  const ai = opts.ai || new NuqtaAI({ apiKey: env.ANTHROPIC_API_KEY, model: env.NUQTA_MODEL, kb });
  const tts = opts.tts || makeTTS({ apiKey: env.ELEVENLABS_API_KEY, voiceId: env.ELEVENLABS_VOICE_ID });
  const limiter = new RateLimiter({ perMinute: Number(env.NUQTA_RATE_PER_MINUTE) || 8, burst: 4 });
  const ttsLimiter = new RateLimiter({ perMinute: 6, burst: 3 });
  const cap = new DailyCap(Number(env.NUQTA_DAILY_REQUEST_CAP) || 2000);
  const log = opts.log || ((...a) => console.log('[USER-X]', ...a));

  function send(res, status, body, headers = {}) {
    const isBuf = Buffer.isBuffer(body);
    res.writeHead(status, { ...SECURITY, 'Content-Type': isBuf ? 'audio/mpeg' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(isBuf ? body : JSON.stringify(body));
  }

  function readJson(req, limit = 16_384) {
    return new Promise((resolve, reject) => {
      // Oversized bodies are drained (so the client gets a clean 413), and cut off past 1 MB.
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size <= limit) chunks.push(c); else if (size > 1_048_576) req.destroy(); });
      req.on('end', () => {
        if (size > limit) return reject(Object.assign(new Error('body too large'), { status: 413 }));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); }
      });
      req.on('error', reject);
    });
  }

  const ip = (req) => (env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
  const sameOrigin = (req) => {
    const o = req.headers.origin;
    return !o || o === `http://${req.headers.host}` || o === `https://${req.headers.host}`;
  };

  async function api(req, res, route) {
    if (route === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true, ai: ai.enabled, tts: tts.enabled });
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'cross-origin requests are not allowed' });

    if (route === '/api/nuqta') {
      if (!ai.enabled) return send(res, 503, { error: 'ai_offline', mode: 'offline' });
      const rl = limiter.take(ip(req));
      if (!rl.ok) return send(res, 429, { error: 'rate_limited', retryAfterS: rl.retryAfterS }, { 'Retry-After': String(rl.retryAfterS) });
      if (!cap.take()) return send(res, 503, { error: 'daily_cap', mode: 'offline' });
      const body = await readJson(req);
      const messages = cleanMessages(body.messages);
      try {
        const out = await ai.reply(messages, cleanContext(body.context));
        if (out.usage) log('nuqta', `in=${out.usage.in} out=${out.usage.out} cached=${out.usage.cached}`);
        const { usage, ...publicOut } = out;
        return send(res, 200, { mode: 'ai', ...publicOut });
      } catch (err) {
        log('nuqta error', err.code || err.status || '', err.message);
        return send(res, 502, { error: 'ai_unavailable', mode: 'offline' });
      }
    }
    if (route === '/api/tts') {
      if (!tts.enabled) return send(res, 503, { error: 'tts_offline' });
      const rl = ttsLimiter.take(ip(req));
      if (!rl.ok) return send(res, 429, { error: 'rate_limited', retryAfterS: rl.retryAfterS });
      const body = await readJson(req, 4096);
      try {
        return send(res, 200, await tts.speak(body.text));
      } catch (err) {
        if (err.status === 400) return send(res, 400, { error: err.message });
        log('tts error', err.code || '', err.message);
        return send(res, 502, { error: 'tts_unavailable' });
      }
    }
    return send(res, 404, { error: 'not found' });
  }

  function serveStatic(req, res, route) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
    let rel;
    try { rel = decodeURIComponent(route); } catch (e) { return send(res, 400, { error: 'bad path' }); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'forbidden' });
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { ...SECURITY, 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('not found');
      }
      const ext = path.extname(file).toLowerCase();
      const long = /\.(woff2|jpg|png|webp|mp4|webm|mp3)$/.test(ext);
      const headers = { ...SECURITY, 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': long ? 'public, max-age=2592000' : 'public, max-age=300', Vary: 'Accept-Encoding' };
      // Text assets are gzipped on the fly (HTML/CSS/JS/JSON/SVG shrink ~70%); media is sent as-is.
      const gzip = /\.(html|css|js|json|svg|txt|webmanifest)$/.test(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
      if (gzip) headers['Content-Encoding'] = 'gzip'; else headers['Content-Length'] = st.size;
      res.writeHead(200, headers);
      if (req.method === 'HEAD') return res.end();
      const src = fs.createReadStream(file).on('error', () => res.destroy());
      (gzip ? src.pipe(zlib.createGzip({ level: 6 })) : src).pipe(res);
    });
  }

  return http.createServer((req, res) => {
    const route = (req.url || '/').split('?')[0];
    if (route.startsWith('/api/')) {
      api(req, res, route).catch((err) => {
        const status = err.status || 500;
        if (status >= 500) log('api error', err.message);
        if (!res.headersSent) send(res, status, { error: status >= 500 ? 'server error' : err.message });
      });
    } else serveStatic(req, res, route);
  });
}

if (require.main === module) {
  loadEnv();
  let server;
  try {
    server = createApp();
  } catch (err) {
    console.error('[USER-X] cannot start:', err.message);
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, () => {
    console.log(`[USER-X] http://localhost:${port}  ai=${Boolean(process.env.ANTHROPIC_API_KEY)} tts=${Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID)}`);
  });
}

module.exports = { createApp, loadEnv };

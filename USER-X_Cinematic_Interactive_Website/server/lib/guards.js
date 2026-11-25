'use strict';
/* Cost and abuse guards: per-IP token bucket, daily cap, and input validation. */

class RateLimiter {
  constructor({ perMinute = 8, burst = 4 } = {}) {
    this.rate = perMinute / 60_000; // tokens per ms
    this.burst = burst;
    this.buckets = new Map();
  }
  take(key, now = Date.now()) {
    const b = this.buckets.get(key) || { tokens: this.burst, at: now };
    b.tokens = Math.min(this.burst, b.tokens + (now - b.at) * this.rate);
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    if (this.buckets.size > 10_000) this.prune(now);
    return { ok, retryAfterS: ok ? 0 : Math.ceil((1 - b.tokens) / this.rate / 1000) };
  }
  prune(now) {
    for (const [k, b] of this.buckets) if (now - b.at > 600_000) this.buckets.delete(k);
  }
}

class DailyCap {
  constructor(cap = 2000) { this.cap = cap; this.day = ''; this.count = 0; }
  take(now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) { this.day = day; this.count = 0; }
    if (this.count >= this.cap) return false;
    this.count += 1;
    return true;
  }
}

const MAX_TURNS = 12;       // history the browser may send
const MAX_CHARS = 600;      // per visitor message
const MAX_TOTAL = 6000;     // whole history

// Validates the browser's history; returns clean Anthropic messages or throws a 400-style error.
function cleanMessages(input) {
  if (!Array.isArray(input) || input.length === 0) throw badRequest('messages must be a non-empty array');
  const recent = input.slice(-MAX_TURNS);
  let total = 0;
  const out = [];
  for (const m of recent) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') throw badRequest('each message needs role user|assistant and string content');
    const text = m.content.trim().slice(0, m.role === 'user' ? MAX_CHARS : 1200);
    if (!text) continue;
    total += text.length;
    // keep strict alternation; merge consecutive same-role turns
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n' + text;
    else out.push({ role: m.role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') throw badRequest('the last message must be from the visitor');
  if (total > MAX_TOTAL) throw badRequest('conversation too long');
  return out;
}

function badRequest(msg) { return Object.assign(new Error(msg), { status: 400 }); }

// Page context sent by the browser. Only allowlisted ids and an hour number get through,
// and the sentence the model reads is written here — nothing the browser sends is copied into the prompt.
const SCENES = ['universe', 'symbol', 'guide', 'about', 'games', 'brands', 'process', 'why', 'faq', 'contact', 'end'];
const GAME_IDS = ['curse-of-os', 'choice-room', 'last-standing', 'asia-journey'];
function cleanContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
  const parts = [];
  if (SCENES.includes(input.scene)) parts.push(`They are looking at the "${input.scene}" section now.`);
  if (Array.isArray(input.visited)) {
    const seen = [...new Set(input.visited.filter((s) => SCENES.includes(s)))];
    if (seen.length) parts.push(`Sections they have seen: ${seen.join(', ')}.`);
  }
  if (GAME_IDS.includes(input.game)) parts.push(`The last game card they lingered on: ${input.game}.`);
  if (input.returning === true) parts.push('They have visited the site before.');
  if (Number.isInteger(input.hour) && input.hour >= 0 && input.hour <= 23) parts.push(`Their local hour: ${input.hour}.`);
  if (!parts.length) return '';
  return `# Page context (measured by the website, not written by the visitor; use it lightly, never recite it)\n${parts.join('\n')}`;
}

module.exports = { RateLimiter, DailyCap, cleanMessages, cleanContext, MAX_CHARS };

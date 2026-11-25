'use strict';
/*
 * USER-X knowledge base: loads public/knowledge/*.json, renders it for the
 * system prompt, and retrieves entries for the offline (no-AI) mode.
 * The same retrieval logic runs in the browser (public/nuqta/brain.js) so the
 * site still answers when the server or the AI is unavailable.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'public', 'knowledge');
const FILES = ['company', 'games', 'services', 'process', 'pricing', 'booking', 'contact', 'policies', 'brand', 'faq'];

function load(dir = DIR) {
  const kb = {};
  for (const name of FILES) {
    const file = path.join(dir, name + '.json');
    try {
      kb[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      throw new Error(`knowledge file ${file} is missing or invalid: ${err.message}`);
    }
  }
  return kb;
}

// Arabic-aware normalisation: drop tashkeel/tatweel, unify alef/ya/ta marbuta forms.
function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s+]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Light Arabic prefix stripping so «والالعاب» matches «العاب».
function stem(w) {
  return w.replace(/^(وال|بال|كال|فال|لل|ال|و|ب|ف)(?=.{3,})/, '');
}

// Question words and fillers never count as a match on their own («وش» alone must not pick an answer).
const STOP = new Set(['وش','ايش','كيف','كم','هل','في','من','عن','على','الى','اللي','ابي','ابغى','ودي','انا','انت','انتم','هي','هو','ما','مو','يا','لو','او','عندكم','عندي','وين','متى','ليش','what','how','is','are','the','a','an','do','does','you','your','i','to','of','in','for','and','or','it','can','me','my','we'].map(normalize));
const MIN_SCORE = 2;

function entries(kb) {
  const out = [];
  for (const [topic, data] of Object.entries(kb)) for (const e of data.entries || []) out.push({ topic, ...e });
  return out;
}

function retrieve(kb, query, limit = 3) {
  const q = normalize(query);
  if (!q) return [];
  const qTokens = new Set(q.split(' ').filter((t) => !STOP.has(t)).map(stem).filter((t) => t.length > 1));
  const scored = entries(kb).map((e) => {
    let score = 0;
    for (const k of e.keywords || []) {
      const nk = normalize(k);
      if (!nk) continue;
      if (q.includes(nk)) score += 3 + nk.split(' ').length;
      else if (nk.split(' ').some((w) => !STOP.has(w) && qTokens.has(stem(w)))) score += 1;
    }
    return { e, score };
  }).filter((x) => x.score >= MIN_SCORE).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.e);
}

// Compact, deterministic rendering for the system prompt (stable bytes keep the prompt cache warm).
function render(kb) {
  const lines = [];
  for (const [topic, data] of Object.entries(kb)) {
    lines.push(`## ${topic}`);
    if (data.note) lines.push(`note: ${data.note}`);
    for (const [k, v] of Object.entries(data)) {
      if (k === 'entries' || k === 'topic' || k === 'note') continue;
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
    for (const e of data.entries || []) {
      lines.push(`- [${e.id}] status=${e.status}${e.note ? ' note=' + e.note : ''}\n  ar: ${e.answer_ar}\n  en: ${e.answer_en}`);
    }
  }
  return lines.join('\n');
}

module.exports = { load, normalize, retrieve, render, entries, FILES, STOP, MIN_SCORE };

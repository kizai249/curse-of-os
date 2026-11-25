/*
 * «نقطة» offline brain — answers from public/knowledge/*.json when the AI server is
 * not configured, over its limits, or unreachable. Same retrieval as server/lib/kb.js.
 * It never invents: no matching entry -> an honest "I don't have that confirmed".
 */
(function (root) {
  'use strict';

  var FILES = ['company', 'games', 'services', 'process', 'pricing', 'booking', 'contact', 'policies', 'brand', 'faq'];

  function normalize(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ْـ]/g, '')
      .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[^\p{L}\p{N}\s+]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function stem(w) { return w.replace(/^(وال|بال|كال|فال|لل|ال|و|ب|ف)(?=.{3,})/, ''); }
  // Question words and fillers never count as a match on their own (same list as server/lib/kb.js).
  var STOP = {}; ['وش','ايش','كيف','كم','هل','في','من','عن','على','الى','اللي','ابي','ابغى','ودي','انا','انت','انتم','هي','هو','ما','مو','يا','لو','او','عندكم','عندي','وين','متى','ليش','what','how','is','are','the','a','an','do','does','you','your','i','to','of','in','for','and','or','it','can','me','my','we'].forEach(function (w) { STOP[normalize(w)] = 1; });
  var MIN_SCORE = 2;
  function isEnglish(text) {
    var lat = (String(text).match(/[a-z]/gi) || []).length, ar = (String(text).match(/[؀-ۿ]/g) || []).length;
    return lat > ar;
  }

  var INTENTS = {
    corporate: ['علامه', 'براند', 'شركه', 'حمله', 'تسويق', 'اعلان', 'فروع', 'قسائم', 'brand', 'company', 'campaign', 'marketing', 'activation'],
    event: ['فعاليه', 'مؤتمر', 'معرض', 'مهرجان', 'حفل', 'event', 'conference', 'festival', 'exhibition'],
    agency: ['وكاله', 'ايجنسي', 'agency', 'white label', 'تعاون'],
    player: ['العب', 'شلتي', 'اصحابي', 'ربعي', 'نلعب', 'تذكره', 'play', 'friends', 'tickets', 'group'],
  };
  var BOOK_WORDS = ['احجز', 'حجز', 'اطلب', 'عرض سعر', 'تواصل', 'book', 'reserve', 'quote', 'contact'];
  var GAME_WORDS = { 'curse-of-os': ['لعنه اوس', 'اوس', 'رعب', 'curse', 'horror', 'os'], 'choice-room': ['غرفه الاختيار', 'الاختيار', 'بابين', 'choice'],
    'last-standing': ['اخر من يصمد', 'يصمد', 'last one', 'standing'], 'asia-journey': ['مشوار اسيا', 'اسيا', 'كوره', 'football', 'quest', 'asia'] };

  // Whole-word (after light Arabic prefix stripping) so «cost» never matches «os».
  function words(s) { return ' ' + s.split(' ').map(stem).join(' ') + ' '; }
  function has(q, list) {
    var qs = ' ' + q + ' ', qw = words(q);
    return list.some(function (w) { var n = normalize(w); return qs.indexOf(' ' + n + ' ') >= 0 || qw.indexOf(' ' + n.split(' ').map(stem).join(' ') + ' ') >= 0; });
  }

  function Brain() { this.kb = null; this.ready = null; }

  Brain.prototype.load = function (base) {
    var self = this;
    if (this.ready) return this.ready;
    base = base || 'knowledge/';
    this.ready = Promise.all(FILES.map(function (f) {
      return fetch(base + f + '.json').then(function (r) { if (!r.ok) throw new Error(f + ' HTTP ' + r.status); return r.json(); });
    })).then(function (list) {
      self.kb = {}; FILES.forEach(function (f, i) { self.kb[f] = list[i]; });
      return self.kb;
    });
    return this.ready;
  };

  Brain.prototype.entries = function () {
    var out = [], kb = this.kb || {};
    Object.keys(kb).forEach(function (topic) { (kb[topic].entries || []).forEach(function (e) { out.push(Object.assign({ topic: topic }, e)); }); });
    return out;
  };

  Brain.prototype.retrieve = function (query, limit) {
    var q = normalize(query); if (!q) return [];
    var tokens = {}; q.split(' ').forEach(function (t) { if (STOP[t]) return; t = stem(t); if (t.length > 1) tokens[t] = 1; });
    return this.entries().map(function (e) {
      var score = 0;
      (e.keywords || []).forEach(function (k) {
        var nk = normalize(k); if (!nk) return;
        if (q.indexOf(nk) >= 0) score += 3 + nk.split(' ').length;
        else if (nk.split(' ').some(function (w) { return !STOP[w] && tokens[stem(w)]; })) score += 1;
      });
      return { e: e, score: score };
    }).filter(function (x) { return x.score >= MIN_SCORE; }).sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 3).map(function (x) { return x.e; });
  };

  Brain.prototype.game = function (id) {
    var g = this.kb && this.kb.games && this.kb.games.games; if (!g) return null;
    for (var i = 0; i < g.length; i++) if (g[i].id === id) return g[i];
    return null;
  };

  // Returns { reply, lang, intent, action, game_id, mood, mode:'offline' }
  Brain.prototype.answer = function (text) {
    var en = isEnglish(text), q = normalize(text), lang = en ? 'en' : 'ar';
    var intent = 'unknown';
    Object.keys(INTENTS).some(function (k) { if (has(q, INTENTS[k])) { intent = k; return true; } return false; });
    var gameId = '';
    Object.keys(GAME_WORDS).some(function (k) { if (has(q, GAME_WORDS[k])) { gameId = k; return true; } return false; });
    var out = { lang: lang, intent: intent, action: 'none', game_id: gameId, mood: 'happy', mode: 'offline' };

    if (/^(هلا|السلام|مرحبا|اهلين|هاي|hi|hello|hey|salam)(\s|$)/.test(q) && q.split(' ').length <= 3) {
      out.reply = en ? "Hey! I'm Nuqta, your guide in USER-X. Here to play with friends, or looking for a game for your brand or event?"
        : 'هلا والله! أنا نقطة، دليلك في يوزر إكس. جاي تلعب مع شلّتك، ولا تدوّر لعبة لعلامتك أو فعاليتك؟';
      out.mood = 'excited'; return out;
    }
    if (/(شكرا|يعطيك العافيه|thanks|thank you)/.test(q)) {
      out.reply = en ? 'Anytime. If you want to start a request, the form is one tap away.' : 'العفو! إذا جاهز، طلبك على بُعد ضغطة.'; out.mood = 'happy'; return out;
    }

    if (gameId) {
      var g = this.game(gameId);
      if (g) {
        out.reply = en
          ? g.title_en + ' — status: ' + statusEn(g.status) + '. Want me to prepare a request to the team?'
          : g.title_ar + ' — ' + g.premise_ar + ' الحالة: ' + g.status_ar + '.' + (g.warning_ar ? ' ' + g.warning_ar : '');
        out.action = 'show_games'; out.mood = g.id === 'curse-of-os' ? 'cheeky' : 'excited';
        if (has(q, BOOK_WORDS)) { out.action = 'open_booking'; out.reply += en ? '' : ' الحجز يتأكد من الفريق — جهّزت لك نموذج الطلب.'; }
        return out;
      }
    }

    var hits = this.retrieve(text, 2);
    if (has(q, BOOK_WORDS)) out.action = 'open_booking';
    if (hits.length) {
      var e = hits[0];
      out.reply = en ? e.answer_en : e.answer_ar;
      if (e.status === 'missing') out.action = 'open_whatsapp';
      if (e.topic === 'games' && out.action === 'none') out.action = 'show_games';
      if (e.topic === 'services' && out.action === 'none') out.action = 'show_brands';
      if (e.topic === 'process' && out.action === 'none') out.action = 'show_process';
      if (e.topic === 'booking' || e.topic === 'pricing') out.action = 'open_booking';
      out.mood = e.status === 'missing' ? 'serious' : 'happy';
      if (!en && out.action === 'none') {
        out.reply += intent === 'corporate' ? ' وش الهدف من حملتكم؟' : intent === 'event' ? ' كم تقريباً عدد الجمهور؟' : '';
      }
      return out;
    }
    out.reply = en
      ? "I don't have that confirmed, and I'd rather not guess. The USER-X team can answer you directly on WhatsApp."
      : 'هذي ما عندي فيها معلومة مؤكدة، وما أحب أألّف. الفريق يقدر يجاوبك مباشرة على الواتساب.';
    out.action = 'open_whatsapp'; out.mood = 'thinking';
    return out;
  };

  function statusEn(s) { return { soon: 'coming soon (after licensing)', template: 'ready template we customise', 'in-development': 'in development', building: 'in build, launch planned December 2026' }[s] || s; }

  var api = { Brain: Brain, normalize: normalize, isEnglish: isEnglish };
  root.NuqtaBrain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

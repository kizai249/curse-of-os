/*
 * «نقطة · NUQTA» — the living host of the USER-X site.
 *   Roam  : a small pixel Nuqta along the bottom edge — idles, runs between scenes,
 *           peeks, dances, celebrates. Never blocks clicks (pointer-events: none),
 *           frequency is a setting (lively / calm / off), reduced-motion = no running.
 *   Chat  : «اسأل نقطة» panel. Talks to /api/nuqta (Claude, server-side key) and falls
 *           back to the offline brain (knowledge/*.json) when the AI is unavailable.
 *   Voice : optional. Server TTS (/api/tts) when configured, else the browser voice.
 *           Voice input through the Web Speech API where the browser supports it.
 * Depends on script.js (window.__ux) and nuqta/brain.js (window.NuqtaBrain).
 */
(function () {
  'use strict';
  var UX = window.__ux; if (!UX) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = UX.store || { get: function (k, f) { return f; }, set: function () {} };
  var reduced = UX.reduced || function () { return false; };
  var brain = new window.NuqtaBrain.Brain();
  var NQ = window.__nuqta = { log: [], errors: [], antics: [], mode: 'offline', health: { ai: false, tts: false } };

  function settle(name, fn) { try { return fn(); } catch (e) { NQ.errors.push(name + ': ' + e.message); console.warn('[Nuqta]', name, e); } }

  var Prefs = {
    antics: store.get('nq.antics', 'calm'),
    voice: store.get('nq.voice', false),
    volume: store.get('nq.volume', 70),
    save: function () { store.set('nq.antics', this.antics); store.set('nq.voice', this.voice); store.set('nq.volume', this.volume); }
  };
  NQ.prefs = Prefs;

  var SCENE_LINES = {
    universe: 'هذا عالمنا. انزل شوي… ما نعض.',
    symbol: 'اضغط الرمز. كل سهم فيه خيار… وأنا ما أختار عنك.',
    guide: 'هذا أنا! بس بحجم أكبر. الكاميرا تحبني.',
    about: 'القصة باختصار: إنت مو جمهور.',
    games: 'اختر عالم. لعنة أوس للكبار بس… لا تقول ما قلت لك.',
    brands: 'عندك علامة؟ هنا الجزء اللي يحبه المحاسب.',
    process: 'خطوات واضحة. حتى أنا فهمتها من أول مرة.',
    why: 'ليش إحنا؟ لأن جمهورك يستاهل يلعب.',
    faq: 'أسئلة صريحة… وأجوبة أصرح. وإذا ما أعرف، أقول ما أعرف.',
    contact: 'هنا نبدأ. اختر نوع طلبك وأجهّز لك رسالة الواتساب.',
    end: 'وصلت للنهاية؟ يعني اللعبة بدأت.'
  };
  var IDLE_QUIPS = ['تدري إن المربّع الماجنتا في قلبي يمثّلك؟ لا تتحمس، هو مربّع بس.', 'أنا هنا لو احتجتني… اضغط «اسأل نقطة».', 'ركّز. أنا بس أطلع حلو.', 'إذا عجبك اللي تشوفه، قول للفريق. إذا ما عجبك… قول لي، ما أسمع زين.'];

  /* ---------------------------------------------------------------- *
   * Roam — the running, peeking, dancing Nuqta
   * ---------------------------------------------------------------- */
  var Roam = {
    el: null, body: null, avatar: null, x: 0, home: 0, busy: false, timer: null, lastRun: 0, seen: {}, enabled: false,
    init: function () {
      this.el = $('#roam'); this.body = $('#roamBody'); this.bubble = $('#roamBubble');
      if (!this.el || !UX.Avatar) return false;
      this.avatar = new UX.Avatar($('#roamAvatar'), {});
      UX.avatars.push(this.avatar);
      var self = this;
      // the old corner dock and the roaming host would be two Nuqtas at once
      if (UX.dock) {
        UX.dock.say = function (t) { self.say(t, 3800); };
        UX.dock.update = function () { if (UX.dock.el) UX.dock.el.hidden = true; };
        UX.dock.update();
      }
      document.addEventListener('ux:scene', function (e) { self.onScene(e.detail); });
      document.addEventListener('ux:booking-open', function () { self.act('point'); });
      document.addEventListener('ux:booking-sent', function () { self.celebrate(); });
      window.addEventListener('resize', function () { self.place(true); });
      $$('.btn--primary').forEach(function (b) {
        b.addEventListener('pointerenter', function () { if (self.visible()) { var r = b.getBoundingClientRect(); self.avatar.lookAt(r.left + r.width / 2, r.top + r.height / 2); } });
      });
      this.apply();
      return true;
    },
    visible: function () { return this.enabled && !this.el.hidden; },
    apply: function () {
      var guideOn = !UX.settings || UX.settings.guide !== false;
      this.enabled = guideOn && Prefs.antics !== 'off' && UX.introPhase === 'done';
      this.el.hidden = !this.enabled;
      this.avatar.visible = this.enabled;
      document.body.classList.toggle('has-roam', this.enabled);
      this.place(true);
      clearTimeout(this.timer);
      if (this.enabled) this.schedule();
    },
    place: function (instant) {
      // Home = beside the «اسأل نقطة» launcher (bottom-left): in RTL the text starts on the right,
      // so the left edge is the emptiest place on screen.
      var l = document.getElementById('nqLaunch'), r = l && l.getBoundingClientRect();
      this.home = r && r.width ? Math.min(window.innerWidth - (this.el.offsetWidth || 64) - 8, r.right + 10) : 18;
      if (instant) this.moveTo(this.home, true);
    },
    moveTo: function (x, instant) {
      this.x = x;
      this.el.style.transition = instant ? 'none' : '';
      this.el.style.transform = 'translate3d(' + Math.round(x) + 'px,0,0)';
    },
    // Stepped run (pixel feel): ~16 frames/s, legs flap via CSS .is-run, facing via .is-left.
    run: function (toX, done) {
      var self = this, from = this.x, dist = toX - from, steps = Math.max(6, Math.round(Math.abs(dist) / 38)), i = 0;
      this.body.classList.add('is-run'); this.body.classList.toggle('is-left', dist < 0);
      this.el.style.transition = 'none';
      var id = setInterval(function () {
        i++;
        self.x = from + dist * (i / steps);
        self.el.style.transform = 'translate3d(' + Math.round(self.x) + 'px,0,0)';
        if (i >= steps) { clearInterval(id); self.body.classList.remove('is-run'); if (done) done(); }
      }, 62);
      return id;
    },
    act: function (name) {
      if (!this.visible() || this.busy) return;
      var self = this, b = this.body, ms = { jump: 520, spin: 700, dance: 1500, fall: 1600, wave: 1200, point: 1300, shrug: 900 }[name] || 800;
      NQ.antics.push(name);
      if (reduced() && /jump|spin|dance|fall/.test(name)) name = 'wave';
      this.busy = true;
      if (name === 'wave' || name === 'point') { this.avatar.wave ? this.avatar.wave() : this.avatar.set('arm', 'up'); }
      else b.classList.add('is-' + name);
      if (name === 'fall') this.avatar.set('eyes', 'shut');
      setTimeout(function () {
        b.classList.remove('is-' + name); self.avatar.set('arm', 'down'); self.avatar.set('eyes', 'open'); self.busy = false;
      }, ms);
    },
    // Run off one edge and come back in from the other (a "scene transition" run).
    lap: function (line) {
      if (!this.visible() || this.busy || reduced()) { if (line) this.say(line); return; }
      var self = this, w = this.el.offsetWidth || 64;
      this.busy = true; this.lastRun = Date.now(); NQ.antics.push('run');
      this.run(-w - 10, function () {
        self.moveTo(window.innerWidth + 10, true);
        setTimeout(function () {
          self.run(self.home, function () { self.busy = false; if (line) self.say(line); self.act('jump'); });
        }, 140);
      });
    },
    peek: function () {
      if (!this.visible() || this.busy || reduced()) return;
      var self = this; this.busy = true; NQ.antics.push('peek');
      this.body.classList.add('is-hide');
      setTimeout(function () {
        self.body.classList.remove('is-hide'); self.body.classList.add('is-peek');
        self.avatar.look(-1, 0);
        setTimeout(function () { self.body.classList.remove('is-peek'); self.busy = false; self.avatar.look(0, 0); }, 1400);
      }, 900);
    },
    // First appearance: runs in from the far edge and says hello (static when reduced motion).
    enter: function () {
      if (!this.visible()) return;
      var self = this, hello = 'هلا! أنا نقطة. إذا احتجتني، أنا جنب «اسأل نقطة».';
      if (reduced()) { this.say(hello); return; }
      this.busy = true; this.moveTo(window.innerWidth + 10, true);
      setTimeout(function () { self.run(self.home, function () { self.busy = false; self.act('wave'); self.say(hello, 4200); }); }, 400);
    },
    celebrate: function () {
      if (!this.enabled) return;
      var self = this; this.busy = false;
      this.say('يا سلام! أرسلها، والفريق يرد عليك. أنا متحمس أكثر منك.', 4200);
      this.act('dance');
      if (UX.sound) UX.sound.play('win');
      setTimeout(function () { self.busy = false; self.act('jump'); }, 1600);
    },
    say: function (text, hold) {
      if (!this.visible() || !text) return;
      if (window.innerWidth < 640) { this.avatar.react(); return; } // phones: no bubble over content
      var self = this, b = this.bubble, t = $('.bubble__text', b);
      clearTimeout(this.sayId);
      t.textContent = text; b.hidden = false; this.avatar.set('mouth', 'open');
      var flaps = 0, flap = setInterval(function () { self.avatar.set('mouth', flaps++ % 2 ? 'open' : 'closed'); if (flaps > Math.min(14, text.length / 4)) { clearInterval(flap); self.avatar.set('mouth', 'closed'); } }, 130);
      this.sayId = setTimeout(function () { b.hidden = true; }, hold || Math.max(3200, text.length * 70));
    },
    onScene: function (id) {
      if (!this.visible() || this.seen[id]) return;
      this.seen[id] = true;
      var line = SCENE_LINES[id];
      if (Prefs.antics === 'lively' && Date.now() - this.lastRun > 7000 && id !== 'universe') this.lap(line);
      else if (line && Prefs.antics !== 'off') this.say(line);
    },
    // Background antics: rare, never while the chat or a dialog is open.
    schedule: function () {
      var self = this, lively = Prefs.antics === 'lively';
      var wait = (lively ? 16000 : 42000) + Math.random() * (lively ? 14000 : 30000);
      this.timer = setTimeout(function () {
        if (self.visible() && !Chat.open && !document.hidden && !document.querySelector('dialog[open]')) {
          var pool = lively ? ['jump', 'spin', 'dance', 'fall', 'wave', 'peek', 'look', 'quip', 'lap'] : ['wave', 'look', 'peek', 'quip'];
          var pick = pool[Math.floor(Math.random() * pool.length)];
          if (pick === 'peek') self.peek();
          else if (pick === 'look') { self.avatar.look(-1, -1); setTimeout(function () { self.avatar.look(1, 0); }, 700); setTimeout(function () { self.avatar.look(0, 0); }, 1500); }
          else if (pick === 'quip') self.say(IDLE_QUIPS[Math.floor(Math.random() * IDLE_QUIPS.length)]);
          else if (pick === 'lap') self.lap();
          else self.act(pick);
        }
        self.schedule();
      }, wait);
    }
  };
  NQ.roam = Roam;

  /* ---------------------------------------------------------------- *
   * Voice — out (server TTS or browser voice) and in (speech recognition)
   * ---------------------------------------------------------------- */
  var Voice = {
    audio: null, speaking: false, utter: null,
    stop: function () {
      if (this.audio) { this.audio.pause(); this.audio = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      this.done();
    },
    done: function () { this.speaking = false; $('#nqStop').hidden = true; Chat.avatar && Chat.avatar.set('mouth', 'closed'); },
    start: function () { this.speaking = true; $('#nqStop').hidden = false; },
    speak: function (text, lang) {
      this.stop();
      if (!text) return Promise.resolve(false);
      var self = this, vol = Prefs.volume / 100;
      if (NQ.health.tts) {
        return fetch('api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text }) })
          .then(function (r) { if (!r.ok) throw new Error('tts ' + r.status); return r.blob(); })
          .then(function (blob) {
            var url = URL.createObjectURL(blob), a = new Audio(url);
            a.volume = vol; self.audio = a; self.start();
            a.onended = a.onerror = function () { URL.revokeObjectURL(url); self.done(); };
            return a.play().then(function () { return true; });
          })
          .catch(function () { return self.browser(text, lang, vol); });
      }
      return Promise.resolve(this.browser(text, lang, vol));
    },
    browser: function (text, lang, vol) {
      if (!('speechSynthesis' in window)) return false;
      var u = new SpeechSynthesisUtterance(text), voices = window.speechSynthesis.getVoices() || [];
      var want = lang === 'en' ? /^en/i : /^ar/i;
      var v = voices.filter(function (x) { return want.test(x.lang) && /SA/i.test(x.lang); })[0] || voices.filter(function (x) { return want.test(x.lang); })[0];
      if (v) u.voice = v;
      u.lang = v ? v.lang : (lang === 'en' ? 'en-US' : 'ar-SA');
      u.rate = lang === 'en' ? 1.04 : 1; u.pitch = 1.15; u.volume = vol;
      var self = this;
      u.onstart = function () { self.start(); };
      u.onend = u.onerror = function () { self.done(); };
      this.utter = u;
      window.speechSynthesis.speak(u);
      return true;
    },
    // Speech-to-text (Chrome/Edge/Safari). Hidden when unsupported.
    Rec: window.SpeechRecognition || window.webkitSpeechRecognition,
    listen: function (lang, onText, onEnd) {
      if (!this.Rec) return false;
      var r = new this.Rec(); this.rec = r;
      r.lang = lang === 'en' ? 'en-US' : 'ar-SA'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = function (e) { var t = e.results[0] && e.results[0][0] && e.results[0][0].transcript; if (t) onText(t); };
      r.onerror = r.onend = function () { onEnd(); };
      try { r.start(); return true; } catch (e) { onEnd(); return false; }
    },
    stopListening: function () { if (this.rec) try { this.rec.stop(); } catch (e) { /* ignore */ } }
  };
  NQ.voice = Voice;

  /* ---------------------------------------------------------------- *
   * Chat — «اسأل نقطة»
   * ---------------------------------------------------------------- */
  var ACTION_LABEL = { open_booking: 'جهّز طلبي', open_whatsapp: 'كلّم الفريق على واتساب', show_games: 'وريني التجارب', show_brands: 'وريني حلول الجهات', show_faq: 'الأسئلة الشائعة', show_process: 'كيف تشتغلون' };
  var ACTION_LABEL_EN = { open_booking: 'Prepare my request', open_whatsapp: 'Talk to the team on WhatsApp', show_games: 'Show me the games', show_brands: 'Show brand solutions', show_faq: 'FAQ', show_process: 'How it works' };
  var INTENT_TYPE = { player: 'booking', corporate: 'corporate', event: 'event', agency: 'partnership', curious: 'booking', unknown: 'booking' };

  var Chat = {
    open: false, history: [], pending: false, lastIntent: 'unknown', lastLang: 'ar',
    init: function () {
      var self = this;
      this.panel = $('#nqChat'); this.logEl = $('#nqLog'); this.input = $('#nqText'); this.launch = $('#nqLaunch');
      this.avatar = new UX.Avatar($('#nqChatAvatar'), {}); UX.avatars.push(this.avatar);
      var face = $('.nq-launch__face'); if (face && window.USERSX_AVATAR) face.innerHTML = window.USERSX_AVATAR.svg({});
      this.launch.addEventListener('click', function () { self.toggle(); });
      $('#nqClose').addEventListener('click', function () { self.toggle(false); });
      $('#nqStop').addEventListener('click', function () { Voice.stop(); });
      $('#nqForm').addEventListener('submit', function (e) { e.preventDefault(); self.send(self.input.value); });
      $$('#nqQuick [data-q]').forEach(function (b) { b.addEventListener('click', function () { self.send(b.getAttribute('data-q')); }); });
      this.panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { self.toggle(false); } });
      var vb = $('#nqVoice');
      vb.setAttribute('aria-pressed', String(Prefs.voice));
      vb.addEventListener('click', function () { setVoice(!Prefs.voice); });
      var mic = $('#nqMic');
      if (Voice.Rec) {
        mic.hidden = false;
        mic.addEventListener('click', function () {
          if (mic.getAttribute('aria-pressed') === 'true') { Voice.stopListening(); return; }
          mic.setAttribute('aria-pressed', 'true'); Voice.stop();
          Voice.listen(self.lastLang, function (t) { self.input.value = t; self.send(t); }, function () { mic.setAttribute('aria-pressed', 'false'); });
        });
      }
      $$('[data-ask]').forEach(function (b) { b.addEventListener('click', function () { self.toggle(true); self.send(b.getAttribute('data-ask')); }); });
      return true;
    },
    toggle: function (force) {
      var open = typeof force === 'boolean' ? force : !this.open;
      if (open === this.open) { if (open) this.input.focus(); return; }
      this.open = open;
      this.panel.hidden = !open;
      this.launch.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nq-chat-open', open);
      if (UX.sound) UX.sound.play(open ? 'avatar' : 'back');
      if (open) {
        if (!this.history.length && !this.logEl.children.length) this.greet();
        this.input.focus();
        Roam.act('wave');
      } else { Voice.stop(); Voice.stopListening(); this.launch.focus(); }
    },
    greet: function () {
      var line = NQ.mode === 'ai'
        ? 'هلا والله! أنا نقطة. اسألني أي شي عن يوزر إكس — بالعربي أو English. جاي تلعب، ولا عندك علامة أو فعالية؟'
        : 'هلا والله! أنا نقطة. أجاوبك الحين من معلومات يوزر إكس المؤكدة. جاي تلعب، ولا عندك علامة أو فعالية؟';
      this.add('nuqta', line, { lang: 'ar', action: 'none' }, true);
    },
    add: function (who, text, meta, quiet) {
      var li = document.createElement('li'); li.className = 'nq-msg nq-msg--' + who;
      var p = document.createElement('p'); p.textContent = text;
      if (meta && meta.lang === 'en') { p.lang = 'en'; p.dir = 'ltr'; }
      li.appendChild(p);
      if (who === 'nuqta') {
        var tools = document.createElement('div'); tools.className = 'nq-msg__tools';
        var replay = document.createElement('button'); replay.type = 'button'; replay.className = 'nq-replay'; replay.setAttribute('aria-label', 'اسمع الرد'); replay.textContent = '▶';
        replay.addEventListener('click', function () { Voice.speak(text, meta && meta.lang); });
        tools.appendChild(replay);
        if (meta && meta.action && meta.action !== 'none') tools.appendChild(this.actionButton(meta));
        li.appendChild(tools);
        if (meta && meta.mode === 'offline-notice') li.classList.add('is-notice');
      }
      this.logEl.appendChild(li);
      this.logEl.scrollTop = this.logEl.scrollHeight;
      NQ.log.push({ who: who, text: text, meta: meta || null });
      if (who === 'nuqta' && !quiet && Prefs.voice) Voice.speak(text, meta && meta.lang);
      return li;
    },
    actionButton: function (m) {
      var self = this, en = m.lang === 'en', label = (en ? ACTION_LABEL_EN : ACTION_LABEL)[m.action];
      var el;
      if (m.action === 'open_whatsapp') {
        el = document.createElement('a'); el.target = '_blank'; el.rel = 'noopener';
        var last = this.history.filter(function (h) { return h.role === 'user'; }).pop();
        el.href = UX.waUrl ? UX.waUrl('هلا فريق يوزر إكس، سألت نقطة في الموقع: «' + (last ? last.content : '') + '» — ممكن تساعدوني؟') : 'https://wa.me/966565952065';
      } else {
        el = document.createElement('button'); el.type = 'button';
        el.addEventListener('click', function () { self.perform(m); });
      }
      el.className = 'btn btn--ghost btn--sm nq-action'; el.textContent = label;
      return el;
    },
    perform: function (m) {
      var go = function (id) { var t = document.getElementById(id); if (t && UX.scrollToEl) UX.scrollToEl(t, t.querySelector('h2')); };
      if (m.action === 'open_booking' && UX.contact) {
        var type = INTENT_TYPE[m.intent || this.lastIntent] || 'booking';
        if (window.innerWidth < 900) this.toggle(false);
        UX.contact.open(type, null, m.game_id || null);
      } else if (m.action === 'show_games') {
        if (window.innerWidth < 900) this.toggle(false);
        if (m.game_id && UX.games && UX.modules.games && UX.modules.games.open) {
          var i = UX.games.map(function (g) { return g.id; }).indexOf(m.game_id); go('games'); if (i >= 0) setTimeout(function () { UX.modules.games.open(i); }, 400);
        } else go('games');
      } else if (m.action === 'show_brands') { if (window.innerWidth < 900) this.toggle(false); go('brands'); }
      else if (m.action === 'show_faq') { if (window.innerWidth < 900) this.toggle(false); go('faq'); }
      else if (m.action === 'show_process') { if (window.innerWidth < 900) this.toggle(false); go('process'); }
    },
    typing: function (on) {
      var li = $('.nq-msg--typing', this.logEl);
      if (on && !li) {
        li = document.createElement('li'); li.className = 'nq-msg nq-msg--nuqta nq-msg--typing';
        li.innerHTML = '<p><span class="nq-dots" aria-label="نقطة يكتب"><i></i><i></i><i></i></span></p>';
        this.logEl.appendChild(li); this.logEl.scrollTop = this.logEl.scrollHeight;
        this.avatar.set('mouth', 'open');
      } else if (!on && li) { li.remove(); this.avatar.set('mouth', 'closed'); }
    },
    send: function (raw) {
      var text = String(raw || '').trim().slice(0, 600);
      if (!text || this.pending) return;
      var self = this;
      this.toggle(true);
      this.input.value = '';
      Voice.stop();
      this.add('user', text, { lang: window.NuqtaBrain.isEnglish(text) ? 'en' : 'ar' });
      this.history.push({ role: 'user', content: text });
      this.pending = true; this.typing(true);
      var started = Date.now();
      this.ask().then(function (res) {
        var wait = Math.max(0, 450 - (Date.now() - started)); // never feel instant-robotic
        setTimeout(function () { self.reply(res); }, wait);
      });
    },
    ask: function () {
      var self = this, history = this.history.slice(-12);
      var offline = function (why) {
        return brain.load().then(function () {
          var a = brain.answer(history[history.length - 1].content);
          a.offlineReason = why; return a;
        }).catch(function () {
          return { reply: 'معليش، ما قدرت أوصل لمعلوماتي الحين. كلّم الفريق على الواتساب مباشرة.', lang: 'ar', action: 'open_whatsapp', intent: 'unknown', game_id: '', mood: 'serious', mode: 'offline' };
        });
      };
      if (!NQ.health.ai) return offline('not-configured');
      var ctrl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
      return fetch('api/nuqta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }), signal: ctrl && ctrl.signal })
        .then(function (r) {
          clearTimeout(t);
          if (r.status === 429) return r.json().then(function (j) { return { reply: 'شوي شوي علي! خذ نفس ' + (j.retryAfterS || 10) + ' ثواني وارجع اسألني.', lang: self.lastLang, action: 'none', intent: self.lastIntent, game_id: '', mood: 'cheeky', mode: 'ai' }; });
          if (!r.ok) return offline('http-' + r.status);
          return r.json();
        })
        .catch(function () { clearTimeout(t); return offline('network'); });
    },
    reply: function (res) {
      this.pending = false; this.typing(false);
      if (res.mode === 'offline' && NQ.mode === 'ai') { setMode('offline'); }
      this.lastIntent = res.intent || this.lastIntent; this.lastLang = res.lang || this.lastLang;
      this.history.push({ role: 'assistant', content: res.reply });
      this.add('nuqta', res.reply, res);
      var mood = res.mood;
      if (mood === 'excited') { this.avatar.react(); Roam.act('jump'); }
      else if (mood === 'cheeky') Roam.act('wave');
      else if (mood === 'thinking') { this.avatar.look(0, -1); var a = this.avatar; setTimeout(function () { a.look(0, 0); }, 1200); }
      else this.avatar.react();
      NQ.last = res;
    }
  };
  NQ.chat = Chat;

  function setMode(mode) {
    NQ.mode = mode;
    var el = $('#nqMode');
    if (el) el.textContent = mode === 'ai' ? 'متصل · ذكاء اصطناعي' : 'وضع المعلومات المؤكدة (بدون ذكاء اصطناعي)';
    document.body.setAttribute('data-nq-mode', mode);
  }
  function setVoice(on) {
    Prefs.voice = !!on; Prefs.save();
    var vb = $('#nqVoice'); if (vb) { vb.setAttribute('aria-pressed', String(Prefs.voice)); vb.setAttribute('aria-label', Prefs.voice ? 'إيقاف صوت نقطة' : 'تشغيل صوت نقطة'); }
    var sv = $('#setVoice'); if (sv) sv.checked = Prefs.voice;
    if (!Prefs.voice) Voice.stop();
  }

  /* ---------------------------------------------------------------- *
   * FAQ section — rendered from the knowledge base, with "ask Nuqta"
   * ---------------------------------------------------------------- */
  var FAQ_IDS = ['what-is', 'how-to-book', 'price', 'location', 'faq-size', 'faq-duration', 'faq-online', 'minors', 'privacy', 'targets', 'faq-app', 'contact'];
  function renderFaq() {
    var list = $('#faqList'); if (!list) return;
    return brain.load().then(function () {
      var byId = {}; brain.entries().forEach(function (e) { byId[e.id] = e; });
      var Q = { 'what-is': 'وش هي يوزر إكس؟', 'how-to-book': 'كيف أحجز؟', price: 'كم الأسعار؟', location: 'وين مكانكم؟', 'faq-size': 'كم شخص يقدر يلعب؟', 'faq-duration': 'كم تاخذ التجربة؟',
        'faq-online': 'تنلعب أونلاين؟', minors: 'فيه حد للعمر؟', privacy: 'وش يصير ببياناتي؟', targets: 'وش النتائج المتوقعة للجهات؟', 'faq-app': 'فيه تطبيق؟', contact: 'كيف أتواصل معكم؟' };
      list.innerHTML = '';
      FAQ_IDS.forEach(function (id) {
        var e = byId[id]; if (!e) return;
        var d = document.createElement('details'); d.className = 'faq-item';
        var s = document.createElement('summary'); s.textContent = Q[id] || id;
        var p = document.createElement('p'); p.textContent = e.answer_ar;
        d.appendChild(s); d.appendChild(p);
        d.addEventListener('toggle', function () { if (d.open && UX.sound) UX.sound.play('blip'); });
        list.appendChild(d);
      });
    }).catch(function (err) { NQ.errors.push('faq: ' + err.message); list.innerHTML = '<p class="placeholder">ما قدرنا نحمّل الأسئلة. اسأل نقطة مباشرة أو كلّم الفريق على الواتساب.</p>'; });
  }

  /* ---------------------------------------------------------------- *
   * Settings wiring + boot
   * ---------------------------------------------------------------- */
  function wireSettings() {
    var a = $('#setAntics'), v = $('#setVoice'), vol = $('#setVolume'), guide = $('#setGuide');
    if (a) { a.value = Prefs.antics; a.addEventListener('change', function () { Prefs.antics = a.value; Prefs.save(); Roam.apply(); }); }
    if (v) { v.checked = !!Prefs.voice; v.addEventListener('change', function () { setVoice(v.checked); }); }
    if (vol) {
      vol.value = Prefs.volume;
      vol.addEventListener('input', function () {
        Prefs.volume = +vol.value; Prefs.save();
        if (Voice.audio) Voice.audio.volume = Prefs.volume / 100;
        var S = UX.sound; if (S && S.master && S.ctx) S.master.gain.setTargetAtTime(Prefs.volume / 100 * 0.9, S.ctx.currentTime, 0.05);
      });
    }
    if (guide) guide.addEventListener('change', function () { setTimeout(function () { Roam.apply(); }, 0); });
  }

  // Trailer: the video loads only when the dialog opens; phones get the 640p file.
  function wireTrailer() {
    var btn = $('#trailerBtn'), dlg = $('#trailer'), v = $('#trailerVideo');
    if (!btn || !dlg || !v || typeof dlg.showModal !== 'function') { if (btn) btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      if (!v.src) v.src = 'assets/video/user-x-trailer-' + (window.innerWidth < 700 ? '640' : '960') + '.mp4';
      dlg.showModal(); Voice.stop();
      if (UX.sound && UX.sound.duck) UX.sound.duck(0.0005);
      v.play().catch(function () { /* autoplay blocked: controls are visible */ });
    });
    var close = function () { v.pause(); if (dlg.open) dlg.close(); };
    $('#trailerClose').addEventListener('click', close);
    dlg.addEventListener('close', function () { v.pause(); if (UX.sound && UX.sound.duck) UX.sound.duck(0.05); btn.focus(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    v.addEventListener('error', function () { var n = $('.trailer__note', dlg); if (n) n.textContent = 'ما قدرنا نشغّل الفيديو الحين. جرّب مرة ثانية لاحقاً.'; });
  }

  function boot() {
    settle('trailer', wireTrailer);
    setMode('offline');
    settle('chat', function () { Chat.init(); });
    settle('settings', wireSettings);
    settle('faq', renderFaq);
    settle('faqAsk', function () {
      var f = $('#faqAsk'); if (!f) return;
      f.addEventListener('submit', function (e) { e.preventDefault(); var i = $('#faqInput'); var q = i.value; i.value = ''; Chat.toggle(true); Chat.send(q); });
    });
    settle('roam', function () {
      Roam.init();
      // start roaming only after the intro is gone (or was skipped)
      var tries = 0, wait = setInterval(function () {
        if (UX.introPhase === 'done' || ++tries > 600) { clearInterval(wait); Roam.apply(); Roam.enter(); }
      }, 250);
    });
    fetch('api/health').then(function (r) { return r.ok ? r.json() : { ai: false, tts: false }; })
      .catch(function () { return { ai: false, tts: false }; })
      .then(function (h) { NQ.health = { ai: !!h.ai, tts: !!h.tts }; setMode(h.ai ? 'ai' : 'offline'); NQ.ready = true; });
    brain.load().catch(function (e) { NQ.errors.push('kb: ' + e.message); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

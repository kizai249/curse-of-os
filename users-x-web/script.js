/*
 * USERS-X · Cinematic interactive experience — orchestration
 * Vanilla JS, no dependencies. Each module is started through safeStart() so a
 * failure in one scene never takes down the rest of the page.
 * Debug/test hooks live on window.__ux (read-only state, no behaviour changes).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var UX = window.__ux = { errors: [], modules: {} };

  var CONFIG = (function () {
    var c = window.USERSX_CONFIG || {};
    return {
      contact: { email: (c.contact && typeof c.contact.email === 'string') ? c.contact.email.trim() : '' },
      social: Array.isArray(c.social) ? c.social.filter(function (s) { return s && s.url && s.label; }) : [],
      audio: c.audio && typeof c.audio === 'object' ? c.audio : {}
    };
  })();

  function safeStart(name, fn) {
    try { UX.modules[name] = fn() || true; }
    catch (err) {
      UX.errors.push(name + ': ' + (err && err.message));
      UX.modules[name] = false;
      if (window.console) console.warn('[USERS-X] module "' + name + '" failed and was skipped:', err);
    }
  }

  var store = {
    get: function (k, fallback) { try { var v = localStorage.getItem('ux.' + k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set: function (k, v) { try { localStorage.setItem('ux.' + k, JSON.stringify(v)); } catch (e) { /* private mode: ignore */ } }
  };
  var session = {
    get: function (k) { try { return sessionStorage.getItem('ux.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem('ux.' + k, v); } catch (e) { /* ignore */ } }
  };

  // Cancellable timeline — every sequence (intro, outro, logo) uses this so
  // skipping or closing never leaves orphan timers behind.
  function Timeline() { this.ids = []; }
  Timeline.prototype.at = function (ms, fn) { this.ids.push(setTimeout(fn, ms)); return this; };
  Timeline.prototype.cancel = function () { this.ids.forEach(clearTimeout); this.ids = []; };

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var finePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;
  function reduced() { return root.classList.contains('reduce-motion'); }

  function scrollToEl(el, focusEl) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
    if (focusEl) {
      if (!focusEl.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(focusEl.tagName)) focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------ *
   * Settings (sound · reduced motion · guide)
   * ------------------------------------------------------------------ */
  var Settings = {
    sound: false, // never on before a user gesture
    motion: store.get('reduceMotion', null),
    guide: store.get('guide', true),
    applyMotion: function () {
      var on = this.motion === null ? motionQuery.matches : this.motion;
      root.classList.toggle('reduce-motion', !!on);
      root.classList.toggle('motion-ok', !on);
      var box = $('#setMotion'); if (box) box.checked = !!on;
      document.dispatchEvent(new CustomEvent('ux:motion', { detail: !!on }));
    }
  };
  Settings.applyMotion();
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', function () { if (Settings.motion === null) Settings.applyMotion(); });

  /* ------------------------------------------------------------------ *
   * Sound — optional, original synth cues (Web Audio). Optional files from
   * CONFIG.audio are tried first; missing files fall back to the synth.
   * ------------------------------------------------------------------ */
  var Sound = {
    AC: window.AudioContext || window.webkitAudioContext,
    ctx: null, master: null, amb: null, buffers: {}, missing: [], played: [],
    get supported() { return !!this.AC; },
    enable: function () {
      if (!this.supported) return Promise.resolve(false);
      var self = this;
      try {
        if (!this.ctx) {
          this.ctx = new this.AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.22;
          this.master.connect(this.ctx.destination);
          this.loadFiles();
        }
        return Promise.resolve(this.ctx.resume()).then(function () { self.startAmbience(); return true; }, function () { return false; });
      } catch (e) { console.warn('[USERS-X] audio unavailable:', e); return Promise.resolve(false); }
    },
    disable: function () { this.stopAmbience(); if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
    loadFiles: function () {
      var self = this;
      Object.keys(CONFIG.audio).forEach(function (name) {
        var url = CONFIG.audio[name];
        fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
          .then(function (buf) { return new Promise(function (res, rej) { self.ctx.decodeAudioData(buf, res, rej); }); })
          .then(function (decoded) { self.buffers[name] = decoded; })
          .catch(function (err) { self.missing.push(name); console.info('[USERS-X] audio "' + name + '" not available (' + (err && err.message) + ') — using built-in synth.'); });
      });
    },
    tone: function (o) {
      var c = this.ctx, t = c.currentTime + (o.when || 0);
      var osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.g || 0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
      osc.connect(g); g.connect(o.dest || this.master);
      osc.start(t); osc.stop(t + o.d + 0.05);
    },
    synth: {
      blip: function (s) { s.tone({ f: 880, d: 0.06, g: 0.12 }); },
      select: function (s) { s.tone({ f: 660, d: 0.07 }); s.tone({ f: 990, d: 0.09, when: 0.07 }); },
      reveal: function (s) { [523, 659, 784, 1046].forEach(function (f, i) { s.tone({ f: f, d: 0.09, when: i * 0.07, g: 0.14 }); }); },
      back: function (s) { s.tone({ f: 660, to: 330, d: 0.14, g: 0.12 }); },
      avatar: function (s) { s.tone({ f: 600, to: 920, d: 0.12, type: 'sine', g: 0.2 }); s.tone({ f: 920, to: 700, d: 0.1, type: 'sine', when: 0.12, g: 0.15 }); },
      intro: function (s) { s.tone({ f: 110, to: 220, d: 0.9, type: 'triangle', g: 0.18 }); s.synth.reveal(s); },
      portal: function (s) { s.tone({ f: 200, to: 800, d: 0.8, type: 'sine', g: 0.18 }); },
      horror: function (s) { s.tone({ f: 70, to: 52, d: 1.4, type: 'sawtooth', g: 0.06 }); s.tone({ f: 233, d: 0.9, type: 'sine', when: 0.4, g: 0.05 }); },
      mystery: function (s) { [880, 0, 880, 1175].forEach(function (f, i) { if (f) s.tone({ f: f, d: 0.05, when: i * 0.09, g: 0.08 }); }); },
      strategy: function (s) { [392, 523, 659, 523].forEach(function (f, i) { s.tone({ f: f, d: 0.08, type: 'triangle', when: i * 0.1 }); }); },
      sports: function (s) { [523, 659, 784, 1046, 1318].forEach(function (f, i) { s.tone({ f: f, d: 0.05, when: i * 0.045, g: 0.14 }); }); },
      adventure: function (s) { s.tone({ f: 220, to: 440, d: 0.6, type: 'triangle', g: 0.14 }); },
      outroPulse: function (s) { s.tone({ f: 82, d: 0.5, type: 'sine', g: 0.3 }); },
      outroFinal: function (s) { [262, 330, 392, 523].forEach(function (f) { s.tone({ f: f, d: 1.2, type: 'triangle', g: 0.07 }); }); },
      win: function (s) { [659, 784, 1046].forEach(function (f, i) { s.tone({ f: f, d: 0.08, when: i * 0.08 }); }); },
      lose: function (s) { s.tone({ f: 300, to: 120, d: 0.35, type: 'sawtooth', g: 0.08 }); }
    },
    play: function (name) {
      if (!Settings.sound || !this.ctx || this.ctx.state !== 'running') return;
      try {
        if (this.buffers[name]) {
          var src = this.ctx.createBufferSource(); src.buffer = this.buffers[name]; src.connect(this.master); src.start();
        } else if (this.synth[name]) this.synth[name](this);
        this.played.push(name);
      } catch (e) { console.warn('[USERS-X] sound "' + name + '" failed:', e); }
    },
    startAmbience: function () {
      if (this.amb || !this.ctx) return;
      var c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 240; g.gain.value = 0.0001;
      var a = c.createOscillator(), b = c.createOscillator();
      a.type = 'sine'; b.type = 'triangle'; a.frequency.value = 55; b.frequency.value = 55.6;
      a.connect(lp); b.connect(lp); lp.connect(g); g.connect(this.master);
      a.start(); b.start();
      g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 2);
      this.amb = { g: g, oscs: [a, b] };
    },
    stopAmbience: function () {
      if (!this.amb) return;
      var amb = this.amb, t = this.ctx.currentTime; this.amb = null;
      amb.g.gain.cancelScheduledValues(t); amb.g.gain.setValueAtTime(amb.g.gain.value, t);
      amb.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      amb.oscs.forEach(function (o) { o.stop(t + 0.5); });
    },
    duck: function (level) {
      if (!this.amb) return;
      var t = this.ctx.currentTime;
      this.amb.g.gain.cancelScheduledValues(t);
      this.amb.g.gain.setValueAtTime(Math.max(this.amb.g.gain.value, 0.0001), t);
      this.amb.g.gain.exponentialRampToValueAtTime(level, t + 0.8);
    }
  };
  UX.sound = Sound;

  function setSound(on) {
    var btn = $('#soundBtn'), box = $('#setSound'), note = $('#soundNote');
    if (on && !Sound.supported) {
      Settings.sound = false;
      if (note) note.textContent = 'متصفحك ما يدعم الصوت التفاعلي — التجربة كاملة بدونه.';
      if (btn) { btn.disabled = true; btn.setAttribute('aria-label', 'الصوت غير مدعوم في هذا المتصفح'); }
      return;
    }
    Settings.sound = !!on;
    if (btn) {
      btn.setAttribute('aria-pressed', String(!!on));
      btn.setAttribute('aria-label', on ? 'الصوت شغّال — اضغط للكتم' : 'الصوت مقفل — اضغط للتشغيل');
    }
    if (box) box.checked = !!on;
    var ib = $('#introSound');
    if (ib) { ib.setAttribute('aria-pressed', String(!!on)); ib.textContent = on ? 'اكتم الصوت' : 'شغّل الصوت'; }
    if (on) Sound.enable().then(function (ok) { if (ok) Sound.play('select'); else setSound(false); });
    else Sound.disable();
  }

  /* ------------------------------------------------------------------ *
   * Avatar «نقطة» — rig controller. Renderer is swappable: a future GLB/GLTF
   * renderer only needs to implement the same methods (look, pose, talk…).
   * ------------------------------------------------------------------ */
  function Avatar(mount, opts) {
    this.mount = mount;
    this.opts = opts || {};
    this.timers = new Timeline();
    this.visible = true;
    if (!mount) return;
    if (window.USERSX_AVATAR) {
      mount.innerHTML = window.USERSX_AVATAR.svg({ title: this.opts.title });
      this.svg = mount.querySelector('svg');
    } else {
      // Fallback: the static still is already in the HTML (or we add it).
      if (!mount.querySelector('img')) mount.innerHTML = '<img src="assets/avatar/nuqta.svg" alt="">';
      this.svg = null;
      mount.classList.add('is-static');
    }
    this.blinkLoop();
  }
  Avatar.prototype.set = function (attr, val) { if (this.svg) this.svg.setAttribute('data-' + attr, val); };
  Avatar.prototype.look = function (dx, dy) {
    if (!this.svg) return;
    this.svg.style.setProperty('--ex', String(Math.max(-1, Math.min(1, dx))));
    this.svg.style.setProperty('--ey', String(Math.max(-1, Math.min(1, dy))));
  };
  Avatar.prototype.lookAt = function (x, y) {
    if (!this.svg) return;
    var r = this.svg.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height * 0.32;
    var dx = x - cx, dy = y - cy, dead = r.width * 0.6;
    this.look(Math.abs(dx) < dead ? 0 : (dx > 0 ? 1 : -1), Math.abs(dy) < dead * 0.8 ? 0 : (dy > 0 ? 1 : -1));
  };
  Avatar.prototype.blinkLoop = function () {
    var self = this;
    var next = function () {
      self.blinkId = setTimeout(function () { self.blink(); next(); }, 2600 + Math.random() * 2800);
    };
    next();
  };
  Avatar.prototype.blink = function () {
    var self = this;
    this.set('eyes', 'shut');
    setTimeout(function () { self.set('eyes', 'open'); }, 140);
  };
  Avatar.prototype.react = function () {
    var m = this.mount; if (!m) return;
    m.classList.remove('is-react'); void m.offsetWidth; m.classList.add('is-react');
    this.blink();
  };
  Avatar.prototype.wave = function () {
    if (!this.svg) return;
    var self = this, svg = this.svg, frames = reduced() ? 1 : 6;
    this.set('arm', 'up');
    for (var i = 0; i < frames; i++) {
      (function (n) { self.timers.at(n * 170, function () { svg.style.setProperty('--wave', n % 2 ? '1' : '0'); }); })(i);
    }
    this.timers.at(frames * 170 + 300, function () { self.set('arm', 'down'); svg.style.setProperty('--wave', '0'); });
  };
  // talk(text, bubble, srEl): visual typing + mouth flaps; screen readers get the whole line at once.
  Avatar.prototype.talk = function (text, bubble, srEl, holdMs) {
    var self = this;
    clearInterval(this.typeId); clearTimeout(this.hideId);
    if (srEl) srEl.textContent = text;
    if (!bubble) return;
    var out = bubble.querySelector('.bubble__text');
    bubble.hidden = false;
    if (reduced()) { out.textContent = text; }
    else {
      var i = 0; out.textContent = '';
      this.typeId = setInterval(function () {
        i += 2; out.textContent = text.slice(0, i);
        self.set('mouth', (i / 2) % 2 ? 'open' : 'closed');
        if (i >= text.length) { clearInterval(self.typeId); self.set('mouth', 'closed'); }
      }, 34);
    }
    this.hideId = setTimeout(function () { bubble.hidden = true; self.set('mouth', 'closed'); }, holdMs || Math.max(3800, text.length * 75));
  };
  Avatar.prototype.destroy = function () { this.timers.cancel(); clearTimeout(this.blinkId); clearInterval(this.typeId); clearTimeout(this.hideId); };

  var avatars = [];
  // One shared, rAF-throttled pointer listener for every visible avatar (quantised to 3×3 gaze).
  function trackPointer() {
    var pending = null;
    window.addEventListener('pointermove', function (e) {
      if (pending) return;
      pending = requestAnimationFrame(function () {
        pending = null;
        avatars.forEach(function (a) { if (a.visible && a.svg) a.lookAt(e.clientX, e.clientY); });
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Starfield — pixel stars that twinkle in steps (~8fps), paused when hidden.
   * ------------------------------------------------------------------ */
  function startStars() {
    var canvas = $('#stars'); if (!canvas || !canvas.getContext) return false;
    var ctx = canvas.getContext('2d'), stars = [], dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = 0, h = 0;
    var colours = ['#F4F4F1', '#F4F4F1', '#33354C', '#00DEE6', '#F54BF7'];
    function build() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 700 ? 34 : 80;
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({ x: Math.round(Math.random() * w), y: Math.round(Math.random() * h * 0.85), s: Math.random() < 0.15 ? 3 : 2,
          c: colours[(Math.random() * colours.length) | 0], plus: Math.random() < 0.06, on: Math.random() > 0.3 });
      }
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(function (s) {
        if (!s.on) return;
        ctx.fillStyle = s.c; ctx.globalAlpha = s.c === '#33354C' ? 1 : 0.7;
        if (s.plus) { ctx.fillRect(s.x - 4, s.y, 10, 2); ctx.fillRect(s.x, s.y - 4, 2, 10); }
        else ctx.fillRect(s.x, s.y, s.s, s.s);
      });
      ctx.globalAlpha = 1;
    }
    var id = null, last = 0;
    function loop(t) {
      id = requestAnimationFrame(loop);
      if (t - last < 125) return;
      last = t;
      for (var i = 0; i < 4; i++) { var s = stars[(Math.random() * stars.length) | 0]; if (s) s.on = !s.on; }
      draw();
    }
    function run() { if (id === null && !reduced() && !document.hidden) id = requestAnimationFrame(loop); }
    function stop() { if (id !== null) cancelAnimationFrame(id); id = null; }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else run(); });
    document.addEventListener('ux:motion', function (e) { if (e.detail) { stop(); draw(); } else run(); });
    build(); run();
    return { running: function () { return id !== null; } };
  }

  /* ------------------------------------------------------------------ *
   * Floors: pause their CSS loop when off screen.
   * ------------------------------------------------------------------ */
  function watchFloors() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-offscreen', !en.isIntersecting); });
    });
    $$('.floor').forEach(function (f) { io.observe(f); });
  }

  /* ------------------------------------------------------------------ *
   * 01 · Intro — Signal → Awakening → Reveal → Invitation (~3.7s)
   * ------------------------------------------------------------------ */
  var Intro = {
    el: null, tl: new Timeline(), active: false,
    init: function () {
      this.el = $('#intro');
      if (!this.el) return;
      this.buildSymbol();
      var self = this;
      $('#enterBtn').addEventListener('click', function () { self.leave(true); });
      $('#skipIntro').addEventListener('click', function () { self.leave(false); });
      $('#introSound').addEventListener('click', function () { setSound(!Settings.sound); });
      document.addEventListener('keydown', function (e) {
        if (!self.active) return;
        if ((e.key === 'x' || e.key === 'X') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); self.leave(true); }
      });
      // Skip automatically for deep links and returning visits in this session.
      var deep = location.hash && location.hash !== '#intro' && document.getElementById(location.hash.slice(1));
      if (deep || session.get('introSeen')) { this.hide(); return; }
      this.play();
    },
    buildSymbol: function () {
      var host = $('#introSymbol'); if (!host) return;
      if (!window.USERSX_SYMBOL) { host.innerHTML = '<img class="intro__fallback" src="assets/logo/usersx-symbol.svg" alt="">'; this.el.classList.add('is-static'); return; }
      var dirs = { tl: [-1, -1], tr: [1, -1], bl: [-1, 1], br: [1, 1], core: [0, -1] };
      var colours = window.USERSX_SYMBOL.COLORS, html = '';
      window.USERSX_SYMBOL.cells().forEach(function (c, i) {
        var d = dirs[c.region], far = 6 + Math.random() * 10;
        if (c.region === 'core') d = [(Math.random() < 0.5 ? -1 : 1), (Math.random() < 0.5 ? -1 : 1)];
        html += '<i class="intro__px" style="--x:' + c.x + ';--y:' + c.y + ';--c:' + colours[c.c] +
          ';--dx:' + (d[0] * far * 100).toFixed(0) + '%;--dy:' + (d[1] * far * 100).toFixed(0) + '%;--d:' + (Math.random() * 360).toFixed(0) + 'ms"></i>';
      });
      html += '<div class="intro__final">' + window.USERSX_SYMBOL.svg({ grouped: true, depth: true }) + '</div>';
      host.innerHTML = html;
    },
    phase: function (p) { this.el.setAttribute('data-phase', p); UX.introPhase = p; },
    play: function () {
      var self = this;
      this.tl.cancel();
      this.active = true;
      this.el.hidden = false;
      this.el.classList.remove('is-leaving');
      document.body.classList.add('is-locked');
      setInert(true);
      if (reduced()) {
        this.phase('invite');
        $('#enterBtn').focus();
        return;
      }
      this.phase('signal');
      $('#skipIntro').focus({ preventScroll: true });
      this.tl
        .at(700, function () { self.phase('awaken'); Sound.play('outroPulse'); })
        .at(1500, function () { self.phase('reveal'); })
        .at(2500, function () { self.phase('depth'); Sound.play('reveal'); })
        .at(3100, function () {
          self.phase('invite');
          var f = document.activeElement;
          if (!f || f === document.body || f.id === 'skipIntro') $('#enterBtn').focus({ preventScroll: true });
        });
    },
    leave: function (withCue) {
      if (!this.active) return;
      var self = this;
      this.tl.cancel();
      this.active = false;
      session.set('introSeen', '1');
      if (withCue) Sound.play('intro');
      setInert(false);
      document.body.classList.remove('is-locked');
      if (reduced()) { this.hide(); this.afterLeave(); return; }
      this.el.classList.add('is-leaving');
      setTimeout(function () { self.hide(); }, 430);
      this.afterLeave();
    },
    afterLeave: function () {
      var target = $('#universe');
      if (location.hash === '#intro' || !location.hash) target.scrollIntoView({ behavior: 'instant' });
      $('#universe-title').focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('ux:entered'));
    },
    hide: function () {
      this.active = false; this.el.hidden = true; this.el.classList.remove('is-leaving');
      setInert(false); document.body.classList.remove('is-locked');
      UX.introPhase = 'done';
    }
  };
  UX.intro = Intro;

  function setInert(on) {
    ['#main', '#hud', '.footer', '#dock'].forEach(function (sel) {
      var el = $(sel); if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  /* ------------------------------------------------------------------ *
   * HUD: scene progress, menu, settings, sound
   * ------------------------------------------------------------------ */
  var Scenes = ['intro', 'universe', 'symbol', 'guide', 'about', 'games', 'why', 'contact', 'end'];
  function startHud() {
    var links = $$('#sceneList a'), counter = $('#sceneCounter'), list = $('#sceneList'), menuBtn = $('#menuBtn');
    var settingsBtn = $('#settingsBtn'), settings = $('#settings');
    var seen = {};
    function setCurrent(id) {
      UX.currentScene = id;
      var idx = Scenes.indexOf(id);
      links.forEach(function (a) {
        var on = a.getAttribute('data-scene') === id;
        if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
        if (seen[a.getAttribute('data-scene')] && !on) a.classList.add('is-done');
      });
      seen[id] = true;
      if (counter && idx >= 0) counter.textContent = String(idx + 1).padStart(2, '0') + '/09';
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) setCurrent(en.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main .scene').forEach(function (s) { io.observe(s); });
    }
    setCurrent('universe');

    function closeMenu() { list.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    menuBtn.addEventListener('click', function () {
      var open = !list.classList.contains('is-open');
      list.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      if (open) { closeSettings(); links[0].focus(); }
    });
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var replay = a.getAttribute('data-replay');
        closeMenu();
        Sound.play('blip');
        if (replay === 'intro') { e.preventDefault(); Intro.play(); }
        else if (replay === 'outro') { e.preventDefault(); scrollToEl($('#end')); Outro.open('nav'); }
        else { e.preventDefault(); var t = document.getElementById(a.getAttribute('href').slice(1)); scrollToEl(t, t.querySelector('h1, h2')); history.replaceState(null, '', a.getAttribute('href')); }
      });
    });

    function closeSettings() { settings.hidden = true; settingsBtn.setAttribute('aria-expanded', 'false'); }
    settingsBtn.addEventListener('click', function () {
      var open = settings.hidden;
      settings.hidden = !open;
      settingsBtn.setAttribute('aria-expanded', String(open));
      if (open) { closeMenu(); $('#setSound').focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!settings.hidden && !settings.contains(e.target) && !settingsBtn.contains(e.target)) closeSettings();
      if (list.classList.contains('is-open') && !list.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!settings.hidden) { closeSettings(); settingsBtn.focus(); }
      if (list.classList.contains('is-open')) { closeMenu(); menuBtn.focus(); }
    });

    $('#soundBtn').addEventListener('click', function () { setSound(!Settings.sound); });
    $('#setSound').addEventListener('change', function (e) { setSound(e.target.checked); });
    $('#setMotion').addEventListener('change', function (e) { Settings.motion = e.target.checked; store.set('reduceMotion', Settings.motion); Settings.applyMotion(); });
    var guideBox = $('#setGuide'); guideBox.checked = !!Settings.guide;
    guideBox.addEventListener('change', function (e) { Settings.guide = e.target.checked; store.set('guide', Settings.guide); Dock.update(); });
    $('#replayIntro').addEventListener('click', function () { closeSettings(); Intro.play(); });
    $('#replayOutroSettings').addEventListener('click', function () { closeSettings(); scrollToEl($('#end')); Outro.open('settings'); });
    if (!Sound.supported) { setSound(true); }
    return { setCurrent: setCurrent };
  }

  /* ------------------------------------------------------------------ *
   * 02 · Universe — parallax (fine pointers only) + hotspots
   * ------------------------------------------------------------------ */
  function startUniverse() {
    var sec = $('#universe'), layers = $$('.parallax', sec), raf = null;
    layers.forEach(function (l) { l.style.setProperty('--depth-px', (l.getAttribute('data-depth') || 0) + 'px'); });
    if (finePointer) {
      sec.addEventListener('pointermove', function (e) {
        if (reduced() || raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = sec.getBoundingClientRect();
          var px = ((e.clientX - r.left) / r.width - 0.5) * 2, py = ((e.clientY - r.top) / r.height - 0.5) * 2;
          layers.forEach(function (l) { l.style.setProperty('--px', px.toFixed(2)); l.style.setProperty('--py', py.toFixed(2)); });
        });
      });
      sec.addEventListener('pointerleave', function () { layers.forEach(function (l) { l.style.setProperty('--px', 0); l.style.setProperty('--py', 0); }); });
    }
    var spots = $$('.hotspot__btn', sec);
    function closeAll(except) {
      spots.forEach(function (b) { if (b !== except) { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; } });
    }
    spots.forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        closeAll(b);
        b.setAttribute('aria-expanded', String(open));
        $('#' + b.getAttribute('aria-controls')).hidden = !open;
        Sound.play(open ? 'select' : 'blip');
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.hotspot')) closeAll(null); });
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 03 · Interactive symbol — state machine with cooldown
   *   idle → hover → pressed → revealing → active → returning → idle
   * ------------------------------------------------------------------ */
  var Logo = {
    state: 'idle', reveals: 0, ignored: 0, tl: new Timeline(), cooldownUntil: 0,
    init: function () {
      this.stage = $('#logoStage'); this.btn = $('#logoBtn'); this.arms = $('#logoArms'); this.msg = $('#logoMsg');
      if (window.USERSX_SYMBOL) $('#logoArt').innerHTML = window.USERSX_SYMBOL.svg({ grouped: true, depth: true, title: 'رمز يوزرز إكس — زر الاتجاهات' });
      var self = this;
      this.btn.addEventListener('pointerenter', function () { if (self.state === 'idle') self.set('hover'); });
      this.btn.addEventListener('pointerleave', function () { if (self.state === 'hover' || self.state === 'pressed') self.set('idle'); });
      this.btn.addEventListener('pointerdown', function () { if (self.state === 'idle' || self.state === 'hover') self.set('pressed'); });
      this.btn.addEventListener('click', function () { self.toggle(); });
      this.stage.addEventListener('keydown', function (e) { self.key(e); });
      $$('.logo-arm', this.arms).forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var t = document.getElementById(a.getAttribute('href').slice(1));
          Sound.play('select');
          self.close(true);
          scrollToEl(t, t.querySelector('h2'));
        });
      });
      document.addEventListener('click', function (e) { if (self.state === 'active' && !self.stage.contains(e.target)) self.close(false); });
      return this;
    },
    set: function (s) { this.state = s; this.stage.setAttribute('data-state', s); },
    toggle: function () {
      var now = Date.now();
      if (this.state === 'revealing' || this.state === 'returning' || now < this.cooldownUntil) { this.ignored++; return; }
      if (this.state === 'active') this.close(false); else this.open();
    },
    open: function () {
      var self = this, fast = reduced();
      this.tl.cancel();
      this.reveals++;
      // a double-tap or shaky click right after opening must not slam it shut
      this.cooldownUntil = Date.now() + 900;
      this.set('revealing');
      this.btn.setAttribute('aria-expanded', 'true');
      Sound.play('reveal');
      this.tl.at(fast ? 0 : 520, function () {
        self.set('active');
        self.arms.hidden = false;
        self.msg.textContent = 'كل سهم خيار — والمربّع اللي في القلب هو إنت.';
        // auto-return so the symbol never stays exploded on its own
        self.tl.at(9000, function () { if (self.state === 'active' && !self.stage.contains(document.activeElement)) self.close(false); });
      });
    },
    close: function (fromNav) {
      if (this.state !== 'active') return;
      var self = this;
      this.tl.cancel();
      this.set('returning');
      this.btn.setAttribute('aria-expanded', 'false');
      this.msg.textContent = '';
      var hadFocus = this.arms.contains(document.activeElement);
      this.arms.hidden = true;
      if (hadFocus && !fromNav) this.btn.focus();
      Sound.play('back');
      this.tl.at(reduced() ? 0 : 380, function () { self.set('idle'); self.cooldownUntil = Date.now() + 250; });
    },
    key: function (e) {
      if (e.key === 'Escape' && this.state === 'active') { e.preventDefault(); this.close(false); return; }
      if (this.state !== 'active') return;
      var order = ['tl', 'tr', 'br', 'bl'];
      var map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      var current = document.activeElement && document.activeElement.getAttribute('data-dir');
      var i = current ? order.indexOf(current) : -1;
      var next = order[(i + map[e.key] + order.length) % order.length];
      if (i < 0) next = order[0];
      $('.logo-arm[data-dir="' + next + '"]', this.arms).focus();
      Sound.play('blip');
    }
  };
  UX.logo = Logo;

  /* ------------------------------------------------------------------ *
   * 04 · Guide avatar + dock
   * ------------------------------------------------------------------ */
  var LINES = {
    greet: 'هلا والله! أنا نقطة، دليلك هنا. اضغط عليّ إذا تبي سالفة.',
    taps: [
      'تدري؟ المربّع الماجنتا اللي في قلبي… هو إنت.',
      'هنا ما فيه جمهور. كلنا لاعبين.',
      'جرّب تضغط الرمز فوق — كل سهم فيه خيار.',
      'لا تستعجل. أحلى شي في اللعبة القرار.'
    ],
    talk: 'نصمّم ونشغّل تجارب تفاعلية هجينة: على جوالك وفي المكان بنفس اللحظة — وكل جولة تترك أثر.',
    contact: 'البوابة انفتحت. قول لنا وش في بالك.'
  };
  var Guide = {
    init: function () {
      var self = this;
      this.avatar = new Avatar($('#avatarMain'), { title: 'نقطة — دليل يوزرز إكس' });
      avatars.push(this.avatar);
      this.bubble = $('#avatarBubble'); this.sr = $('#avatarSay'); this.tap = 0; this.greeted = false;
      $('#avatarBtn').addEventListener('click', function () {
        self.avatar.react(); Sound.play('avatar');
        self.avatar.talk(LINES.taps[self.tap++ % LINES.taps.length], self.bubble, self.sr);
      });
      $$('[data-avatar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var what = b.getAttribute('data-avatar');
          if (what === 'wave') { self.avatar.wave(); Sound.play('avatar'); self.avatar.talk('هلا فيك! حيّاك في عالمنا.', self.bubble, self.sr); }
          if (what === 'talk') { Sound.play('avatar'); self.avatar.talk(LINES.talk, self.bubble, self.sr); }
          if (what === 'card') {
            var card = $('#avatarCard'), open = card.hidden;
            card.hidden = !open; b.setAttribute('aria-expanded', String(open)); Sound.play('select');
          }
        });
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            self.avatar.visible = en.isIntersecting;
            if (en.isIntersecting && en.intersectionRatio > 0.45 && !self.greeted && !Intro.active) {
              self.greeted = true;
              self.avatar.wave();
              self.avatar.talk(LINES.greet, self.bubble, self.sr);
              Sound.play('avatar');
            }
          });
        }, { threshold: [0, 0.5] }).observe($('#guide'));
      }
      return this;
    }
  };

  var Dock = {
    init: function () {
      this.el = $('#dock'); this.avatar = new Avatar($('#avatarDock'), {}); this.bubble = $('#dockBubble'); this.sr = $('#dockSay');
      this.unlocked = false; avatars.push(this.avatar);
      var self = this;
      $('#dockClose').addEventListener('click', function () {
        Settings.guide = false; store.set('guide', false); $('#setGuide').checked = false; self.update();
        $('#settingsBtn').focus();
      });
      $('#avatarDock').addEventListener('click', function () { self.avatar.react(); });
      // The dock only appears once the visitor has scrolled past the main guide,
      // and hides again whenever the main avatar is on screen (never two at once).
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { self.unlocked = !en.isIntersecting && en.boundingClientRect.top < 0; self.update(); });
        }).observe($('#guide'));
      }
      return this;
    },
    update: function () {
      var show = Settings.guide && this.unlocked && !Outro.isOpen;
      this.el.hidden = !show;
      this.avatar.visible = show;
    },
    say: function (text) {
      if (!Settings.guide || !this.unlocked) return;
      // phones: the bubble would cover content, so the guide only reacts visually
      if (window.innerWidth < 700) { this.avatar.react(); this.sr.textContent = text; return; }
      this.update();
      this.avatar.react();
      this.avatar.talk(text, this.bubble, this.sr, 4200);
    }
  };

  /* ------------------------------------------------------------------ *
   * 05 · About — scroll-triggered reveals
   * ------------------------------------------------------------------ */
  function startReveals() {
    var items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.2 });
    items.forEach(function (i) { io.observe(i); });
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 06 · Game universe — data, cards, detail, isolated effects
   * Add a game: push an object to GAMES (see README › Adding a game).
   * ------------------------------------------------------------------ */
  var GAMES = [
    {
      id: 'curse-of-os', title: 'لعنة أوس', titleEn: 'CURSE OF OS',
      genre: 'رعب نفسي · هجين', tags: ['horror', 'teams'], effect: 'horror',
      art: 'assets/games/curse-of-os.svg',
      status: 'قيد التطوير', statusKind: 'status',
      premise: 'رعب نفسي تعيشه بجوالك وفي المكان بنفس اللحظة — وكل قرار تاخذه يغيّر اللي بعده.',
      gameplay: 'جولات حيّة بعدّاد، وفي كل جولة تختار باب واحد… والباب الثاني ينقفل للأبد.',
      audience: 'جيل زد — أفراد وشِلل وفرق',
      draft: true, caption: 'الباب الثاني ينقفل للأبد.', line: 'لعنة أوس… فكّر زين قبل تختار الباب.'
    },
    {
      id: 'choice-room', title: 'غرفة الاختيار', titleEn: 'THE CHOICE ROOM',
      genre: 'قرارات · فرق', tags: ['teams'], effect: 'strategy',
      art: 'assets/games/choice-room.svg',
      status: 'قيد التطوير', statusKind: 'status',
      premise: 'غرفة واحدة، فريق واحد، وقرارات لازم تتفقون عليها قبل ما يخلص الوقت.',
      gameplay: 'كل فريق يبني طريقه خطوة بخطوة؛ كل اختيار يفتح مسار ويقفل غيره.',
      audience: 'فرق العمل والفعاليات الجماعية',
      draft: true, caption: 'اختاروا مع بعض.', line: 'غرفة الاختيار؟ هنا الفريق كله يقرّر.'
    },
    {
      id: 'last-standing', title: 'آخر من يصمد', titleEn: 'LAST ONE STANDING',
      genre: 'تحدي · جماعي', tags: ['group'], effect: 'sports',
      art: 'assets/games/last-standing.svg',
      status: 'قيد التطوير', statusKind: 'status',
      premise: 'تحدي جماعي بمراحل تتصاعد — واللي يصمد للآخر يفوز.',
      gameplay: 'مراحل أسبوعية على الجوال وفي المكان، والصعوبة تزيد مع كل مرحلة.',
      audience: 'جمهور الفعاليات الكبيرة',
      draft: true, caption: 'STAGE 3/5', line: 'آخر من يصمد… خلك آخر واحد واقف.'
    },
    {
      id: 'asia-journey', title: 'مشوار آسيا', titleEn: 'THE ASIA RUN',
      genre: 'كورة · جولات', tags: ['sports'], effect: 'adventure',
      art: 'assets/games/asia-journey.svg',
      status: 'قريباً', statusKind: 'soon',
      premise: 'مشوار كروي بالجولات تمشيه مع شلّتك، جولة بعد جولة.',
      gameplay: 'جولات مرتبطة بأيام المباريات، وتقدّم تبنيه خطوة بخطوة.',
      audience: 'جمهور الكورة من جيل زد',
      draft: true, caption: 'جولة بعد جولة →', line: 'مشوار آسيا قريب. جهّز شلّتك.'
    }
  ];
  UX.games = GAMES;

  // Isolated effect templates. mount(stage, game) must return a cleanup function.
  var EFFECTS = {
    horror: {
      sound: 'horror',
      mount: function (stage, game) {
        var dark = layer(stage, 'fx-dark'); caption(stage, game.caption);
        var raf = null, auto = true;
        stage.classList.add('is-auto');
        function move(e) {
          if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            var r = stage.getBoundingClientRect();
            dark.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
            dark.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
            if (auto) { auto = false; stage.classList.remove('is-auto'); }
          });
        }
        stage.addEventListener('pointermove', move);
        return function () { stage.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
      }
    },
    mystery: {
      sound: 'mystery',
      mount: function (stage, game) {
        layer(stage, 'fx-scan');
        ['#01 بصمة', '#02 مفتاح', '#03 رسالة'].forEach(function (t, i) {
          var c = document.createElement('span'); c.className = 'fx-clue'; c.textContent = t;
          c.style.cssText = 'top:' + (14 + i * 22) + '%;inset-inline-start:' + (10 + i * 18) + '%;--d:' + (300 + i * 450) + 'ms';
          stage.appendChild(c);
        });
        caption(stage, game.caption);
        return function () {};
      }
    },
    strategy: {
      sound: 'strategy',
      mount: function (stage, game) {
        var pts = [[10, 50], [25, 25], [25, 75], [45, 40], [45, 62], [62, 28], [62, 52], [62, 76], [80, 40], [80, 64], [92, 50]];
        var links = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [3, 6], [4, 6], [4, 7], [6, 8], [6, 9], [8, 10]];
        var svg = '<svg class="fx-net" viewBox="0 0 100 100" preserveAspectRatio="none" shape-rendering="crispEdges">';
        links.forEach(function (l, i) {
          var a = pts[l[0]], b = pts[l[1]];
          svg += '<line class="fx-link" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" style="--d:' + (500 + i * 140) + 'ms"/>';
        });
        pts.forEach(function (p, i) {
          svg += '<rect class="fx-node' + (i === 10 || i === 6 || i === 3 ? ' fx-node--pick' : '') + '" x="' + (p[0] - 2) + '" y="' + (p[1] - 3) + '" width="4" height="6" style="--d:' + (i * 50) + 'ms"/>';
        });
        var l = layer(stage, 'fx-netwrap'); l.innerHTML = svg + '</svg>';
        caption(stage, game.caption);
        return function () {};
      }
    },
    sports: {
      sound: 'sports',
      mount: function (stage, game) {
        layer(stage, 'fx-speed');
        var t = layer(stage, 'fx-type'); t.innerHTML = '<span>' + game.caption + '</span><span>' + game.caption + '</span><span>' + game.caption + '</span>';
        var bars = layer(stage, 'fx-bars');
        bars.innerHTML = '<i style="--w:78%"></i><i style="--w:54%"></i><i style="--w:31%"></i>';
        return function () {};
      }
    },
    adventure: {
      sound: 'adventure',
      mount: function (stage, game) {
        var far = layer(stage, 'fx-depth fx-depth--far'), mid = layer(stage, 'fx-depth fx-depth--mid');
        layer(stage, 'fx-depth fx-depth--near');
        var a = document.createElement('span'); a.className = 'fx-arrow'; a.textContent = '←'; a.setAttribute('aria-hidden', 'true'); stage.appendChild(a);
        caption(stage, game.caption);
        var raf = null;
        function move(e) {
          if (raf || reduced()) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5;
            far.style.transform = 'translateX(' + (x * -6).toFixed(1) + 'px)';
            mid.style.transform = 'translateX(' + (x * -16).toFixed(1) + 'px)';
          });
        }
        stage.addEventListener('pointermove', move);
        return function () { stage.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
      }
    }
  };
  UX.effects = EFFECTS;

  function layer(stage, cls) { var d = document.createElement('div'); d.className = 'fx-layer ' + cls; stage.appendChild(d); return d; }
  function caption(stage, text) { var p = document.createElement('p'); p.className = 'fx-caption'; p.textContent = text; stage.appendChild(p); return p; }

  var Games = {
    current: -1, cleanup: null, saved: null,
    init: function () {
      this.grid = $('#gameGrid'); this.detail = $('#gameDetail'); this.stage = $('#fxStage');
      this.render();
      var self = this;
      $$('#gameFilters .chip').forEach(function (chip) {
        chip.addEventListener('click', function () { self.filter(chip.getAttribute('data-filter')); Sound.play('blip'); });
      });
      $('#gdBack').addEventListener('click', function () { self.close(); });
      $('#gdPrev').addEventListener('click', function () { self.step(-1); });
      $('#gdNext').addEventListener('click', function () { self.step(1); });
      $('#gdCta').addEventListener('click', function (e) {
        e.preventDefault();
        var g = GAMES[self.current];
        Contact.open('project', 'مهتم بتجربة «' + g.title + '» لفعاليتنا.');
      });
      this.detail.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); self.close(); } });
      // touch swipe between games (RTL: swipe left = next)
      var sx = null, sy = null;
      this.detail.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      this.detail.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) self.step(dx < 0 ? 1 : -1);
        sx = sy = null;
      }, { passive: true });
      return this;
    },
    render: function () {
      var html = '';
      GAMES.forEach(function (g, i) {
        html += '<li class="game-card game-card--' + g.effect + '" data-tags="' + g.tags.join(' ') + '" data-id="' + g.id + '">' +
          '<button type="button" class="game-card__btn" data-index="' + i + '" aria-describedby="gc-' + g.id + '">' +
          '<span class="game-card__art"><img src="' + g.art + '" alt="" loading="lazy" width="320" height="200"></span>' +
          '<span class="game-card__body">' +
          '<span class="label" lang="en" dir="ltr">' + g.titleEn + '</span>' +
          '<span class="game-card__title">' + g.title + '</span>' +
          '<span class="game-card__genre">' + g.genre + '</span>' +
          '<span class="game-card__premise" id="gc-' + g.id + '">' + g.premise + '</span>' +
          '<span class="game-card__foot">' +
          '<span class="badge badge--' + g.statusKind + '">' + g.status + '</span>' +
          (g.draft ? '<span class="badge badge--draft">وصف مسودة</span>' : '') +
          '<span class="game-card__open" aria-hidden="true">افتح الملف ←</span>' +
          '</span></span></button></li>';
      });
      this.grid.innerHTML = html;
      var self = this;
      $$('.game-card__btn', this.grid).forEach(function (b) {
        b.addEventListener('click', function () { self.open(+b.getAttribute('data-index')); });
      });
    },
    filter: function (tag) {
      $$('#gameFilters .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === tag)); });
      $$('.game-card', this.grid).forEach(function (card) {
        card.hidden = tag !== 'all' && card.getAttribute('data-tags').split(' ').indexOf(tag) < 0;
      });
    },
    open: function (i) {
      var g = GAMES[i]; if (!g) return;
      if (this.current < 0) this.saved = { y: window.scrollY, id: g.id };
      this.current = i;
      this.grid.hidden = true; $('#gameFilters').hidden = true;
      this.detail.hidden = false;
      this.detail.classList.remove('is-entering'); void this.detail.offsetWidth; this.detail.classList.add('is-entering');
      $('#gdGenre').textContent = g.titleEn + ' · ' + g.genre;
      $('#gdTitle').textContent = g.title;
      $('#gdPremise').textContent = g.premise;
      $('#gdIndex').textContent = (i + 1) + '/' + GAMES.length;
      var facts = [['التصنيف', g.genre], ['طريقة اللعب', g.gameplay], ['الفئة المستهدفة', g.audience], ['الحالة', g.status]];
      if (g.draft) facts.push(['ملاحظة', 'وصف مبدئي — بانتظار اعتماد فريق يوزرز إكس.']);
      $('#gdFacts').innerHTML = facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>'; }).join('');
      this.mountEffect(g);
      Sound.play(EFFECTS[g.effect] ? EFFECTS[g.effect].sound : 'select');
      Dock.say(g.line);
      scrollToEl(this.detail, $('#gdTitle'));
      UX.openGame = g.id;
    },
    mountEffect: function (g) {
      this.unmountEffect();
      var stage = this.stage;
      stage.className = 'fx-stage fx--' + g.effect;
      stage.innerHTML = '<img class="fx-art" src="' + g.art + '" alt="">';
      var fx = EFFECTS[g.effect];
      try {
        if (!fx) throw new Error('no effect "' + g.effect + '"');
        this.cleanup = fx.mount(stage, g) || null;
        UX.activeEffect = g.effect;
      } catch (err) {
        console.warn('[USERS-X] effect failed, showing static art:', err);
        stage.className = 'fx-stage fx-fallback';
        UX.activeEffect = 'fallback';
      }
    },
    unmountEffect: function () {
      if (this.cleanup) { try { this.cleanup(); } catch (e) { console.warn(e); } }
      this.cleanup = null;
      this.stage.innerHTML = '';
      UX.activeEffect = null;
    },
    step: function (d) { this.open((this.current + d + GAMES.length) % GAMES.length); },
    close: function () {
      if (this.current < 0) return;
      this.unmountEffect();
      this.detail.hidden = true; this.grid.hidden = false; $('#gameFilters').hidden = false;
      this.current = -1; UX.openGame = null;
      Sound.play('back');
      var saved = this.saved || {};
      window.scrollTo({ top: saved.y || 0, behavior: 'instant' });
      var card = saved.id && $('.game-card[data-id="' + saved.id + '"] .game-card__btn');
      if (card) card.focus({ preventScroll: true });
    }
  };
  UX.gamesCtl = Games;

  /* ------------------------------------------------------------------ *
   * 07 · Why — each statement lights up as it enters the viewport
   * ------------------------------------------------------------------ */
  function startWhy() {
    var items = $$('#whyList .why__item'), lv = $('#whyLv'), bar = $('#whyBar');
    function update() {
      var on = items.filter(function (i) { return i.classList.contains('is-on'); }).length;
      lv.textContent = String(on).padStart(2, '0');
      bar.style.width = (on / items.length * 100) + '%';
    }
    if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('is-on'); }); update(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !en.target.classList.contains('is-on')) { en.target.classList.add('is-on'); Sound.play('blip'); update(); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0.6 });
    items.forEach(function (i) { io.observe(i); });
    update();
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 08 · Contact — portal + honest form (mailto only if an inbox is configured)
   * ------------------------------------------------------------------ */
  var TYPE_LABEL = { project: 'عندي مشروع', partnership: 'شراكة', idea: 'عندي فكرة' };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var Contact = {
    lastMailto: null, opened: 0,
    init: function () {
      var self = this;
      this.form = $('#contactForm'); this.portal = $('#portal'); this.status = $('#formStatus');
      this.hasInbox = EMAIL_RE.test(CONFIG.contact.email);
      $('#formModeNote').textContent = this.hasInbox
        ? 'زر «جهّز الرسالة» يفتح برنامج البريد عندك برسالة جاهزة. الإرسال يصير من بريدك أنت.'
        : 'بريد الاستقبال الرسمي ما انضاف للموقع للحين — بنجهّز لك نص الرسالة تنسخه وترسله.';
      $$('.contact-options .option').forEach(function (b) {
        b.addEventListener('click', function () { self.open(b.getAttribute('data-type')); });
      });
      $$('[data-contact-type]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); if ($('#play').open) $('#play').close(); self.open(a.getAttribute('data-contact-type')); });
      });
      $('#fCancel').addEventListener('click', function () { self.close(); });
      this.form.addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
      $('#copyBtn').addEventListener('click', function () { self.copy(); });
      ['fName', 'fEmail', 'fMsg'].forEach(function (id) { $('#' + id).addEventListener('input', function () { self.clearError(id); }); });
      this.renderDirect();
      return this;
    },
    renderDirect: function () {
      var p = $('#directEmail'), ul = $('#socials');
      if (this.hasInbox) {
        p.innerHTML = '';
        var a = document.createElement('a'); a.href = 'mailto:' + CONFIG.contact.email; a.textContent = CONFIG.contact.email; a.dir = 'ltr'; p.appendChild(a);
      } else {
        p.innerHTML = '<span class="placeholder">[بريد يوزرز إكس الرسمي — يُضاف بعد الاعتماد]</span>';
      }
      if (CONFIG.social.length) {
        ul.innerHTML = '';
        CONFIG.social.forEach(function (s) {
          var li = document.createElement('li'), a = document.createElement('a');
          a.href = s.url; a.textContent = s.label; a.className = 'btn btn--ghost btn--sm'; a.rel = 'noopener'; a.target = '_blank';
          li.appendChild(a); ul.appendChild(li);
        });
      } else {
        ul.innerHTML = '<li><span class="placeholder">[حسابات التواصل الرسمية — تُضاف بعد الاعتماد]</span></li>';
      }
    },
    open: function (type, message) {
      type = TYPE_LABEL[type] ? type : 'project';
      this.opened++;
      $$('.contact-options .option').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-type') === type)); });
      $('#fType').value = type;
      if (message && !$('#fMsg').value) $('#fMsg').value = message;
      this.form.hidden = false;
      this.portal.setAttribute('data-state', 'open');
      Sound.play('portal');
      Dock.say(LINES.contact);
      scrollToEl($('#contact'));
      var name = $('#fName');
      setTimeout(function () { name.focus({ preventScroll: true }); }, reduced() ? 0 : 350);
      UX.contactOpen = type;
    },
    close: function () {
      this.form.hidden = true; this.portal.setAttribute('data-state', 'idle');
      $$('.contact-options .option').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      Sound.play('back');
      $('.contact-options .option').focus();
    },
    setError: function (id, msg) {
      var input = $('#' + id), err = $('#e' + id.slice(1));
      input.setAttribute('aria-invalid', 'true'); err.textContent = msg;
    },
    clearError: function (id) { $('#' + id).removeAttribute('aria-invalid'); $('#e' + id.slice(1)).textContent = ''; },
    submit: function () {
      var name = $('#fName').value.trim(), email = $('#fEmail').value.trim(), msg = $('#fMsg').value.trim();
      var org = $('#fOrg').value.trim(), type = $('#fType').value, bad = [];
      ['fName', 'fEmail', 'fMsg'].forEach(this.clearError);
      if (!name) { this.setError('fName', 'اكتب اسمك.'); bad.push('fName'); }
      if (!EMAIL_RE.test(email)) { this.setError('fEmail', 'اكتب بريد صحيح عشان نقدر نرد عليك.'); bad.push('fEmail'); }
      if (msg.length < 10) { this.setError('fMsg', 'اكتب لنا سطرين على الأقل (١٠ أحرف).'); bad.push('fMsg'); }
      this.status.className = 'form-status';
      if (bad.length) {
        this.status.textContent = 'فيه حقول تحتاج تعديل.'; this.status.classList.add('is-warn');
        $('#' + bad[0]).focus();
        return false;
      }
      var subject = '[USERS-X] ' + TYPE_LABEL[type] + ' — ' + name;
      var body = 'النوع: ' + TYPE_LABEL[type] + '\nالاسم: ' + name + '\nالبريد: ' + email + (org ? '\nالجهة: ' + org : '') + '\n\n' + msg;
      $('#composedText').value = 'الموضوع: ' + subject + '\n\n' + body;
      $('#composed').hidden = false;
      var link = $('#mailtoLink');
      if (this.hasInbox) {
        var href = 'mailto:' + CONFIG.contact.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        this.lastMailto = href;
        link.href = href; link.hidden = false;
        this.status.textContent = 'جهّزنا الرسالة وبنفتح برنامج البريد عندك. الإرسال يصير منك — إذا ما انفتح، انسخ النص تحت.';
        this.status.classList.add('is-ok');
        try { window.location.href = href; } catch (e) { /* user can use the link */ }
      } else {
        link.hidden = true;
        this.status.textContent = 'رسالتك جاهزة — بس ما انرسلت. بريد الاستقبال الرسمي ما انضاف للموقع للحين، انسخ النص وأرسله عبر قنوات يوزرز إكس الرسمية.';
        this.status.classList.add('is-warn');
      }
      Sound.play('select');
      UX.lastSubmit = { mode: this.hasInbox ? 'mailto' : 'copy', subject: subject };
      return true;
    },
    copy: function () {
      var ta = $('#composedText'), status = this.status;
      function ok() { status.textContent = 'انسخت الرسالة ✓'; status.className = 'form-status is-ok'; }
      function fail() { ta.focus(); ta.select(); status.textContent = 'ما قدرنا ننسخ تلقائياً — النص محدّد، انسخه يدوياً.'; status.className = 'form-status is-warn'; }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(ta.value).then(ok, fail);
      else { try { ta.select(); document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(); } }
    }
  };
  UX.contact = Contact;

  /* ------------------------------------------------------------------ *
   * 09 · Outro — "The game has started. Your choice." (~6s, skippable, Esc closes)
   * ------------------------------------------------------------------ */
  var Outro = {
    isOpen: false, tl: new Timeline(), plays: 0, autoDone: false,
    init: function () {
      var self = this;
      this.dlg = $('#outro'); this.end = $('#end');
      this.avatar = new Avatar($('#avatarOutro'), {}); this.avatar.visible = false; avatars.push(this.avatar);
      $('#outroSkip').addEventListener('click', function () { self.skip(); });
      $('#outroClose').addEventListener('click', function () { self.close(); });
      $('#outroReplay').addEventListener('click', function () { self.open('replay'); });
      $('#replayOutro').addEventListener('click', function () { self.open('replay'); });
      this.dlg.addEventListener('cancel', function (e) { e.preventDefault(); self.close(); });
      $$('.choice', this.dlg).forEach(function (b) { b.addEventListener('click', function () { self.choose(b.getAttribute('data-choice')); }); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting && !self.autoDone && !Intro.active && !$('#play').open) { self.autoDone = true; self.open('auto'); }
          });
        }, { threshold: 0.6 }).observe($('#end-title'));
      }
      return this;
    },
    step: function (n) {
      this.dlg.setAttribute('data-step', String(n));
      UX.outroStep = n;
      $$('.outro__line', this.dlg).forEach(function (l) {
        var s = +l.getAttribute('data-step');
        l.classList.toggle('is-shown', s <= n);
        l.classList.toggle('is-past', s < n && s < 4);
      });
      if (n >= 5) {
        this.dlg.classList.add('is-choosing');
        $('.choice', this.dlg).focus();
      }
    },
    open: function (why) {
      if (this.isOpen || !this.dlg.showModal) { if (!this.dlg.showModal) this.end.classList.add('is-played'); return; }
      var self = this;
      this.isOpen = true; this.plays++;
      UX.outroReason = why;
      this.dlg.classList.remove('is-choosing');
      this.step(0);
      this.dlg.showModal();
      $('#outroSkip').focus();
      Dock.update();
      this.avatar.visible = true;
      this.avatar.look(0, 0);
      Sound.duck(0.012);
      if (reduced()) { this.step(4); this.step(5); return; }
      this.tl.cancel();
      this.tl
        .at(500, function () { Sound.play('outroPulse'); })
        .at(1000, function () { self.step(1); self.avatar.look(0, 0); })
        .at(2300, function () { self.step(2); self.avatar.blink(); })
        .at(3600, function () { self.step(3); self.avatar.talk('اللعبة بدأت.', null, null); self.avatar.set('mouth', 'open'); setTimeout(function () { self.avatar.set('mouth', 'closed'); }, 400); Sound.play('avatar'); })
        .at(4900, function () { self.step(4); Sound.play('outroFinal'); })
        .at(5700, function () { self.step(5); self.avatar.wave(); });
    },
    skip: function () { this.tl.cancel(); this.step(4); this.step(5); },
    close: function (keepFocus) {
      if (!this.isOpen) return;
      this.tl.cancel();
      this.isOpen = false;
      this.avatar.visible = false;
      this.dlg.close();
      this.dlg.classList.remove('is-choosing');
      this.end.classList.add('is-played');
      Sound.duck(0.05);
      Dock.update();
      if (!keepFocus) $('#replayOutro').focus({ preventScroll: true });
    },
    choose: function (c) {
      UX.lastChoice = c;
      Sound.play('select');
      this.close(true);
      if (c === 'play') Play.open();
      else if (c === 'explore') {
        Games.close();
        scrollToEl($('#games'), $('#games-title'));
        Dock.say('اختر تجربة وادخل ملفها.');
      } else if (c === 'create') Contact.open('project');
    }
  };
  UX.outro = Outro;

  /* ------------------------------------------------------------------ *
   * Prototype: «اختر باب واحد» — 3 rounds, 10s each. Clearly labelled demo.
   * ------------------------------------------------------------------ */
  var Play = {
    round: 0, score: 0, timer: null, left: 10, busy: false,
    init: function () {
      var self = this;
      this.dlg = $('#play');
      $('#playClose').addEventListener('click', function () { self.close(); });
      this.dlg.addEventListener('cancel', function (e) { e.preventDefault(); self.close(); });
      $('#playAgain').addEventListener('click', function () { self.start(); });
      $$('.door', this.dlg).forEach(function (d) { d.addEventListener('click', function () { self.pick(d.getAttribute('data-door')); }); });
      this.dlg.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); $('.door--right', self.dlg).focus(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); $('.door--left', self.dlg).focus(); }
      });
      return this;
    },
    open: function () { this.dlg.showModal(); this.start(); },
    close: function () { this.stopTimer(); if (this.dlg.open) this.dlg.close(); UX.play = { closed: true }; $('#replayOutro').focus({ preventScroll: true }); },
    start: function () {
      this.round = 0; this.score = 0;
      $('#playEnd').hidden = true; $('#playScore').textContent = '0';
      this.next();
    },
    next: function () {
      this.round++;
      this.busy = false;
      $('#playRound').textContent = String(this.round);
      $('#playResult').textContent = '';
      $('#playPrompt').textContent = this.round === 1 ? 'الباب الثاني ينقفل للأبد.' : 'جولة ' + this.round + ' — نفس القاعدة. اختر.';
      $$('.door', this.dlg).forEach(function (d) { d.disabled = false; d.classList.remove('is-locked', 'is-picked'); });
      $('.door--right', this.dlg).focus();
      this.left = 10; this.tick();
      var self = this;
      this.stopTimer();
      this.timer = setInterval(function () { self.left--; self.tick(); if (self.left <= 0) self.pick(null); }, 1000);
      UX.play = { round: this.round, score: this.score };
    },
    tick: function () {
      var t = $('#playTimer'); t.textContent = '00:' + String(Math.max(0, this.left)).padStart(2, '0');
      t.classList.toggle('is-low', this.left <= 3);
    },
    stopTimer: function () { clearInterval(this.timer); this.timer = null; },
    pick: function (door) {
      if (this.busy) return;
      this.busy = true;
      this.stopTimer();
      var safe = Math.random() < 0.5 ? 'right' : 'left', self = this;
      $$('.door', this.dlg).forEach(function (d) {
        d.disabled = true;
        if (d.getAttribute('data-door') === door) d.classList.add('is-picked'); else d.classList.add('is-locked');
      });
      var res = $('#playResult');
      if (!door) { res.textContent = 'تأخرت… الأبواب انقفلت.'; Sound.play('lose'); }
      else if (door === safe) { this.score += 10 + this.left; res.textContent = 'نجوت! +' + (10 + this.left) + ' نقطة.'; Sound.play('win'); }
      else { res.textContent = 'الباب هذا كان مقفول من الجهة الثانية.'; Sound.play('lose'); }
      $('#playScore').textContent = String(this.score);
      UX.play = { round: this.round, score: this.score, last: door };
      setTimeout(function () {
        if (!self.dlg.open) return;
        if (self.round >= 3) {
          res.textContent = 'خلصت الجولات. نقاطك: ' + self.score + '. هذي لمحة بس — التجربة الكاملة تنبني لفعاليتك.';
          $('#playEnd').hidden = false; $('#playAgain').focus();
          UX.play.done = true;
        } else self.next();
      }, reduced() ? 600 : 1400);
    }
  };
  UX.playCtl = Play;

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function boot() {
    safeStart('hud', startHud);
    safeStart('stars', startStars);
    safeStart('floors', watchFloors);
    safeStart('universe', startUniverse);
    safeStart('logo', function () { return Logo.init(); });
    safeStart('guide', function () { return Guide.init(); });
    safeStart('dock', function () { return Dock.init(); });
    safeStart('reveals', startReveals);
    safeStart('games', function () { return Games.init(); });
    safeStart('why', startWhy);
    safeStart('contact', function () { return Contact.init(); });
    safeStart('outro', function () { return Outro.init(); });
    safeStart('play', function () { return Play.init(); });
    safeStart('pointer', trackPointer);
    safeStart('intro', function () { Intro.init(); return Intro; });
    UX.ready = true;
    document.dispatchEvent(new CustomEvent('ux:ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

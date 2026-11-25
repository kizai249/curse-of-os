/*
 * USER-X · cinematic intro ("the film") — plays by itself on arrival, ~12 s, skippable.
 * Five shots, studio-title style:
 *   1 COLD OPEN  0.0–1.4 s  black, one magenta pixel (the player) beats like a heart
 *   2 SHAPES     1.4–3.4 s  four pixel arrows slam in on the beat, then a rush through a tunnel of X's
 *   3 WORLDS     3.4–6.8 s  the four game worlds as hard-cut panels with light-streak wipes, then a mosaic
 *   4 THE LINE   6.8–8.8 s  «ما تتفرّج.» «إنت» «اللعبة.» slammed word by word, RGB split
 *   5 LOGO       8.8–12.0 s the D-PAD X assembles pixel by pixel, flash, wordmark, light sweep, dissolve
 * Canvas draws light, particles and pixels; the DOM carries images and Arabic type (crisp fonts).
 * Sound is synthesised live (Web Audio). Browsers block audio before the first interaction, so the film
 * starts silent and the score joins from the current moment as soon as the visitor touches or presses a key.
 */
(function (root) {
  'use strict';

  var C = { bone: '#F4F4F1', void: '#0B0B0F', cyan: '#00DEE6', magenta: '#F54BF7', shade: '#33354C' };
  var DUR = 12000;
  var SHOT = [0, 1400, 3400, 6800, 8800, DUR];
  var PANELS = [
    { img: 'assets/games/curse-of-os-world.jpg', title: 'لعنة أوس', sub: 'CURSE OF OS', font: 'Blaka', fg: '#E9DFCF', a: '#A3121F' },
    { img: 'assets/games/choice-room-world.jpg', title: 'غرفة الاختيار', sub: 'THE CHOICE ROOM', font: 'Changa', fg: '#111114', a: '#E5283A' },
    { img: 'assets/games/last-standing-world.jpg', title: 'آخر من يصمد', sub: 'LAST ONE STANDING', font: 'Changa', fg: '#F2EDE4', a: '#FFC400' },
    { img: 'assets/games/asia-journey-world.jpg', title: 'مشوار آسيا', sub: 'FOOTBALL QUEST', font: 'Marhey', fg: '#FFFFFF', a: '#F5C542' }
  ];
  var PANEL_AT = [3400, 4100, 4800, 5500];   // each world gets a hard cut; mosaic at 6200
  var SLAMS = [1400, 1700, 2000, 2300];     // arrows
  var WORDS = [6850, 7450, 7900];            // the line

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
  function easeIn(t) { t = clamp(t, 0, 1); return t * t * t; }

  // ---------- live score ----------
  function Score(getCtx) { this.getCtx = getCtx; this.started = -1; this.nodes = []; }
  Score.prototype.cues = function () {
    return [
      [150, 'beat'], [520, 'beat'], [1050, 'beat'], [1250, 'beat'],
      [1400, 'slam'], [1700, 'slam'], [2000, 'slam'], [2300, 'slam'],
      [2500, 'riser'], [3400, 'boom'], [3400, 'whoosh'], [4100, 'whoosh'], [4800, 'whoosh'], [5500, 'whoosh'], [6200, 'stack'],
      [6850, 'hit'], [7450, 'hit'], [7900, 'hitBig'], [8500, 'reverse'],
      [8800, 'pixels'], [10000, 'logo'], [10650, 'shimmer']
    ];
  };
  // start(offsetMs): schedule every cue that is still ahead of the playhead
  Score.prototype.start = function (offsetMs) {
    var ctx = this.getCtx(); if (!ctx) return false;
    var self = this, now = ctx.currentTime;
    this.cues().forEach(function (c) { if (c[0] >= offsetMs - 40) self[c[1]](ctx, now + (c[0] - offsetMs) / 1000); });
    if (offsetMs < 8800) this.drone(ctx, now, (8800 - offsetMs) / 1000);
    return true;
  };
  Score.prototype.stop = function () { this.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* already stopped */ } }); this.nodes = []; };
  Score.prototype.out = function (ctx) { return (root.__ux && root.__ux.sound && root.__ux.sound.master) || ctx.destination; };
  Score.prototype.osc = function (ctx, t, o) {
    var s = ctx.createOscillator(), g = ctx.createGain();
    s.type = o.type || 'sine'; s.frequency.setValueAtTime(o.f, t);
    if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + o.d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.g || 0.3, t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    s.connect(g); g.connect(this.out(ctx)); s.start(t); s.stop(t + o.d + 0.05); this.nodes.push(s);
  };
  Score.prototype.noise = function (ctx, t, d, g, freq, type, rise) {
    var len = Math.ceil(ctx.sampleRate * d), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (rise ? i / len : 1 - i / len);
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
    s.buffer = buf; f.type = type || 'lowpass'; f.frequency.value = freq || 1200; gn.gain.value = g;
    s.connect(f); f.connect(gn); gn.connect(this.out(ctx)); s.start(t); this.nodes.push(s);
  };
  Score.prototype.beat = function (ctx, t) { this.osc(ctx, t, { f: 78, to: 42, d: 0.32, g: 0.55 }); };
  Score.prototype.slam = function (ctx, t) { this.osc(ctx, t, { f: 120, to: 38, d: 0.5, g: 0.7 }); this.noise(ctx, t, 0.18, 0.35, 2600, 'bandpass'); this.osc(ctx, t, { f: 880, to: 440, d: 0.12, type: 'square', g: 0.06 }); };
  Score.prototype.riser = function (ctx, t) { this.noise(ctx, t, 0.9, 0.3, 3000, 'highpass', true); this.osc(ctx, t, { f: 110, to: 880, d: 0.9, type: 'sawtooth', g: 0.05, a: 0.6 }); };
  Score.prototype.boom = function (ctx, t) { this.osc(ctx, t, { f: 60, to: 30, d: 1.2, g: 0.8 }); this.noise(ctx, t, 0.6, 0.4, 600); };
  Score.prototype.whoosh = function (ctx, t) { this.noise(ctx, t, 0.35, 0.28, 1800, 'bandpass', true); this.osc(ctx, t + 0.3, { f: 98, to: 49, d: 0.3, g: 0.45 }); };
  Score.prototype.stack = function (ctx, t) { [0, 0.09, 0.18, 0.27].forEach(function (d, i) { this.osc(ctx, t + d, { f: 220 * (i + 2), d: 0.12, type: 'square', g: 0.05 }); }, this); this.osc(ctx, t, { f: 55, to: 40, d: 0.6, g: 0.6 }); };
  Score.prototype.hit = function (ctx, t) { this.osc(ctx, t, { f: 100, to: 45, d: 0.35, g: 0.75 }); this.noise(ctx, t, 0.12, 0.4, 4000, 'highpass'); };
  Score.prototype.hitBig = function (ctx, t) { this.hit(ctx, t); this.osc(ctx, t, { f: 523, d: 0.5, type: 'triangle', g: 0.12 }); this.osc(ctx, t, { f: 784, d: 0.5, type: 'triangle', g: 0.09 }); };
  Score.prototype.reverse = function (ctx, t) { this.noise(ctx, t, 0.3, 0.4, 1500, 'lowpass', true); };
  Score.prototype.pixels = function (ctx, t) { for (var i = 0; i < 14; i++) this.osc(ctx, t + i * 0.08, { f: [523, 659, 784, 1046][i % 4] * (i < 7 ? 0.5 : 1), d: 0.06, type: 'square', g: 0.05 }); };
  Score.prototype.logo = function (ctx, t) { this.osc(ctx, t, { f: 55, to: 36, d: 1.6, g: 0.85 }); this.noise(ctx, t, 0.8, 0.35, 900); [131, 196, 262, 330, 392].forEach(function (f) { this.osc(ctx, t, { f: f, d: 2.2, type: 'triangle', g: 0.07, a: 0.04 }); }, this); };
  Score.prototype.shimmer = function (ctx, t) { this.osc(ctx, t, { f: 2093, to: 1568, d: 1.0, g: 0.08 }); };
  Score.prototype.drone = function (ctx, t, d) { this.osc(ctx, t, { f: 41, d: d, g: 0.12, a: Math.min(1.2, d / 3) }); this.osc(ctx, t, { f: 41.6, d: d, g: 0.08, a: Math.min(1.2, d / 3) }); };

  // ---------- the film ----------
  function Film(host, opts) {
    this.host = host; this.opts = opts || {};
    this.reduced = !!this.opts.reduced;
    this.raf = 0; this.t0 = 0; this.t = 0; this.done = false; this.paused = false;
    this.score = new Score(this.opts.audioCtx || function () { return null; });
    this.build();
  }
  Film.prototype.build = function () {
    var h = this.host;
    h.innerHTML = '';
    this.cv = el('canvas', 'cin__cv'); this.cv.setAttribute('aria-hidden', 'true'); h.appendChild(this.cv);
    this.g = this.cv.getContext('2d');
    var panels = el('div', 'cin__panels'); panels.setAttribute('aria-hidden', 'true');
    PANELS.forEach(function (p, i) {
      var f = el('figure', 'cin__panel');
      f.style.setProperty('--i', i); f.style.setProperty('--fg', p.fg); f.style.setProperty('--a', p.a);
      f.innerHTML = '<img src="' + p.img + '" alt="" decoding="async"><figcaption><b style="font-family:' + p.font + ',var(--f-display)">' + p.title + '</b><span lang="en" dir="ltr">' + p.sub + '</span></figcaption>';
      panels.appendChild(f);
    });
    h.appendChild(panels); this.panels = Array.prototype.slice.call(panels.children);
    this.presents = el('p', 'cin__presents', '<span lang="en" dir="ltr">USER-X</span> <small lang="en" dir="ltr">PRESENTS</small>'); this.presents.setAttribute('aria-hidden', 'true'); h.appendChild(this.presents);
    var type = el('div', 'cin__type'); type.setAttribute('aria-hidden', 'true');
    this.words = ['ما تتفرّج.', 'إنت', 'اللعبة.'].map(function (w, i) { var p = el('p', 'cin__w cin__w' + (i + 1)); p.textContent = w; p.setAttribute('data-text', w); type.appendChild(p); return p; });
    h.appendChild(type);
    this.logo = el('div', 'cin__logo');
    this.logo.innerHTML = '<img src="assets/logo/usersx-wordmark.png" width="1174" height="422" alt="يوزر إكس — USER-X"><p class="cin__tag">كل لاعب هو نقطة التقاطع</p>';
    h.appendChild(this.logo);
    this.flash = el('div', 'cin__flash'); this.flash.setAttribute('aria-hidden', 'true'); h.appendChild(this.flash);
    // pixel targets for the logo assembly
    var S = root.USERSX_SYMBOL;
    this.cells = S ? S.cells().map(function (c) { return { x: c.x, y: c.y, c: S.COLORS[c.c] || C.bone, sx: Math.random(), sy: Math.random(), d: Math.random() * 500 }; }) : [];
    this.arrowCells = this.cells.filter(function (c) { return c.c !== C.magenta; });
    // particle field (X glyphs) for the tunnel
    this.stars = [];
    for (var i = 0; i < 260; i++) this.stars.push({ a: Math.random() * Math.PI * 2, r: Math.random(), z: Math.random(), c: i % 9 === 0 ? C.magenta : (i % 7 === 0 ? C.cyan : C.bone) });
    // film grain tile
    this.grain = document.createElement('canvas'); this.grain.width = this.grain.height = 128;
    var gg = this.grain.getContext('2d'), id = gg.createImageData(128, 128);
    for (var k = 0; k < id.data.length; k += 4) { var v = Math.random() * 255; id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 22; }
    gg.putImageData(id, 0, 0);
    var self = this;
    this.onResize = function () { self.resize(); };
    window.addEventListener('resize', this.onResize);
    this.resize();
  };
  Film.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = this.host.clientWidth || window.innerWidth; this.h = this.host.clientHeight || window.innerHeight;
    this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.u = Math.min(this.w / 34, this.h / 48); // logo pixel: leaves room under the symbol for the wordmark and tagline
  };
  Film.prototype.play = function (onEnd) {
    var self = this; this.onEnd = onEnd;
    if (this.reduced) { this.t = DUR - 2600; this.host.setAttribute('data-shot', '5'); this.logo.classList.add('is-on', 'is-static'); this.drawStatic(); this.endTimer = setTimeout(function () { self.finish(); }, 2400); return; }
    this.t0 = performance.now();
    var tick = function (now) {
      if (self.done) return;
      self.t = now - self.t0;
      self.frame(self.t);
      if (self.t >= DUR) { self.finish(); return; }
      self.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };
  // audio joins late: schedule the score from the current playhead
  Film.prototype.unmute = function () { if (!this.done && !this.reduced && this.score.started < 0) { if (this.score.start(this.t)) this.score.started = this.t; } };
  Film.prototype.mute = function () { this.score.stop(); this.score.started = -1; };
  Film.prototype.finish = function () {
    if (this.done) return;
    this.done = true; cancelAnimationFrame(this.raf); clearTimeout(this.endTimer);
    window.removeEventListener('resize', this.onResize);
    if (this.onEnd) this.onEnd();
  };
  Film.prototype.destroy = function () { this.done = true; cancelAnimationFrame(this.raf); clearTimeout(this.endTimer); this.score.stop(); window.removeEventListener('resize', this.onResize); };

  Film.prototype.shot = function (t) { for (var i = SHOT.length - 2; i >= 0; i--) if (t >= SHOT[i]) return i + 1; return 1; };

  Film.prototype.frame = function (t) {
    var g = this.g, w = this.w, h = this.h, cx = w / 2, cy = h / 2, shot = this.shot(t);
    if (this.host.getAttribute('data-shot') !== String(shot)) this.host.setAttribute('data-shot', shot);
    // camera shake from the most recent impact
    var hits = SLAMS.concat(WORDS, [3400, 10000]), shake = 0;
    hits.forEach(function (k) { var d = t - k; if (d >= 0 && d < 260) shake = Math.max(shake, (1 - d / 260) * 14); });
    var sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    this.host.style.setProperty('--shake-x', sx.toFixed(1) + 'px'); this.host.style.setProperty('--shake-y', sy.toFixed(1) + 'px');
    g.save();
    g.fillStyle = C.void; g.fillRect(0, 0, w, h);
    g.translate(sx, sy);

    if (shot === 1) this.coldOpen(t, cx, cy);
    else if (shot === 2) this.shapes(t, cx, cy);
    else if (shot === 3) this.worlds(t);
    else if (shot === 4) this.line(t, cx, cy);
    else this.logoShot(t, cx, cy);
    g.restore();

    // vignette + grain + letterbox breathing
    var vg = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'screen';
    g.fillStyle = g.createPattern(this.grain, 'repeat');
    g.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0);
    g.fillRect(-128, -128, w + 256, h + 256);
    g.setTransform(this.cv.width / w, 0, 0, this.cv.height / h, 0, 0);
    g.globalCompositeOperation = 'source-over';

    // DOM states
    this.presents.classList.toggle('is-on', t > 380 && t < 1350);
    var p = -1; PANEL_AT.forEach(function (k, i) { if (t >= k) p = i; });
    var mosaic = t >= 6200 && t < 6800;
    this.panels.forEach(function (el, i) {
      el.classList.toggle('is-on', shot === 3 && (mosaic || i === p));
      el.classList.toggle('is-mosaic', mosaic);
    });
    this.words.forEach(function (el, i) { el.classList.toggle('is-on', t >= WORDS[i] && t < 8650); });
    this.logo.classList.toggle('is-on', t >= 10050);
    this.logo.classList.toggle('is-sweep', t >= 10600);
    var fl = 0; [3400, 6200, 8750, 10000].forEach(function (k) { var d = t - k; if (d >= 0 && d < 220) fl = Math.max(fl, 1 - d / 220); });
    this.flash.style.opacity = fl.toFixed(2);
    this.host.classList.toggle('is-out', t >= DUR - 600);
  };

  // 1 · one magenta pixel, heartbeat
  Film.prototype.coldOpen = function (t, cx, cy) {
    var g = this.g, beats = [150, 520, 1050, 1250], pulse = 0;
    beats.forEach(function (k) { var d = t - k; if (d >= 0 && d < 300) pulse = Math.max(pulse, 1 - d / 300); });
    var s = this.u * (1 + pulse * 0.6);
    g.fillStyle = C.magenta; g.shadowColor = C.magenta; g.shadowBlur = 30 + pulse * 60;
    g.fillRect(Math.round(cx - s / 2), Math.round(cy - s / 2), Math.round(s), Math.round(s));
    g.shadowBlur = 0;
    if (t > 1100) { g.globalAlpha = clamp((t - 1100) / 300, 0, 1) * 0.5; this.scan(t); g.globalAlpha = 1; }
  };
  Film.prototype.scan = function (t) {
    var g = this.g; g.fillStyle = 'rgba(0,222,230,.08)';
    for (var y = (t / 8) % 6; y < this.h; y += 6) g.fillRect(0, y, this.w, 1);
  };

  // 2 · arrows slam in, then a rush through a tunnel of X's
  Film.prototype.shapes = function (t, cx, cy) {
    var g = this.g, u = this.u * 1.25, self = this;
    if (t < 2550) {
      var quads = ['tl', 'tr', 'br', 'bl'];
      var from = { tl: [-1, -1], tr: [1, -1], br: [1, 1], bl: [-1, 1] };
      quads.forEach(function (q, i) {
        var k = SLAMS[i], p = ease((t - k) / 160);
        if (t < k) return;
        var f = from[q], off = (1 - p) * Math.max(self.w, self.h) * 0.7;
        g.fillStyle = C.bone;
        self.arrowCells.forEach(function (c) {
          var reg = (c.y < 7 ? 't' : 'b') + (c.x < 7 ? 'l' : 'r');
          if (reg !== q || c.x === 7 || c.y === 7) return;
          g.fillStyle = c.c;
          g.fillRect(Math.round(cx + (c.x - 7.5) * u + f[0] * off), Math.round(cy + (c.y - 7.5) * u + f[1] * off), Math.ceil(u), Math.ceil(u));
        });
      });
      g.fillStyle = C.magenta; g.fillRect(Math.round(cx - u / 2), Math.round(cy - u / 2), Math.ceil(u), Math.ceil(u));
      // impact rings
      SLAMS.forEach(function (k) { var d = t - k; if (d >= 0 && d < 400) { g.strokeStyle = 'rgba(0,222,230,' + (1 - d / 400) + ')'; g.lineWidth = 3; g.strokeRect(cx - d, cy - d, d * 2, d * 2); } });
    } else {
      // tunnel rush (2.55 → 3.4 s)
      var p2 = (t - 2550) / 850, zoom = 1 + easeIn(p2) * 40;
      this.stars.forEach(function (s) {
        var z = (s.z - p2 * 1.8) % 1; if (z < 0) z += 1;
        var r = (s.r * 0.6 + 0.05) / Math.max(z, 0.02) * Math.min(self.w, self.h) * 0.18;
        var x = cx + Math.cos(s.a) * r, y = cy + Math.sin(s.a) * r, sz = Math.max(1, (1 - z) * 7);
        g.strokeStyle = s.c; g.globalAlpha = clamp(1 - z, 0, 1); g.lineWidth = Math.max(1, sz / 3);
        g.beginPath(); g.moveTo(x - sz, y - sz); g.lineTo(x + sz, y + sz); g.moveTo(x + sz, y - sz); g.lineTo(x - sz, y + sz); g.stroke();
      });
      g.globalAlpha = 1;
      g.save(); g.translate(cx, cy); g.scale(zoom, zoom);
      this.arrowCells.concat(this.cells.filter(function (c) { return c.c === C.magenta; })).forEach(function (c) {
        g.fillStyle = c.c; g.fillRect((c.x - 7.5) * u * 0.5, (c.y - 7.5) * u * 0.5, u * 0.5 + 0.5, u * 0.5 + 0.5);
      });
      g.restore();
    }
  };

  // 3 · worlds: light-streak wipes between hard-cut panels (images live in the DOM)
  Film.prototype.worlds = function (t) {
    var g = this.g, self = this;
    PANEL_AT.concat([6200]).forEach(function (k, i) {
      var d = t - k; if (d < 0 || d > 340) return;
      var p = d / 340, x = -self.w * 0.3 + p * self.w * 1.6;
      g.save(); g.translate(x, 0); g.rotate(-0.35);
      g.fillStyle = i % 2 ? 'rgba(245,75,247,.85)' : 'rgba(0,222,230,.85)'; g.fillRect(-40, -self.h, 26, self.h * 3);
      g.fillStyle = 'rgba(244,244,241,.9)'; g.fillRect(-8, -self.h, 10, self.h * 3);
      g.restore();
    });
  };

  // 4 · the line: speed lines and RGB glitch bars on each slam
  Film.prototype.line = function (t, cx, cy) {
    var g = this.g, self = this;
    WORDS.forEach(function (k, i) {
      var d = t - k; if (d < 0 || d > 420) return;
      var a = 1 - d / 420;
      g.strokeStyle = i === 2 ? 'rgba(245,75,247,' + a + ')' : 'rgba(244,244,241,' + a * 0.6 + ')'; g.lineWidth = 2;
      for (var n = 0; n < 48; n++) {
        var ang = (n / 48) * Math.PI * 2, r1 = Math.min(self.w, self.h) * (0.22 + (d / 420) * 0.3), r2 = r1 + 60 + (n % 3) * 40;
        g.beginPath(); g.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); g.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2); g.stroke();
      }
      if (d < 160) for (var b = 0; b < 6; b++) {
        g.fillStyle = b % 2 ? 'rgba(0,222,230,.35)' : 'rgba(245,75,247,.35)';
        g.fillRect(0, Math.random() * self.h, self.w, 2 + Math.random() * 10);
      }
    });
  };

  // 5 · logo: pixels fly in and lock onto the 15×15 grid, depth, sweep, pixel dissolve
  Film.prototype.logoShot = function (t, cx, cy) {
    var g = this.g, u = this.u, ox = cx - 7.5 * u, oy = cy - 16 * u, self = this;
    var lockT = 10000, outT = DUR - 600;
    var depth = t >= lockT ? Math.min(1, (t - lockT) / 200) : 0;
    if (depth) {
      g.fillStyle = C.cyan; this.cells.forEach(function (c) { g.fillRect(ox + c.x * u + u * 0.55 * depth, oy + c.y * u + u * 0.55 * depth, Math.ceil(u), Math.ceil(u)); });
      g.fillStyle = C.magenta; this.cells.forEach(function (c) { g.fillRect(ox + c.x * u + u * 0.28 * depth, oy + c.y * u + u * 0.28 * depth, Math.ceil(u), Math.ceil(u)); });
    }
    this.cells.forEach(function (c) {
      var p = ease((t - 8800 - c.d) / 700);
      var x = ox + c.x * u, y = oy + c.y * u;
      var fx = c.sx * self.w, fy = c.sy * self.h;
      var px = fx + (x - fx) * p, py = fy + (y - fy) * p;
      if (t >= outT) { var q = (t - outT) / 600; px += (c.sx - 0.5) * q * self.w * 0.8; py += (c.sy - 0.5) * q * self.h * 0.8; g.globalAlpha = 1 - q; }
      g.fillStyle = c.c; g.fillRect(Math.round(px), Math.round(py), Math.ceil(u), Math.ceil(u));
    });
    g.globalAlpha = 1;
    if (t >= 10600 && t < 11300) { // light sweep across the symbol
      var sp = (t - 10600) / 700, sxp = ox - 2 * u + sp * 19 * u;
      var lg = g.createLinearGradient(sxp - 3 * u, 0, sxp + 3 * u, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(ox, oy, 15 * u, 15 * u); g.globalCompositeOperation = 'source-over';
    }
  };
  Film.prototype.drawStatic = function () { this.resize(); this.g.fillStyle = C.void; this.g.fillRect(0, 0, this.w, this.h); this.logoShot(11000, this.w / 2, this.h / 2); };

  root.UXCinema = { Film: Film, DURATION: DUR };
})(window);

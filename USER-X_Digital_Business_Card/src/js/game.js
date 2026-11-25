/*
 * «امسك نقطة! · Catch Nuqta» — the 12-second USER-X challenge.
 *   Nuqta pops up somewhere in the arena; tap him before he vanishes (faster tap = more points).
 *   From the 5th second he sometimes ducks to a new spot mid-way. A red glitch block costs points.
 *   A rare magenta "player square" is a +25 bonus. 3 catches in a row start a combo (+5 each).
 * Plain DOM + transforms (crisp SVG, cheap on phones). Taps use pointerdown for zero delay.
 */
(function (root) {
  'use strict';

  function Game(o) {
    this.o = o; this.arena = o.arena; this.cfg = o.cfg;
    this.running = false; this.targets = []; this.timers = [];
  }

  Game.prototype.later = function (fn, ms) { var id = setTimeout(fn, ms); this.timers.push(id); return id; };

  Game.prototype.start = function () {
    var self = this, n = this.cfg.countdownFrom, cd = this.o.countdown;
    this.stop();
    this.score = 0; this.hits = 0; this.misses = 0; this.bad = 0; this.streak = 0; this.best = 0; this.bonus = 0;
    this.o.onHud(this.score, this.cfg.durationMs, 0);
    cd.hidden = false;
    var step = function () {
      if (n > 0) { cd.textContent = String(n); cd.classList.remove('is-pop'); void cd.offsetWidth; cd.classList.add('is-pop'); self.o.sound('count'); n--; self.later(step, 650); }
      else { cd.textContent = self.o.t.go; cd.classList.remove('is-pop'); void cd.offsetWidth; cd.classList.add('is-pop'); self.o.sound('go'); self.later(function () { cd.hidden = true; self.run(); }, 420); }
    };
    step();
  };

  Game.prototype.run = function () {
    var self = this;
    this.running = true; this.t0 = performance.now();
    var loop = function (now) {
      if (!self.running) return;
      var left = Math.max(0, self.cfg.durationMs - (now - self.t0));
      self.o.onHud(self.score, left, self.streak);
      if (left <= 0) { self.finish(); return; }
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    // a safety net in case animation frames stall (hidden tab): the round still ends on time
    this.later(function () { if (self.running) self.finish(); }, this.cfg.durationMs + 400);
    this.spawn();
  };

  Game.prototype.elapsed = function () { return performance.now() - this.t0; };
  Game.prototype.progress = function () { return Math.min(1, this.elapsed() / this.cfg.durationMs); };

  Game.prototype.spawn = function () {
    if (!this.running) return;
    var p = this.progress(), r = Math.random(), type = 'nuqta';
    if (this.elapsed() > 2000 && r < 0.16) type = 'bad';
    else if (this.elapsed() > 3000 && r > 0.93) type = 'gold';
    this.place(type);
    // second target overlaps in the last third
    if (p > 0.6 && Math.random() < 0.35) this.later(this.place.bind(this, 'nuqta'), 260);
    var self = this, delay = 520 - p * 180 + Math.random() * 120;
    this.nextId = this.later(function () { self.spawn(); }, this.lifetime(type) * 0.55 + delay);
  };

  Game.prototype.lifetime = function (type) {
    var p = this.progress();
    return type === 'bad' ? 1300 : type === 'gold' ? 800 : Math.round(1300 - p * 420);
  };

  Game.prototype.spot = function (size) {
    var w = this.arena.clientWidth, h = this.arena.clientHeight, pad = 8, tries = 0, x, y;
    do {
      x = pad + Math.random() * Math.max(1, w - size - pad * 2);
      y = pad + Math.random() * Math.max(1, h - size - pad * 2);
      tries++;
    } while (tries < 12 && this.targets.some(function (t) { return Math.abs(t.x - x) < size && Math.abs(t.y - y) < size; }));
    return { x: Math.round(x), y: Math.round(y) };
  };

  Game.prototype.place = function (type) {
    if (!this.running) return;
    var self = this, size = this.size(), el = document.createElement('button'), at = this.spot(size);
    el.type = 'button'; el.className = 'tgt tgt--' + type;
    el.style.width = el.style.height = size + 'px';
    el.style.transform = 'translate(' + at.x + 'px,' + at.y + 'px)';
    el.setAttribute('aria-label', type === 'bad' ? '✕' : type === 'gold' ? '+25' : 'نقطة · Nuqta');
    if (type === 'nuqta') el.innerHTML = '<span class="tgt__art">' + (root.USERSX_AVATAR ? root.USERSX_AVATAR.svg({ still: true }) : '') + '</span>';
    else el.innerHTML = '<span class="tgt__art" aria-hidden="true"></span>';
    var t = { el: el, type: type, born: performance.now(), life: this.lifetime(type), x: at.x, y: at.y, done: false };
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); self.tap(t, e); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.tap(t, null); } });
    this.arena.appendChild(el); this.targets.push(t);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    // the dodge: from the 5th second, sometimes Nuqta hops to a new spot half-way through
    if (type === 'nuqta' && this.elapsed() > 5000 && Math.random() < 0.3) {
      t.dodgeId = this.later(function () {
        if (t.done || !self.running) return;
        var n = self.spot(size); t.x = n.x; t.y = n.y; t.born = performance.now() - t.life * 0.3;
        el.classList.add('is-hop'); el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
        self.o.bubble(el, self.o.t.nuqtaTaunts[2]);
      }, t.life * 0.45);
    }
    t.expireId = this.later(function () { self.expire(t); }, t.life);
  };

  Game.prototype.size = function () { var m = Math.min(this.arena.clientWidth, this.arena.clientHeight); return Math.round(Math.max(64, Math.min(96, m / 4.6))); };

  Game.prototype.tap = function (t, e) {
    if (t.done || !this.running) return;
    t.done = true; clearTimeout(t.expireId); clearTimeout(t.dodgeId);
    var cx = t.x + t.el.offsetWidth / 2, cy = t.y + t.el.offsetHeight / 2, pts;
    if (t.type === 'bad') {
      pts = -15; this.bad++; this.streak = 0;
      this.o.sound('bad'); this.o.shake();
      this.o.float(cx, cy, '−15', 'is-bad');
    } else {
      var react = performance.now() - t.born;
      pts = t.type === 'gold' ? 25 : 10 + Math.max(0, Math.round(10 * (1 - react / t.life)));
      this.hits++; this.streak++; this.best = Math.max(this.best, this.streak);
      if (this.streak >= 3) { pts += 5; this.bonus++; }
      this.o.sound(t.type === 'gold' ? 'bonus' : 'hit');
      this.o.float(cx, cy, '+' + pts + (this.streak >= 3 ? ' ×' + this.streak : ''), t.type === 'gold' ? 'is-gold' : '');
      this.o.burst(cx, cy, t.type === 'gold');
    }
    this.score = Math.max(0, this.score + pts);
    this.remove(t, 'is-hit');
  };

  Game.prototype.expire = function (t) {
    if (t.done) return;
    t.done = true;
    if (t.type === 'nuqta' && this.running) {
      this.misses++; this.streak = 0; this.o.sound('miss');
      this.o.bubble(t.el, this.o.t.nuqtaTaunts[Math.floor(Math.random() * 2)]);
    }
    this.remove(t, 'is-out');
  };

  Game.prototype.remove = function (t, cls) {
    t.el.classList.add(cls); t.el.disabled = true;
    setTimeout(function () { t.el.remove(); }, 260);
    this.targets = this.targets.filter(function (x) { return x !== t; });
  };

  Game.prototype.finish = function () {
    if (!this.running) return;
    this.running = false; cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout); this.timers = [];
    var self = this;
    this.targets.slice().forEach(function (t) { t.done = true; self.remove(t, 'is-out'); });
    this.o.onHud(this.score, 0, 0);
    this.o.onEnd({ score: this.score, hits: this.hits, misses: this.misses, bad: this.bad, bestStreak: this.best });
  };

  // stop without results (quit / leaving the scene)
  Game.prototype.stop = function () {
    this.running = false; cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout); this.timers = [];
    this.targets.forEach(function (t) { t.done = true; });
    this.targets = [];
    // also the ones still fading out, so leaving the game never leaves a ghost behind
    Array.prototype.forEach.call(this.arena.querySelectorAll('.tgt, .float, .taunt, .px'), function (el) { el.remove(); });
    if (this.o.countdown) this.o.countdown.hidden = true;
  };

  root.CardGame = Game;
})(window);

/*
 * Background field + pixel bursts. Light on purpose: ~40 squares on a 1x canvas,
 * paused when the tab is hidden, frozen (one static frame) with reduced motion.
 */
(function (root) {
  'use strict';
  var COLORS = ['#00DEE6', '#F54BF7', '#F4F4F1', '#33354C'];
  var FX = {
    cv: null, g: null, dots: [], raf: 0, still: false, boost: 0,
    init: function (canvas, still) {
      this.cv = canvas; this.g = canvas.getContext('2d'); this.still = still;
      if (!this.g) return;
      var self = this;
      for (var i = 0; i < 42; i++) this.dots.push({ x: Math.random(), y: Math.random(), s: 2 + Math.floor(Math.random() * 3) * 2, v: 0.00012 + Math.random() * 0.0004, c: COLORS[i % 4], a: 0.15 + Math.random() * 0.45 });
      this.resize();
      root.addEventListener('resize', function () { self.resize(); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) cancelAnimationFrame(self.raf); else self.start(); });
      this.start();
    },
    resize: function () { if (!this.cv) return; this.cv.width = innerWidth; this.cv.height = innerHeight; this.draw(0); },
    setStill: function (s) { this.still = s; this.start(); },
    start: function () {
      cancelAnimationFrame(this.raf);
      if (!this.g) return;
      if (this.still) { this.draw(0); return; }
      var self = this, last = performance.now();
      var tick = function (now) { var dt = Math.min(50, now - last); last = now; self.draw(dt); self.raf = requestAnimationFrame(tick); };
      this.raf = requestAnimationFrame(tick);
    },
    draw: function (dt) {
      var g = this.g, w = this.cv.width, h = this.cv.height, k = 1 + this.boost;
      this.boost = Math.max(0, this.boost - dt / 600);
      g.clearRect(0, 0, w, h);
      for (var i = 0; i < this.dots.length; i++) {
        var d = this.dots[i];
        d.y -= d.v * dt * k; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        g.globalAlpha = d.a; g.fillStyle = d.c;
        g.fillRect(Math.round(d.x * w), Math.round(d.y * h), d.s, d.s);
      }
      g.globalAlpha = 1;
    },
    // short speed-up of the field (scene changes)
    rush: function () { this.boost = 6; },
    // DOM pixel burst at a point inside a container
    burst: function (host, x, y, n, colors) {
      if (this.still) return;
      colors = colors || COLORS;
      for (var i = 0; i < (n || 12); i++) {
        var p = document.createElement('i'); p.className = 'px';
        var ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 60;
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        p.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        p.style.background = colors[i % colors.length];
        host.appendChild(p);
        setTimeout(function (el) { el.remove(); }, 650, p);
      }
    }
  };
  root.CardFX = FX;
})(window);

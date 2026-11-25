/*
 * Card sounds — original, synthesised live with Web Audio (no files, no licences needed).
 * Off by default; only starts from a tap on the sound button. To use recorded sounds instead,
 * add files and map them in CardAudio.files (name -> URL); they take priority over the synth.
 */
(function (root) {
  'use strict';
  var A = {
    ctx: null, master: null, on: false, volume: 0.7, files: {}, buffers: {},
    ensure: function () {
      if (this.ctx) return this.ctx;
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
      try {
        this.ctx = new AC(); this.master = this.ctx.createGain();
        this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },
    setOn: function (on) {
      this.on = !!on;
      if (on) { var c = this.ensure(); if (c && c.state === 'suspended') c.resume().catch(function () {}); this.loadFiles(); }
    },
    setVolume: function (v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); },
    loadFiles: function () {
      var self = this;
      Object.keys(this.files).forEach(function (k) {
        if (self.buffers[k] !== undefined) return; self.buffers[k] = null;
        fetch(self.files[k]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(function (b) { return self.ctx.decodeAudioData(b); })
          .then(function (buf) { self.buffers[k] = buf; })
          .catch(function () { /* missing file: the synth plays instead */ });
      });
    },
    tone: function (t, f, d, o) {
      o = o || {};
      var c = this.ctx, s = c.createOscillator(), g = c.createGain();
      s.type = o.type || 'square'; s.frequency.setValueAtTime(f, t);
      if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.g || 0.18, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(g); g.connect(this.master); s.start(t); s.stop(t + d + 0.03);
    },
    noise: function (t, d, g, f) {
      var c = this.ctx, n = Math.ceil(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
      for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = c.createBufferSource(), fl = c.createBiquadFilter(), gn = c.createGain();
      s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = f || 1800; gn.gain.value = g || 0.2;
      s.connect(fl); fl.connect(gn); gn.connect(this.master); s.start(t);
    },
    play: function (name) {
      if (!this.on || !this.ensure()) return;
      var c = this.ctx, t = c.currentTime + 0.01, self = this;
      if (this.buffers[name]) { var src = c.createBufferSource(); src.buffer = this.buffers[name]; src.connect(this.master); src.start(t); return; }
      try {
        switch (name) {
          case 'boot': [262, 392, 523, 784].forEach(function (f, i) { self.tone(t + i * 0.07, f, 0.16, { g: 0.12 }); }); self.tone(t + 0.3, 1046, 0.5, { type: 'triangle', g: 0.1 }); break;
          case 'ui': this.tone(t, 880, 0.05, { g: 0.08 }); break;
          case 'flip': this.noise(t, 0.18, 0.15, 2400); this.tone(t, 660, 0.12, { to: 990, type: 'triangle', g: 0.1 }); break;
          case 'count': this.tone(t, 523, 0.14, { g: 0.14 }); break;
          case 'go': this.tone(t, 784, 0.12, { g: 0.16 }); this.tone(t + 0.1, 1046, 0.25, { g: 0.16 }); break;
          case 'hit': this.tone(t, 988, 0.07, { g: 0.14 }); this.tone(t + 0.05, 1318, 0.09, { g: 0.12 }); break;
          case 'bonus': [1046, 1318, 1568, 2093].forEach(function (f, i) { self.tone(t + i * 0.05, f, 0.08, { g: 0.1 }); }); break;
          case 'miss': this.tone(t, 330, 0.18, { to: 196, g: 0.1, type: 'sawtooth' }); break;
          case 'bad': this.noise(t, 0.25, 0.3, 600); this.tone(t, 140, 0.25, { to: 70, g: 0.2, type: 'sawtooth' }); break;
          case 'end': [784, 659, 523].forEach(function (f, i) { self.tone(t + i * 0.12, f, 0.2, { type: 'triangle', g: 0.14 }); }); break;
          case 'win': [523, 659, 784, 1046, 1318].forEach(function (f, i) { self.tone(t + i * 0.08, f, 0.22, { type: 'triangle', g: 0.13 }); }); break;
          case 'secret': [392, 494, 587, 784, 988, 1175].forEach(function (f, i) { self.tone(t + i * 0.06, f, 0.12, { g: 0.1 }); }); this.noise(t + 0.4, 0.4, 0.12, 4000); break;
        }
      } catch (e) { /* audio is optional — never break the card */ }
    }
  };
  root.CardAudio = A;
})(window);

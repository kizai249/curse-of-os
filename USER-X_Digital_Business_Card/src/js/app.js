/*
 * USER-X digital business card — scenes, card, contact, QR, secret level, analytics.
 *   boot → card → game → result → contact   (every scene reachable from the card; nothing forced)
 */
(function () {
  'use strict';
  var cfg = window.CARD_CONFIG, I18N = window.CARD_I18N, Audio = window.CardAudio, FX = window.CardFX;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k, f) { try { var v = localStorage.getItem('card.' + k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem('card.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var App = window.__card = { events: [], errors: [], scene: 'boot' };

  /* ---------------- analytics (anonymous, optional) ---------------- */
  function track(event, props) {
    var row = { event: event, props: props || {}, lang: App.lang, ts: Date.now() };
    App.events.push(row);
    var ep = cfg.analytics && cfg.analytics.endpoint;
    if (!ep) return;
    try {
      var body = JSON.stringify(row);
      if (navigator.sendBeacon) navigator.sendBeacon(ep, new Blob([body], { type: 'application/json' }));
      else fetch(ep, { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
    } catch (e) { /* analytics never breaks the card */ }
  }

  /* ---------------- motion preference ---------------- */
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function calm() { return !!(store.get('calm', false) || (mq && mq.matches)); }
  function applyCalm() { document.documentElement.classList.toggle('calm', calm()); if (FX.cv) FX.setStill(calm()); }

  /* ---------------- language ---------------- */
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o && o[k]; }, obj); }
  function initialLang() {
    var q = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
    if (q === 'ar' || q === 'en') return q;
    return store.get('lang', cfg.defaultLang === 'en' ? 'en' : 'ar');
  }
  function setLang(lang, user) {
    App.lang = lang; var t = App.t = I18N[lang];
    var html = document.documentElement; html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = (lang === 'ar' ? cfg.person.nameAr : cfg.person.nameEn) + ' · ' + cfg.company.name;
    $$('[data-i18n]').forEach(function (el) { var v = t[el.getAttribute('data-i18n')]; if (typeof v === 'string') el.textContent = v; });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t[el.getAttribute('data-i18n-aria')] || ''); });
    $$('[data-cfg]').forEach(function (el) { el.textContent = get(cfg, el.getAttribute('data-cfg')) || ''; });
    $$('[data-cfg-i18n]').forEach(function (el) { el.textContent = get(cfg, el.getAttribute('data-cfg-i18n') + (lang === 'ar' ? 'Ar' : 'En')) || ''; });
    var lb = $('#langBtn'); lb.textContent = lang === 'ar' ? 'EN' : 'ع'; lb.setAttribute('aria-label', t.langLabel); lb.lang = lang === 'ar' ? 'en' : 'ar';
    syncSound(); fillContact(); showBest();
    if (App.lastResult) renderResult(App.lastResult, true);
    if (user) { store.set('lang', lang); track('language_changed', { to: lang }); }
  }

  /* ---------------- sound ---------------- */
  function syncSound() {
    var b = $('#soundBtn'); if (!b || !App.t) return;
    b.setAttribute('aria-pressed', String(Audio.on)); b.setAttribute('aria-label', Audio.on ? App.t.soundOn : App.t.soundOff);
  }
  function sfx(n) { Audio.play(n); }

  /* ---------------- scenes ---------------- */
  var SCENES = { boot: '#boot', card: '#cardScene', game: '#gameScene', result: '#resultScene', contact: '#contactScene' };
  function show(name) {
    Object.keys(SCENES).forEach(function (k) { $(SCENES[k]).hidden = k !== name; });
    document.body.setAttribute('data-scene', name);
    App.scene = name; FX.rush();
    var target = { card: '#cardName', game: '#gameTitle', result: '#resultTitle', contact: '#contactTitle', boot: '#bootTitle' }[name];
    var el = $(target); if (el) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  /* ---------------- boot ---------------- */
  var bootTimer;
  function buildBootSymbol() {
    var S = window.USERSX_SYMBOL, host = $('#bootSymbol'); if (!S || !host) return;
    var cells = S.cells(), out = '<svg viewBox="-1 -1 17 17" shape-rendering="crispEdges">';
    cells.forEach(function (c) {
      var a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 10;
      out += '<rect class="bc" x="' + c.x + '" y="' + c.y + '" width="1.02" height="1.02" fill="' + S.COLORS[c.c] + '" style="--dx:' + (Math.cos(a) * d).toFixed(1) + 'px;--dy:' + (Math.sin(a) * d).toFixed(1) + 'px;--d:' + (c.c === 'M' ? 0 : 60 + Math.round(Math.random() * 520)) + 'ms"/>';
    });
    host.innerHTML = out + '</svg>';
  }
  function playBoot() {
    clearTimeout(bootTimer);
    show('boot');
    var b = $('#boot'); b.classList.remove('is-on'); void b.offsetWidth; b.classList.add('is-on');
    if (cfg.introAutoContinueMs > 0) bootTimer = setTimeout(function () { if (App.scene === 'boot') enterCard('auto'); }, calm() ? 1800 : cfg.introAutoContinueMs);
  }
  function enterCard(how) {
    clearTimeout(bootTimer);
    if (how === 'start') sfx('boot');
    show('card');
    var c = $('#card'); c.classList.remove('is-dealt'); void c.offsetWidth; c.classList.add('is-dealt');
    if (!App.opened) { App.opened = true; track('card_opened', { via: how }); }
  }

  /* ---------------- the card: tilt, sheen, flip ---------------- */
  function initTilt() {
    var card = $('#card'), inner = $('#cardInner'), raf = 0, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, base = { x: 0, y: 0 };
    function apply(rx, ry, mx, my) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        inner.style.setProperty('--rx', rx.toFixed(2) + 'deg'); inner.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        card.style.setProperty('--mx', (mx * 100).toFixed(1) + '%'); card.style.setProperty('--my', (my * 100).toFixed(1) + '%');
      });
    }
    function rel(e) { var r = card.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; }
    card.addEventListener('pointermove', function (e) {
      if (calm()) return;
      var p = rel(e);
      if (e.pointerType === 'mouse') { card.classList.add('is-live'); apply((0.5 - p.y) * 16, (p.x - 0.5) * 20, p.x, p.y); }
      else if (dragging) { tx = (e.clientX - sx) / 6; ty = (e.clientY - sy) / 6; apply(Math.max(-22, Math.min(22, base.x - ty)), Math.max(-28, Math.min(28, base.y + tx)), p.x, p.y); }
    });
    card.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || calm() || e.target.closest('button, a')) return;
      dragging = true; sx = e.clientX; sy = e.clientY; card.classList.add('is-live');
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    var reset = function () { dragging = false; card.classList.remove('is-live'); apply(0, 0, 0.5, 0.3); };
    card.addEventListener('pointerup', reset); card.addEventListener('pointercancel', reset); card.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') reset(); });
  }
  // only the face you can see takes taps and keyboard focus
  function faces(back) { $('.face--front').inert = !!back; $('.face--back').inert = !back; }
  function flip(toBack) {
    var c = $('#card'); c.setAttribute('data-face', toBack ? 'back' : 'front'); sfx('flip');
    faces(toBack);
    $(toBack ? '#flipBackBtn' : '#flipBtn').focus({ preventScroll: true });
    if (toBack) track('card_flipped');
  }

  /* ---------------- secret level ---------------- */
  var taps = [];
  function logoTap() {
    var now = Date.now(); taps = taps.filter(function (t) { return now - t < 2500; }); taps.push(now);
    var sym = $('#cardSymbol'); sym.classList.remove('is-tap'); void sym.offsetWidth; sym.classList.add('is-tap'); sfx('ui');
    if (taps.length >= cfg.secretTaps) { taps = []; openSecret('logo'); }
  }
  function openSecret(via) {
    var d = $('#secret'); if (d.open) return;
    var n = $('#secretNuqta'); n.innerHTML = window.USERSX_AVATAR ? window.USERSX_AVATAR.svg({}) : '';
    var svg = n.querySelector('svg'); if (svg) { svg.setAttribute('data-arm', 'up'); svg.setAttribute('data-mouth', 'open'); }
    openDialog(d); sfx('secret'); store.set('secret', true);
    var r = d.getBoundingClientRect(); FX.burst(document.body, r.left + r.width / 2, r.top + 40, 28);
    track('secret_found', { via: via });
  }

  /* ---------------- game ---------------- */
  var game;
  function hudText(ms) { return (ms / 1000).toFixed(1); }
  function startGame() {
    show('game');
    var arena = $('#arena');
    if (!game) {
      game = new window.CardGame({
        arena: arena, cfg: cfg.game, countdown: $('#countdown'),
        get t() { return App.t; },
        sound: sfx,
        onHud: function (score, left, streak) {
          $('#hudScore').textContent = String(score); $('#hudTime').textContent = hudText(left);
          $('#hudCombo').textContent = streak >= 3 ? '×' + streak : '';
          $('#hudTime').parentNode.classList.toggle('is-low', left > 0 && left < 3000);
        },
        float: function (x, y, text, cls) {
          var f = document.createElement('span'); f.className = 'float num ' + (cls || ''); f.dir = 'ltr'; f.textContent = text;
          f.style.left = x + 'px'; f.style.top = y + 'px'; arena.appendChild(f);
          setTimeout(function () { f.remove(); }, 700);
          if (!cls) $('#gameLive').textContent = text;
        },
        bubble: function (el, text) {
          var b = document.createElement('span'); b.className = 'taunt'; b.textContent = text;
          var m = /translate\((-?\d+)px,\s*(-?\d+)px\)/.exec(el.style.transform) || [0, 0, 0];
          b.style.left = (+m[1] + el.offsetWidth / 2) + 'px'; b.style.top = (+m[2]) + 'px'; arena.appendChild(b);
          setTimeout(function () { b.remove(); }, 800);
        },
        shake: function () { if (calm()) return; arena.classList.remove('is-shake'); void arena.offsetWidth; arena.classList.add('is-shake'); },
        burst: function (x, y, gold) { FX.burst(arena, x, y, gold ? 18 : 10, gold ? ['#F54BF7', '#F4F4F1'] : null); },
        onEnd: endGame
      });
      App.game = game;
    }
    game.start();
    track('game_started');
  }
  function tierOf(score) { var t = cfg.game.tiers, i = 0; for (var k = 0; k < t.length; k++) if (score >= t[k]) i = k; return i; }
  function endGame(res) {
    sfx('end');
    var best = store.get('best', 0); res.newBest = res.score > best; if (res.newBest) store.set('best', res.score);
    res.tier = tierOf(res.score);
    res.gold = res.score >= cfg.game.goldCardScore;
    if (res.gold) { store.set('gold', true); applyGold(); }
    App.lastResult = res;
    setTimeout(function () { show('result'); renderResult(res); if (res.tier >= 2) sfx('win'); }, 500);
    track('game_completed', { score: res.score, tier: res.tier });
  }
  function renderResult(res, quiet) {
    var t = App.t, tier = t.tiers[res.tier];
    $('#resultTitle').textContent = tier.t; $('#resultSub').textContent = tier.s;
    $('#resultStats').textContent = t.statsLine(res.hits, res.misses, res.bestStreak) + (res.newBest ? ' · ' + t.newBest : '');
    $('#resultUnlock').hidden = !res.gold;
    $('#resultEyebrow').textContent = 'GAME OVER · LV ' + (res.tier + 1);
    var host = $('#resultNuqta');
    if (!host.firstChild && window.USERSX_AVATAR) host.innerHTML = window.USERSX_AVATAR.svg({});
    var svg = host.querySelector('svg');
    if (svg) {
      svg.setAttribute('data-arm', res.tier >= 2 ? 'up' : 'down');
      svg.setAttribute('data-mouth', res.tier === 0 ? 'open' : 'closed');
      svg.setAttribute('data-eyes', res.tier === 0 ? 'shut' : 'open');
      host.setAttribute('data-mood', ['laugh', 'nod', 'cheer', 'dance'][res.tier]);
    }
    var el = $('#resultScore');
    if (quiet || calm()) { el.textContent = String(res.score); return; }
    var start = performance.now(), dur = 700;
    (function count(now) { var p = Math.min(1, (now - start) / dur); el.textContent = String(Math.round(res.score * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(count); })(start);
  }
  function showBest() {
    var b = store.get('best', 0), el = $('#bestLine'); if (!el || !App.t) return;
    el.hidden = !b; el.textContent = App.t.bestPrefix + b;
  }
  function applyGold() { $('#card').classList.toggle('is-gold', !!store.get('gold', false)); }

  /* ---------------- contact ---------------- */
  function fillContact() {
    var c = cfg.contact, t = App.t; if (!t) return;
    var waNum = c.personalWhatsapp || c.companyWhatsapp, msg = App.lang === 'ar' ? cfg.whatsappMessageAr : cfg.whatsappMessageEn;
    var wa = $('#waBtn'); wa.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);
    $('#waSub').textContent = c.personalWhatsapp ? t.waSubPersonal : t.waSubCompany;
    var phone = c.personalPhone || c.companyPhone;
    $('#callBtn').href = 'tel:' + phone; $('#callSub').textContent = phone.replace(/^\+966(\d{2})(\d{3})(\d{4})$/, '+966 $1 $2 $3');
    $$('[data-needs]').forEach(function (li) { li.hidden = !c[li.getAttribute('data-needs')]; });
    if (c.email) { $('#mailBtn').href = 'mailto:' + c.email; $('#mailSub').textContent = c.email; }
    if (c.linkedin) $('#liBtn').href = c.linkedin;
    var site = $('#siteLink'); site.hidden = !c.website; if (c.website) site.href = c.website;
    $('#saveBtn').href = $('#quickSave').href = cfg.vcfFile;
    $('#saveBtn').setAttribute('download', cfg.vcfFile.split('/').pop()); $('#quickSave').setAttribute('download', cfg.vcfFile.split('/').pop());
  }
  function toast(msg) { var el = $('#toast'); el.textContent = msg; clearTimeout(App.toastId); App.toastId = setTimeout(function () { el.textContent = ''; }, 4200); }
  function cardUrl() { return cfg.cardUrl || (location.origin + location.pathname); }
  function isPreviewUrl(u) { return /^(file:|https?:\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|\[::1\])|https?:\/\/[^/]*claude\.ai\/|https?:\/\/[^/]*\.(local|test)\b)/i.test(u) || !/^https:/.test(u); }
  function share(kind) {
    var t = App.t, url = cardUrl(), text = kind === 'score' && App.lastResult ? t.shareScoreText(App.lastResult.score) : t.shareText;
    var where = kind === 'score' ? $('#resultStats') : null;
    track('share_clicked', { what: kind });
    var copy = function () {
      var full = text + ' ' + url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(function () { say(t.shareCopied); }, function () { say(t.shareFail + url); });
      } else say(t.shareFail + url);
    };
    var say = function (m) { if (where) where.textContent = m; else toast(m); };
    if (navigator.share) {
      navigator.share({ title: document.title, text: text, url: url }).then(function () { say(t.shareDone); }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
    } else copy();
  }

  /* ---------------- QR ---------------- */
  function qrMatrix(url) {
    var Q = window.qrcode; if (!Q) return null;
    Q.stringToBytes = Q.stringToBytesFuncs['UTF-8'];
    var q = Q(0, 'Q'); q.addData(url, 'Byte'); q.make();
    return q;
  }
  function qrSvg(q, quiet) {
    var n = q.getModuleCount(), s = n + quiet * 2, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.isDark(y, x)) d += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" width="' + s * 10 + '" height="' + s * 10 + '"><rect width="100%" height="100%" fill="#FFFFFF"/><path fill="#0B0B0F" d="' + d + '"/></svg>';
  }
  function download(blob, name) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function openQr() {
    var url = cardUrl(), q = qrMatrix(url), box = $('#qrBox');
    App.qrUrl = url;
    box.innerHTML = q ? qrSvg(q, 4) : '';
    $('#qrUrl').textContent = url;
    $('#qrWarn').hidden = !isPreviewUrl(url);
    openDialog($('#qrSheet'));
    track('qr_opened', { preview: isPreviewUrl(url) });
  }
  function qrPng() {
    var q = qrMatrix(App.qrUrl); if (!q) return;
    var n = q.getModuleCount(), quiet = 4, scale = Math.floor(2048 / (n + quiet * 2)), size = (n + quiet * 2) * scale;
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    var g = cv.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, size, size); g.fillStyle = '#0B0B0F';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    cv.toBlob(function (b) { if (b) download(b, 'userx-khalid-hamida-qr.png'); }, 'image/png');
  }

  /* ---------------- dialogs ---------------- */
  function openDialog(d) {
    App.lastFocus = document.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    var b = d.querySelector('button'); if (b) b.focus();
  }
  function closeDialog(d) { if (typeof d.close === 'function' && d.open) d.close(); else d.removeAttribute('open'); if (App.lastFocus && App.lastFocus.focus) App.lastFocus.focus(); }

  /* ---------------- boot it all ---------------- */
  function safe(name, fn) { try { fn(); } catch (e) { App.errors.push(name + ': ' + e.message); if (window.console) console.error('[card]', name, e); } }
  function init() {
    document.documentElement.classList.remove('no-js');
    safe('calm', applyCalm);
    safe('fx', function () { FX.init($('#bg'), calm()); });
    safe('lang', function () { setLang(initialLang(), false); });
    safe('sound', function () {
      Audio.on = false; Audio.setVolume(store.get('volume', 70) / 100); $('#volume').value = store.get('volume', 70);
      if (store.get('sound', cfg.soundDefault)) Audio.on = true; // turned on for real at the next tap (browser rule)
      syncSound();
      $('#soundBtn').addEventListener('click', function () { Audio.setOn(!Audio.on); store.set('sound', Audio.on); syncSound(); sfx('ui'); track('sound_toggled', { on: Audio.on }); });
      $('#volume').addEventListener('input', function (e) { Audio.setVolume(e.target.value / 100); store.set('volume', +e.target.value); });
      document.addEventListener('pointerdown', function () { if (Audio.on) Audio.setOn(true); }, { once: true, passive: true });
    });
    safe('settings', function () {
      var btn = $('#setBtn'), panel = $('#settings');
      btn.addEventListener('click', function () { var open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
      document.addEventListener('click', function (e) { if (!panel.hidden && !e.target.closest('#settings, #setBtn')) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
      $('#calmMotion').checked = !!store.get('calm', false);
      $('#calmMotion').addEventListener('change', function (e) { store.set('calm', e.target.checked); applyCalm(); });
      if (mq && mq.addEventListener) mq.addEventListener('change', applyCalm);
      $('#replayIntro').addEventListener('click', function () { panel.hidden = true; if (game) game.stop(); playBoot(); });
      $('#langBtn').addEventListener('click', function () { setLang(App.lang === 'ar' ? 'en' : 'ar', true); sfx('ui'); });
    });
    safe('boot', function () {
      buildBootSymbol();
      $('#startBtn').addEventListener('click', function (e) { e.stopPropagation(); if (Audio.on) Audio.setOn(true); enterCard('start'); });
      $('#skipBtn').addEventListener('click', function (e) { e.stopPropagation(); enterCard('skip'); });
      $('#boot').addEventListener('click', function (e) { if (!e.target.closest('button')) enterCard('tap'); });
      document.addEventListener('keydown', function (e) { if (App.scene === 'boot' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { e.preventDefault(); enterCard('key'); } });
    });
    safe('card', function () {
      var S = window.USERSX_SYMBOL; if (S) $('#cardSymbol').innerHTML = S.svg({ depth: true });
      if (window.USERSX_AVATAR) $('#backNuqta').innerHTML = window.USERSX_AVATAR.svg({});
      initTilt(); applyGold(); faces(false);
      $('#flipBtn').addEventListener('click', function () { flip(true); });
      $('#flipBackBtn').addEventListener('click', function () { flip(false); });
      $('#logoTap').addEventListener('click', logoTap);
      $('#playBtn').addEventListener('click', startGame);
      $('#quickContact').addEventListener('click', function () { show('contact'); track('contact_opened', { via: 'card' }); });
      // keyboard players: ↑↑↓↓ opens the secret level too
      var seq = [], code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];
      document.addEventListener('keydown', function (e) { seq.push(e.key); seq = seq.slice(-4); if (seq.join() === code.join()) openSecret('keys'); });
    });
    safe('game', function () {
      $('#quitGame').addEventListener('click', function () { if (game) game.stop(); show('card'); track('game_quit'); });
      $('#againBtn').addEventListener('click', startGame);
      $('#playFromContact').addEventListener('click', startGame);
      $('#toContact').addEventListener('click', function () { show('contact'); track('contact_opened', { via: 'result' }); });
      $('#shareScore').addEventListener('click', function () { share('score'); });
    });
    safe('contact', function () {
      fillContact();
      $('#backToCard').addEventListener('click', function () { show('card'); showBest(); });
      [['#saveBtn', 'save_contact_clicked'], ['#quickSave', 'save_contact_clicked'], ['#waBtn', 'whatsapp_clicked'], ['#callBtn', 'call_clicked'], ['#mailBtn', 'email_clicked'], ['#liBtn', 'linkedin_clicked']]
        .forEach(function (p) { $(p[0]).addEventListener('click', function () { track(p[1]); if (/save/.test(p[1])) toast(App.t.saved); }); });
      $('#shareBtn').addEventListener('click', function () { share('card'); });
      $('#qrBtn').addEventListener('click', openQr);
      $('#qrClose').addEventListener('click', function () { closeDialog($('#qrSheet')); });
      $('#qrPng').addEventListener('click', qrPng);
      $('#qrSvg').addEventListener('click', function () { var q = qrMatrix(App.qrUrl); if (q) download(new Blob([qrSvg(q, 4)], { type: 'image/svg+xml' }), 'userx-khalid-hamida-qr.svg'); });
      $('#secretClose').addEventListener('click', function () { closeDialog($('#secret')); });
      $$('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); }); });
    });
    var src = new URLSearchParams(location.search).get('src');
    track('landing', { src: src === 'qr' ? 'qr' : 'direct' });
    playBoot();
    App.ready = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

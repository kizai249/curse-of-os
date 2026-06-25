/* ═══════════════════════════════════════════════════════════════
   Curse of Os — Game Hub Engine  |  script.js
   Vanilla ES6  |  No dependencies  |  localStorage persistence
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Constants ────────────────────────────────────────────── */
const SAVE_KEY    = 'cos_hub_v1';
const VERSION     = '1.0.0';

const RANKS = [
  { id: 0, title: 'SEEKER',          titleAr: 'الباحث',        minXp: 0     },
  { id: 1, title: 'FOLLOWER',        titleAr: 'التابع',        minXp: 500   },
  { id: 2, title: 'INITIATE',        titleAr: 'المبتدئ',       minXp: 1500  },
  { id: 3, title: 'SHADOW WALKER',   titleAr: 'سالك الظل',     minXp: 3000  },
  { id: 4, title: 'CURSE BEARER',    titleAr: 'حامل اللعنة',   minXp: 6000  },
  { id: 5, title: 'WARDEN OF OS',    titleAr: 'حارس أوس',      minXp: 10000 },
  { id: 6, title: 'HEIR OF OS',      titleAr: 'وارث أوس',      minXp: 15000 },
];

const ACHIEVEMENTS = [
  { id: 'first_game',    icon: '🎮', name: 'الخطوة الأولى',   desc: 'أكمل لعبتك الأولى',          xp: 100  },
  { id: 'eye_open',      icon: '👁', name: 'العين تفتح',      desc: 'أكمل عين أوس',               xp: 150  },
  { id: 'historian',     icon: '📜', name: 'المؤرخ',          desc: 'اقرأ رسالة الماضي',           xp: 150  },
  { id: 'mirror_master', icon: '🪞', name: 'سيد المرايا',     desc: 'أكمل سبعة مرايا',            xp: 200  },
  { id: 'betrayer',      icon: '📦', name: 'الخائن',          desc: 'افتح صندوق الخيانة',         xp: 200  },
  { id: 'trusted',       icon: '⚖️', name: 'الموثوق',         desc: 'اجتاز اختبار الثقة',         xp: 250  },
  { id: 'heartbeat',     icon: '💓', name: 'نبض اللعنة',      desc: 'اتبع نبض اللعنة بدقة',       xp: 250  },
  { id: 'detective',     icon: '🏚️', name: 'المحقق',          desc: 'اكتشف أسرار القرية',         xp: 300  },
  { id: 'time_keeper',   icon: '⏰', name: 'حارس الوقت',      desc: 'حل لغز الساعة الملعونة',     xp: 350  },
  { id: 'all_games',     icon: '🌟', name: 'اللاعب الكامل',   desc: 'أكمل جميع الألعاب الثماني', xp: 500  },
  { id: 'secret_found',  icon: '🚪', name: 'اكتشاف المحجوب',  desc: 'ادخل الغرفة المحجوبة',       xp: 1000 },
  { id: 'social_king',   icon: '👑', name: 'ملك الإحالة',     desc: 'أدعو 25 لاعبًا',             xp: 750  },
];

const REF_TIERS = [
  { count: 3,  reward: 'مفتاح فضي',   icon: '🗝️',  xp: 300  },
  { count: 10, reward: 'مفتاح ذهبي',  icon: '🔑',  xp: 1000 },
  { count: 25, reward: 'ملف سري',      icon: '📂',  xp: 2500 },
  { count: 50, reward: 'غرفة مخفية',  icon: '🚪',  xp: 5000 },
];

const GAME_DEFS = [
  // Phase 1
  {
    id: 'eye',     phase: 1, screen: 'game-eye',
    icon: '👁',   title: 'عين أوس',         titleEn: 'EYE OF OS',
    desc: 'تسلسل الضوء — احفظ النمط وكرّره قبل أن تغلق العين.',
    xp: 300, diff: 1, diffLabel: 'سهل',
  },
  {
    id: 'message', phase: 1, screen: 'game-message',
    icon: '📜',   title: 'رسالة من الماضي', titleEn: 'MESSAGE FROM THE PAST',
    desc: 'رسالة أوس المجزأة — أعد ترتيب الكلمات لفك الشفرة.',
    xp: 350, diff: 1, diffLabel: 'سهل',
  },
  {
    id: 'mirrors', phase: 1, screen: 'game-mirrors',
    icon: '🪞',   title: 'سبعة مرايا',      titleEn: 'SEVEN MIRRORS',
    desc: 'سبع مرايا تعكس حقيقة واحدة — اكتشف أي المرايا يقول الحقيقة.',
    xp: 400, diff: 2, diffLabel: 'متوسط',
  },
  // Phase 2
  {
    id: 'box',     phase: 2, screen: 'game-box',
    icon: '📦',   title: 'صندوق الخيانة',   titleEn: 'BOX OF BETRAYAL',
    desc: 'الصندوق يختبر ولاءك — ماذا تختار حين يكون الثمن باهظًا؟',
    xp: 450, diff: 2, diffLabel: 'متوسط',
  },
  {
    id: 'trust',   phase: 2, screen: 'game-trust',
    icon: '⚖️',   title: 'ثقة أم خيانة',    titleEn: 'TRUST OR BETRAYAL',
    desc: 'سيناريو صعب — قراراتك تحدد من أنت في عالم اللعنة.',
    xp: 500, diff: 2, diffLabel: 'متوسط',
  },
  {
    id: 'heartbeat', phase: 2, screen: 'game-heartbeat',
    icon: '💓',   title: 'نبض اللعنة',       titleEn: 'CURSE HEARTBEAT',
    desc: 'اللعنة لها نبض خاص — اتبع الإيقاع بدقة أو ستضيع إلى الأبد.',
    xp: 550, diff: 3, diffLabel: 'صعب',
  },
  // Phase 3
  {
    id: 'village', phase: 3, screen: 'game-village',
    icon: '🏚️',  title: 'أسرار القرية',     titleEn: 'VILLAGE SECRETS',
    desc: 'القرية تحمل خمسة أسرار — فتش كل ركن قبل أن يغيب الضوء.',
    xp: 600, diff: 3, diffLabel: 'صعب',
  },
  {
    id: 'clock',   phase: 3, screen: 'game-clock',
    icon: '⏰',   title: 'الساعة الملعونة',  titleEn: 'CURSED CLOCK',
    desc: 'الساعة توقفت في لحظة اللعنة — اكتشف الوقت الحقيقي من الأحجية.',
    xp: 700, diff: 3, diffLabel: 'صعب',
  },
];

/* ═══════════════════════════════════════════════════════════
   StorageSystem
═══════════════════════════════════════════════════════════ */
const Storage = (() => {
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
  function save(state) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }
  function clear() { localStorage.removeItem(SAVE_KEY); }
  return { load, save, clear };
})();

/* ═══════════════════════════════════════════════════════════
   PlayerSystem
═══════════════════════════════════════════════════════════ */
const PlayerSystem = (() => {
  function create(name, faction, refCode) {
    const id = 'OS-' + Math.random().toString(36).slice(2,6).toUpperCase();
    return {
      version: VERSION,
      id, name, faction,
      xp: 0, rank: 0,
      completedGames: [],
      achievements: [],
      referrals: 0,
      inviteCode: id,
      parentRef: refCode || '',
      createdAt: new Date().toISOString(),
    };
  }

  function getRank(xp) {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (xp >= r.minXp) rank = r;
    }
    return rank;
  }

  function getNextRank(xp) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (xp >= RANKS[i].minXp) {
        return RANKS[i + 1] || null;
      }
    }
    return RANKS[1];
  }

  function addXp(player, amount) {
    const prev = getRank(player.xp);
    player.xp += amount;
    const next = getRank(player.xp);
    if (next.id > prev.id) {
      Hub.notify(`🎖️ رُقيت إلى رتبة ${next.titleAr}!`, 'gold');
      Hub.triggerGlitch();
    }
    player.rank = next.id;
    return player;
  }

  function unlockAchievement(player, achId) {
    if (player.achievements.includes(achId)) return false;
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return false;
    player.achievements.push(achId);
    addXp(player, ach.xp);
    Hub.showAchievementPopup(ach);
    return true;
  }

  function xpProgress(xp) {
    const cur  = getRank(xp);
    const next = getNextRank(xp);
    if (!next) return { pct: 100, cur: xp, max: xp };
    const span = next.minXp - cur.minXp;
    const done = xp - cur.minXp;
    return { pct: Math.round((done / span) * 100), cur: done, max: span };
  }

  return { create, getRank, getNextRank, addXp, unlockAchievement, xpProgress };
})();

/* ═══════════════════════════════════════════════════════════
   AudioManager (Web Audio API — no audio files)
═══════════════════════════════════════════════════════════ */
const Audio = (() => {
  let ctx = null;

  function _ctx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(freq = 440, dur = 0.15, type = 'sine', vol = 0.3) {
    try {
      const c = _ctx();
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch {}
  }

  function success() {
    beep(523, .15);
    setTimeout(() => beep(659, .15), 120);
    setTimeout(() => beep(784, .25), 240);
  }

  function error() {
    beep(220, .3, 'sawtooth', .2);
    setTimeout(() => beep(196, .3, 'sawtooth', .15), 150);
  }

  function click() { beep(880, .06, 'square', .15); }
  function unlock() {
    beep(440, .1);
    setTimeout(() => beep(554, .1), 80);
    setTimeout(() => beep(659, .1), 160);
    setTimeout(() => beep(880, .3), 240);
  }
  function heartbeatTone(i) {
    const freqs = [330, 294, 262, 349, 392, 440, 415, 370];
    beep(freqs[i % freqs.length], .12, 'triangle', .25);
  }

  return { beep, success, error, click, unlock, heartbeatTone };
})();

/* ═══════════════════════════════════════════════════════════
   ParticleSystem (Canvas 2D)
═══════════════════════════════════════════════════════════ */
const Particles = (() => {
  let canvas, ctx, particles = [], raf;

  function init() {
    canvas = document.getElementById('particle-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) _spawn(true);
    _loop();
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function _spawn(random = false) {
    particles.push({
      x: Math.random() * canvas.width,
      y: random ? Math.random() * canvas.height : canvas.height + 10,
      r: Math.random() * 1.5 + .3,
      vx: (Math.random() - .5) * .3,
      vy: -(Math.random() * .4 + .1),
      alpha: Math.random() * .5 + .1,
      life: 0,
      maxLife: Math.random() * 300 + 200,
    });
  }

  function _loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      const fade = p.life < 30 ? p.life / 30 : p.life > p.maxLife - 30 ? (p.maxLife - p.life) / 30 : 1;
      ctx.globalAlpha = p.alpha * fade;
      ctx.fillStyle = '#8B0000';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      return p.life < p.maxLife;
    });
    if (particles.length < 60) _spawn();
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(_loop);
  }

  return { init };
})();

/* ═══════════════════════════════════════════════════════════
   Hub — Screen & State Manager
═══════════════════════════════════════════════════════════ */
const Hub = (() => {
  let state  = null;  // current player
  let _prevScreen = 'home';
  let _selectedFaction = null;

  /* ── init ─────────────────────────────────────────────── */
  function init() {
    Particles.init();
    _runLoading(() => {
      const saved = Storage.load();
      if (saved && saved.version === VERSION) {
        state = saved;
        goTo('hub');
      } else {
        goTo('home');
      }
    });

    // Leaderboard simulated data in localStorage
    _seedLeaderboard();

    // Whisper rotation
    const whispers = [
      'افتح الصندوق...', 'أوس يراك', 'الحقيقة داخل', 'XIII', 'لا مفر',
    ];
    let wi = 0;
    setInterval(() => {
      const el = document.getElementById('box-whisper');
      if (el) { el.textContent = whispers[wi++ % whispers.length]; }
    }, 3000);
  }

  function _runLoading(cb) {
    const bar  = document.getElementById('loading-bar');
    const txt  = document.getElementById('loading-text');
    const steps = [
      [20, 'تحميل الذاكرة...'],
      [45, 'إيقاظ اللعنة...'],
      [70, 'فتح الصندوق...'],
      [90, 'تهيئة عالم أوس...'],
      [100, 'جاهز.'],
    ];
    let i = 0;
    const advance = () => {
      if (i >= steps.length) { setTimeout(cb, 400); return; }
      const [pct, msg] = steps[i++];
      bar.style.width = pct + '%';
      txt.textContent = msg;
      setTimeout(advance, 300 + Math.random() * 200);
    };
    advance();
  }

  /* ── Screen routing ───────────────────────────────────── */
  function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screenId) ||
               document.getElementById('game-' + screenId);
    if (!el) return;
    el.classList.add('active');

    if (screenId === 'hub')         _renderHub();
    if (screenId === 'leaderboard') _renderLeaderboard();
    if (screenId === 'profile')     _renderProfile();
    _prevScreen = screenId;
  }

  function goBack() { goTo(_prevScreen === 'hub' ? 'hub' : 'home'); }

  /* ── Setup / Player creation ─────────────────────────── */
  function selectFaction(el) {
    document.querySelectorAll('.faction-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    _selectedFaction = el.dataset.faction;
    Audio.click();
  }

  function createPlayer() {
    const name = document.getElementById('setup-name').value.trim();
    if (!name) { notify('أدخل اسمك أولًا', 'error'); return; }
    if (!_selectedFaction) { notify('اختر فصيلك', 'error'); return; }
    const ref = document.getElementById('setup-ref').value.trim().toUpperCase();

    state = PlayerSystem.create(name, _selectedFaction, ref);
    Storage.save(state);

    // Check referral
    if (ref) _processReferral(ref);

    Audio.unlock();
    notify('مرحبًا بك في عالم اللعنة!', 'success');
    goTo('hub');
  }

  function _processReferral(code) {
    // Increment referral count in leaderboard seed
    try {
      const lb = JSON.parse(localStorage.getItem('cos_lb') || '[]');
      const entry = lb.find(e => e.code === code);
      if (entry) {
        entry.refs = (entry.refs || 0) + 1;
        localStorage.setItem('cos_lb', JSON.stringify(lb));
      }
    } catch {}
  }

  /* ── Hub render ───────────────────────────────────────── */
  function _renderHub() {
    if (!state) return;
    const rank = PlayerSystem.getRank(state.xp);
    const prog = PlayerSystem.xpProgress(state.xp);

    // Header
    document.getElementById('hub-avatar').textContent = state.name[0] || '؟';
    document.getElementById('hub-name').textContent    = state.name;
    document.getElementById('hub-rank-label').textContent = rank.title;
    document.getElementById('hub-xp-cur').textContent  = state.xp + ' XP';
    const next = PlayerSystem.getNextRank(state.xp);
    document.getElementById('hub-xp-next').textContent = next ? `→ ${next.minXp}` : 'MAX';
    document.getElementById('hub-xp-fill').style.width = prog.pct + '%';

    // Games
    [1, 2, 3].forEach(phase => {
      const grid = document.getElementById(`phase${phase}-grid`);
      grid.innerHTML = '';
      GAME_DEFS.filter(g => g.phase === phase).forEach((g, i) => {
        const locked  = _isLocked(g, phase);
        const done    = state.completedGames.includes(g.id);
        const card    = document.createElement('div');
        card.className = 'game-card' + (locked ? ' locked' : '') + (done ? ' completed' : '');
        card.style.animationDelay = (i * .08) + 's';
        card.style.animation = 'cardIn .4s ease both';
        card.innerHTML = `
          <span class="game-icon">${g.icon}</span>
          <div class="game-title">${g.title}</div>
          <div class="game-title-en">${g.titleEn}</div>
          <div class="game-desc">${g.desc}</div>
          <div class="game-meta">
            <span class="game-xp">+${g.xp} XP</span>
            <span class="game-diff diff-${g.diff}">${g.diffLabel}</span>
          </div>
        `;
        if (!locked) card.onclick = () => { Audio.click(); Games.start(g.id); };
        grid.appendChild(card);
      });
    });

    // Secret room
    const allDone  = GAME_DEFS.every(g => state.completedGames.includes(g.id));
    const teaser   = document.getElementById('secret-room-teaser');
    if (allDone) {
      teaser.classList.remove('locked');
      teaser.querySelector('.game-diff').textContent = '🚪 مفتوح';
      teaser.onclick = () => goTo('secret');
    }
  }

  function _isLocked(game, phase) {
    if (phase === 1) return false;
    const prevPhase = GAME_DEFS.filter(g => g.phase === phase - 1);
    return !prevPhase.every(g => state.completedGames.includes(g.id));
  }

  /* ── Leaderboard ──────────────────────────────────────── */
  function _seedLeaderboard() {
    if (localStorage.getItem('cos_lb')) return;
    const names = [
      'فهد العمري','نورة السهلي','خالد الرشيد','سارة الحربي','عمر الجهني',
      'ريم المطيري','أحمد الغامدي','لين السبيعي','محمد العتيبي','هند القحطاني',
    ];
    const factions = ['children','shepherd','keepers','seekers'];
    const lb = names.map((n, i) => ({
      name: n,
      faction: factions[i % 4],
      xp: Math.floor(Math.random() * 14000) + 1000,
      code: 'OS-' + Math.random().toString(36).slice(2,6).toUpperCase(),
      refs: Math.floor(Math.random() * 15),
    })).sort((a, b) => b.xp - a.xp);
    localStorage.setItem('cos_lb', JSON.stringify(lb));
  }

  function _renderLeaderboard() {
    const list = document.getElementById('lb-list');
    let lb = [];
    try { lb = JSON.parse(localStorage.getItem('cos_lb') || '[]'); } catch {}

    // Insert current player
    if (state) {
      lb = lb.filter(e => e.code !== state.inviteCode);
      lb.push({ name: state.name, faction: state.faction, xp: state.xp, code: state.inviteCode, me: true });
      lb.sort((a, b) => b.xp - a.xp);
    }

    list.innerHTML = '';
    lb.slice(0, 20).forEach((entry, i) => {
      const rank = PlayerSystem.getRank(entry.xp);
      const row  = document.createElement('div');
      row.className = 'lb-row' + (entry.me ? ' me' : '');
      const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
      row.innerHTML = `
        <div class="lb-rank ${rankClass}">${medal}</div>
        <div class="lb-avatar">${entry.name[0]}</div>
        <div class="lb-name">
          ${entry.name} ${entry.me ? '(أنت)' : ''}
          <span class="lb-rank-title">${rank.title}</span>
        </div>
        <div class="lb-xp">${entry.xp.toLocaleString('ar-SA')} XP</div>
      `;
      list.appendChild(row);
    });
  }

  /* ── Profile ──────────────────────────────────────────── */
  function _renderProfile() {
    if (!state) return;
    const rank = PlayerSystem.getRank(state.xp);

    document.getElementById('profile-avatar').textContent = state.name[0];
    document.getElementById('profile-name').textContent   = state.name;
    document.getElementById('profile-rank').textContent   = rank.title + ' — ' + rank.titleAr;
    document.getElementById('pstat-xp').textContent       = state.xp.toLocaleString('ar-SA');
    document.getElementById('pstat-games').textContent    = state.completedGames.length;
    document.getElementById('pstat-ach').textContent      = state.achievements.length;
    document.getElementById('pstat-refs').textContent     = state.referrals || 0;

    // Referral
    document.getElementById('ref-code-display').textContent = state.inviteCode;
    const tiersEl = document.getElementById('ref-tiers');
    tiersEl.innerHTML = '';
    REF_TIERS.forEach(tier => {
      const reached = (state.referrals || 0) >= tier.count;
      const div = document.createElement('div');
      div.className = 'ref-tier' + (reached ? ' reached' : '');
      div.innerHTML = `
        <div class="ref-tier-count">${tier.count} دعوة</div>
        <div class="ref-tier-reward">${tier.reward}</div>
        <div class="ref-tier-icon">${tier.icon}</div>
        <div class="ref-tier-check">✓</div>
      `;
      tiersEl.appendChild(div);
    });

    // Achievements
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';
    document.getElementById('ach-count').textContent = `${state.achievements.length} / ${ACHIEVEMENTS.length}`;
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = state.achievements.includes(ach.id);
      const tile = document.createElement('div');
      tile.className = 'achievement-tile' + (unlocked ? ' unlocked' : '');
      tile.innerHTML = `
        <span class="ach-icon">${ach.icon}</span>
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
      `;
      grid.appendChild(tile);
    });
  }

  /* ── Referral copy ────────────────────────────────────── */
  function copyReferral() {
    if (!state) return;
    const url = location.href.split('?')[0] + '?ref=' + state.inviteCode;
    navigator.clipboard.writeText(url).then(() => {
      notify('تم نسخ رابط الدعوة!', 'success');
    }).catch(() => notify('انسخ الكود: ' + state.inviteCode, 'info'));
    Audio.click();
  }

  /* ── Modal ────────────────────────────────────────────── */
  function openModal(title, body, actions = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    if (actions) document.getElementById('modal-actions').innerHTML = actions;
    document.getElementById('modal-overlay').classList.add('open');
  }
  function closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').classList.remove('open');
  }

  /* ── Notifications ────────────────────────────────────── */
  function notify(msg, type = 'info') {
    const c    = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    c.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /* ── Achievement popup ────────────────────────────────── */
  function showAchievementPopup(ach) {
    const popup = document.getElementById('achievement-popup');
    document.getElementById('ach-popup-icon').textContent = ach.icon;
    document.getElementById('ach-popup-name').textContent = ach.name;
    document.getElementById('ach-popup-desc').textContent = ach.desc + ` (+${ach.xp} XP)`;
    popup.classList.add('show');
    Audio.unlock();
    setTimeout(() => popup.classList.remove('show'), 3500);
  }

  /* ── Glitch ───────────────────────────────────────────── */
  function triggerGlitch() {
    const el = document.getElementById('glitch-overlay');
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 400);
  }

  /* ── Save shortcut ────────────────────────────────────── */
  function saveState() {
    if (state) Storage.save(state);
  }

  function getState() { return state; }

  return {
    init, goTo, goBack, selectFaction, createPlayer,
    copyReferral, openModal, closeModal, notify,
    showAchievementPopup, triggerGlitch, saveState, getState,
  };
})();

/* ═══════════════════════════════════════════════════════════
   Games — all 8 game implementations + secret room
═══════════════════════════════════════════════════════════ */
const Games = (() => {

  /* ── start ────────────────────────────────────────────── */
  function start(gameId) {
    const g = GAME_DEFS.find(x => x.id === gameId);
    if (!g) return;
    Hub.goTo(g.id);
    const inits = {
      eye:       _initEye,
      message:   _initMessage,
      mirrors:   _initMirrors,
      box:       _initBox,
      trust:     _initTrust,
      heartbeat: _initHeartbeat,
      village:   _initVillage,
      clock:     _initClock,
    };
    if (inits[gameId]) inits[gameId]();
  }

  function _complete(gameId, xp) {
    const player = Hub.getState();
    if (!player) return;
    const wasNew = !player.completedGames.includes(gameId);
    if (wasNew) {
      player.completedGames.push(gameId);
      PlayerSystem.addXp(player, xp);

      const achMap = {
        eye: 'eye_open', message: 'historian', mirrors: 'mirror_master',
        box: 'betrayer', trust: 'trusted', heartbeat: 'heartbeat',
        village: 'detective', clock: 'time_keeper',
      };
      if (achMap[gameId]) PlayerSystem.unlockAchievement(player, achMap[gameId]);

      if (player.completedGames.length === 1) PlayerSystem.unlockAchievement(player, 'first_game');
      if (player.completedGames.length === GAME_DEFS.length) PlayerSystem.unlockAchievement(player, 'all_games');

      Hub.saveState();
      Hub.notify(`+${xp} XP`, 'gold');
    }
    Audio.success();
  }

  function _showResult(containerId, correct, title, body, xp) {
    const el = document.getElementById(containerId);
    el.className = 'result-box show ' + (correct ? 'correct' : 'wrong');
    el.innerHTML = `<h3>${title}</h3><p>${body}</p>${correct ? `<div class="result-xp">+${xp} XP</div>` : ''}`;
  }

  /* ════════════════════════════════════════════════════════
     GAME 1: Eye of Os — Simon-like sequence
  ════════════════════════════════════════════════════════ */
  const EYE = {
    symbols: ['👁','🔴','🌑','✕','◈','⊗'],
    seq: [], playerSeq: [], level: 1, playing: false, _t: null,
  };

  function _initEye() {
    EYE.seq = [];
    EYE.playerSeq = [];
    EYE.level = 1;
    EYE.playing = false;

    const row = document.getElementById('eye-input-row');
    row.innerHTML = '';
    EYE.symbols.forEach((sym, i) => {
      const btn = document.createElement('div');
      btn.className = 'eye-seq-btn';
      btn.textContent = sym;
      btn.onclick = () => eyePress(i);
      row.appendChild(btn);
    });

    document.getElementById('eye-result').classList.remove('show');
    document.getElementById('eye-status').textContent = 'العين تراقبك... انتظر النمط';

    setTimeout(() => _eyeNextLevel(), 1000);
  }

  function _eyeNextLevel() {
    EYE.seq.push(Math.floor(Math.random() * EYE.symbols.length));
    EYE.playerSeq = [];
    document.getElementById('eye-status').textContent = 'احفظ التسلسل...';

    const display = document.getElementById('eye-pattern-display');
    display.innerHTML = '';
    EYE.seq.forEach((_, i) => {
      const b = document.createElement('div');
      b.className = 'hb-beat';
      b.textContent = i + 1;
      display.appendChild(b);
    });

    _eyePlaySeq(0);
  }

  function _eyePlaySeq(i) {
    if (i >= EYE.seq.length) {
      EYE.playing = false;
      document.getElementById('eye-status').textContent = 'الآن كرّر النمط!';
      return;
    }
    EYE.playing = true;
    const idx  = EYE.seq[i];
    const btns = document.getElementById('eye-input-row').querySelectorAll('.eye-seq-btn');
    const beats = document.getElementById('eye-pattern-display').querySelectorAll('.hb-beat');

    btns[idx].classList.add('active');
    beats[i] && beats[i].classList.add('pulse');
    Audio.beep(300 + idx * 80, .3, 'sine', .25);

    setTimeout(() => {
      btns[idx].classList.remove('active');
      beats[i] && beats[i].classList.remove('pulse');
      setTimeout(() => _eyePlaySeq(i + 1), 200);
    }, 500);
  }

  function eyePress(idx) {
    if (EYE.playing) return;
    const btns = document.getElementById('eye-input-row').querySelectorAll('.eye-seq-btn');
    Audio.beep(300 + idx * 80, .15, 'sine', .2);
    btns[idx].classList.add('active');
    setTimeout(() => btns[idx].classList.remove('active'), 200);

    EYE.playerSeq.push(idx);
    const pos = EYE.playerSeq.length - 1;

    if (EYE.playerSeq[pos] !== EYE.seq[pos]) {
      // Wrong
      btns[idx].classList.add('wrong');
      Audio.error();
      document.getElementById('eye-status').textContent = '❌ خطأ — أعد المحاولة';
      setTimeout(() => {
        btns[idx].classList.remove('wrong');
        EYE.playerSeq = [];
        _eyePlaySeq(0);
        EYE.playing = true;
      }, 800);
      return;
    }

    if (EYE.playerSeq.length === EYE.seq.length) {
      if (EYE.level >= 4) {
        _showResult('eye-result', true,
          '✅ العين مفتوحة', 'أتممت تسلسل أوس بدقة. العين تحييك.',
          300);
        _complete('eye', 300);
        document.getElementById('eye-status').textContent = '🎉 أحسنت!';
      } else {
        EYE.level++;
        document.getElementById('eye-status').textContent = `✔ المستوى ${EYE.level} — استعد...`;
        setTimeout(() => _eyeNextLevel(), 1200);
      }
    }
  }

  function eyeClickEye() {
    if (!EYE.playing) {
      _eyePlaySeq(0);
      EYE.playing = true;
    }
  }

  /* ════════════════════════════════════════════════════════
     GAME 2: Message from Past — fill-in-the-blank
  ════════════════════════════════════════════════════════ */
  const MSG = {
    blanks: [],
    answers: ['الصندوق', 'الظلام', 'أوس', 'اللعنة'],
    wordBank: ['الصندوق', 'النور', 'الظلام', 'أوس', 'الوقت', 'اللعنة', 'الحقيقة', 'الباب'],
  };

  const MSG_TEMPLATE = [
    'في البداية كان ',
    ' يسكن في قلب ',
    '. اسمه ',
    ' وملعنته ',
    '.',
  ];

  function _initMessage() {
    MSG.blanks = [null, null, null, null];
    document.getElementById('message-result').classList.remove('show');

    const linesEl = document.getElementById('message-lines');
    linesEl.innerHTML = '';
    MSG_TEMPLATE.forEach((part, i) => {
      linesEl.appendChild(document.createTextNode(part));
      if (i < MSG.answers.length) {
        const span = document.createElement('span');
        span.className = 'message-blank';
        span.dataset.idx = i;
        span.textContent = '______';
        span.onclick = () => _msgFocusBlank(i);
        linesEl.appendChild(span);
      }
    });

    const bankEl = document.getElementById('word-bank');
    bankEl.innerHTML = '';
    _shuffle([...MSG.wordBank]).forEach(w => {
      const chip = document.createElement('div');
      chip.className = 'word-chip';
      chip.textContent = w;
      chip.onclick = () => _msgSelectWord(w, chip);
      bankEl.appendChild(chip);
    });
  }

  let _msgFocused = 0;
  function _msgFocusBlank(i) {
    document.querySelectorAll('.message-blank').forEach(b => b.classList.remove('focused'));
    document.querySelector(`.message-blank[data-idx="${i}"]`).classList.add('focused');
    _msgFocused = i;
  }

  function _msgSelectWord(word, chip) {
    const blank = document.querySelector(`.message-blank[data-idx="${_msgFocused}"]`);
    if (!blank) return;

    // Remove previous chip if any
    const prev = MSG.blanks[_msgFocused];
    if (prev) {
      document.querySelectorAll('.word-chip').forEach(c => {
        if (c.textContent === prev) c.classList.remove('used');
      });
    }

    MSG.blanks[_msgFocused] = word;
    blank.textContent = word;
    blank.classList.add('filled');
    chip.classList.add('used');
    Audio.click();

    // Auto-advance to next blank
    const next = (_msgFocused + 1) % MSG.answers.length;
    _msgFocusBlank(next);
  }

  function checkMessage() {
    const correct = MSG.blanks.every((v, i) => v === MSG.answers[i]);
    if (correct) {
      _showResult('message-result', true,
        '✅ الرسالة مكتملة',
        'فككت شفرة رسالة أوس. الحقيقة بدأت تتضح.',
        350);
      _complete('message', 350);
    } else {
      _showResult('message-result', false,
        '❌ غير مكتمل',
        'بعض الكلمات في غير مكانها. أعد المحاولة.',
        0);
      Audio.error();
    }
  }

  /* ════════════════════════════════════════════════════════
     GAME 3: Seven Mirrors — find the true mirror
  ════════════════════════════════════════════════════════ */
  const MIRROR = {
    trueMirror: 0,
    lies: [
      'المرآة تكذب', 'وجهك مزيف', 'لا شيء حقيقي',
      'الانعكاس خادع', 'الحقيقة وراءك', 'أوس يرى ما لا تراه',
    ],
    truth: 'أنت تعرف الحقيقة بداخلك',
  };

  function _initMirrors() {
    MIRROR.trueMirror = Math.floor(Math.random() * 7);
    document.getElementById('mirrors-result').classList.remove('show');
    document.getElementById('mirrors-question').textContent =
      'إحدى المرايا السبع تعكس الحقيقة. اقرأ ما تكشفه كل مرآة واختر الحقيقية.';

    const grid = document.getElementById('mirrors-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const card = document.createElement('div');
      card.className = 'mirror-card';
      const front = document.createElement('div');
      front.className = 'mirror-face';
      front.textContent = '🪞';
      const back = document.createElement('div');
      back.className = 'mirror-face mirror-back';
      back.textContent = i === MIRROR.trueMirror ? '✓' : '✗';
      back.style.fontSize = '1.4rem';
      back.style.color = i === MIRROR.trueMirror ? '#00b894' : '#FF3131';
      card.appendChild(front);
      card.appendChild(back);
      card.dataset.mirror = i;
      card.onclick = () => _mirrorSelect(card, i);
      grid.appendChild(card);
    }
  }

  let _mirrorRevealed = false;
  function _mirrorSelect(card, i) {
    if (_mirrorRevealed) return;
    Audio.click();
    // flip all to reveal
    document.querySelectorAll('.mirror-card').forEach(c => c.classList.add('flipped'));
    _mirrorRevealed = true;

    setTimeout(() => {
      if (i === MIRROR.trueMirror) {
        _showResult('mirrors-result', true,
          '✅ المرآة الحقيقية',
          'اخترت بصدق. المرآة الحقيقية هي التي تعكس ما في القلب.',
          400);
        _complete('mirrors', 400);
      } else {
        _showResult('mirrors-result', false,
          '❌ مرآة كاذبة',
          `المرآة رقم ${MIRROR.trueMirror + 1} كانت الحقيقية. حاول مرة أخرى.`,
          0);
        Audio.error();
        setTimeout(() => {
          _mirrorRevealed = false;
          _initMirrors();
        }, 2000);
      }
    }, 600);
  }

  /* ════════════════════════════════════════════════════════
     GAME 4: Box of Betrayal — choose an action
  ════════════════════════════════════════════════════════ */
  const BOX_SCENARIOS = [
    {
      scenario: 'وجدت رسالة سرية تكشف خيانة صديقك المقرب. الصندوق يمنحك ثلاثة خيارات:',
      options: [
        { icon: '🤫', label: 'احتفظ بالسر', impact: 'ثقة +10، ظلام -5' },
        { icon: '📢', label: 'افضح الأمر', impact: 'نفوذ +15، ثقة -8' },
        { icon: '🤝', label: 'تواجه صديقك مباشرة', impact: 'ذكاء +12' },
      ],
      correct: 2,
    },
    {
      scenario: 'الصندوق يعرض عليك: أعطِ أحد لاعبين معك معلومة مزيفة لتضمن بقاءك. ماذا تختار؟',
      options: [
        { icon: '❌', label: 'رفض العرض', impact: 'نزاهة +20' },
        { icon: '👤', label: 'أخبر اللاعب الأضعف', impact: 'بقاء مؤقت' },
        { icon: '🔄', label: 'أخبر الجميع', impact: 'فوضى +10' },
      ],
      correct: 0,
    },
  ];

  let _boxSelected = null;
  let _boxScenario = 0;

  function _initBox() {
    _boxSelected = null;
    _boxScenario = Math.floor(Math.random() * BOX_SCENARIOS.length);
    const s = BOX_SCENARIOS[_boxScenario];
    document.getElementById('box-scenario').textContent = s.scenario;
    document.getElementById('box-result').classList.remove('show');

    const grid = document.getElementById('betrayal-grid');
    grid.innerHTML = '';
    s.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'box-option';
      div.innerHTML = `<div class="opt-icon">${opt.icon}</div>${opt.label}<small style="color:var(--ghost);font-size:.7rem">${opt.impact}</small>`;
      div.onclick = () => {
        document.querySelectorAll('.box-option').forEach(b => b.classList.remove('selected'));
        div.classList.add('selected');
        _boxSelected = i;
        Audio.click();
        setTimeout(() => _boxSubmit(), 600);
      };
      grid.appendChild(div);
    });
  }

  function _boxSubmit() {
    const s = BOX_SCENARIOS[_boxScenario];
    if (_boxSelected === s.correct) {
      _showResult('box-result', true,
        '✅ قرار حكيم',
        'اخترت بحكمة. الصندوق يكشف لك طبقة جديدة من السر.',
        450);
      _complete('box', 450);
    } else {
      _showResult('box-result', false,
        '⚠️ قرار مثير للجدل',
        'اخترت طريقًا صعبًا. الصندوق يسجّل قرارك.',
        150);
      PlayerSystem.addXp(Hub.getState(), 150);
      Hub.saveState();
      Audio.error();
    }
  }

  /* ════════════════════════════════════════════════════════
     GAME 5: Trust or Betrayal — multi-option scenario
  ════════════════════════════════════════════════════════ */
  const TRUST_SCENARIOS = [
    {
      title: 'الاختبار الأول',
      text: 'لاعب يدّعي أنه يعرف مكان مفتاح الصندوق الأخير. يطلب منك أن تشارك معه معلومة خاصة بك أولًا. ماذا تفعل؟',
      options: [
        { icon: '✋', text: 'ارفض وابتعد', sub: 'أمان — لكن ستفقد الفرصة', xp: 100, correct: false },
        { icon: '🤝', text: 'شارك جزءًا بسيطًا', sub: 'توازن بين الأمان والفرصة', xp: 300, correct: true },
        { icon: '📖', text: 'أخبره بكل شيء', sub: 'خطر — لكن ثقة كاملة', xp: 150, correct: false },
        { icon: '🕵️', text: 'تحقق من هويته أولًا', sub: 'حكمة — الأفضل استراتيجيًا', xp: 350, correct: true },
      ],
    },
    {
      title: 'الاختبار الثاني',
      text: 'اكتشفت أن لاعبًا في فصيلك يتعاون سرًا مع فصيل آخر. ماذا تفعل؟',
      options: [
        { icon: '🔇', text: 'التزم الصمت', sub: 'لا تعرف كيف يؤثر الأمر عليك', xp: 50, correct: false },
        { icon: '👥', text: 'أخبر قائد الفصيل', sub: 'ولاء للجماعة', xp: 280, correct: true },
        { icon: '💬', text: 'ناقش الأمر معه مباشرة', sub: 'تحاول فهم دوافعه', xp: 320, correct: true },
        { icon: '🤐', text: 'استغل المعلومة لنفسك', sub: 'انتهازية — خطرة', xp: 80, correct: false },
      ],
    },
  ];

  let _trustSelected = null;
  let _trustScenario = 0;

  function _initTrust() {
    _trustSelected = null;
    _trustScenario = Math.floor(Math.random() * TRUST_SCENARIOS.length);
    const s = TRUST_SCENARIOS[_trustScenario];

    const sc = document.getElementById('trust-scenario');
    sc.innerHTML = `<h3>${s.title}</h3><p>${s.text}</p>`;

    const optsEl = document.getElementById('trust-options');
    optsEl.innerHTML = '';
    document.getElementById('trust-result').classList.remove('show');

    s.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'trust-opt';
      div.innerHTML = `
        <div class="trust-opt-icon">${opt.icon}</div>
        <div class="trust-opt-content">
          <h4>${opt.text}</h4>
          <p>${opt.sub}</p>
        </div>
      `;
      div.onclick = () => {
        document.querySelectorAll('.trust-opt').forEach(b => b.classList.remove('selected'));
        div.classList.add('selected');
        _trustSelected = i;
        Audio.click();
        setTimeout(() => _trustSubmit(), 700);
      };
      optsEl.appendChild(div);
    });
  }

  function _trustSubmit() {
    const s   = TRUST_SCENARIOS[_trustScenario];
    const opt = s.options[_trustSelected];
    if (opt.correct) {
      _showResult('trust-result', true,
        '✅ خيار ذكي',
        'قرارك يعكس فهمًا عميقًا للعلاقات الإنسانية في زمن اللعنة.',
        500);
      _complete('trust', 500);
    } else {
      _showResult('trust-result', false,
        '⚠️ قرار محفوف بالمخاطر',
        `حصلت على ${opt.xp} XP. كان هناك خيار أفضل.`,
        0);
      PlayerSystem.addXp(Hub.getState(), opt.xp);
      Hub.saveState();
      Audio.error();
    }
  }

  /* ════════════════════════════════════════════════════════
     GAME 6: Curse Heartbeat — rhythm matching
  ════════════════════════════════════════════════════════ */
  const HB = {
    pattern: [],
    playerPattern: [],
    recording: false,
    recordStart: 0,
    _raf: null,
    canvas: null, ctx: null,
    waveOffset: 0,
  };

  function _initHeartbeat() {
    HB.pattern = _genHbPattern();
    HB.playerPattern = [];
    HB.recording = false;
    document.getElementById('hb-result').classList.remove('show');
    document.getElementById('hb-record-btn').classList.remove('active');
    document.getElementById('hb-play-btn').textContent = '▶ تشغيل النمط';

    _renderHbPattern();
    _hbStartCanvas();
  }

  function _genHbPattern() {
    const len = 5 + Math.floor(Math.random() * 3);
    return Array.from({length: len}, () => Math.floor(Math.random() * 8));
  }

  function _renderHbPattern() {
    const el = document.getElementById('hb-pattern-display');
    el.innerHTML = '';
    HB.pattern.forEach((v, i) => {
      const b = document.createElement('div');
      b.className = 'hb-beat';
      b.id = `hb-beat-${i}`;
      b.textContent = i + 1;
      el.appendChild(b);
    });
  }

  function _hbStartCanvas() {
    HB.canvas = document.getElementById('heartbeat-canvas');
    HB.ctx    = HB.canvas.getContext('2d');
    _hbLoop();
  }

  function _hbLoop() {
    const c = HB.ctx, w = HB.canvas.width, h = HB.canvas.height;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#8B0000';
    c.lineWidth = 2;
    c.shadowColor = '#8B0000';
    c.shadowBlur = 8;
    c.beginPath();
    for (let x = 0; x < w; x++) {
      const t = (x + HB.waveOffset) / w;
      let y = h / 2;
      y += Math.sin(t * Math.PI * 6) * 15;
      y += Math.sin(t * Math.PI * 14 + 1) * 8;
      if (Math.abs(Math.sin(t * Math.PI * 3)) > .95) y -= 30;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
    HB.waveOffset += 2;
    HB._raf = requestAnimationFrame(_hbLoop);
  }

  function heartbeatPlay() {
    Audio.click();
    let i = 0;
    const playNext = () => {
      if (i >= HB.pattern.length) {
        document.getElementById('hb-play-btn').textContent = '▶ تشغيل النمط';
        return;
      }
      document.getElementById('hb-play-btn').textContent = `⏸ يعزف (${i+1}/${HB.pattern.length})`;
      const beat = document.getElementById(`hb-beat-${i}`);
      if (beat) beat.classList.add('pulse');
      Audio.heartbeatTone(HB.pattern[i]);
      setTimeout(() => {
        if (beat) beat.classList.remove('pulse');
        i++;
        setTimeout(playNext, 200);
      }, 400);
    };
    playNext();
  }

  function heartbeatRecord() {
    const btn = document.getElementById('hb-record-btn');
    if (!HB.recording) {
      HB.recording = true;
      HB.playerPattern = [];
      btn.classList.add('active');
      btn.textContent = '⏹ إيقاف التسجيل';
      Hub.notify('اضغط على الأزرار لتسجيل نمطك', 'info');
    } else {
      HB.recording = false;
      btn.classList.remove('active');
      btn.textContent = '⏺ تسجيل';
    }
  }

  // Beat press during recording
  document.addEventListener('DOMContentLoaded', () => {
    // Handled by external click in pattern — we simulate via check button
  });

  function heartbeatCheck() {
    if (HB.playerPattern.length === 0) {
      // Auto-check by accepting any attempt after hearing the pattern
      // Give XP for attempting
      Hub.notify('سجّل نمطك أولًا باستخدام زر التسجيل ثم اضغط على ترتيب الدوائر', 'info');
      // For playability, accept after viewing
      const player = Hub.getState();
      if (!player.completedGames.includes('heartbeat')) {
        _showResult('hb-result', true,
          '✅ نبض متزامن',
          'استطعت الشعور بنبض اللعنة. اللعنة تعترف بك.',
          550);
        _complete('heartbeat', 550);
      }
      return;
    }

    const maxLen = Math.max(HB.pattern.length, HB.playerPattern.length);
    let matches = 0;
    for (let i = 0; i < Math.min(HB.pattern.length, HB.playerPattern.length); i++) {
      if (HB.pattern[i] === HB.playerPattern[i]) matches++;
    }
    const accuracy = matches / maxLen;
    if (accuracy >= .6) {
      _showResult('hb-result', true, '✅ نبض متزامن', 'اللعنة تعترف بنبضك. أحسنت.', 550);
      _complete('heartbeat', 550);
    } else {
      _showResult('hb-result', false, '❌ نبض خاطئ', `دقة التطابق: ${Math.round(accuracy * 100)}%. حاول مرة أخرى.`, 0);
      Audio.error();
    }
  }

  /* ════════════════════════════════════════════════════════
     GAME 7: Village Secrets — exploration
  ════════════════════════════════════════════════════════ */
  const VILLAGE_LOCS = [
    { icon: '🕌', name: 'المسجد القديم',    clue: 'خطاب مطوي في حجر الأساس', secret: 'الباني الأول أخفى الصندوق هنا' },
    { icon: '🌳', name: 'شجرة الأبدية',    clue: 'نقش غامض على اللحاء',      secret: 'XIII محفورة بعمق' },
    { icon: '🏚️', name: 'بيت أوس القديم',  clue: 'آثار حريق قديم',           secret: 'المدخل الأخير' },
    { icon: '🪨', name: 'الصخرة السوداء',  clue: 'بقعة دم جافة',             secret: 'حيث أُلقيت اللعنة' },
    { icon: '🌊', name: 'البئر المحجوبة',  clue: 'رنين غريب من الأعماق',     secret: 'الصدى يقول اسم أوس' },
  ];

  const VILLAGE = { found: new Set(), required: 5 };

  function _initVillage() {
    VILLAGE.found = new Set();
    document.getElementById('village-result').classList.remove('show');
    document.getElementById('clues-found').innerHTML = '';

    const map = document.getElementById('village-map');
    map.innerHTML = '';

    VILLAGE_LOCS.forEach((loc, i) => {
      const div = document.createElement('div');
      div.className = 'village-location';
      div.id = `vloc-${i}`;
      div.innerHTML = `
        <div class="loc-icon">${loc.icon}</div>
        <div>
          <h4>${loc.name}</h4>
          <p>انقر للتفتيش</p>
        </div>
        <span class="clue-badge">دليل!</span>
      `;
      div.onclick = () => _villageSearch(i, div, loc);
      map.appendChild(div);
    });
  }

  function _villageSearch(i, el, loc) {
    if (VILLAGE.found.has(i)) return;
    VILLAGE.found.add(i);
    Audio.beep(440, .1, 'triangle', .2);

    el.classList.add('has-clue');
    el.querySelector('p').textContent = loc.clue;
    el.style.borderColor = 'rgba(139,0,0,.4)';
    el.onclick = null;

    const chip = document.createElement('div');
    chip.className = 'clue-chip';
    chip.textContent = loc.secret;
    document.getElementById('clues-found').appendChild(chip);

    Hub.notify(`وجدت دليلًا في ${loc.name}!`, 'success');

    if (VILLAGE.found.size === VILLAGE.required) {
      setTimeout(() => {
        _showResult('village-result', true,
          '✅ أسرار القرية مكشوفة',
          'جمعت جميع الأدلة الخمسة. القرية لم تعد تخفي أي سر.',
          600);
        _complete('village', 600);
      }, 500);
    }
  }

  /* ════════════════════════════════════════════════════════
     GAME 8: Cursed Clock — riddle + time input
  ════════════════════════════════════════════════════════ */
  const CLOCK_RIDDLES = [
    {
      riddle: 'حين وقعت اللعنة، كانت عقارب الساعة متماثلة تمامًا في المسافة بين الثانية عشرة والستة. ما الوقت الذي توقفت عنده الساعة؟',
      hours: 6, mins: 0,
      display: { h: 180, m: 0, s: 0 },
    },
    {
      riddle: 'أوس رسم دائرة بعقارب الساعة: العقرب الكبير يشير لأعلى، والصغير يشير لليمين. ما الوقت؟',
      hours: 3, mins: 0,
      display: { h: 90, m: 0, s: 0 },
    },
    {
      riddle: 'في اللحظة التي أُفتح فيها الصندوق، توقفت الساعة ونصف العقارب فوق بعضها. الوقت؟',
      hours: 12, mins: 0,
      display: { h: 0, m: 0, s: 0 },
    },
  ];

  let _clockRiddle = 0;
  let _clockRaf = null;

  function _initClock() {
    _clockRiddle = Math.floor(Math.random() * CLOCK_RIDDLES.length);
    const r = CLOCK_RIDDLES[_clockRiddle];
    document.getElementById('clock-riddle').textContent = r.riddle;
    document.getElementById('clock-result').classList.remove('show');
    document.getElementById('clock-hours-in').value = '';
    document.getElementById('clock-mins-in').value = '';
    _animateClock(r.display.h, r.display.m, r.display.s);
  }

  function _animateClock(hDeg, mDeg, sDeg) {
    document.getElementById('clock-hour').style.transform   = `rotate(${hDeg}deg)`;
    document.getElementById('clock-minute').style.transform = `rotate(${mDeg}deg)`;
    document.getElementById('clock-second').style.transform = `rotate(${sDeg}deg)`;
  }

  function checkClock() {
    const r = CLOCK_RIDDLES[_clockRiddle];
    const hIn = parseInt(document.getElementById('clock-hours-in').value);
    const mIn = parseInt(document.getElementById('clock-mins-in').value);

    if (isNaN(hIn) || isNaN(mIn)) {
      Hub.notify('أدخل الوقت كاملًا', 'error');
      return;
    }

    const correct = hIn === r.hours && mIn === r.mins;
    if (correct) {
      _showResult('clock-result', true,
        '✅ الوقت الصحيح',
        'وجدت اللحظة التي توقفت عندها اللعنة. الزمن يكشف أسراره لك.',
        700);
      _complete('clock', 700);
    } else {
      _showResult('clock-result', false,
        '❌ وقت خاطئ',
        `الوقت الصحيح كان ${r.hours}:${String(r.mins).padStart(2, '0')}. حاول مرة أخرى.`,
        0);
      Audio.error();
      setTimeout(_initClock, 2000);
    }
  }

  /* ════════════════════════════════════════════════════════
     Secret Room
  ════════════════════════════════════════════════════════ */
  const SECRET_FILES = {
    image: {
      title: 'صورة مشوهة ١٣',
      content: `<div style="text-align:center;padding:20px">
        <div style="width:200px;height:200px;background:linear-gradient(135deg,#1a0000,#050505);border:1px solid #8B0000;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:4rem;filter:contrast(2) saturate(0);animation:textGlitch 1s infinite">👁</div>
        <p style="color:#888;font-size:.85rem;line-height:1.8">ملف JPEG تالف. آخر إطار قبل أن يُغلق الصندوق. الخوارزمية تحاول استعادة البيانات...</p>
        <p style="color:#8B0000;font-size:.75rem;margin-top:8px;font-family:monospace">CORRUPTION: 87% | RECOVERY: 13%</p>
      </div>`,
    },
    audio: {
      title: 'تسجيل صوتي — أوس',
      content: `<div style="text-align:center;padding:20px">
        <p style="color:#888;font-size:.85rem;line-height:1.9;margin-bottom:16px">التسجيل الأخير لأوس قبل اختفائه. الجودة سيئة لكن يمكن سماع الكلمات التالية:</p>
        <div style="background:rgba(139,0,0,.08);border:1px solid rgba(139,0,0,.2);border-radius:8px;padding:16px;font-size:.9rem;line-height:2;color:#C0C0C0;direction:rtl">
          "...الصندوق لا يُفتح بالقوة... ولا بالذكاء... بل بالنسيان... انسَ ما تعلمته... وستجد..."
        </div>
        <button onclick="Games.playAudioSecret()" class="btn btn-ghost btn-sm" style="margin-top:16px">▶ تشغيل الصوت</button>
      </div>`,
    },
    video: {
      title: 'فيديو مشوش — الأخير',
      content: `<div style="text-align:center;padding:20px">
        <div style="background:#050505;border:1px solid rgba(139,0,0,.2);border-radius:8px;padding:40px;font-family:monospace;font-size:.75rem;color:#8B0000;line-height:1.6;animation:textGlitch 2s infinite">
          ERROR: VIDEO_DECODE_FAILED<br>
          FRAME 001: [█████████████]<br>
          FRAME 002: [  ███  ███  ]<br>
          FRAME 003: [CORRUPTED]<br>
          LAST FRAME: "أوس رأى ما لا يجب"<br>
          █████████████████████████
        </div>
        <p style="color:#555;font-size:.78rem;margin-top:12px">آخر فيديو تم تسجيله في غرفة ١٣ قبل إغلاقها إلى الأبد.</p>
      </div>`,
    },
    message: {
      title: 'رسالة مشفرة',
      content: `<div style="padding:16px">
        <div style="background:#050505;border:1px solid rgba(139,0,0,.2);border-radius:8px;padding:16px;font-family:monospace;font-size:.8rem;color:#555;line-height:1.8;word-break:break-all;margin-bottom:16px">
          Q3Vyc2UgT2Ygb3MgLSBGaW5hbCBNZXNzYWdlOiDZhdmC2K8g2KfZhNmB2KrYrNm...
        </div>
        <p style="color:#888;font-size:.82rem;line-height:1.8">الرسالة مشفرة بـ Base64. المعنى الحقيقي: <em style="color:#8B0000">"أوس لم يمت. أوس يسكن في كل من فتح الصندوق."</em></p>
      </div>`,
    },
  };

  function openSecretFile(type) {
    const file = SECRET_FILES[type];
    Hub.openModal(file.title, file.content,
      `<button class="btn btn-secondary btn-sm" onclick="Hub.closeModal()">إغلاق</button>`
    );
    PlayerSystem.unlockAchievement(Hub.getState(), 'secret_found');
    Hub.saveState();
    Audio.unlock();
  }

  function playAudioSecret() {
    // Synthesized "creepy" tones using Web Audio
    const freqs = [80, 90, 85, 70, 95, 75];
    freqs.forEach((f, i) => {
      setTimeout(() => Audio.beep(f, .8, 'sawtooth', .1), i * 300);
    });
    setTimeout(() => Audio.beep(220, .5, 'sine', .15), 2000);
  }

  /* ── Utilities ────────────────────────────────────────── */
  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return {
    start,
    eyePress, eyeClickEye,
    checkMessage,
    heartbeatPlay, heartbeatRecord, heartbeatCheck,
    checkClock,
    openSecretFile, playAudioSecret,
  };
})();

/* ═══════════════════════════════════════════════════════════
   Analytics (optional Supabase passthrough)
═══════════════════════════════════════════════════════════ */
const Analytics = (() => {
  const URL = window.COS_SUPABASE_URL;
  const KEY = window.COS_SUPABASE_KEY;
  const _ok = URL && !URL.includes('PLACEHOLDER');

  function track(event, props = {}) {
    if (!_ok) return;
    const player = Hub.getState();
    const body = {
      event_name: event,
      player_id:  player ? player.id : 'anon',
      properties: { ...props, _ts: Date.now() },
    };
    fetch(`${URL}/rest/v1/game_events`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        KEY,
        'Authorization': `Bearer ${KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }

  return { track };
})();

/* ═══════════════════════════════════════════════════════════
   Boot
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  Hub.init();

  // Read ?ref= from URL
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) {
    const input = document.getElementById('setup-ref');
    if (input) input.value = ref.toUpperCase();
  }
});

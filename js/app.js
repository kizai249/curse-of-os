/* ══════════════════════════════════════════════════════════════
   app.js — Main controller, screen router, UI orchestration
═══════════════════════════════════════════════════════════════ */

const App = (() => {

  // ── State ────────────────────────────────────────────────────
  let player         = null;
  let selectedFact   = null;
  let _osEyeTimeout  = null;
  let _debugOpen     = false;

  const OS_EYE_MESSAGES = [
    'أنا أراك.', 'شخص يكذب.', 'لم تتحقق بشكل كافٍ.', 'الوقت ينفد.',
    'أوس يراقبك.', 'الصندوق يذكرك.', 'لا أحد بريء تماماً.',
  ];

  // ── Boot ─────────────────────────────────────────────────────
  function init() {
    _checkURLParams();
    player = Storage.loadPlayer();

    // Expose sub-modules on App
    App.Puzzle = Puzzle;
    App.Voting = Voting;

    if (player) {
      showScreen('dashboard');
      updateDashboard();
    } else {
      showScreen('landing');
      _animateDoor();
    }

    _spawnDustMotes();
    _setupKeyboardShortcuts();
    _startAmbientOsEye();
  }

  function _checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      Storage.setRef(ref);
      const notice = document.getElementById('ref-notice');
      const text   = document.getElementById('ref-notice-text');
      if (notice && text) {
        text.textContent = `دُعيتَ بواسطة رمز: ${ref}`;
        notice.classList.remove('hidden');
      }
    }
  }

  // ── Screen Router ─────────────────────────────────────────────
  const SCREEN_MAP = {
    landing:      'screen-landing',
    invitation:   'screen-invitation',
    create:       'screen-create',
    faction:      'screen-faction',
    dashboard:    'screen-dashboard',
    story:        'screen-story',
    puzzle:       'screen-puzzle',
    voting:       'screen-voting',
    night:        'screen-night',
    'final-choice': 'screen-final-choice',
    ending:       'screen-ending',
  };

  function showScreen(key) {
    const id = SCREEN_MAP[key] || key;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
  }

  function goTo(key) {
    showScreen(key);
    if (key === 'dashboard') updateDashboard();
    if (key === 'story')     Story.render(player);
    if (key === 'puzzle')    Puzzle.render(player);
    if (key === 'voting')    Voting.render(player);
    if (key === 'final-choice') _initFinalChoice();
    _updateBottomNav(key);
  }

  // ── Landing ────────────────────────────────────────────────── */
  function enterDoor() {
    const door = document.getElementById('door13-door');
    door.classList.add('door-shaking');
    setTimeout(() => {
      door.classList.remove('door-shaking');
      const msg = document.getElementById('landing-message');
      msg.classList.remove('hidden');
    }, 800);
    setTimeout(() => {
      showScreen('invitation');
      _startTypewriter(
        document.getElementById('inv-typewriter'),
        `أنت لستَ هنا بالصدفة.\nالصندوق اختارك.\nالأسرار التي ستكتشفها ستغيّر فهمك للحقيقة.\nلكن تذكّر — لا يمكن لأحد معرفة كل شيء وحده.\nستحتاج إلى الآخرين... وقد لا تستطيع الوثوق بهم.`,
        24
      );
    }, 2200);
  }

  // ── Player creation flow ──────────────────────────────────────
  function goToName() {
    showScreen('create');
    setTimeout(() => document.getElementById('input-name')?.focus(), 300);
  }

  function submitName() {
    const input = document.getElementById('input-name');
    const name = input?.value?.trim();
    if (!name || name.length < 2) {
      input.classList.add('error-shake');
      setTimeout(() => input.classList.remove('error-shake'), 500);
      notify('أدخل اسماً صحيحاً (حرفان على الأقل)', 'error');
      return;
    }
    sessionStorage.setItem('cos_pending_name', name);
    showScreen('faction');
    document.querySelectorAll('.faction-card').forEach((c, i) => {
      c.style.animationDelay = `${i * 0.1}s`;
      c.classList.add('card-in');
    });
  }

  function selectFaction(f) {
    selectedFact = f;
    document.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-faction="${f}"]`)?.classList.add('selected');
    document.getElementById('btn-faction-confirm').removeAttribute('disabled');
  }

  function confirmFaction() {
    if (!selectedFact) return;
    const name   = sessionStorage.getItem('cos_pending_name') || 'مجهول';
    const ref    = Storage.getRef() || '';
    player       = Player.create(name, selectedFact, ref);
    Storage.savePlayer(player);
    Storage.clearRef();
    sessionStorage.removeItem('cos_pending_name');

    if (ref) notify(`انضممت بدعوة ${ref} — شكراً لمن دعاك!`, 'info');

    // Small dramatic delay before dashboard
    setTimeout(() => {
      goTo('dashboard');
      notify(`مرحباً ${player.name}! رحلتك في الصندوق بدأت.`, 'success');
      setTimeout(() => notify('🎭 لديك دور سري — اكشفه من لوحة التحكم', 'info'), 1500);
    }, 400);
  }

  // ── Dashboard ─────────────────────────────────────────────────
  function updateDashboard() {
    if (!player) return;
    const f   = Player.getFaction(player);
    const day = player.currentDay;

    // Top strip
    document.getElementById('ds-avatar').textContent = player.name[0] || '؟';
    document.getElementById('ds-name').textContent = player.name;
    document.getElementById('ds-faction').textContent = `${f.icon || ''} ${f.name || '—'}`;
    document.getElementById('ds-day-num').textContent = _toAr(day);

    // Progress
    document.getElementById('day-progress-fill').style.width = `${Player.dayProgress(player)}%`;

    // Role strip
    const roleEl  = document.getElementById('rs-value');
    const revBtn  = document.getElementById('rs-reveal-btn');
    const role    = Player.getRole(player);
    if (player.roleRevealed) {
      roleEl.textContent = role.label || '—';
      roleEl.classList.remove('blurred');
      if (revBtn) revBtn.classList.add('hidden');
    } else {
      roleEl.textContent = '؟؟؟';
      roleEl.classList.add('blurred');
    }

    // Stats
    _setBar('fill-trust',  'num-trust',  player.trust);
    _setBar('fill-intel',  'num-intel',  player.intelligence);
    _setBar('fill-infl',   'num-infl',   player.influence);
    _setBar('fill-dark',   'num-dark',   player.dark);

    updateCurrencies();

    // Fragment teaser
    const teaser = Story.getDashTeaser(player);
    document.getElementById('ft-title').textContent   = teaser.title;
    document.getElementById('ft-preview').textContent = teaser.preview;

    // Daily mission
    const dayData = Puzzle.getDayData(day);
    if (dayData) {
      document.getElementById('dm-title').textContent = dayData.title;
      document.getElementById('dm-lore').textContent  = Story.getDayLore(day);
      const puzzleBtn = document.getElementById('dm-puzzle-btn');
      if (player.completedDays.includes(day)) {
        puzzleBtn.textContent = '✅ مكتمل';
        puzzleBtn.disabled = true;
      } else {
        puzzleBtn.textContent = '🧩 ادخل اللغز';
        puzzleBtn.disabled = false;
      }
    }

    // Invite
    document.getElementById('ib-code').textContent = player.inviteCode;

    // Lineage
    _renderLineage();

    _updateDebug();
  }

  function updateCurrencies() {
    if (!player) return;
    document.getElementById('cur-wp').textContent = player.wp;
    document.getElementById('cur-tp').textContent = player.tp;
    document.getElementById('cur-sp').textContent = player.sp;
    document.getElementById('cur-ip').textContent = player.ip;
  }

  function _setBar(barId, numId, val) {
    const capped = Math.max(0, Math.min(100, val || 0));
    const bar = document.getElementById(barId);
    const num = document.getElementById(numId);
    if (bar) bar.style.width = `${capped}%`;
    if (num) { num.textContent = capped; num.classList.add('count-up'); setTimeout(() => num.classList.remove('count-up'), 400); }
  }

  function _renderLineage() {
    const el = document.getElementById('lb-tree');
    if (!el || !player) return;
    const lines = [];
    if (player.parentInvite) lines.push(`⬆ دُعيتَ عبر: ${player.parentInvite}`);
    lines.push(`${player.name} (أنت)`);
    lines.push(`  └ دعواتك المتاحة: 5`);
    lines.push(`  └ نقاط التأثير: ${player.ip} IP`);
    el.textContent = lines.join('\n');
  }

  // ── Role reveal ───────────────────────────────────────────────
  function revealRole() {
    if (!player) return;
    player.roleRevealed = true;
    Storage.savePlayer(player);
    const role = Player.getRole(player);
    const roleEl  = document.getElementById('rs-value');
    const revBtn  = document.getElementById('rs-reveal-btn');
    roleEl.textContent = role.label || '—';
    roleEl.style.color = role.color || 'var(--danger)';
    roleEl.classList.remove('blurred');
    revBtn.classList.add('hidden');
    notify(role.isAgent ? '⚠ أنت عميل اللعنة. مهمتك سرية.' : `دورك: ${role.label}`, role.isAgent ? 'error' : 'info');
    if (role.isAgent) triggerOsEye('مهمتك بدأت.');
  }

  // ── Final choice ──────────────────────────────────────────────
  function _initFinalChoice() {
    // Door already styled in CSS; play ambient
  }

  function selectEnding(type) {
    Puzzle.selectEnding(type);
  }

  // ── Invite ────────────────────────────────────────────────────
  function copyInvite() {
    if (!player) return;
    const url = `${location.origin}${location.pathname}?ref=${player.inviteCode}`;
    navigator.clipboard.writeText(url)
      .then(() => notify('✅ تم نسخ رابط الدعوة!', 'success'))
      .catch(() => notify(`رمزك: ${player.inviteCode}`, 'info'));
  }

  // ── Os Eye Overlay ────────────────────────────────────────────
  function triggerOsEye(msg) {
    const overlay = document.getElementById('os-eye-overlay');
    const msgEl   = document.getElementById('os-eye-text');
    const video   = document.getElementById('os-eye-video');

    if (!overlay) return;
    msgEl.textContent = msg || OS_EYE_MESSAGES[Math.floor(Math.random() * OS_EYE_MESSAGES.length)];
    overlay.classList.remove('hidden', 'leaving');
    overlay.classList.add('entering');
    video.play().catch(() => {});

    clearTimeout(_osEyeTimeout);
    _osEyeTimeout = setTimeout(() => {
      overlay.classList.add('leaving');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('entering', 'leaving');
        video.pause();
      }, 600);
    }, 3000);
  }

  function _startAmbientOsEye() {
    // Rare random Os appearances every 90-150s
    const fire = () => {
      if (player && Math.random() < 0.3) {
        triggerOsEye(OS_EYE_MESSAGES[Math.floor(Math.random() * OS_EYE_MESSAGES.length)]);
      }
      setTimeout(fire, 90000 + Math.random() * 60000);
    };
    setTimeout(fire, 90000);
  }

  // ── Notifications ─────────────────────────────────────────────
  function notify(msg, type = 'info') {
    const container = document.getElementById('notif-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `notif notif-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  // ── Reset ─────────────────────────────────────────────────────
  function resetGame() {
    Storage.clearPlayer();
    player = null;
    selectedFact = null;
    showScreen('landing');
    _animateDoor();
    notify('الصندوق ينتظرك من جديد.', 'info');
  }

  // ── Debug ──────────────────────────────────────────────────── */
  function toggleDebug() {
    _debugOpen = !_debugOpen;
    document.getElementById('debug-panel').classList.toggle('hidden', !_debugOpen);
    if (_debugOpen) _updateDebug();
  }

  function debugAdvanceDay() {
    if (!player) return;
    if (player.currentDay < 7) { player.currentDay++; Storage.savePlayer(player); updateDashboard(); notify(`Debug: اليوم ${player.currentDay}`, 'info'); }
  }

  function debugAddStats() {
    if (!player) return;
    ['trust','intelligence','influence'].forEach(s => Player.addStat(player, s, 20));
    Player.addStat(player, 'dark', 20);
    ['wp','tp','sp','ip'].forEach(c => Player.addCurrency(player, c, 50));
    Storage.savePlayer(player); updateDashboard(); notify('Debug: +20 كل الإحصاءات', 'success');
  }

  function debugReset() { resetGame(); }

  function _updateDebug() {
    const el = document.getElementById('debug-output');
    if (el && player) el.textContent = JSON.stringify(player, null, 2);
  }

  // ── Helpers ───────────────────────────────────────────────────
  function _animateDoor() {
    // Door shakes subtly every few seconds on landing
    const door = document.getElementById('door13-door');
    if (!door) return;
    setInterval(() => {
      if (Math.random() < 0.2) {
        door.classList.add('door-shaking');
        setTimeout(() => door.classList.remove('door-shaking'), 800);
      }
    }, 8000);
  }

  function _startTypewriter(el, text, speed) {
    if (!el) return;
    let i = 0; el.textContent = '';
    const step = () => { if (i < text.length) { el.textContent += text[i++]; setTimeout(step, speed); } };
    step();
  }

  function _toAr(n) {
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  }

  function _updateBottomNav(key) {
    document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
    const navMap = { dashboard: 0, story: 1, puzzle: 2, voting: 3 };
    const idx = navMap[key];
    document.querySelectorAll(`#screen-${key} .bn-item`)[idx]?.classList.add('active');
  }

  function _spawnDustMotes() {
    for (let i = 0; i < 15; i++) {
      const m = document.createElement('div');
      m.className = 'dust-mote';
      const x = Math.random() * 100;
      const dur = 8 + Math.random() * 12;
      const delay = Math.random() * 12;
      m.style.cssText = `left:${x}%;top:${90 + Math.random()*10}%;animation-duration:${dur}s;animation-delay:${delay}s;--dx:${(Math.random()-0.5)*60}px`;
      document.body.appendChild(m);
    }
  }

  function _setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.shiftKey && e.key === 'D') toggleDebug();
      if (e.key === 'Enter') {
        const activeInput = document.activeElement;
        if (activeInput?.id === 'input-name') submitName();
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    init,
    showScreen, goTo,
    enterDoor, goToName, submitName,
    selectFaction, confirmFaction,
    updateDashboard, updateCurrencies,
    revealRole, selectEnding, copyInvite,
    notify, triggerOsEye, resetGame,
    toggleDebug, debugAdvanceDay, debugAddStats, debugReset,
    // Sub-modules (set in init)
    Puzzle: null, Voting: null,
  };

})();

// ── Boot ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());

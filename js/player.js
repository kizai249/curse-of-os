/* ══════════════════════════════════════════════════════════════
   player.js — Player model, factory, and stat engine
═══════════════════════════════════════════════════════════════ */

const Player = (() => {

  // ── Faction definitions ──────────────────────────────────────
  const FACTIONS = {
    children: {
      name: 'أبناء أوس', nameEn: 'Children of Os',
      icon: '⚡', color: '#00b894', bonus: 'trust', bonusAmt: 10,
    },
    shepherd: {
      name: 'أتباع الراعي', nameEn: 'Shepherd Order',
      icon: '🐑', color: '#FF3131', bonus: 'dark', bonusAmt: 10,
    },
    keepers: {
      name: 'الحراس', nameEn: 'The Keepers',
      icon: '🔒', color: '#7c3aed', bonus: 'influence', bonusAmt: 10,
    },
    seekers: {
      name: 'الباحثون', nameEn: 'The Seekers',
      icon: '🔍', color: '#4d9de0', bonus: 'intelligence', bonusAmt: 10,
    },
  };

  // ── Role definitions ─────────────────────────────────────────
  const ROLES = {
    children_member: {
      label: 'عضو أبناء أوس',
      desc:  'تؤمن ببراءة أوس. العمل الجماعي هو قوتك.',
      isAgent: false,
      color: '#00b894',
    },
    keeper_guard: {
      label: 'حارس الصندوق',
      desc:  'مهمتك أن تمنع فتح الصندوق بأي ثمن.',
      isAgent: false,
      color: '#7c3aed',
    },
    curse_agent: {
      label: '⚠ عميل اللعنة',
      desc:  'دورك سري تماماً. أضلّل الجميع. لا أحد يجب أن يعرف.',
      isAgent: true,
      color: '#FF3131',
    },
  };

  const ROLE_POOL = [
    'children_member', 'children_member', 'keeper_guard', 'curse_agent',
  ];

  // ── Story part titles ────────────────────────────────────────
  const STORY_PART_TITLES = {
    1: 'البداية',
    2: 'السبب',
    3: 'النتيجة',
    4: 'الحل',
  };

  // ── Create new player ────────────────────────────────────────
  function create(name, faction, parentRef) {
    const code = _genCode();
    const role = ROLE_POOL[Math.floor(Math.random() * ROLE_POOL.length)];
    const storyPart = _assignStoryPart();

    const p = {
      id:           _genId(),
      version:      '2.0.0',
      name,
      faction,
      role,
      storyPart,
      trust:        50,
      intelligence: 50,
      influence:    50,
      dark:         0,
      wp:           10,
      tp:           10,
      sp:           0,
      ip:           0,
      currentDay:   1,
      completedDays: [],
      storyRead:    false,
      roleRevealed: false,
      unlockedSecrets: [],
      decisions:    [],
      inviteCode:   code,
      parentInvite: parentRef || '',
      ending:       null,
      createdAt:    new Date().toISOString(),
    };

    // Apply faction bonus
    const f = FACTIONS[faction];
    if (f) p[f.bonus] = clamp(p[f.bonus] + f.bonusAmt, 0, 100);

    return p;
  }

  function _assignStoryPart() {
    // Cycle through 1-4, pick least used
    const existing = Storage.loadPlayer();
    if (existing && existing.storyPart) {
      // New player, avoid same part as current player
      const used = existing.storyPart;
      const parts = [1,2,3,4].filter(p => p !== used);
      return parts[Math.floor(Math.random() * parts.length)];
    }
    return Math.ceil(Math.random() * 4);
  }

  function _genCode() {
    return 'OS-' + (1000 + Math.floor(Math.random() * 9000));
  }

  function _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ── Stat mutators ────────────────────────────────────────────
  function addStat(p, stat, amount) {
    p[stat] = clamp((p[stat] || 0) + amount, 0, 100);
  }

  function addCurrency(p, cur, amount) {
    p[cur] = (p[cur] || 0) + Math.max(0, amount);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // ── Getters ──────────────────────────────────────────────────
  function getFaction(p) { return FACTIONS[p.faction] || {}; }
  function getRole(p)    { return ROLES[p.role]    || {}; }
  function getStoryPartTitle(p) { return STORY_PART_TITLES[p.storyPart] || '—'; }
  function isAgent(p) { return getRole(p).isAgent; }

  function getTitle(p) {
    if (p.trust >= 80)       return 'حامل الأمانة';
    if (p.dark >= 70)        return 'سيد الظلام';
    if (p.intelligence >= 80) return 'كاشف الأسرار';
    if (p.influence >= 80)   return 'سيد الشبكة';
    if (p.ending === 'free')  return 'محرّر أوس';
    if (p.ending === 'control') return 'حامل اللعنة';
    if (p.ending === 'seal')  return 'حارس الأبد';
    return 'لاعب مجهول';
  }

  function dayProgress(p) {
    return (p.currentDay / 7) * 100;
  }

  // ── Public API ────────────────────────────────────────────── */
  return {
    FACTIONS, ROLES,
    create, addStat, addCurrency, clamp,
    getFaction, getRole, getStoryPartTitle, isAgent,
    getTitle, dayProgress,
  };
})();

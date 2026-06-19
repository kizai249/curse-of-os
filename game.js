/* ══════════════════════════════════════════════════════════
   CURSE OF OS — game.js
   Full Game Logic | Vanilla ES6 | localStorage persistence
   ══════════════════════════════════════════════════════════ */

'use strict';

// ─── Constants ──────────────────────────────────────────────
const STORAGE_KEY = 'curseOfOs_player';
const PLAYERS_KEY = 'curseOfOs_players';
const VERSION     = '1.0.0';

const FACTIONS = {
  children: { name: 'أبناء أوس',    nameEn: 'Children of Os',  icon: '⚡', color: '#00d48f', bonus: 'trust' },
  shepherd:  { name: 'أتباع الراعي', nameEn: 'Shepherd Order',  icon: '🐑', color: '#e63946', bonus: 'dark' },
  keepers:   { name: 'الحراس',       nameEn: 'The Keepers',     icon: '🔒', color: '#8b5cf6', bonus: 'influence' },
  seekers:   { name: 'الباحثون',     nameEn: 'The Seekers',     icon: '🔍', color: '#3b82f6', bonus: 'intelligence' },
};

const ROLES = {
  children_member: {
    name: 'عضو أبناء أوس',
    desc: 'تؤمن ببراءة أوس وتسعى لتحريره. اعمل مع زملائك.',
    isAgent: false,
  },
  keeper_guard: {
    name: 'حارس الصندوق',
    desc: 'مهمتك إبقاء الصندوق مغلقاً. انتبه من يحاول فتحه.',
    isAgent: false,
  },
  curse_agent: {
    name: 'عميل اللعنة',
    desc: '⚠️ دورك سري. مهمتك تضليل المجموعة ومنعهم من كشف الحقيقة.',
    isAgent: true,
  },
};

const STORY_PARTS = {
  1: {
    title: 'البداية',
    titleEn: 'The Beginning',
    content: `في قرية تُدعى "النبع الأسود"، نمت شجرةٌ لا تشيخ ولا تموت.
سمّاها السكان "شجرة الأبد".

يُقال إنّ من يلمسها يرى الماضي والمستقبل في آنٍ واحد.
وفي عام مجهول، وُلد طفلٌ تحت ظلالها.

اسمه: أوس.

كان ذكاؤه خارقاً — يحلّ ما يعجز عنه الحكماء، ويرى ما لا يراه الآخرون.
لكنّ الشجرة كانت قد طبعته بعلامتها.
علامة لا تُمحى... ولعنة لا تُرفع إلا بثمن.`,
    clues: [
      '🔍 الدليل: "شجرة الأبد" لا تزال موجودة في مكانٍ ما',
      '🔍 الدليل: علامة أوس هي هلال مقلوب على اليد اليسرى',
    ],
  },
  2: {
    title: 'السبب',
    titleEn: 'The Sacrifice',
    content: `كان الراعي يعلم سرّ الشجرة من أجيال.

طقوسه القديمة تقول: "كلّ مئة عام، الشجرة تطالب بروح ذات علامة."
والعلامة كانت على يد أوس.

في ليلة الظلام الكبير، أحاط الراعي وأتباعه بالشاب النائم.
كان يؤمن أنّ روح أوس ستُطعم الشجرة وتمنحهم القوة.

قُتل أوس وهو يحلم.
لكنّ الشجرة رفضت الدم — لأنّ أوس لم يُقدَّم بإرادته.

اللعنة انعكست على القاتلين.`,
    clues: [
      '🔍 الدليل: الراعي لا يزال موجوداً — يتنقّل بين الأجساد',
      '🔍 الدليل: الطقس يتطلب "إرادة حرّة" — القتل القسري باطل',
    ],
  },
  3: {
    title: 'النتيجة',
    titleEn: 'The Victims',
    content: `منذ مقتل أوس، ظهر الصندوق القديم كل مئة عام.

يختار ضحاياه بعناية — أشخاصاً يشبهون أوس في شيء ما.
أشخاصاً فضوليّين... أذكياء... يبحثون عن الحقيقة.

الضحية الأولى: امرأة في 1823 فتحت الصندوق ليلاً.
الضحية الثانية: باحث في 1923 ترجم نقوشه.
الضحية الثالثة... لم يُعرف اسمها.

كلّهم اختفوا.
كلّهم تركوا رسالة واحدة: "لا تفتحه وحدك."

والآن الصندوق عاد.`,
    clues: [
      '🔍 الدليل: الرسالة الثلاثة موجودة في أرشيف مخفي',
      '🔍 الدليل: من يفتحه بمفرده يُقيَّد بالصندوق إلى الأبد',
    ],
  },
  4: {
    title: 'الحل',
    titleEn: 'The Solution',
    content: `وجد الباحث الأخير — قبل اختفائه — طريقة كسر اللعنة.

ثلاثة خيارات لا غير:

الأول: إذا اجتمع أربعة لاعبين من فصائل مختلفة وقرّروا معاً تحرير أوس،
ستُفتح روحه وتنتهي اللعنة إلى الأبد.

الثاني: إذا استخدم شخص ذو قوة مظلمة كافية القوةَ لنفسه،
سيُقيَّد بالصندوق — لكنّه سيمتلك قدرة خارقة.

الثالث: إغلاق الصندوق بأختام الحقيقة — أربعة أدلة من أربعة لاعبين.
هذا يُعيد أوس إلى النوم دون تحرير ودون لعنة.

اختر بحكمة.`,
    clues: [
      '🔍 الدليل: الحل الأول يتطلب ثقة تفوق 70 من كل لاعب',
      '🔍 الدليل: الحل الثاني يتطلب dark score يفوق 60',
    ],
  },
};

const DAYS = [
  null,
  {
    num: 1,
    title: 'دعوة الصندوق',
    titleEn: 'Invitation of the Box',
    lore: 'وصل الصندوق في مغلف غامض. لا عنوان مرسل. لا ختم بريد. فقط اسمك مكتوب على الغلاف بحبر أحمر.',
    puzzleType: 'mcq',
    question: 'كم قفلاً يغلق صندوق أوس؟',
    options: ['3 أقفال', '4 أقفال', '5 أقفال', '7 أقفال'],
    answer: 1,
    hint: 'الإجابة مخفية في القصة — عدد الفصائل',
    rewardStat: 'intelligence',
    rewardAmount: 20,
    rewardCurrency: 'wp',
    rewardCurrencyAmount: 30,
  },
  {
    num: 2,
    title: 'شجرة الأبد',
    titleEn: 'Tree of Eternity',
    lore: 'وصلتك رسالة مجهولة: "الشجرة تتكلم لمن يصغي. أجب على سؤالها."',
    puzzleType: 'mcq',
    question: 'ماذا تطالب "شجرة الأبد" كل مئة عام؟',
    options: ['بالذهب والفضة', 'بروح ذات علامة', 'بدماء الراعي', 'بدموع الأبرياء'],
    answer: 1,
    hint: 'تذكّر: اللعنة تحتاج روحاً مميّزة',
    rewardStat: 'intelligence',
    rewardAmount: 15,
    rewardCurrency: 'wp',
    rewardCurrencyAmount: 20,
  },
  {
    num: 3,
    title: 'مجلس الظلال',
    titleEn: 'Council of Shadows',
    lore: 'حان وقت الثقة والشك. الصندوق يراقب كل قرار.',
    puzzleType: 'voting',
    question: 'صوّت على زملائك',
    options: [],
    answer: -1,
    hint: 'ثق بحدسك',
    rewardStat: 'trust',
    rewardAmount: 10,
    rewardCurrency: 'tp',
    rewardCurrencyAmount: 25,
  },
  {
    num: 4,
    title: 'متاهة المرايا',
    titleEn: 'Mirror Maze',
    lore: 'كل لاعب يرى جزءاً من الحقيقة في مرآته. اجمعوا الأجزاء.',
    puzzleType: 'text',
    question: 'ما اسم القرية التي عاش فيها أوس؟ (تجدها في قصة اللاعب الأول)',
    options: [],
    answer: 'النبع الأسود',
    answerAlt: ['النبع', 'الأسود', 'نبع', 'نبع اسود'],
    hint: 'أسم القرية مكوّن من كلمتين',
    rewardStat: 'intelligence',
    rewardAmount: 25,
    rewardCurrency: 'wp',
    rewardCurrencyAmount: 40,
  },
  {
    num: 5,
    title: 'ليلة الخيانة',
    titleEn: 'Night of Betrayal',
    lore: 'الظلام يكشف طبيعة الأشياء. من أنت في الليل؟',
    puzzleType: 'choice',
    question: 'وجدت دليلاً خطيراً. ماذا ستفعل؟',
    options: [
      'أشارك الجميع بالدليل (Trust +15, Dark -5)',
      'أخبئ الدليل لنفسي (Intelligence +10, Dark +20)',
      'أوجّه الشبهة لشخص آخر (Dark +30, SP +20)',
    ],
    answer: -1,
    hint: 'كل خيار له عواقب تدوم',
    rewardStat: null,
    rewardAmount: 0,
    rewardCurrency: 'sp',
    rewardCurrencyAmount: 0,
  },
  {
    num: 6,
    title: 'كشف الراعي',
    titleEn: 'Shepherd Revelation',
    lore: 'رأيت الراعي في حلمك. قال لك: "الحقيقة التي تعرفها كذبة." هل تصدّقه؟',
    puzzleType: 'mcq',
    question: 'ماذا حدث لأتباع الراعي بعد مقتل أوس؟',
    options: [
      'حصلوا على القوة التي أرادوها',
      'انعكست اللعنة عليهم',
      'هربوا من القرية إلى الأبد',
      'أصبحوا خدّاماً للشجرة',
    ],
    answer: 1,
    hint: 'تذكّر: الطقس يتطلب إرادة حرة',
    rewardStat: 'intelligence',
    rewardAmount: 20,
    rewardCurrency: 'wp',
    rewardCurrencyAmount: 35,
  },
  {
    num: 7,
    title: 'القرار النهائي',
    titleEn: 'Final Decision',
    lore: 'الصندوق أمامك. اللحظة التي من أجلها كل شيء. اختر.',
    puzzleType: 'ending',
    question: '',
    options: [],
    answer: -1,
    hint: '',
    rewardStat: null,
    rewardAmount: 0,
    rewardCurrency: 'ip',
    rewardCurrencyAmount: 500,
  },
];

const AGENT_MISSIONS = [
  'ادّعِ أن اللاعب الأول هو عميل اللعنة دون دليل.',
  'أخبر اللاعبين أن الإجابة الصحيحة في اللغز هي الخيار الأول دائماً.',
  'تظاهر بأنك تعرف طريقة سرية لكسر اللعنة وأبقِها لنفسك.',
  'شكّك في قصة أحد اللاعبين وادّعِ أنها ملفقة.',
];

const ENDINGS = {
  free: {
    icon: '🕊️',
    title: 'تحرّر أوس',
    subtitle: 'النور يعود إلى القرية',
    lore: `فتحتَ الصندوق بنية نقية وقلب صادق.
انتشر ضوء أخضر ناعم من كل شقّ.
روح أوس ارتفعت... وابتسمت.

شجرة الأبد أخيراً ثمرت.
واللعنة... رُفعت للأبد.`,
    condition: p => p.trust >= 65,
    conditionFail: 'لا تملك ثقة كافية لتحرير أوس. ثقتك يجب أن تكون 65 أو أكثر.',
  },
  control: {
    icon: '⚡',
    title: 'القوة في يدك',
    subtitle: 'لكن بأيّ ثمن؟',
    lore: `استخدمتَ قوة الصندوق لنفسك.
شعرتَ بطاقة خارقة تسري في عروقك.
لكن في الليل...

سمعتَ صوت أوس يهمس:
"أنت الآن جزء من اللعنة."

جسدك حرّ... لكن روحك مقيّدة.`,
    condition: p => p.dark >= 50,
    conditionFail: 'نقاطك المظلمة غير كافية. تحتاج 50 أو أكثر.',
  },
  seal: {
    icon: '🔒',
    title: 'الصندوق مغلق',
    subtitle: 'الحكمة تختار السلامة',
    lore: `وضعتَ الأختام الأربعة على الصندوق.
لم يعد يرتجف. لم يعد يهمس.

أوس نائم مرة أخرى.
اللعنة في سبات.

لن تنتهي... لكنك أخّرتها.
وهذا أحياناً يكفي.`,
    condition: () => true,
    conditionFail: '',
  },
};

// ─── State ───────────────────────────────────────────────────
let player = null;
let selectedFaction = null;
let voteData = { trust: null, suspect: null };
let roleRevealed = false;
let currentPuzzleAnswered = false;
let simPlayers = [];

// ─── Init ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  checkURLParams();
  loadPlayer();
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key === 'D') toggleDebug();
  });
});

function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    sessionStorage.setItem('pendingRef', ref);
    const notice = document.getElementById('invite-notice');
    const text   = document.getElementById('invite-text');
    notice.classList.remove('hidden');
    text.textContent = `تمت دعوتك برمز: ${ref}`;
  }
}

function loadPlayer() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    player = JSON.parse(raw);
    showScreen('dashboard-screen');
    updateDashboard();
  } else {
    showScreen('intro-screen');
  }
  loadSimPlayers();
}

function savePlayer() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  updateDebug();
}

function loadSimPlayers() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  simPlayers = raw ? JSON.parse(raw) : [];
}

function saveSimPlayers() {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(simPlayers));
}

// ─── Screen Navigation ───────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
}

// ─── INTRO ───────────────────────────────────────────────────
function goToName() {
  if (player) {
    showScreen('dashboard-screen');
    updateDashboard();
  } else {
    showScreen('name-screen');
    setTimeout(() => document.getElementById('player-name-input').focus(), 300);
  }
}

// ─── NAME ────────────────────────────────────────────────────
function submitName() {
  const input = document.getElementById('player-name-input');
  const name = input.value.trim();
  if (!name || name.length < 2) {
    notify('أدخل اسماً صحيحاً (حرفان على الأقل)', 'error');
    return;
  }
  sessionStorage.setItem('pendingName', name);
  showScreen('faction-screen');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const nameInput = document.getElementById('player-name-input');
    if (document.activeElement === nameInput) submitName();
  }
});

// ─── FACTION ─────────────────────────────────────────────────
function selectFaction(f) {
  selectedFaction = f;
  document.querySelectorAll('.faction-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-faction="${f}"]`).classList.add('selected');
  document.getElementById('faction-confirm-btn').removeAttribute('disabled');
}

function confirmFaction() {
  if (!selectedFaction) return;
  createPlayer();
}

function createPlayer() {
  const name   = sessionStorage.getItem('pendingName') || 'مجهول';
  const parent = sessionStorage.getItem('pendingRef') || '';
  const code   = generateInviteCode();
  const role   = assignRole();

  player = {
    id:           generateId(),
    name,
    faction:      selectedFaction,
    role,
    trust:        50,
    intelligence: 50,
    influence:    50,
    dark:         0,
    wp:           10,
    tp:           10,
    sp:           0,
    ip:           0,
    storyPart:    assignStoryPart(),
    currentDay:   1,
    inviteCode:   code,
    parentInvite: parent,
    createdAt:    new Date().toISOString(),
    completedDays: [],
    version:      VERSION,
  };

  applyFactionBonus();
  savePlayer();

  if (parent) {
    rewardParent(parent);
    notify(`انضممت بدعوة ${parent} — +50 IP لصاحب الدعوة`, 'info');
  }

  showRoleRevealAnimation();
  showScreen('dashboard-screen');
  updateDashboard();
  notify(`مرحباً ${name}! رحلتك بدأت.`, 'success');
}

function assignRole() {
  const rolls = ['children_member', 'children_member', 'keeper_guard', 'curse_agent'];
  return rolls[Math.floor(Math.random() * rolls.length)];
}

function assignStoryPart() {
  const existing = JSON.parse(localStorage.getItem(PLAYERS_KEY) || '[]');
  const usedParts = existing.map(p => p.storyPart);
  for (let i = 1; i <= 4; i++) {
    if (!usedParts.includes(i)) return i;
  }
  return Math.ceil(Math.random() * 4);
}

function applyFactionBonus() {
  const bonus = FACTIONS[player.faction]?.bonus;
  if (!player || !bonus) return;
  const map = { trust: 'trust', dark: 'dark', influence: 'influence', intelligence: 'intelligence' };
  if (map[bonus]) {
    player[map[bonus]] = Math.min(100, player[map[bonus]] + 10);
  }
}

function generateInviteCode() {
  return 'OS-' + Math.floor(1000 + Math.random() * 9000);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── DASHBOARD ───────────────────────────────────────────────
function updateDashboard() {
  if (!player) return;
  const f = FACTIONS[player.faction] || {};

  // Top bar
  document.getElementById('dash-avatar').textContent = player.name[0] || '؟';
  document.getElementById('dash-playername').textContent = player.name;
  document.getElementById('dash-faction-badge').textContent = `${f.icon || ''} ${f.name || '—'}`;

  // Day
  const day = player.currentDay;
  document.getElementById('dash-day').textContent = toArabicNum(day);
  document.getElementById('day-progress-fill').style.width = `${(day / 7) * 100}%`;

  // Stats bars
  setBar('stat-trust', player.trust);
  setBar('stat-intel', player.intelligence);
  setBar('stat-influence', player.influence);
  setBar('stat-dark', player.dark);

  // Currencies
  setEl('curr-wp', player.wp);
  setEl('curr-tp', player.tp);
  setEl('curr-sp', player.sp);
  setEl('curr-ip', player.ip);

  // Story fragment
  const part = STORY_PARTS[player.storyPart];
  if (part) {
    document.getElementById('fragment-title').textContent = part.title;
    document.getElementById('fragment-preview').textContent = part.content.slice(0, 60) + '...';
  }

  // Daily action
  const dayData = DAYS[day];
  if (dayData) {
    document.getElementById('daily-action-title').textContent = dayData.title;
    if (player.completedDays && player.completedDays.includes(day)) {
      document.getElementById('daily-puzzle-btn').textContent = '✅ مكتمل';
      document.getElementById('daily-puzzle-btn').disabled = true;
    } else {
      document.getElementById('daily-puzzle-btn').textContent = '🧩 حل اللغز';
      document.getElementById('daily-puzzle-btn').disabled = false;
    }
  }

  // Invite
  const invSec = document.getElementById('invite-section');
  if (player.currentDay >= 1) {
    invSec.classList.remove('hidden');
    document.getElementById('invite-code-display').textContent = player.inviteCode;
  }

  // Lineage
  renderLineage();

  // Role card
  if (!roleRevealed) {
    document.getElementById('role-name').style.filter = 'blur(4px)';
    document.getElementById('role-name').textContent = '؟؟؟';
  }

  updateDebug();
}

function setBar(prefix, val) {
  const capped = Math.max(0, Math.min(100, val));
  const bar = document.getElementById(`${prefix}-bar`);
  const valEl = document.getElementById(`${prefix}-val`);
  if (bar) bar.style.width = `${capped}%`;
  if (valEl) valEl.textContent = capped;
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// ─── ROLE REVEAL ─────────────────────────────────────────────
function revealRole() {
  if (!player) return;
  roleRevealed = true;
  const role = ROLES[player.role];
  const nameEl = document.getElementById('role-name');
  const descEl = document.getElementById('role-desc');
  const btn    = document.getElementById('role-reveal-btn');

  nameEl.textContent = role?.name || '—';
  descEl.textContent = role?.desc || '';
  nameEl.classList.add('revealed');
  descEl.classList.add('revealed');
  btn.classList.add('hidden');

  if (role?.isAgent) {
    nameEl.style.color = 'var(--red)';
    notify('⚠️ أنت عميل اللعنة. مهمتك سرية.', 'error');
  } else {
    notify('دورك مكشوف. تذكّره جيداً.', 'info');
  }
}

function showRoleRevealAnimation() {
  setTimeout(() => {
    notify('🎭 تم تعيين دورك السري. اكشفه من لوحة التحكم.', 'info');
  }, 1500);
}

// ─── PUZZLE ──────────────────────────────────────────────────
function renderPuzzle() {
  if (!player) return;
  const day = DAYS[player.currentDay];
  if (!day) return;
  currentPuzzleAnswered = player.completedDays?.includes(player.currentDay);

  document.getElementById('puzzle-day-label').textContent = `اليوم ${toArabicNum(day.num)}`;
  document.getElementById('puzzle-title').textContent = day.title;
  document.getElementById('puzzle-lore').textContent = day.lore;
  document.getElementById('puzzle-question').textContent = day.question;

  const optionsEl  = document.getElementById('puzzle-options');
  const textArea   = document.getElementById('puzzle-text-area');
  const resultEl   = document.getElementById('puzzle-result');
  const hintBtn    = document.getElementById('hint-btn');
  const hintText   = document.getElementById('hint-text');

  optionsEl.innerHTML = '';
  textArea.classList.add('hidden');
  resultEl.classList.add('hidden');
  resultEl.className = 'puzzle-result hidden';
  hintText.classList.add('hidden');

  if (day.puzzleType === 'ending') {
    showScreen('ending-screen');
    return;
  }

  if (day.puzzleType === 'voting') {
    showScreen('voting-screen');
    renderVoting();
    return;
  }

  if (day.puzzleType === 'mcq') {
    const letters = ['أ', 'ب', 'ج', 'د'];
    day.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'puzzle-option';
      div.innerHTML = `<span class="option-letter">${letters[i]}</span> ${opt}`;
      if (!currentPuzzleAnswered) {
        div.onclick = () => selectMCQ(i, day.answer, day);
      } else {
        if (i === day.answer) div.classList.add('correct');
        div.style.cursor = 'default';
      }
      optionsEl.appendChild(div);
    });
    if (currentPuzzleAnswered) {
      showResult(resultEl, true, `✅ أكملت هذا اليوم. المكافأة حُصلت بالفعل.`);
    }
  }

  if (day.puzzleType === 'text') {
    textArea.classList.remove('hidden');
    if (currentPuzzleAnswered) {
      textArea.classList.add('hidden');
      showResult(resultEl, true, '✅ أكملت هذا اليوم.');
    }
  }

  if (day.puzzleType === 'choice') {
    renderChoicePuzzle(day, optionsEl, resultEl);
  }

  hintBtn.textContent = `💡 تلميح (10 WP)`;
}

function selectMCQ(idx, correct, day) {
  if (currentPuzzleAnswered) return;
  const options = document.querySelectorAll('.puzzle-option');
  options.forEach((o, i) => {
    o.onclick = null;
    if (i === correct) o.classList.add('correct');
    else if (i === idx && idx !== correct) o.classList.add('wrong');
  });

  const resultEl = document.getElementById('puzzle-result');
  if (idx === correct) {
    applyReward(day);
    showResult(resultEl, true, `✅ إجابة صحيحة! +${day.rewardAmount} ${getStatLabel(day.rewardStat)} | +${day.rewardCurrencyAmount} ${day.rewardCurrency.toUpperCase()}`);
    completeDayActions();
    advanceDay();
  } else {
    player.intelligence = Math.max(0, player.intelligence - 5);
    savePlayer();
    showResult(resultEl, false, '❌ إجابة خاطئة. -5 ذكاء. حاول مرة أخرى.');
    setTimeout(() => {
      resultEl.classList.add('hidden');
      document.querySelectorAll('.puzzle-option').forEach((o, i) => {
        o.classList.remove('correct', 'wrong');
        o.onclick = () => selectMCQ(i, correct, day);
      });
    }, 2000);
  }
}

function submitTextPuzzle() {
  if (!player) return;
  const day = DAYS[player.currentDay];
  if (!day) return;
  const input = document.getElementById('puzzle-text-input').value.trim();
  const resultEl = document.getElementById('puzzle-result');

  const correct = input === day.answer ||
    (day.answerAlt && day.answerAlt.some(a => input.includes(a)));

  if (correct) {
    applyReward(day);
    showResult(resultEl, true, `✅ إجابة صحيحة! +${day.rewardAmount} ${getStatLabel(day.rewardStat)}`);
    completeDayActions();
    advanceDay();
  } else {
    showResult(resultEl, false, '❌ إجابة خاطئة. تلميح: اقرأ قصة اللاعب الأول.');
  }
}

function renderChoicePuzzle(day, container, resultEl) {
  if (currentPuzzleAnswered) {
    showResult(resultEl, true, '✅ اتخذت قرارك بالفعل.');
    return;
  }
  const effects = [
    { trust: 15, dark: -5, intelligence: 0, sp: 0 },
    { trust: 0,  dark: 20, intelligence: 10, sp: 10 },
    { trust: -10, dark: 30, intelligence: 0, sp: 20 },
  ];
  const letters = ['أ', 'ب', 'ج'];
  day.options.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'puzzle-option';
    div.innerHTML = `<span class="option-letter">${letters[i]}</span> ${opt}`;
    div.onclick = () => {
      if (currentPuzzleAnswered) return;
      const e = effects[i];
      player.trust        = clamp(player.trust + e.trust, 0, 100);
      player.dark         = clamp(player.dark + e.dark, 0, 100);
      player.intelligence = clamp(player.intelligence + e.intelligence, 0, 100);
      player.sp           += e.sp;
      applyReward(day);
      savePlayer();
      showResult(resultEl, true, `خيارك اتُّخذ. عواقبه ستظهر لاحقاً.`);
      completeDayActions();
      advanceDay();
      document.querySelectorAll('.puzzle-option').forEach(o => o.onclick = null);
      div.style.border = '1px solid var(--green)';
    };
    container.appendChild(div);
  });
}

function applyReward(day) {
  if (day.rewardStat) {
    const statMap = {
      intelligence: 'intelligence', trust: 'trust',
      influence: 'influence', dark: 'dark',
    };
    const stat = statMap[day.rewardStat];
    if (stat) player[stat] = clamp(player[stat] + day.rewardAmount, 0, 100);
  }
  if (day.rewardCurrency && day.rewardCurrencyAmount > 0) {
    player[day.rewardCurrency] = (player[day.rewardCurrency] || 0) + day.rewardCurrencyAmount;
  }
  notify(`🏆 مكافأة: +${day.rewardAmount} ${getStatLabel(day.rewardStat)}`, 'success');
  savePlayer();
}

function completeDayActions() {
  if (!player.completedDays) player.completedDays = [];
  if (!player.completedDays.includes(player.currentDay)) {
    player.completedDays.push(player.currentDay);
    player.ip += 100;
    notify('+100 IP لإكمال اليوم!', 'success');
  }
  currentPuzzleAnswered = true;
  savePlayer();
}

function advanceDay() {
  setTimeout(() => {
    if (player.currentDay < 7) {
      player.currentDay++;
      savePlayer();
      showScreen('dashboard-screen');
      updateDashboard();
      notify(`📅 اليوم ${toArabicNum(player.currentDay)} بدأ!`, 'info');
    } else {
      player.ip += 500;
      savePlayer();
      showScreen('ending-screen');
    }
  }, 2500);
}

function showResult(el, success, msg) {
  el.textContent = msg;
  el.className = `puzzle-result ${success ? 'success' : 'fail'}`;
  el.classList.remove('hidden');
}

function getStatLabel(stat) {
  const map = { trust: 'ثقة', intelligence: 'ذكاء', influence: 'تأثير', dark: 'مظلم' };
  return map[stat] || stat || '';
}

function buyHint() {
  if (!player) return;
  const day = DAYS[player.currentDay];
  if (!day || !day.hint) return;
  if (player.wp < 10) {
    notify('لا تملك WP كافية (تحتاج 10)', 'error');
    return;
  }
  player.wp -= 10;
  savePlayer();
  const hintEl = document.getElementById('hint-text');
  hintEl.textContent = `💡 ${day.hint}`;
  hintEl.classList.remove('hidden');
  document.getElementById('hint-btn').classList.add('hidden');
  updateDashboard();
}

// ─── VOTING ──────────────────────────────────────────────────
function renderVoting() {
  if (!player) return;
  const simNames = ['أحمد', 'سارة', 'خالد', 'نورة'];
  const names = simNames.filter(n => n !== player.name.split(' ')[0]);

  ['trust-vote-players', 'suspect-vote-players'].forEach((id, idx) => {
    const container = document.getElementById(id);
    container.innerHTML = '';
    names.forEach(name => {
      const div = document.createElement('div');
      div.className = 'vote-player';
      div.innerHTML = `<span class="dash-avatar" style="width:32px;height:32px;font-size:14px">${name[0]}</span>${name}`;
      const key = idx === 0 ? 'trust' : 'suspect';
      const cls = idx === 0 ? 'selected' : 'selected-suspect';
      div.onclick = () => {
        container.querySelectorAll('.vote-player').forEach(v => v.classList.remove('selected', 'selected-suspect'));
        div.classList.add(cls);
        voteData[key] = name;
      };
      container.appendChild(div);
    });
  });
}

function submitVotes() {
  if (!voteData.trust && !voteData.suspect) {
    notify('صوّت على شخص واحد على الأقل', 'error');
    return;
  }
  player.tp += 15;
  if (voteData.trust) {
    player.trust = clamp(player.trust + 5, 0, 100);
    notify(`+5 ثقة لثقتك بـ${voteData.trust}`, 'success');
  }
  if (voteData.suspect) {
    player.dark = clamp(player.dark + 5, 0, 100);
    notify(`+5 مظلم للشك في ${voteData.suspect}`, 'info');
  }
  savePlayer();

  const resultEl = document.getElementById('vote-result');
  resultEl.textContent = `✅ تم تسجيل تصويتك. ${voteData.trust ? `ثقة: ${voteData.trust}.` : ''} ${voteData.suspect ? `شك: ${voteData.suspect}.` : ''}`;
  resultEl.classList.remove('hidden');

  completeDayActions();
  setTimeout(advanceDay, 1500);
}

// ─── STORY ───────────────────────────────────────────────────
function renderStory() {
  if (!player) return;
  const part = STORY_PARTS[player.storyPart];
  if (!part) return;

  document.getElementById('story-title').textContent = `${part.title} — ${part.titleEn}`;

  const contentEl = document.getElementById('story-content');
  contentEl.textContent = '';
  typewrite(contentEl, part.content, 30);

  const cluesEl = document.getElementById('story-clues');
  cluesEl.innerHTML = '';
  (part.clues || []).forEach(clue => {
    const div = document.createElement('div');
    div.className = 'clue-item';
    div.textContent = clue;
    cluesEl.appendChild(div);
  });

  // Reveal agent mission if applicable
  if (ROLES[player.role]?.isAgent) {
    const mission = AGENT_MISSIONS[Math.floor(Math.random() * AGENT_MISSIONS.length)];
    const missionDiv = document.createElement('div');
    missionDiv.className = 'agent-mission';
    missionDiv.innerHTML = `<div class="agent-mission-title">🔴 مهمتك السرية</div><div class="agent-mission-text">${mission}</div>`;
    cluesEl.insertBefore(missionDiv, cluesEl.firstChild);
  }

  // Grant intelligence for reading
  if (!player.storyRead) {
    player.storyRead = true;
    player.intelligence = clamp(player.intelligence + 5, 0, 100);
    player.wp += 10;
    savePlayer();
    notify('+5 ذكاء +10 WP لقراءة القصة', 'success');
  }
}

function typewrite(el, text, speed) {
  let i = 0;
  el.textContent = '';
  function step() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(step, speed);
    }
  }
  step();
}

// ─── LINEAGE ──────────────────────────────────────────────────
function renderLineage() {
  const el = document.getElementById('lineage-tree');
  if (!el || !player) return;
  let lines = [];
  lines.push(`${player.name} (أنت)`);
  if (player.parentInvite) {
    lines.unshift(`⬆ دُعيت بواسطة: ${player.parentInvite}`);
  }
  lines.push(`  └ دعواتك المتاحة: 5`);
  lines.push(`  └ IP المكتسب: ${player.ip}`);
  el.textContent = lines.join('\n');
}

// ─── ENDING ──────────────────────────────────────────────────
function selectEnding(type) {
  if (!player) return;
  const ending = ENDINGS[type];
  if (!ending) return;

  if (!ending.condition(player)) {
    const resultEl = document.getElementById('ending-result');
    resultEl.textContent = '⚠️ ' + ending.conditionFail;
    resultEl.classList.remove('hidden');
    notify(ending.conditionFail, 'error');
    return;
  }

  showFinalScreen(type, ending);
}

function showFinalScreen(type, ending) {
  showScreen('final-screen');
  document.getElementById('final-icon').textContent   = ending.icon;
  document.getElementById('final-title').textContent  = ending.title;
  document.getElementById('final-title').setAttribute('data-text', ending.title);
  document.getElementById('final-subtitle').textContent = ending.subtitle;

  const loreEl = document.getElementById('final-lore');
  loreEl.textContent = '';
  typewrite(loreEl, ending.lore, 40);

  document.getElementById('final-stat-trust').textContent = player.trust;
  document.getElementById('final-stat-intel').textContent = player.intelligence;
  document.getElementById('final-stat-dark').textContent  = player.dark;
  document.getElementById('final-stat-ip').textContent    = player.ip;

  if (player.currentDay >= 7) {
    const bonus = document.getElementById('final-invite-bonus');
    bonus.classList.remove('hidden');
  }

  player.ending = type;
  player.ip += 500;
  savePlayer();
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  player = null;
  roleRevealed = false;
  voteData = { trust: null, suspect: null };
  selectedFaction = null;
  showScreen('intro-screen');
  notify('بدأت من جديد. الصندوق ينتظرك.', 'info');
}

// ─── INVITE ──────────────────────────────────────────────────
function copyInvite() {
  if (!player) return;
  const url = `${window.location.origin}${window.location.pathname}?ref=${player.inviteCode}`;
  navigator.clipboard.writeText(url).then(() => {
    notify('تم نسخ رابط الدعوة!', 'success');
  }).catch(() => {
    notify(`رمزك: ${player.inviteCode}`, 'info');
  });
}

function rewardParent(code) {
  player.ip += 50;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────
function notify(msg, type = 'info') {
  const container = document.getElementById('notifications');
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ─── DEBUG ───────────────────────────────────────────────────
function toggleDebug() {
  const panel = document.getElementById('debug-panel');
  panel.classList.toggle('hidden');
  updateDebug();
}

function updateDebug() {
  const el = document.getElementById('debug-content');
  if (!el || !player) return;
  el.textContent = JSON.stringify(player, null, 2);
}

// ─── PARTICLES ───────────────────────────────────────────────
function initParticles() {
  const container = document.getElementById('box-particles');
  if (!container) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:absolute;
      width:${2 + Math.random() * 3}px;
      height:${2 + Math.random() * 3}px;
      background:var(--green);
      border-radius:50%;
      top:${Math.random() * 100}%;
      left:${Math.random() * 100}%;
      opacity:${0.2 + Math.random() * 0.6};
      animation: particleFloat${i % 3} ${2 + Math.random() * 3}s ease-in-out infinite;
    `;
    container.appendChild(p);
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes particleFloat0 {0%,100%{transform:translate(0,0);opacity:0.3}50%{transform:translate(-6px,-10px);opacity:0.8}}
    @keyframes particleFloat1 {0%,100%{transform:translate(0,0);opacity:0.2}50%{transform:translate(6px,-8px);opacity:0.6}}
    @keyframes particleFloat2 {0%,100%{transform:translate(0,0);opacity:0.4}50%{transform:translate(-4px,-12px);opacity:1}}
  `;
  document.head.appendChild(style);
}

// ─── Utility ─────────────────────────────────────────────────
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

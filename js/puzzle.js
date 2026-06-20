/* ══════════════════════════════════════════════════════════════
   puzzle.js — Puzzle engine (MCQ, text, choice, voting, ending)
═══════════════════════════════════════════════════════════════ */

const Puzzle = (() => {

  let _answered = false;
  let _player   = null;

  // ── Day puzzle data ──────────────────────────────────────────
  const DAYS = [
    null, // index 0 unused
    {
      num: 1, title: 'دعوة الصندوق', titleEn: 'Invitation of the Box',
      lore: 'وصل الصندوق في مغلّف بلا عنوان. اسمك مكتوب بحبر أحمر. لا يوجد مرسل.',
      type: 'mcq',
      question: 'كم قفلاً يغلق صندوق أوس؟',
      options: ['ثلاثة أقفال', 'أربعة أقفال', 'خمسة أقفال', 'سبعة أقفال'],
      answer: 1,
      hint: 'عدد الفصائل = عدد الأقفال',
      reward: { intelligence: 20, wp: 30 },
    },
    {
      num: 2, title: 'شجرة الأبد', titleEn: 'Tree of Eternity',
      lore: 'رأيت الشجرة في حلمك. كانت تنبض كقلب حي. سألتك سؤالاً واحداً.',
      type: 'mcq',
      question: 'ماذا تطالب "شجرة الأبد" كل مئة عام؟',
      options: ['بالذهب والفضة', 'بروح ذات علامة', 'بدماء الراعي', 'بدموع الأبرياء'],
      answer: 1,
      hint: 'الروح يجب أن تُقدَّم طوعاً — هذا شرط الطقس',
      reward: { intelligence: 15, wp: 20 },
    },
    {
      num: 3, title: 'مجلس الظلال', titleEn: 'Council of Shadows',
      lore: 'مجلس الظلال يجتمع. أصوات، شكوك، اتهامات. من تثق به؟',
      type: 'voting',
      question: '',
      options: [], answer: -1, hint: 'ثق بحدسك',
      reward: { trust: 10, tp: 25 },
    },
    {
      num: 4, title: 'متاهة المرايا', titleEn: 'Mirror Maze',
      lore: 'الحقيقة مجزّأة في مرايا مختلفة. كل لاعب يرى جزءاً. اجمعوها.',
      type: 'text',
      question: 'ما اسم القرية التي وُلد فيها أوس؟',
      answer: 'النبع الأسود',
      answerAlts: ['النبع', 'نبع الأسود', 'نبع اسود'],
      hint: 'الاسم مكوّن من كلمتين — موجود في قصة اللاعب الأول',
      reward: { intelligence: 25, wp: 40 },
    },
    {
      num: 5, title: 'ليلة الخيانة', titleEn: 'Night of Betrayal',
      lore: 'وجدتَ دليلاً يمكن أن يُغيّر مجرى اللعبة. اختر كيف تستخدمه.',
      type: 'choice',
      question: 'ماذا ستفعل بالدليل الذي وجدته؟',
      options: [
        { text: '📢 أشاركه مع الجميع فوراً', effect: { trust: 15, dark: -5 }, sp: 0 },
        { text: '🔒 أخبّئه لنفسي حتى اللحظة المناسبة', effect: { intelligence: 10, dark: 20 }, sp: 10 },
        { text: '🗡 أستخدمه لاتهام شخص آخر والتخلص منه', effect: { dark: 35, sp: 25 }, sp: 25 },
      ],
      answer: -1, hint: 'كل خيار يشكّل هويتك في اللعبة',
      reward: null,
    },
    {
      num: 6, title: 'كشف الراعي', titleEn: 'Shepherd Revelation',
      lore: 'رأيت الراعي في حلمك. قال: "الحقيقة التي تعرفها كذبة." هل تصدّقه؟',
      type: 'mcq',
      question: 'ماذا حدث بعد مقتل أوس؟',
      options: [
        'حصل الراعي وأتباعه على القوة',
        'انعكست اللعنة على القاتلين',
        'مات الجميع في تلك الليلة',
        'أصبح الراعي سيد الشجرة',
      ],
      answer: 1,
      hint: 'الطقس فشل لأن أوس لم يُقدَّم بإرادته الحرة',
      reward: { intelligence: 20, wp: 35 },
    },
    {
      num: 7, title: 'القرار النهائي', titleEn: 'Final Decision',
      lore: 'الصندوق أمامك. سبعة أيام مرّت. اختر مصيرك.',
      type: 'ending',
      question: '', options: [], answer: -1, hint: '',
      reward: { ip: 500 },
    },
  ];

  // ── Endings data ─────────────────────────────────────────────
  const ENDINGS = {
    free: {
      icon: '🕊️', title: 'تحرّر أوس', subtitle: 'النور يعود',
      condition: p => p.trust >= 65,
      conditionMsg: 'تحتاج ثقة ≥ 65 لتحرير أوس.',
      lore: `فتحتَ الصندوق بنية نقية.
ضوء أخضر هادئ انتشر من كل شقّ.

روح أوس ارتفعت...
وابتسمت للمرة الأولى منذ مئة عام.

شجرة الأبد أخيراً ثمرت.
اللعنة رُفعت.
إلى الأبد.`,
    },
    control: {
      icon: '⚡', title: 'القوة في يدك', subtitle: 'لكن بأيّ ثمن؟',
      condition: p => p.dark >= 50,
      conditionMsg: 'تحتاج نقاط مظلمة ≥ 50 للسيطرة على القوة.',
      lore: `استخدمتَ قوة الصندوق لنفسك.
شعرتَ بطاقة خارقة تسري في عروقك.

لكن في الليل...
صوت أوس يهمس من عمق صدرك:
"أنت الآن جزء منّي."

جسدك حرّ.
لكن روحك... لم تعد لك.`,
    },
    seal: {
      icon: '🔒', title: 'الصندوق مغلق', subtitle: 'الحكمة أن تعرف متى تتوقف',
      condition: () => true,
      conditionMsg: '',
      lore: `وضعتَ الأختام الأربعة.
الصندوق سكت.
أوس نام مجدداً.

اللعنة لم تنتهِ.
لكنّك أخّرتها.

وأحياناً...
التأخير هو الانتصار الوحيد الممكن.`,
    },
  };

  // ── Render ───────────────────────────────────────────────────
  function render(player) {
    _player = player;
    _answered = player.completedDays.includes(player.currentDay);
    const day = DAYS[player.currentDay];
    if (!day) return;

    if (day.type === 'voting') { App.goTo('voting'); return; }
    if (day.type === 'ending') { App.goTo('final-choice'); return; }

    document.getElementById('pz-day-badge').textContent = `اليوم ${_toAr(day.num)}`;
    document.getElementById('pz-title').textContent = day.title;
    document.getElementById('pz-lore').textContent = day.lore;
    document.getElementById('pz-question').textContent = day.question;

    const optEl     = document.getElementById('pz-options');
    const textWrap  = document.getElementById('pz-text-wrap');
    const resultEl  = document.getElementById('pz-result');
    const hintText  = document.getElementById('pz-hint-text');
    const hintBtn   = document.getElementById('pz-hint-btn');

    optEl.innerHTML = '';
    textWrap.classList.add('hidden');
    resultEl.classList.add('hidden');
    hintText.classList.add('hidden');
    hintBtn.classList.remove('hidden');

    if (day.type === 'mcq')    _renderMCQ(day, optEl, resultEl);
    if (day.type === 'text')   _renderText(day, textWrap, resultEl);
    if (day.type === 'choice') _renderChoice(day, optEl, resultEl);
  }

  function _renderMCQ(day, container, resultEl) {
    const letters = ['أ','ب','ج','د'];
    day.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'pz-option card-in';
      div.innerHTML = `<span class="pz-option-letter">${letters[i]}</span>${opt}`;

      if (_answered) {
        if (i === day.answer) div.classList.add('correct');
        div.style.cursor = 'default';
      } else {
        div.onclick = () => _selectMCQ(i, day, container, resultEl);
      }
      container.appendChild(div);
    });

    if (_answered) {
      _showResult(resultEl, true, '✅ أكملت هذا اليوم بالفعل.');
    }
  }

  function _selectMCQ(idx, day, container, resultEl) {
    if (_answered) return;

    const opts = container.querySelectorAll('.pz-option');
    opts.forEach(o => o.onclick = null);
    opts[day.answer].classList.add('correct');
    if (idx !== day.answer) opts[idx].classList.add('wrong');

    if (idx === day.answer) {
      _applyReward(day);
      _showResult(resultEl, true, `✅ إجابة صحيحة! ${_rewardText(day.reward)}`);
      _completeDay();
      _scheduleAdvance();
    } else {
      Player.addStat(_player, 'intelligence', -5);
      Storage.savePlayer(_player);
      _showResult(resultEl, false, '❌ إجابة خاطئة. -5 ذكاء. حاول مرة أخرى.');
      App.triggerOsEye('إجابة خاطئة.');
      setTimeout(() => {
        resultEl.classList.add('hidden');
        opts.forEach((o, i) => {
          o.classList.remove('correct', 'wrong');
          o.onclick = () => _selectMCQ(i, day, container, resultEl);
        });
        _answered = false;
      }, 2200);
    }
  }

  function _renderText(day, wrap, resultEl) {
    wrap.classList.remove('hidden');
    if (_answered) {
      wrap.classList.add('hidden');
      _showResult(resultEl, true, '✅ أكملت هذا اليوم بالفعل.');
    }
  }

  function submitText() {
    if (_answered) return;
    const day = DAYS[_player.currentDay];
    const val = document.getElementById('pz-textarea').value.trim();
    const resultEl = document.getElementById('pz-result');

    const correct = val === day.answer ||
      (day.answerAlts || []).some(a => val.includes(a));

    if (correct) {
      _applyReward(day);
      _showResult(resultEl, true, `✅ إجابة صحيحة! ${_rewardText(day.reward)}`);
      _completeDay();
      _scheduleAdvance();
    } else {
      _showResult(resultEl, false, '❌ غير صحيح. تلميح: ابحث في قصة اللاعب الأول.');
      App.triggerOsEye('أعد المحاولة.');
    }
  }

  function _renderChoice(day, container, resultEl) {
    if (_answered) {
      _showResult(resultEl, true, '✅ اتّخذتَ قرارك بالفعل.');
      return;
    }
    day.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'pz-option card-in';
      div.innerHTML = `<span class="pz-option-letter">${['أ','ب','ج'][i]}</span>${opt.text}`;
      div.onclick = () => {
        if (_answered) return;
        const e = opt.effect || {};
        Object.keys(e).forEach(k => {
          if (['trust','intelligence','influence','dark'].includes(k)) {
            Player.addStat(_player, k, e[k]);
          }
        });
        if (opt.sp) Player.addCurrency(_player, 'sp', opt.sp);
        Storage.savePlayer(_player);
        _showResult(resultEl, true, 'قرارك اتُّخذ. عواقبه ستظهر لاحقاً.');
        div.classList.add('correct');
        container.querySelectorAll('.pz-option').forEach(o => o.onclick = null);
        _completeDay();
        _scheduleAdvance();
      };
      container.appendChild(div);
    });
  }

  // ── Hint ─────────────────────────────────────────────────────
  function buyHint() {
    if (!_player) return;
    const day = DAYS[_player.currentDay];
    if (!day?.hint) return;
    if (_player.wp < 10) { App.notify('لا يكفي WP (تحتاج 10)', 'error'); return; }
    _player.wp -= 10;
    Storage.savePlayer(_player);
    document.getElementById('pz-hint-text').textContent = `💡 ${day.hint}`;
    document.getElementById('pz-hint-text').classList.remove('hidden');
    document.getElementById('pz-hint-btn').classList.add('hidden');
    App.updateCurrencies();
  }

  // ── Ending selection ─────────────────────────────────────────
  function selectEnding(type) {
    const ending = ENDINGS[type];
    if (!ending) return;
    if (!ending.condition(_player)) {
      const err = document.getElementById('fcu-err');
      err.textContent = '⚠ ' + ending.conditionMsg;
      err.classList.remove('hidden');
      err.classList.add('error-shake');
      setTimeout(() => err.classList.remove('error-shake'), 500);
      App.notify(ending.conditionMsg, 'error');
      return;
    }
    _player.ending = type;
    Player.addCurrency(_player, 'ip', 500);
    Storage.savePlayer(_player);
    _renderEnding(type, ending);
  }

  function _renderEnding(type, ending) {
    App.showScreen('ending');
    const icon = document.getElementById('eu-icon');
    icon.textContent = ending.icon;
    icon.classList.add('icon-reveal');

    document.getElementById('eu-title').textContent = ending.title;
    document.getElementById('eu-title').setAttribute('data-text', ending.title);
    document.getElementById('eu-subtitle').textContent = ending.subtitle;

    const loreEl = document.getElementById('eu-lore');
    loreEl.textContent = '';
    Story.typewrite ? null : null; // typewrite lives in story.js scope, use inline
    _typewrite(loreEl, ending.lore, 35);

    document.getElementById('eu-trust').textContent = _player.trust;
    document.getElementById('eu-intel').textContent = _player.intelligence;
    document.getElementById('eu-dark').textContent  = _player.dark;
    document.getElementById('eu-ip').textContent    = _player.ip;
    document.getElementById('eu-title-earned').textContent = Player.getTitle(_player);
    document.getElementById('eu-bonus').classList.remove('hidden');
  }

  function _typewrite(el, text, speed) {
    let i = 0; el.textContent = '';
    const step = () => { if (i < text.length) { el.textContent += text[i++]; setTimeout(step, speed); } };
    step();
  }

  // ── Internals ────────────────────────────────────────────────
  function _applyReward(day) {
    if (!day.reward) return;
    const r = day.reward;
    ['trust','intelligence','influence','dark'].forEach(s => {
      if (r[s] != null) Player.addStat(_player, s, r[s]);
    });
    ['wp','tp','sp','ip'].forEach(c => {
      if (r[c] != null) Player.addCurrency(_player, c, r[c]);
    });
    Storage.savePlayer(_player);
    App.notify(`🏆 ${_rewardText(r)}`, 'success');
  }

  function _rewardText(r) {
    if (!r) return '';
    const parts = [];
    const map = { trust:'ثقة', intelligence:'ذكاء', influence:'تأثير', dark:'مظلم', wp:'WP', tp:'TP', sp:'SP', ip:'IP' };
    Object.keys(r).forEach(k => { if (r[k] > 0 && map[k]) parts.push(`+${r[k]} ${map[k]}`); });
    return parts.join(' | ');
  }

  function _completeDay() {
    if (_player.completedDays.includes(_player.currentDay)) return;
    _player.completedDays.push(_player.currentDay);
    _answered = true;
    Player.addCurrency(_player, 'ip', 100);
    Storage.savePlayer(_player);
    App.notify('+100 IP لإكمال اليوم', 'success');
  }

  function _scheduleAdvance() {
    setTimeout(() => {
      if (_player.currentDay < 7) {
        _player.currentDay++;
        Storage.savePlayer(_player);
        App.goTo('dashboard');
        App.notify(`📅 اليوم ${_toAr(_player.currentDay)} بدأ!`, 'info');
      } else {
        App.goTo('final-choice');
      }
    }, 2600);
  }

  function _showResult(el, ok, msg) {
    el.textContent = msg;
    el.className = `pz-result ${ok ? 'success' : 'fail'} result-slam`;
    el.classList.remove('hidden');
  }

  function _toAr(n) {
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  }

  function getDayData(day) { return DAYS[day]; }

  return { render, submitText, buyHint, selectEnding, getDayData, ENDINGS };
})();

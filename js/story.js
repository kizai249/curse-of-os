/* ══════════════════════════════════════════════════════════════
   story.js — Story fragments, lore, and rendering
═══════════════════════════════════════════════════════════════ */

const Story = (() => {

  // ── Story fragments ──────────────────────────────────────────
  const FRAGMENTS = {
    1: {
      title:  'البداية',
      titleEn: 'The Beginning',
      eyebrow: 'الجزء الأول',
      text: `في قرية تُدعى "النبع الأسود"، نمت شجرةٌ لا تشيخ ولا تموت.

سمّاها السكان "شجرة الأبد".

يُقال إنّ من يلمس جذورها يرى الماضي والمستقبل معاً.
يُقال إنّها تتغذّى على الأرواح التي تُقدَّم لها طوعاً.

في عام مجهول، وُلد طفلٌ تحت ظلّها في منتصف الليل.
اسمه: أوس.

كان ذكاؤه خارقاً — يحلّ ما يعجز عنه الحكماء.
يرى ما لا تراه العيون العادية.

لكنّ الشجرة كانت قد طبعته منذ لحظة ولادته.
علامة على يده اليسرى: هلال مقلوب.

اللعنة لم تبدأ حين قُتل.
اللعنة بدأت حين وُلد.`,
      clues: [
        '🔍 الدليل: قرية "النبع الأسود" لا تظهر على أي خريطة حديثة',
        '🔍 الدليل: الهلال المقلوب موجود على غلاف الصندوق',
        '🔍 الدليل: الشجرة لا تزال حية في مكانٍ ما',
      ],
      agentFalse: 'في الحقيقة، أوس هو من زرع اللعنة بنفسه. وُلد شرّيراً وخدع الجميع.',
    },
    2: {
      title:  'السبب',
      titleEn: 'The Sacrifice',
      eyebrow: 'الجزء الثاني',
      text: `كان الراعي يعلم سرّ الشجرة منذ أجيال.

طقوسه القديمة تقول:
"كلّ مئة عام، الشجرة تطالب بروح صاحب العلامة."

وحين رأى الراعي الهلال المقلوب على يد أوس...
أيقن أنّ الوقت حان.

في ليلة الظلام الكبير — حين يختفي القمر تماماً —
أحاط الراعي وأتباعه بالشاب النائم.

قتلوه بصمت.
قتلوه بدم بارد.
قتلوا ذكاءه وبراءته وأحلامه.

لكنّ الشجرة رفضت الدم.

لأنّ الطقوس القديمة تشترط شيئاً واحداً:
الروح يجب أن تُقدَّم بإرادتها الحرّة.

القتل القسري لا يُطعم الشجرة.
القتل القسري يُغضبها.

واللعنة... انعكست.`,
      clues: [
        '🔍 الدليل: "ليلة الظلام الكبير" تتكرر كل مئة عام — الليلة التالية قريبة',
        '🔍 الدليل: الراعي لم يمت — ينتقل بين الأجساد كل جيل',
        '🔍 الدليل: الطقس يتطلب "إرادة حرة" — هذا هو مفتاح كسر اللعنة',
      ],
      agentFalse: 'الراعي كان يحاول إنقاذ أوس من اللعنة، لكنّ أوس رفض وأجبر الراعي على قتله.',
    },
    3: {
      title:  'النتيجة',
      titleEn: 'The Victims',
      eyebrow: 'الجزء الثالث',
      text: `منذ مقتل أوس، الصندوق يظهر كل مئة عام.

يختار ضحاياه بعناية فائقة.
لا يتصل بأي شخص — يتصل بالأشخاص المناسبين.

الضحية الأولى — 1823:
امرأة تُدعى "مريم الحكيمة" فتحت الصندوق وحدها ليلاً.
اختفت. وُجد مكانها ورقة واحدة: "لا تفتحه وحدك."

الضحية الثانية — 1923:
باحث ألماني ترجم نقوش الصندوق.
جنّ عقله في اليوم الثالث. مات في اليوم السابع.
آخر ما كتبه: "الحقيقة في الأجزاء — وحدها لا تكتمل."

الضحية الثالثة — 2023؟
الاسم غير معروف.
الرسالة نفسها: "أنتم بحاجة لبعضكم."

والآن الصندوق عاد.
وأنت هنا.`,
      clues: [
        '🔍 الدليل: رسائل الضحايا الثلاث متطابقة في مضمونها',
        '🔍 الدليل: من يفتح الصندوق وحده يُقيَّد به إلى الأبد',
        '🔍 الدليل: "اليوم السابع" هو الموعد النهائي في كل مرة',
      ],
      agentFalse: 'الضحايا الثلاث لم يختفوا — هم يعيشون داخل الصندوق ويتحكمون فيه الآن.',
    },
    4: {
      title:  'الحل',
      titleEn: 'The Solution',
      eyebrow: 'الجزء الرابع',
      text: `وجد الباحث الأخير — قبل أن يجنّ — الحل.

ثلاثة مسارات لا غير:

المسار الأول — التحرير:
إذا اجتمع أربعة لاعبين من فصائل مختلفة،
واتّحدوا في قرار واحد،
وكانت ثقتهم أعلى من خوفهم،
فروح أوس ستُطلق إلى الأبد.

المسار الثاني — السيطرة:
إذا استخدم شخص ذو قوة مظلمة كافية
قوّة الصندوق لنفسه،
سيُقيَّد بالصندوق — لكنّه سيمتلك ما لا يملكه أحد.

المسار الثالث — الإغلاق:
بأختام أربعة من أربعة أيدٍ مختلفة،
يمكن إعادة الصندوق إلى نومه.
أوس ينام مجدداً. اللعنة لا تنتهي — لكنّها تتأخّر.

اختر بعقلك.
لكن لا تنسَ: أحدهم يكذب عليك الآن.`,
      clues: [
        '🔍 الدليل: المسار الأول يتطلب ثقة ≥ 65',
        '🔍 الدليل: المسار الثاني يتطلب dark score ≥ 50',
        '🔍 الدليل: المسار الثالث متاح دائماً لكنه لا ينهي اللعنة',
      ],
      agentFalse: 'الحل الوحيد الحقيقي هو تدمير الصندوق بالنار — أي حل آخر سيقتل الجميع.',
    },
  };

  // ── Agent missions (day-based) ───────────────────────────────
  const AGENT_MISSIONS = [
    'ادّعِ أن اللاعب الأول هو عميل اللعنة دون أي دليل.',
    'أخبر الجميع أن الإجابة الصحيحة دائماً هي الخيار الأول.',
    'تظاهر بأنك تعرف "المسار الرابع السري" — وأن الحل الحقيقي محجوب عن الجميع.',
    'شكّك في قصة كل لاعب وادّعِ أن أجزاء القصة مزيّفة.',
    'ادّعِ أن الصندوق قال لك سراً: أحد اللاعبين ليس حقيقياً.',
  ];

  // ── Day lore texts ───────────────────────────────────────────
  const DAY_LORE = {
    1: 'وصل الصندوق في مغلّف بلا عنوان. اسمك مكتوب بحبر أحمر على الغلاف.',
    2: 'رأيت الشجرة في حلمك الليلة. كانت تتكلّم لكنّك لم تفهم.',
    3: 'مجلس الظلال يجتمع. الأصوات تتشكّل. الشك يتصاعد.',
    4: 'كل مرآة تعكس جزءاً مختلفاً من الحقيقة. لا مرآة واحدة تكفي.',
    5: 'الليل يكشف من يختبئ في الضوء. الخيانة لها رائحة.',
    6: 'الراعي يهمس في أحلامك: "الحقيقة التي تعرفها كذبة."',
    7: 'الصندوق أمامك. الروح تنتظر. اليوم يحسم كل شيء.',
  };

  // ── Render story screen ──────────────────────────────────────
  function render(player) {
    const part = FRAGMENTS[player.storyPart];
    if (!part) return;

    const videoEl = document.getElementById('story-video');
    if (videoEl) { videoEl.play().catch(() => {}); }

    document.getElementById('story-eyebrow').textContent = part.eyebrow;
    document.getElementById('story-title').textContent = `${part.title} — ${part.titleEn}`;

    // Typewriter for story text
    const textEl = document.getElementById('story-text');
    textEl.textContent = '';
    typewrite(textEl, part.text, 18);

    // Clues
    const cluesEl = document.getElementById('story-clues');
    cluesEl.innerHTML = '';

    // Agent mission card (only for agents)
    if (Player.isAgent(player)) {
      const mission = AGENT_MISSIONS[
        Math.min(player.currentDay - 1, AGENT_MISSIONS.length - 1)
      ];
      const mCard = document.createElement('div');
      mCard.className = 'agent-mission-card';
      mCard.innerHTML = `
        <div class="amc-label">🔴 مهمتك السرية — لا تكشفها</div>
        <div class="amc-text">${mission}</div>
      `;
      cluesEl.appendChild(mCard);

      // Show false info
      const fCard = document.createElement('div');
      fCard.className = 'agent-mission-card';
      fCard.innerHTML = `
        <div class="amc-label" style="color:#8B0000">📄 معلومتك المضلّلة</div>
        <div class="amc-text" style="font-size:12px">${part.agentFalse}</div>
      `;
      cluesEl.appendChild(fCard);
    }

    // Real clues
    (part.clues || []).forEach(c => {
      const el = document.createElement('div');
      el.className = 'clue-card';
      el.textContent = c;
      cluesEl.appendChild(el);
    });

    // Reward for reading
    if (!player.storyRead) {
      player.storyRead = true;
      Player.addStat(player, 'intelligence', 5);
      Player.addCurrency(player, 'wp', 10);
      Storage.savePlayer(player);
      App.notify('+5 ذكاء +10 WP لقراءة جزء القصة', 'success');
    }
  }

  // ── Teaser for dashboard ─────────────────────────────────────
  function getDashTeaser(player) {
    const part = FRAGMENTS[player.storyPart];
    if (!part) return { title: '—', preview: '' };
    return {
      title: `${part.title} — ${part.titleEn}`,
      preview: part.text.slice(0, 70) + '...',
    };
  }

  function getDayLore(day) { return DAY_LORE[day] || ''; }

  // ── Typewriter utility ───────────────────────────────────────
  function typewrite(el, text, speed) {
    let i = 0;
    el.textContent = '';
    const step = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(step, speed);
      }
    };
    step();
  }

  return { render, getDashTeaser, getDayLore, FRAGMENTS };
})();

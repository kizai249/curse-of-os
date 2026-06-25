/* ══════════════════════════════════════════════════════════════
   voting.js — Council of Shadows voting system
═══════════════════════════════════════════════════════════════ */

const Voting = (() => {

  const SIM_PLAYERS = ['أحمد الغامدي', 'سارة المطيري', 'خالد العتيبي', 'نورة القحطاني'];

  let _voteData = { trust: null, suspect: null };
  let _player   = null;

  // ── Night events per day ─────────────────────────────────────
  const NIGHT_EVENTS = {
    3:  null, // standard voting
    5:  { label: '🌑 مهمة ليلية', text: 'روح أوس أخبرتك بسر: أحد اللاعبين تلقّى رسالة من الصندوق مباشرةً. ابحث عنه.' },
    7:  { label: '🔴 ليلة القرار', text: 'هذا آخر تصويت. صوتك يحدّد مصير الجماعة.' },
  };

  // ── Render voting screen ─────────────────────────────────────
  function render(player) {
    _player = player;
    _voteData = { trust: null, suspect: null };

    const others = SIM_PLAYERS.filter(n => !n.includes(player.name.split(' ')[0]));
    const displayNames = others.slice(0, 3);

    _buildPlayerList('trust-players', displayNames, 'trust');
    _buildPlayerList('suspect-players', displayNames, 'suspect');

    // Night event
    const nightEv = NIGHT_EVENTS[player.currentDay];
    const nightEl = document.getElementById('vt-night-event');
    const nightText = document.getElementById('vne-text');

    if (nightEv) {
      nightEl.classList.remove('hidden');
      nightEl.querySelector('.vne-label').textContent = nightEv.label;
      nightText.textContent = nightEv.text;
    } else {
      nightEl.classList.add('hidden');
    }

    // If agent, show mission
    if (Player.isAgent(player)) {
      const agentEv = document.getElementById('vt-night-event');
      agentEv.classList.remove('hidden');
      agentEv.querySelector('.vne-label').textContent = '🔴 مهمة سرية — عميل اللعنة';
      agentEv.querySelector('.vne-text').textContent =
        'أثناء التصويت، صوّت بثقة على اللاعب البريء بشكل واضح، ثم شكّك في نتيجة التصويت بعد الإعلان.';
    }

    document.getElementById('vt-result').classList.add('hidden');
  }

  function _buildPlayerList(containerId, names, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    names.forEach(name => {
      const div = document.createElement('div');
      div.className = 'vote-player';
      div.innerHTML = `
        <div class="ds-avatar" style="width:32px;height:32px;font-size:13px;flex-shrink:0">${name[0]}</div>
        <span>${name}</span>
      `;
      div.onclick = () => _selectVote(div, container, name, type);
      container.appendChild(div);
    });
  }

  function _selectVote(el, container, name, type) {
    container.querySelectorAll('.vote-player').forEach(v => {
      v.classList.remove('sel-trust', 'sel-suspect');
    });
    const cls = type === 'trust' ? 'sel-trust' : 'sel-suspect';
    el.classList.add(cls);
    _voteData[type] = name;
  }

  // ── Submit ────────────────────────────────────────────────────
  function submitVotes() {
    if (!_voteData.trust && !_voteData.suspect) {
      App.notify('صوّت على شخص واحد على الأقل', 'error');
      return;
    }

    // Apply effects
    if (_voteData.trust) {
      Player.addStat(_player, 'trust', 8);
      Player.addCurrency(_player, 'tp', 15);
    }
    if (_voteData.suspect) {
      Player.addStat(_player, 'dark', 6);
      Player.addCurrency(_player, 'sp', 5);
    }

    // Record decision
    _player.decisions = _player.decisions || [];
    _player.decisions.push({
      day: _player.currentDay,
      trust: _voteData.trust,
      suspect: _voteData.suspect,
    });

    // ── ANALYTICS: decision_made (vote) ─────────────────────────
    if (_voteData.trust) {
      Analytics.decisionMade('vote_trust', {
        target: _voteData.trust,
        day: _player.currentDay,
      });
    }
    if (_voteData.suspect) {
      Analytics.decisionMade('vote_suspect', {
        target: _voteData.suspect,
        day: _player.currentDay,
      });
    }
    // ── ANALYTICS: puzzle_progress (voting day) ─────────────────
    Analytics.puzzleProgress(`day_${_player.currentDay}_vote`, true, 0);

    Storage.savePlayer(_player);

    // Show result
    const resEl = document.getElementById('vt-result');
    let msg = '✅ تم تسجيل تصويتك.';
    if (_voteData.trust) msg += ` ثقتك: ${_voteData.trust}.`;
    if (_voteData.suspect) msg += ` شكّك: ${_voteData.suspect}.`;
    resEl.textContent = msg;
    resEl.classList.remove('hidden');
    resEl.classList.add('result-slam');

    App.notify('+8 ثقة +6 مظلم +15 TP +5 SP', 'success');

    // Complete day and advance
    if (!_player.completedDays.includes(_player.currentDay)) {
      _player.completedDays.push(_player.currentDay);
      Player.addCurrency(_player, 'ip', 100);
      Storage.savePlayer(_player);
      App.notify('+100 IP لإكمال اليوم', 'success');
    }

    setTimeout(() => {
      if (_player.currentDay < 7) {
        _player.currentDay++;
        Storage.savePlayer(_player);
        App.goTo('dashboard');
        App.notify(`📅 اليوم ${_toAr(_player.currentDay)} بدأ!`, 'info');
      } else {
        App.goTo('final-choice');
      }
    }, 2800);
  }

  function _toAr(n) {
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  }

  return { render, submitVotes };
})();

import { PARTY_CONFIG } from '../../config/minigames';
import { TEAMS, teamById } from '../../config/tournament';
import { mathRng } from '../../core/Rng';
import { generateId } from '../../game/newSave';
import { PartyShootout, type PartyPlayer } from '../../minigames/PartyShootout';
import type { Screen } from '../context';
import { append, clear, el } from '../dom';

const MAX_NAME = 12;
const GRADE_TEXT = { perfect: 'هدف خرافي! 🔥', good: 'هدددف! ⚽', saved: 'صدّها الحارس 🧤' } as const;

export const partyScreen: Screen = (root, ctx) => {
  root.classList.add('fullscreen');
  let game: PartyShootout | null = null;
  let raf = 0;
  let last = performance.now();
  let finishing = false;
  const setup: { name: string; teamId: string }[] = [
    { name: 'لاعب 1', teamId: 'ksa' },
    { name: 'لاعب 2', teamId: 'jpn' },
  ];

  const body = el('div', { class: 'party-body' });

  function renderSetup(): void {
    clear(body);
    const rows = setup.map((p, i) => {
      const name = el('input', { class: 'input', type: 'text', maxlength: MAX_NAME, value: p.name, 'aria-label': `اسم اللاعب ${i + 1}` });
      name.addEventListener('input', () => { p.name = name.value.slice(0, MAX_NAME); });
      const team = el('select', { class: 'input', 'aria-label': `منتخب اللاعب ${i + 1}` });
      for (const t of TEAMS) team.append(el('option', { value: t.id, selected: t.id === p.teamId }, t.nameAr));
      team.addEventListener('change', () => { p.teamId = team.value; renderSetup(); });
      const color = teamById(p.teamId)?.colors[0] ?? '#fff';
      return el('div', { class: 'card party-row', style: `--team:${color}` },
        el('span', { class: 'team-dot', 'aria-hidden': 'true' }), name, team,
        setup.length > PARTY_CONFIG.minPlayers ? el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'حذف لاعب', onclick: () => { setup.splice(i, 1); renderSetup(); } }, '✕') : null);
    });
    append(body,
      el('header', { class: 'screen-header' },
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'رجوع', onclick: () => ctx.navigate('games') }, '→'),
        el('div', {}, el('h2', {}, 'ركلات الشلة 🥅'), el('p', { class: 'muted small' }, `مرروا الجوال بينكم: ${PARTY_CONFIG.rounds} ركلات لكل واحد، والتعادل يروح لركلات حاسمة.`))),
      el('div', { class: 'stack' }, ...rows),
      setup.length < PARTY_CONFIG.maxPlayers
        ? el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { setup.push({ name: `لاعب ${setup.length + 1}`, teamId: TEAMS[(setup.length * 5) % TEAMS.length]!.id }); renderSetup(); } }, '+ أضف لاعب')
        : null,
      el('button', { class: 'btn btn-gold btn-xl', type: 'button', onclick: start }, 'يلا نبدأ'));
  }

  function start(): void {
    const players: PartyPlayer[] = setup.map((p, i) => ({ name: p.name.trim() || `لاعب ${i + 1}`, teamId: p.teamId }));
    game = new PartyShootout(players, mathRng, generateId());
    game.start();
    ctx.audio.unlock();
    ctx.audio.play('whistle');
    renderPlay();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const turnEl = el('div', { class: 'party-turn' });
  const scoreboard = el('div', { class: 'party-scoreboard' });
  const banner = el('div', { class: 'shot-banner', 'aria-live': 'polite' });
  const needle = el('div', { class: 'meter-needle' });
  const goodZone = el('div', { class: 'meter-zone good' });
  const perfectZone = el('div', { class: 'meter-zone perfect' });
  const kickBtn = el('button', { class: 'btn btn-gold btn-xl', type: 'button' }, 'سدّد! ⚽');
  kickBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const k = game?.kick();
    if (!k) return;
    banner.textContent = GRADE_TEXT[k.grade];
    banner.className = `shot-banner show ${k.goal ? 'goal' : 'saved'}`;
    ctx.audio.play(k.goal ? 'goal' : 'saved');
    ctx.haptic(k.goal ? [20, 40, 20] : 60);
  });

  function renderPlay(): void {
    clear(body);
    body.append(
      el('div', { class: 'shot-top' },
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'خروج', onclick: () => { game?.abort(); ctx.navigate('games'); } }, '✕'),
        el('strong', {}, 'ركلات الشلة')),
      scoreboard, turnEl,
      el('div', { class: 'shot-stage-wrap party-stage' }, el('div', { class: 'party-goal', 'aria-hidden': 'true' }, '🥅'), banner),
      el('div', { class: 'shot-controls' }, el('div', { class: 'meter', dir: 'ltr', 'aria-hidden': 'true' }, goodZone, perfectZone, needle), kickBtn));
  }

  let lastKicks = -1;
  function update(): void {
    if (!game) return;
    const s = game.snapshot();
    needle.style.left = `${s.meterValue * 100}%`;
    goodZone.style.left = `${(s.target - s.goodWindow) * 100}%`;
    goodZone.style.width = `${s.goodWindow * 200}%`;
    perfectZone.style.left = `${(s.target - s.perfectWindow) * 100}%`;
    perfectZone.style.width = `${s.perfectWindow * 200}%`;
    kickBtn.toggleAttribute('disabled', s.phase !== 'aiming' || s.state !== 'active');
    const key = s.kicks.length * 10 + (s.phase === 'aiming' ? 1 : 0);
    if (key === lastKicks) return;
    lastKicks = key;
    if (s.phase === 'aiming') banner.className = 'shot-banner';
    const p = game.players[s.currentPlayer]!;
    const team = teamById(p.teamId);
    clear(turnEl);
    turnEl.append(el('span', { class: 'team-dot', style: `--team:${team?.colors[0] ?? '#fff'}`, 'aria-hidden': 'true' }),
      el('strong', {}, `دور ${p.name}`), el('span', { class: 'muted small' }, s.suddenDeath ? ' · ركلات حاسمة!' : ` · الجولة ${Math.min(s.round + 1, PARTY_CONFIG.rounds)} من ${PARTY_CONFIG.rounds}`));
    clear(scoreboard);
    game.players.forEach((pl, i) => {
      const kicks = s.kicks.filter((k) => k.playerIndex === i);
      scoreboard.append(el('div', { class: `party-score ${i === s.currentPlayer ? 'current' : ''} ${s.active.includes(i) ? '' : 'out'}`, style: `--team:${teamById(pl.teamId)?.colors[0] ?? '#fff'}` },
        el('span', { class: 'team-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'party-name' }, pl.name),
        el('span', { class: 'shot-dots', dir: 'ltr' }, ...kicks.map((k) => el('span', { class: `dot ${k.goal ? 'goal' : 'miss'}` }))),
        el('strong', { dir: 'ltr' }, String(s.goals[i]))));
    });
  }

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!game) return;
    game.tick(Math.min(now - last, 100));
    last = now;
    update();
    const s = game.snapshot();
    if (s.state === 'success' && !finishing) {
      finishing = true;
      cancelAnimationFrame(raf);
      const result = game.result()!;
      window.setTimeout(() => {
        void ctx.finishRun({ result, party: { names: game!.players.map((p) => p.name), goals: s.goals, winners: s.winners } });
      }, 700);
    }
  };

  const onVisibility = () => { if (document.hidden) game?.pause(); else if (game?.resume()) last = performance.now(); };
  document.addEventListener('visibilitychange', onVisibility);
  root.append(body);
  renderSetup();

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    root.classList.remove('fullscreen');
    if (!finishing && game?.abort()) ctx.analytics.track({ name: 'minigame_aborted', props: { gameId: 'party_shootout' } });
  };
};

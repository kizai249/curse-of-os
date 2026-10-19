import { mathRng } from '../../core/Rng';
import { generateId } from '../../game/newSave';
import { TimingShot, type ShotOutcome } from '../../minigames/TimingShot';
import type { Screen } from '../context';
import { clear, el } from '../dom';
import { fmt } from '../labels';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRADE_TEXT = { perfect: 'هدف خرافي! 🔥', good: 'هدددف! ⚽', saved: 'صدّها الحارس 🧤' } as const;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function buildStage(): { root: SVGSVGElement; ball: SVGGElement; keeper: SVGGElement } {
  const root = svg('svg', { viewBox: '0 0 320 220', class: 'shot-stage', role: 'img', 'aria-label': 'المرمى والحارس' });
  const defs = svg('defs', {});
  const net = svg('pattern', { id: 'net', width: 10, height: 10, patternUnits: 'userSpaceOnUse' });
  net.append(svg('path', { d: 'M0 0 L10 10 M10 0 L0 10', stroke: 'rgba(255,255,255,.28)', 'stroke-width': 1 }));
  const sky = svg('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 });
  sky.append(svg('stop', { offset: '0', 'stop-color': '#0b1430' }), svg('stop', { offset: '1', 'stop-color': '#1d3b6e' }));
  defs.append(net, sky);
  root.append(defs,
    svg('rect', { x: 0, y: 0, width: 320, height: 220, fill: 'url(#sky)' }),
    svg('rect', { x: 0, y: 150, width: 320, height: 70, fill: '#2e8b47' }),
    svg('path', { d: 'M60 150 L260 150', stroke: '#f2f2f2', 'stroke-width': 2 }),
    svg('rect', { x: 70, y: 60, width: 180, height: 90, fill: 'url(#net)' }),
    svg('path', { d: 'M70 150 L70 60 L250 60 L250 150', fill: 'none', stroke: '#ffffff', 'stroke-width': 6, 'stroke-linejoin': 'round' }));

  const keeper = svg('g', { class: 'keeper' });
  keeper.append(
    svg('rect', { x: -14, y: -40, width: 28, height: 38, rx: 10, fill: '#ff7a00' }),
    svg('circle', { cx: 0, cy: -50, r: 10, fill: '#c68b59' }),
    svg('rect', { x: -30, y: -38, width: 16, height: 9, rx: 4, fill: '#ff7a00' }),
    svg('rect', { x: 14, y: -38, width: 16, height: 9, rx: 4, fill: '#ff7a00' }),
    svg('circle', { cx: -32, cy: -34, r: 6, fill: '#8ecae6' }),
    svg('circle', { cx: 32, cy: -34, r: 6, fill: '#8ecae6' }),
    svg('rect', { x: -12, y: -4, width: 9, height: 16, rx: 3, fill: '#1b1f2a' }),
    svg('rect', { x: 3, y: -4, width: 9, height: 16, rx: 3, fill: '#1b1f2a' }));
  const keeperPos = svg('g', { class: 'keeper-pos', transform: 'translate(160 140)' });
  keeperPos.append(keeper);

  const ball = svg('g', { class: 'ball' });
  ball.append(
    svg('circle', { cx: 0, cy: 0, r: 11, fill: '#f5f5f0', stroke: '#1b1f2a', 'stroke-width': 1.5 }),
    svg('path', { d: 'M0 -5 L5 -1 L3 5 L-3 5 L-5 -1 Z', fill: '#1b1f2a' }));
  root.append(keeperPos, ball);
  return { root, ball, keeper };
}

export const timingShotScreen: Screen = (root, ctx) => {
  root.classList.add('fullscreen');
  const game = new TimingShot(mathRng, generateId());
  let raf = 0;
  let last = performance.now();
  let finishing = false;
  let lastShots = 0;
  let dotsKey = '';
  const reduced = ctx.session.data.settings.reducedMotion;

  const stage = buildStage();
  const dots = el('div', { class: 'shot-dots', 'aria-label': 'التسديدات' });
  const scoreEl = el('div', { class: 'shot-score', dir: 'ltr' }, '0');
  const banner = el('div', { class: 'shot-banner', 'aria-live': 'polite' });
  const needle = el('div', { class: 'meter-needle' });
  const goodZone = el('div', { class: 'meter-zone good' });
  const perfectZone = el('div', { class: 'meter-zone perfect' });
  const meter = el('div', { class: 'meter', dir: 'ltr', 'aria-hidden': 'true' }, goodZone, perfectZone, needle);
  const shootBtn = el('button', { class: 'btn btn-gold btn-xl', type: 'button' }, 'سدّد! ⚽');
  const overlay = el('div', { class: 'shot-overlay' });
  const pauseBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'إيقاف مؤقت' }, '⏸');
  const exitBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'خروج' }, '✕');

  const showOverlay = (...children: (Node | string)[]) => { clear(overlay); overlay.append(el('div', { class: 'shot-card' }, ...children)); overlay.hidden = false; };
  const hideOverlay = () => { overlay.hidden = true; };

  const showStart = () => showOverlay(
    el('div', { class: 'results-icon' }, '🎯'),
    el('h2', {}, 'تحدي التسديد'),
    el('p', {}, 'وقّف المؤشر داخل المنطقة الذهبية. سجّل 3 أهداف من 5 عشان تفوز.'),
    el('p', { class: 'muted small' }, 'المؤشر يسرع مع كل تسديدة. المنطقة البيضا = هدف، الذهبية = هدف خرافي.'),
    el('button', { class: 'btn btn-gold', type: 'button', onclick: () => { ctx.audio.unlock(); ctx.audio.play('whistle'); game.start(); hideOverlay(); } }, 'يلا نبدأ'));

  const showPause = (exiting = false) => showOverlay(
    el('h2', {}, exiting ? 'تبي تطلع؟' : 'إيقاف مؤقت'),
    exiting ? el('p', { class: 'muted' }, 'الجولة ما راح تنحسب.') : el('p', { class: 'muted' }, 'خذ نفس 😮‍💨'),
    el('div', { class: 'row gap' },
      el('button', { class: 'btn btn-gold', type: 'button', onclick: () => { game.resume(); hideOverlay(); last = performance.now(); } }, 'كمّل'),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: exit }, 'اطلع')));

  function exit(): void {
    if (game.abort()) ctx.analytics.track({ name: 'minigame_aborted', props: { gameId: 'timing_shot' } });
    ctx.navigate('games');
  }

  pauseBtn.addEventListener('click', () => { if (game.pause()) showPause(); });
  exitBtn.addEventListener('click', () => {
    const s = game.snapshot().state;
    if (s === 'start') { exit(); return; }
    if (game.pause() || s === 'paused') showPause(true);
  });

  const shoot = () => {
    const outcome = game.shoot();
    if (!outcome) return;
    animateShot(outcome);
  };
  shootBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shoot(); });
  stage.root.addEventListener('pointerdown', shoot);
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); shoot(); }
    if (e.code === 'Escape' && game.pause()) showPause();
  };
  window.addEventListener('keydown', onKey);
  const onVisibility = () => { if (document.hidden && game.pause()) showPause(); };
  document.addEventListener('visibilitychange', onVisibility);

  function animateShot(o: ShotOutcome): void {
    // Direction: where the needle stopped relative to the sweet spot picks the side.
    const side = o.meterValue >= o.target ? 1 : -1;
    const ballX = o.goal ? 160 + side * (o.grade === 'perfect' ? 75 : 50) : 160 + side * 40;
    const ballY = o.goal ? (o.grade === 'perfect' ? 72 : 100) : 112;
    const keeperX = o.goal ? -side * 45 : side * 40;
    stage.root.style.setProperty('--dur', reduced ? '0.15s' : '0.45s');
    stage.ball.style.transform = `translate(${ballX}px, ${ballY}px) scale(0.6)`;
    stage.keeper.style.transform = `translateX(${keeperX}px) rotate(${keeperX > 0 ? 35 : keeperX < 0 ? -35 : 0}deg)`;
    banner.textContent = GRADE_TEXT[o.grade];
    banner.className = `shot-banner show ${o.goal ? 'goal' : 'saved'}`;
    ctx.audio.play(o.goal ? 'goal' : 'saved');
    ctx.haptic(o.goal ? [20, 40, 20] : 60);
  }

  function resetStage(): void {
    stage.root.style.setProperty('--dur', '0s');
    stage.ball.style.transform = 'translate(160px, 195px) scale(1)';
    stage.keeper.style.transform = 'translateX(0) rotate(0deg)';
    banner.className = 'shot-banner';
  }

  function render(): void {
    const s = game.snapshot();
    needle.style.left = `${s.meterValue * 100}%`;
    goodZone.style.left = `${(s.target - s.goodWindow) * 100}%`;
    goodZone.style.width = `${s.goodWindow * 200}%`;
    perfectZone.style.left = `${(s.target - s.perfectWindow) * 100}%`;
    perfectZone.style.width = `${s.perfectWindow * 200}%`;
    scoreEl.textContent = fmt(s.score);
    shootBtn.toggleAttribute('disabled', s.state !== 'active' || s.phase !== 'aiming');
    pauseBtn.toggleAttribute('disabled', s.state !== 'active');
    const key = `${s.history.length}:${s.shotIndex}`;
    if (key !== dotsKey) {
      dotsKey = key;
      clear(dots);
      for (let i = 0; i < s.shotsTotal; i++) {
        const h = s.history[i];
        dots.append(el('span', { class: `dot ${h ? (h.goal ? 'goal' : 'miss') : i === s.shotIndex ? 'current' : ''}` }));
      }
    }
    if (s.phase === 'aiming' && s.history.length === lastShots + 1 && s.state === 'active') resetStage();
    if (s.phase === 'aiming') lastShots = s.history.length;
  }

  async function finish(): Promise<void> {
    if (finishing) return;
    finishing = true;
    const result = game.result();
    if (!result) return;
    ctx.audio.play('whistle');
    ctx.analytics.track({ name: 'minigame_finished', props: { gameId: result.gameId, success: result.success, score: result.score, durationMs: result.durationMs } });
    const recorded = await ctx.session.recordMiniGame(result);
    if (recorded.ok) ctx.navigate('results', { result, xpAwarded: recorded.value.xpAwarded, newBest: recorded.value.newBest });
    else ctx.navigate('results', { result, xpAwarded: 0, newBest: false, error: 'ما قدرنا نسجل النتيجة، المكافأة ما انضافت.' });
  }

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(now - last, 100);
    last = now;
    game.tick(dt);
    render();
    const st = game.snapshot().state;
    if (st === 'success' || st === 'failure') {
      cancelAnimationFrame(raf);
      window.setTimeout(() => { void finish(); }, reduced ? 200 : 700);
    }
  };

  root.append(
    el('div', { class: 'shot-top' }, exitBtn, dots, el('div', { class: 'row' }, scoreEl, pauseBtn)),
    el('div', { class: 'shot-stage-wrap' }, stage.root, banner),
    el('div', { class: 'shot-controls' }, meter, shootBtn),
    overlay);
  resetStage();
  showStart();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    root.classList.remove('fullscreen');
    // leaving mid-game (e.g. via router) counts as an abort; no reward
    if (!finishing && game.abort()) ctx.analytics.track({ name: 'minigame_aborted', props: { gameId: 'timing_shot' } });
  };
};

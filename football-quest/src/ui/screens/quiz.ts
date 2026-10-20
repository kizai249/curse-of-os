import { CUP_QUIZ_CONFIG } from '../../config/minigames';
import { mathRng } from '../../core/Rng';
import { generateId } from '../../game/newSave';
import { CupQuiz } from '../../minigames/CupQuiz';
import { drawQuestions } from '../../minigames/quizBank';
import type { Screen } from '../context';
import { clear, el, progressBar } from '../dom';
import { fmt } from '../labels';

export const quizScreen: Screen = (root, ctx) => {
  root.classList.add('fullscreen');
  const game = new CupQuiz(drawQuestions(mathRng, CUP_QUIZ_CONFIG.questionsPerRound), generateId());
  let raf = 0;
  let last = performance.now();
  let finishing = false;
  let renderedKey = '';

  const counter = el('span', { class: 'quiz-counter', dir: 'ltr' });
  const scoreEl = el('span', { class: 'shot-score', dir: 'ltr' }, '0');
  const timer = el('div', { class: 'quiz-timer' });
  const prompt = el('h2', { class: 'quiz-prompt' });
  const options = el('div', { class: 'quiz-options' });
  const overlay = el('div', { class: 'shot-overlay' });
  const pauseBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'إيقاف مؤقت' }, '⏸');

  const showOverlay = (...children: (Node | string)[]) => { clear(overlay); overlay.append(el('div', { class: 'shot-card' }, ...children)); overlay.hidden = false; };
  const hideOverlay = () => { overlay.hidden = true; };
  const exit = () => { if (game.abort()) ctx.analytics.track({ name: 'minigame_aborted', props: { gameId: 'cup_quiz' } }); ctx.navigate('games'); };
  const showPause = (exiting = false) => showOverlay(
    el('h2', {}, exiting ? 'تبي تطلع؟' : 'إيقاف مؤقت'),
    el('p', { class: 'muted' }, exiting ? 'الجولة ما راح تنحسب.' : 'الوقت واقف.'),
    el('div', { class: 'row gap' },
      el('button', { class: 'btn btn-gold', type: 'button', onclick: () => { game.resume(); hideOverlay(); last = performance.now(); } }, 'كمّل'),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: exit }, 'اطلع')));

  pauseBtn.addEventListener('click', () => { if (game.pause()) showPause(); });
  const exitBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'خروج', onclick: () => {
    if (game.snapshot().state === 'start') { exit(); return; }
    if (game.pause() || game.snapshot().state === 'paused') showPause(true);
  } }, '✕');
  const onVisibility = () => { if (document.hidden && game.pause()) showPause(); };
  document.addEventListener('visibilitychange', onVisibility);

  function render(): void {
    const s = game.snapshot();
    counter.textContent = `${s.index + 1}/${s.total}`;
    scoreEl.textContent = fmt(s.score);
    clear(timer);
    timer.append(progressBar(s.remainingMs, CUP_QUIZ_CONFIG.questionTimeMs, s.remainingMs < 4000 ? 'progress-danger' : ''));
    const key = `${s.index}:${s.phase}`;
    if (key === renderedKey) return;
    renderedKey = key;
    prompt.textContent = s.question.promptAr;
    clear(options);
    s.question.options.forEach((label, i) => {
      let cls = 'quiz-option';
      if (s.phase === 'feedback' && s.lastOutcome) {
        if (i === s.lastOutcome.correctIndex) cls += ' correct';
        else if (i === s.lastOutcome.chosenIndex) cls += ' wrong';
      }
      const b = el('button', { class: cls, type: 'button', disabled: s.phase !== 'asking' }, label);
      b.addEventListener('click', () => {
        const out = game.answer(i);
        if (!out) return;
        ctx.audio.play(out.correct ? 'claim' : 'error');
        ctx.haptic(out.correct ? 20 : 60);
      });
      options.append(b);
    });
  }

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    game.tick(Math.min(now - last, 100));
    last = now;
    render();
    const st = game.snapshot().state;
    if ((st === 'success' || st === 'failure') && !finishing) {
      finishing = true;
      cancelAnimationFrame(raf);
      const result = game.result()!;
      void ctx.finishRun({ result, quiz: { correct: game.snapshot().correctCount, total: game.snapshot().total } });
    }
  };

  root.append(
    el('div', { class: 'shot-top' }, exitBtn, counter, el('div', { class: 'row' }, scoreEl, pauseBtn)),
    timer,
    el('div', { class: 'quiz-body' }, prompt, options),
    overlay);
  showOverlay(
    el('div', { class: 'results-icon' }, '🧠'),
    el('h2', {}, 'وش تعرف عن البطولة؟'),
    el('p', {}, `${CUP_QUIZ_CONFIG.questionsPerRound} أسئلة عن المنتخبات والملاعب والمدن المستضيفة. جاوب ${CUP_QUIZ_CONFIG.correctToWin} صح عشان تفوز.`),
    el('p', { class: 'muted small' }, 'كل ما جاوبت أسرع، أخذت نقاط أكثر.'),
    el('button', { class: 'btn btn-gold', type: 'button', onclick: () => { ctx.audio.unlock(); ctx.audio.play('whistle'); game.start(); hideOverlay(); last = performance.now(); } }, 'يلا نبدأ'));
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    root.classList.remove('fullscreen');
    if (!finishing && game.abort()) ctx.analytics.track({ name: 'minigame_aborted', props: { gameId: 'cup_quiz' } });
  };
};

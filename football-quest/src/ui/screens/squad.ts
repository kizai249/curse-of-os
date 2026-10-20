import { POSITION_LABEL_AR } from '../../config/items';
import { SQUAD_CONFIG } from '../../config/minigames';
import { teamById } from '../../config/tournament';
import { generateId } from '../../game/newSave';
import { scoreSquad, SQUAD_SLOTS, type SquadSlot } from '../../minigames/SquadBuilder';
import { rarityRank, type ItemDefinition } from '../../domain/types';
import { itemArt } from '../art';
import type { Screen } from '../context';
import { clear, el, progressBar } from '../dom';
import { RARITY_LABEL } from '../labels';

const SLOT_LABEL: Readonly<Record<SquadSlot, string>> = { GK: POSITION_LABEL_AR.GK, DF: POSITION_LABEL_AR.DF, MF: POSITION_LABEL_AR.MF, FW: POSITION_LABEL_AR.FW, FLEX: 'نجم حر' };
/** Visual layout on the mini pitch (percent of width/height), attack at the top. */
const SLOT_POS: Readonly<Record<SquadSlot, [number, number]>> = { FW: [50, 14], FLEX: [22, 34], MF: [62, 42], DF: [40, 66], GK: [50, 88] };

const SUBMIT_ERRORS: Record<string, string> = {
  empty_lineup: 'حط لاعب واحد على الأقل',
  not_owned: 'فيه بطاقة ما تملكها',
  duplicate_card: 'نفس البطاقة مكررة',
  duplicate_grant: 'هالتشكيلة انحسبت من قبل',
};

export const squadScreen: Screen = (root, ctx) => {
  const lineup: Partial<Record<SquadSlot, ItemDefinition>> = {};
  const runId = generateId();
  const startedAt = performance.now();
  let submitting = false;

  const ownedCards = () => ctx.catalog.items
    .filter((i) => i.kind === 'player_card' && ctx.session.data.inventory.items[i.id])
    .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));

  const pitch = el('div', { class: 'squad-pitch' });
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lines.setAttribute('class', 'squad-lines');
  lines.setAttribute('viewBox', '0 0 100 100');
  lines.setAttribute('preserveAspectRatio', 'none');
  const breakdown = el('div', { class: 'card stack' });
  const submit = el('button', { class: 'btn btn-gold', type: 'button' }, 'اعتمد التشكيلة ✅');

  function render(): void {
    clear(pitch);
    pitch.append(lines);
    const score = scoreSquad(lineup);
    clear(lines);
    for (const link of score.links) {
      const [x1, y1] = SLOT_POS[link.a], [x2, y2] = SLOT_POS[link.b];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      for (const [k, v] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(k, String(v));
      line.setAttribute('class', `link link-${link.kind}`);
      lines.append(line);
    }
    for (const slot of SQUAD_SLOTS) {
      const card = lineup[slot];
      const [x, y] = SLOT_POS[slot];
      pitch.append(el('button', { class: `slot ${card ? 'filled' : ''}`, type: 'button', style: `left:${x}%;top:${y}%`, 'aria-label': `${SLOT_LABEL[slot]}${card ? `: ${card.nameAr}` : ' — فاضي'}`, onclick: () => pick(slot) },
        card ? itemArt(card, 'item-art card-art-sm') : el('span', { class: 'slot-empty' }, '+'),
        el('span', { class: 'slot-label' }, SLOT_LABEL[slot])));
    }
    clear(breakdown);
    breakdown.append(
      el('div', { class: 'row' }, el('h3', {}, 'الكيمياء'), el('strong', { class: 'score-mid', dir: 'ltr' }, String(score.total))),
      progressBar(score.total, SQUAD_CONFIG.winScore, score.total >= SQUAD_CONFIG.winScore ? '' : 'progress-dim'),
      el('div', { class: 'chips' },
        el('span', { class: 'chip' }, `الندرة ${score.rarity}`),
        el('span', { class: 'chip' }, `المراكز ${score.fit}`),
        el('span', { class: 'chip chip-xp' }, `نفس المنتخب ${score.sameTeam}`),
        el('span', { class: 'chip chip-shard' }, `نفس المجموعة ${score.sameGroup}`)),
      el('p', { class: 'muted small' }, score.total >= SQUAD_CONFIG.winScore ? 'تشكيلة فائزة! اعتمدها 🔥' : `تحتاج ${SQUAD_CONFIG.winScore} عشان تفوز. اجمع لاعبين من نفس المنتخب وحطهم في مراكزهم.`));
  }

  function pick(slot: SquadSlot): void {
    const used = new Set(Object.values(lineup).filter(Boolean).map((c) => c!.id));
    const cards = ownedCards().filter((c) => (slot === 'FLEX' || c.position === slot) && (!used.has(c.id) || lineup[slot]?.id === c.id));
    const close = () => overlay.remove();
    const choose = (card: ItemDefinition | null) => {
      if (card) lineup[slot] = card; else delete lineup[slot];
      ctx.audio.play('tap');
      close();
      render();
    };
    const list = cards.length
      ? el('div', { class: 'pick-list' }, ...cards.map((c) => el('button', { class: 'pick-item', type: 'button', onclick: () => choose(c) },
          itemArt(c, 'item-art card-art-sm'),
          el('div', {}, el('strong', {}, c.nameAr), el('p', { class: 'muted small' }, `${teamById(c.teamId!)?.nameAr ?? ''} · ${RARITY_LABEL[c.rarity]}`)))))
      : el('p', { class: 'empty' }, slot === 'FLEX' ? 'ما عندك بطاقات لاعبين للحين.' : `ما عندك بطاقة ${SLOT_LABEL[slot]} للحين — دوّرها في الملاعب.`);
    const overlay = el('div', { class: 'sheet-overlay', onclick: (e: Event) => { if (e.target === overlay) close(); } },
      el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': `اختر ${SLOT_LABEL[slot]}` },
        el('h2', {}, `اختر ${SLOT_LABEL[slot]}`),
        list,
        el('div', { class: 'row gap' },
          lineup[slot] ? el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => choose(null) }, 'شيل اللاعب') : null,
          el('button', { class: 'btn btn-primary', type: 'button', onclick: close }, 'إغلاق'))));
    document.body.append(overlay);
  }

  submit.addEventListener('click', async () => {
    if (submitting) return;
    submitting = true;
    submit.setAttribute('disabled', '');
    const ids: Partial<Record<SquadSlot, string>> = {};
    for (const slot of SQUAD_SLOTS) if (lineup[slot]) ids[slot] = lineup[slot]!.id;
    const res = await ctx.session.submitSquad(runId, ids, Math.round(performance.now() - startedAt));
    if (!res.ok) {
      ctx.audio.play('error');
      ctx.toast(SUBMIT_ERRORS[res.error] ?? 'ما قدرنا نعتمد التشكيلة', 'error');
      submitting = false;
      submit.removeAttribute('disabled');
      return;
    }
    ctx.analytics.track({ name: 'minigame_finished', props: { gameId: 'squad_builder', success: res.value.success, score: res.value.score.total, durationMs: 0 } });
    ctx.navigate('results', { results: {
      result: { runId, gameId: 'squad_builder', success: res.value.success, score: res.value.score.total, durationMs: 0 },
      xpAwarded: res.value.xpAwarded, newBest: res.value.newBest, squad: res.value.score,
    } });
  });

  const count = ownedCards().length;
  root.append(
    el('header', { class: 'screen-header' },
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'رجوع', onclick: () => ctx.navigate('games') }, '→'),
      el('div', {}, el('h2', {}, 'تحدي التشكيلة'), el('p', { class: 'muted small' }, `عندك ${count} بطاقة لاعب · المركز الصح + نفس المنتخب = كيمياء أعلى`))),
    pitch, breakdown, submit);
  render();
};

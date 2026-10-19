import { dayKey } from '../../core/Clock';
import type { MissionProgress } from '../../domain/missions';
import type { MissionDefinition, Reward } from '../../domain/types';
import type { Screen, UIContext } from '../context';
import { append, el, progressBar } from '../dom';
import { fmt, formatDuration } from '../labels';

const CLAIM_ERRORS: Record<string, string> = {
  already_claimed: 'استلمتها من قبل 👌',
  not_completed: 'كمّل المهمة أول',
  expired: 'انتهى وقت المهمة',
  duplicate_grant: 'استلمتها من قبل 👌',
  grant_in_progress: 'لحظة… جاري الاستلام',
  authority_unavailable: 'ما قدرنا نتحقق من المكافأة، جرّب بعد شوي',
};

function rewardChips(reward: Reward): HTMLElement {
  return el('div', { class: 'chips' },
    reward.xp ? el('span', { class: 'chip chip-xp', dir: 'ltr' }, `+${fmt(reward.xp)} XP`) : null,
    reward.shards ? el('span', { class: 'chip chip-shard', dir: 'ltr' }, `+${fmt(reward.shards)} 💎`) : null,
  );
}

function missionCard(def: MissionDefinition, p: MissionProgress, ctx: UIContext): HTMLElement {
  let action: HTMLElement;
  if (p.status === 'completed') {
    const btn = el('button', { class: 'btn btn-gold btn-sm', type: 'button' }, 'استلم 🎁');
    btn.addEventListener('click', async () => {
      btn.setAttribute('disabled', '');
      const res = await ctx.session.claimMission(def.id);
      if (res.ok) {
        ctx.audio.play('claim');
        ctx.haptic(30);
        ctx.toast(`استلمت مكافأة «${def.titleAr}»`, 'success');
        ctx.analytics.track({ name: 'mission_claimed', props: { missionId: def.id } });
      } else {
        ctx.audio.play('error');
        ctx.toast(CLAIM_ERRORS[res.error] ?? 'صار خطأ، جرّب مرة ثانية', 'error');
        btn.removeAttribute('disabled');
      }
    });
    action = btn;
  } else if (p.status === 'claimed') {
    action = el('span', { class: 'status status-done' }, '✔ مستلمة');
  } else if (p.status === 'expired') {
    action = el('span', { class: 'status status-expired' }, 'انتهت');
  } else {
    action = el('span', { class: 'status' }, `${p.progress}/${def.objective.target}`);
  }
  return el('article', { class: `card mission mission-${p.status}` },
    el('div', { class: 'mission-head' },
      el('div', {}, el('h3', {}, def.titleAr), el('p', { class: 'muted' }, def.descriptionAr)),
      action),
    progressBar(p.progress, def.objective.target),
    rewardChips(def.reward));
}

function msUntilNextDay(now: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return next - now;
}

export const missionsScreen: Screen = (root, ctx) => {
  const { missions } = ctx.session.data;
  const sorted = (entries: Readonly<Record<string, MissionProgress>>) =>
    Object.entries(entries)
      .map(([id, p]) => ({ def: ctx.missionBook.get(id), p }))
      .filter((x): x is { def: MissionDefinition; p: MissionProgress } => x.def !== undefined)
      .sort((a, b) => order(a.p) - order(b.p));

  const intro = sorted(missions.intro).filter((x) => x.p.status !== 'claimed');
  const daily = sorted(missions.daily.entries);
  const isToday = missions.daily.dayKey === dayKey(ctx.clock.now());

  append(root,
    el('header', { class: 'screen-header' }, el('h2', {}, 'المهمات'), el('p', { class: 'muted' }, 'كمّل المهمات واستلم XP وشظايا 💎')),
    el('section', {},
      el('div', { class: 'section-title' }, el('h3', {}, 'مهمات اليوم'),
        isToday ? el('span', { class: 'muted small' }, `تتجدد بعد ${formatDuration(msUntilNextDay(ctx.clock.now()))}`) : null),
      daily.length ? el('div', { class: 'stack' }, ...daily.map((x) => missionCard(x.def, x.p, ctx))) : el('p', { class: 'empty' }, 'ما فيه مهمات يومية الحين.')),
    intro.length ? el('section', {},
      el('div', { class: 'section-title' }, el('h3', {}, 'مهمات البداية')),
      el('div', { class: 'stack' }, ...intro.map((x) => missionCard(x.def, x.p, ctx)))) : null,
  );
};

function order(p: MissionProgress): number {
  return { completed: 0, active: 1, claimed: 2, expired: 3 }[p.status];
}

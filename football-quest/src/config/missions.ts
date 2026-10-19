import type { MissionDefinition } from '../domain/types';

/** One-time onboarding missions. */
export const INTRO_MISSIONS: readonly MissionDefinition[] = [
  { id: 'intro_first_find', kind: 'intro', titleAr: 'أول اكتشاف', descriptionAr: 'روح لأي نقطة لامعة في الساحة والتقطها.', objective: { type: 'discover', target: 1 }, reward: { xp: 50, shards: 10 } },
  { id: 'intro_collect_3', kind: 'intro', titleAr: 'بداية المجموعة', descriptionAr: 'اجمع 3 قطع.', objective: { type: 'collect', target: 3 }, reward: { xp: 80, shards: 20 } },
  { id: 'intro_first_shot', kind: 'intro', titleAr: 'أول تسديدة', descriptionAr: 'العب تحدي التسديد مرة وحدة.', objective: { type: 'play_minigame', target: 1, gameId: 'timing_shot' }, reward: { xp: 60 } },
  { id: 'intro_first_win', kind: 'intro', titleAr: 'هدف الفوز', descriptionAr: 'افز في أي تحدي.', objective: { type: 'win_minigame', target: 1 }, reward: { xp: 100, shards: 30 } },
];

/** Pool that daily missions are drawn from (deterministically per calendar day). */
export const DAILY_MISSION_POOL: readonly MissionDefinition[] = [
  { id: 'daily_discover_5', kind: 'daily', titleAr: 'جولة الساحة', descriptionAr: 'اكتشف 5 نقاط اليوم.', objective: { type: 'discover', target: 5 }, reward: { xp: 120, shards: 25 } },
  { id: 'daily_rare_1', kind: 'daily', titleAr: 'صيد نادر', descriptionAr: 'اجمع قطعة نادرة أو أعلى.', objective: { type: 'collect', target: 1, minRarity: 'rare' }, reward: { xp: 100, shards: 30 } },
  { id: 'daily_play_3', kind: 'daily', titleAr: 'لاعب نشيط', descriptionAr: 'العب 3 تحديات.', objective: { type: 'play_minigame', target: 3 }, reward: { xp: 90 } },
  { id: 'daily_win_2', kind: 'daily', titleAr: 'فوزين ورا بعض', descriptionAr: 'افز في تحديين.', objective: { type: 'win_minigame', target: 2 }, reward: { xp: 150, shards: 20 } },
  { id: 'daily_score_shot', kind: 'daily', titleAr: 'قناص المرمى', descriptionAr: 'سجّل 12 نقطة أو أكثر في تحدي التسديد.', objective: { type: 'score_minigame', target: 1, gameId: 'timing_shot', minScore: 12 }, reward: { xp: 130, shards: 35 } },
  { id: 'daily_collect_6', kind: 'daily', titleAr: 'جامع محترف', descriptionAr: 'اجمع 6 قطع اليوم.', objective: { type: 'collect', target: 6 }, reward: { xp: 110, shards: 20 } },
];

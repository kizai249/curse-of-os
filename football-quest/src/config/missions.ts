import type { MissionDefinition } from '../domain/types';

/** One-time onboarding missions — they walk the player through stadium, landmark, collection and games. */
export const INTRO_MISSIONS: readonly MissionDefinition[] = [
  { id: 'intro_first_stadium', kind: 'intro', titleAr: 'أول ملعب', descriptionAr: 'ادخل أي ملعب من ملاعب البطولة والتقط ختم الملعب.', objective: { type: 'discover', target: 1, locationKind: 'stadium' }, reward: { xp: 60, shards: 10 } },
  { id: 'intro_first_landmark', kind: 'intro', titleAr: 'سائح كروي', descriptionAr: 'زور منطقة المشجعين في أي مدينة والتقط بطاقة معلم.', objective: { type: 'discover', target: 1, locationKind: 'fanzone' }, reward: { xp: 60, shards: 10 } },
  { id: 'intro_badges_3', kind: 'intro', titleAr: 'جمهور آسيا', descriptionAr: 'اجمع 3 شارات منتخبات.', objective: { type: 'collect', target: 3, itemKind: 'team_badge' }, reward: { xp: 90, shards: 20 } },
  { id: 'intro_quiz', kind: 'intro', titleAr: 'تعرف البطولة؟', descriptionAr: 'العب تحدي «وش تعرف عن البطولة».', objective: { type: 'play_minigame', target: 1, gameId: 'cup_quiz' }, reward: { xp: 70 } },
  { id: 'intro_squad', kind: 'intro', titleAr: 'المدرب الجديد', descriptionAr: 'افز في تحدي التشكيلة.', objective: { type: 'win_minigame', target: 1, gameId: 'squad_builder' }, reward: { xp: 100, shards: 30 } },
];

/** Pool that daily missions are drawn from (deterministically per calendar day). */
export const DAILY_MISSION_POOL: readonly MissionDefinition[] = [
  { id: 'daily_landmarks_2', kind: 'daily', titleAr: 'جولة سياحية', descriptionAr: 'زور معلمين سياحيين اليوم.', objective: { type: 'discover', target: 2, locationKind: 'fanzone' }, reward: { xp: 120, shards: 25 } },
  { id: 'daily_stadium_4', kind: 'daily', titleAr: 'جولة الملاعب', descriptionAr: 'اكتشف 4 نقاط داخل الملاعب.', objective: { type: 'discover', target: 4, locationKind: 'stadium' }, reward: { xp: 110, shards: 20 } },
  { id: 'daily_riyadh', kind: 'daily', titleAr: 'يوم في الرياض', descriptionAr: 'اكتشف 3 نقاط في الرياض.', objective: { type: 'discover', target: 3, cityId: 'riyadh' }, reward: { xp: 100, shards: 20 } },
  { id: 'daily_jeddah', kind: 'daily', titleAr: 'يوم في جدة', descriptionAr: 'اكتشف 3 نقاط في جدة.', objective: { type: 'discover', target: 3, cityId: 'jeddah' }, reward: { xp: 100, shards: 20 } },
  { id: 'daily_khobar', kind: 'daily', titleAr: 'يوم في الخبر', descriptionAr: 'اكتشف 3 نقاط في الخبر.', objective: { type: 'discover', target: 3, cityId: 'khobar' }, reward: { xp: 100, shards: 20 } },
  { id: 'daily_cards_3', kind: 'daily', titleAr: 'كشّاف مواهب', descriptionAr: 'اجمع 3 بطاقات لاعبين.', objective: { type: 'collect', target: 3, itemKind: 'player_card' }, reward: { xp: 100, shards: 25 } },
  { id: 'daily_rare_1', kind: 'daily', titleAr: 'صيد نادر', descriptionAr: 'اجمع قطعة نادرة أو أعلى.', objective: { type: 'collect', target: 1, minRarity: 'rare' }, reward: { xp: 100, shards: 30 } },
  { id: 'daily_quiz_win', kind: 'daily', titleAr: 'خبير البطولة', descriptionAr: 'افز في تحدي المعلومات.', objective: { type: 'win_minigame', target: 1, gameId: 'cup_quiz' }, reward: { xp: 130, shards: 30 } },
  { id: 'daily_party', kind: 'daily', titleAr: 'ركلات الشلة', descriptionAr: 'العب ركلات الترجيح مع ربعك.', objective: { type: 'play_minigame', target: 1, gameId: 'party_shootout' }, reward: { xp: 120, shards: 25 } },
  { id: 'daily_score_shot', kind: 'daily', titleAr: 'قناص المرمى', descriptionAr: 'سجّل 12 نقطة أو أكثر في تحدي التسديد.', objective: { type: 'score_minigame', target: 1, gameId: 'timing_shot', minScore: 12 }, reward: { xp: 130, shards: 35 } },
  { id: 'daily_play_3', kind: 'daily', titleAr: 'لاعب نشيط', descriptionAr: 'العب 3 تحديات.', objective: { type: 'play_minigame', target: 3 }, reward: { xp: 90 } },
];

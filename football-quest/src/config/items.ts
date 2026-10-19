import type { ItemDefinition } from '../domain/types';

/**
 * Original football-themed collectibles. All names, characters and designs are
 * fictional and owned by this project — no real clubs, players or brands.
 */
export const ITEM_CATALOG: readonly ItemDefinition[] = [
  { id: 'ball_dune', nameAr: 'كرة الكثبان', nameEn: 'Dune Ball', descriptionAr: 'كرة تدريب بلون الرمل، صمدت قدّام عواصف الصيف.', rarity: 'common', category: 'ball', modelKey: 'ball', color: '#e9c46a' },
  { id: 'cone_training', nameAr: 'قمع التمرين', nameEn: 'Training Cone', descriptionAr: 'كل نجم بدأ يراوغ قمع مثل هذا.', rarity: 'common', category: 'gear', modelKey: 'cone', color: '#f4a261' },
  { id: 'scarf_fans', nameAr: 'وشاح المدرج', nameEn: 'Stand Scarf', descriptionAr: 'وشاح الجمهور اللي ما يسكت طول المباراة.', rarity: 'common', category: 'gear', modelKey: 'scarf', color: '#2a9d8f' },
  { id: 'boots_sand', nameAr: 'حذاء الرمل', nameEn: 'Sand Boots', descriptionAr: 'خفيف وثابت على أي أرضية.', rarity: 'common', category: 'boots', modelKey: 'boots', color: '#c8a27a' },
  { id: 'gloves_practice', nameAr: 'قفازات التمرين', nameEn: 'Practice Gloves', descriptionAr: 'قفازات حارس مبتدئ… بس قلبه كبير.', rarity: 'common', category: 'gloves', modelKey: 'gloves', color: '#8ecae6' },
  { id: 'ball_falcon', nameAr: 'كرة الصقر', nameEn: 'Falcon Ball', descriptionAr: 'تطير بسرعة وتنزل بدقة مثل الصقر.', rarity: 'rare', category: 'ball', modelKey: 'ball', color: '#577590' },
  { id: 'gloves_wall', nameAr: 'قفازات الجدار', nameEn: 'Wall Gloves', descriptionAr: 'ولا كرة تعدّي منها.', rarity: 'rare', category: 'gloves', modelKey: 'gloves', color: '#43aa8b' },
  { id: 'kit_night', nameAr: 'طقم الليل', nameEn: 'Night Kit', descriptionAr: 'طقم مباريات السهر تحت الكشافات.', rarity: 'rare', category: 'kit', modelKey: 'kit', color: '#264653' },
  { id: 'card_sanad', nameAr: 'بطاقة: سند الحارس', nameEn: 'Card: Sanad the Keeper', descriptionAr: 'شخصية خيالية — حارس هادي ما يرتبك أبداً.', rarity: 'rare', category: 'card', modelKey: 'card', color: '#90be6d', position: 'GK' },
  { id: 'boots_lightning', nameAr: 'حذاء البرق', nameEn: 'Lightning Boots', descriptionAr: 'تسمع صوت الرعد قبل ما تشوف التسديدة.', rarity: 'epic', category: 'boots', modelKey: 'boots', color: '#ffd166' },
  { id: 'whistle_gold', nameAr: 'الصفارة الذهبية', nameEn: 'Golden Whistle', descriptionAr: 'صفارة نهائي أسطوري ما أحد يعرف وين انلعب.', rarity: 'epic', category: 'gear', modelKey: 'whistle', color: '#f9c74f' },
  { id: 'card_barq', nameAr: 'بطاقة: برق المهاجم', nameEn: 'Card: Barq the Striker', descriptionAr: 'شخصية خيالية — أسرع مهاجم في الدوري الرملي.', rarity: 'epic', category: 'card', modelKey: 'card', color: '#f94144', position: 'FW' },
  { id: 'card_najm', nameAr: 'بطاقة: نجم الوسط', nameEn: 'Card: Najm the Playmaker', descriptionAr: 'شخصية خيالية — يشوف التمريرة قبل الكل.', rarity: 'rare', category: 'card', modelKey: 'card', color: '#4d908e', position: 'MF' },
  { id: 'card_hisn', nameAr: 'بطاقة: حصن الدفاع', nameEn: 'Card: Hisn the Defender', descriptionAr: 'شخصية خيالية — جدار دفاعي ما ينكسر.', rarity: 'common', category: 'card', modelKey: 'card', color: '#277da1', position: 'DF' },
  { id: 'ball_meteor', nameAr: 'كرة النيزك', nameEn: 'Meteor Ball', descriptionAr: 'نزلت من السما في ليلة صيف… وما أحد قدر يصدها.', rarity: 'legendary', category: 'ball', modelKey: 'ball', color: '#ff6b35' },
  { id: 'trophy_oasis', nameAr: 'كأس الواحة', nameEn: 'Oasis Cup', descriptionAr: 'الكأس الأسطوري لبطولة الواحة الخيالية.', rarity: 'legendary', category: 'trophy', modelKey: 'trophy', color: '#ffd700' },
];

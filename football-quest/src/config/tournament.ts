/**
 * Tournament reference data for the fan journey around the 2027 continental cup hosted by
 * Saudi Arabia. Facts were checked against public reporting on 2026-10-20 (see docs/CONTENT_SOURCES.md).
 *
 * Licensing note: this file holds *facts* only (country names, cities, stadium names, dates).
 * No official tournament logo, mascot, federation crest or real player identity is used —
 * team "badges" are original designs built from flag colours. Swap in licensed marks only
 * after a licence is signed.
 */
import type { Rarity } from '../domain/types';

export const TOURNAMENT = {
  nameAr: 'كأس آسيا 2027 في السعودية',
  startDate: '2027-01-07',
  endDate: '2027-02-05',
  startLabelAr: '7 يناير 2027',
  endLabelAr: '5 فبراير 2027',
  teamCount: 24,
  venueCount: 8,
} as const;

export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export const GROUP_IDS: readonly GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface TeamDefinition {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly group: GroupId;
  /** Popular Arabic nickname — only where widely established. */
  readonly nicknameAr?: string;
  /** Continental titles won before 2027. */
  readonly titles: number;
  readonly isHost?: boolean;
  /** Flag-derived colours [primary, secondary, accent]. */
  readonly colors: readonly [string, string, string];
  /** Collectible rarity of this team's badge. */
  readonly rarity: Rarity;
  /** True when the qualification/draw fact still needs confirmation from the organiser. */
  readonly unconfirmed?: boolean;
}

export const TEAMS: readonly TeamDefinition[] = [
  // Group A
  { id: 'ksa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', group: 'A', nicknameAr: 'الأخضر', titles: 3, isHost: true, colors: ['#006c35', '#ffffff', '#c8a951'], rarity: 'legendary' },
  { id: 'kuw', nameAr: 'الكويت', nameEn: 'Kuwait', group: 'A', nicknameAr: 'الأزرق', titles: 1, colors: ['#0057b8', '#ffffff', '#007a3d'], rarity: 'epic' },
  { id: 'oma', nameAr: 'عُمان', nameEn: 'Oman', group: 'A', nicknameAr: 'الأحمر', titles: 0, colors: ['#db161b', '#ffffff', '#008000'], rarity: 'rare' },
  { id: 'ple', nameAr: 'فلسطين', nameEn: 'Palestine', group: 'A', nicknameAr: 'الفدائي', titles: 0, colors: ['#007a3d', '#ce1126', '#111111'], rarity: 'common' },
  // Group B
  { id: 'uzb', nameAr: 'أوزبكستان', nameEn: 'Uzbekistan', group: 'B', nicknameAr: 'الذئاب البيضاء', titles: 0, colors: ['#0099b5', '#ffffff', '#1eb53a'], rarity: 'rare' },
  { id: 'bhr', nameAr: 'البحرين', nameEn: 'Bahrain', group: 'B', nicknameAr: 'الأحمر', titles: 0, colors: ['#ce1126', '#ffffff', '#ce1126'], rarity: 'rare' },
  { id: 'prk', nameAr: 'كوريا الشمالية', nameEn: 'DPR Korea', group: 'B', titles: 0, colors: ['#ed1c27', '#024fa2', '#ffffff'], rarity: 'common' },
  { id: 'jor', nameAr: 'الأردن', nameEn: 'Jordan', group: 'B', nicknameAr: 'النشامى', titles: 0, colors: ['#ce1126', '#ffffff', '#007a3d'], rarity: 'rare' },
  // Group C
  { id: 'irn', nameAr: 'إيران', nameEn: 'IR Iran', group: 'C', titles: 3, colors: ['#239f40', '#ffffff', '#da0000'], rarity: 'legendary' },
  { id: 'syr', nameAr: 'سوريا', nameEn: 'Syria', group: 'C', nicknameAr: 'نسور قاسيون', titles: 0, colors: ['#ce1126', '#ffffff', '#007a3d'], rarity: 'common' },
  { id: 'kgz', nameAr: 'قيرغيزستان', nameEn: 'Kyrgyz Republic', group: 'C', titles: 0, colors: ['#e8112d', '#ffef00', '#e8112d'], rarity: 'common' },
  { id: 'chn', nameAr: 'الصين', nameEn: 'China PR', group: 'C', titles: 0, colors: ['#de2910', '#ffde00', '#de2910'], rarity: 'rare' },
  // Group D
  { id: 'aus', nameAr: 'أستراليا', nameEn: 'Australia', group: 'D', nicknameAr: 'الكنغر', titles: 1, colors: ['#ffcd00', '#00843d', '#012169'], rarity: 'epic' },
  { id: 'irq', nameAr: 'العراق', nameEn: 'Iraq', group: 'D', nicknameAr: 'أسود الرافدين', titles: 1, colors: ['#007a3d', '#ffffff', '#ce1126'], rarity: 'epic' },
  { id: 'tjk', nameAr: 'طاجيكستان', nameEn: 'Tajikistan', group: 'D', titles: 0, colors: ['#cc0000', '#ffffff', '#006600'], rarity: 'common' },
  { id: 'sgp', nameAr: 'سنغافورة', nameEn: 'Singapore', group: 'D', titles: 0, colors: ['#ef3340', '#ffffff', '#ef3340'], rarity: 'common' },
  // Group E
  { id: 'kor', nameAr: 'كوريا الجنوبية', nameEn: 'Korea Republic', group: 'E', nicknameAr: 'محاربو التايغوك', titles: 2, colors: ['#c60c30', '#003478', '#ffffff'], rarity: 'epic' },
  { id: 'uae', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', group: 'E', nicknameAr: 'الأبيض', titles: 0, colors: ['#ffffff', '#00732f', '#ff0000'], rarity: 'rare' },
  { id: 'vie', nameAr: 'فيتنام', nameEn: 'Vietnam', group: 'E', titles: 0, colors: ['#da251d', '#ffff00', '#da251d'], rarity: 'common' },
  { id: 'yem', nameAr: 'اليمن', nameEn: 'Yemen', group: 'E', titles: 0, colors: ['#ce1126', '#ffffff', '#111111'], rarity: 'common', unconfirmed: true },
  // Group F
  { id: 'jpn', nameAr: 'اليابان', nameEn: 'Japan', group: 'F', nicknameAr: 'الساموراي الأزرق', titles: 4, colors: ['#1b3f8b', '#ffffff', '#bc002d'], rarity: 'legendary' },
  { id: 'qat', nameAr: 'قطر', nameEn: 'Qatar', group: 'F', nicknameAr: 'العنابي', titles: 2, colors: ['#8a1538', '#ffffff', '#8a1538'], rarity: 'epic' },
  { id: 'tha', nameAr: 'تايلاند', nameEn: 'Thailand', group: 'F', titles: 0, colors: ['#241d4f', '#ffffff', '#a51931'], rarity: 'common' },
  { id: 'idn', nameAr: 'إندونيسيا', nameEn: 'Indonesia', group: 'F', titles: 0, colors: ['#ce1126', '#ffffff', '#ce1126'], rarity: 'common' },
];

export type CityId = 'riyadh' | 'jeddah' | 'khobar';

export interface CityDefinition {
  readonly id: CityId;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly taglineAr: string;
  /** Real coordinates, used to place the city on the stylised map. */
  readonly lat: number;
  readonly lon: number;
  readonly coastal: boolean;
  readonly accent: string;
}

export const CITIES: readonly CityDefinition[] = [
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', taglineAr: 'العاصمة: مباراة الافتتاح والنهائي', lat: 24.71, lon: 46.68, coastal: false, accent: '#ffd166' },
  { id: 'jeddah', nameAr: 'جدة', nameEn: 'Jeddah', taglineAr: 'عروس البحر الأحمر', lat: 21.54, lon: 39.17, coastal: true, accent: '#4fc3f7' },
  { id: 'khobar', nameAr: 'الخبر', nameEn: 'Al Khobar', taglineAr: 'بوابة الشرقية على الخليج', lat: 26.28, lon: 50.21, coastal: true, accent: '#36d07a' },
];

export interface VenueDefinition {
  readonly id: string;
  readonly cityId: CityId;
  readonly nameAr: string;
  readonly nameEn: string;
  /** Approximate seated capacity as publicly reported; figures differ between sources. */
  readonly capacity: number;
  readonly noteAr?: string;
  /** Stand colours for the 3D venue [lower tier, upper tier, roof]. */
  readonly palette: readonly [string, string, string];
}

export const VENUES: readonly VenueDefinition[] = [
  { id: 'kfsc', cityId: 'riyadh', nameAr: 'ستاد مدينة الملك فهد الرياضية', nameEn: 'King Fahd Sports City Stadium', capacity: 72000, noteAr: 'يستضيف مباراة الافتتاح والنهائي', palette: ['#0d6b3b', '#f2f2f2', '#e8e8e8'] },
  { id: 'ksu', cityId: 'riyadh', nameAr: 'ستاد جامعة الملك سعود', nameEn: 'King Saud University Stadium', capacity: 26000, palette: ['#1e5aa8', '#f2f2f2', '#cfd8dc'] },
  { id: 'kingdom_arena', cityId: 'riyadh', nameAr: 'المملكة أرينا', nameEn: 'Kingdom Arena', capacity: 26000, palette: ['#1b2a4a', '#3d5a99', '#b0bec5'] },
  { id: 'imamu', cityId: 'riyadh', nameAr: 'ستاد جامعة الإمام محمد بن سعود', nameEn: 'Imam Mohammed Ibn Saud University Stadium', capacity: 25000, palette: ['#0f7a4a', '#c8a951', '#d7ccc8'] },
  { id: 'shabab', cityId: 'riyadh', nameAr: 'ملعب نادي الشباب', nameEn: 'Al Shabab Club Stadium', capacity: 13000, palette: ['#ffffff', '#111111', '#9e9e9e'] },
  { id: 'kasc', cityId: 'jeddah', nameAr: 'ستاد مدينة الملك عبدالله الرياضية (الجوهرة)', nameEn: 'King Abdullah Sports City Stadium', capacity: 60000, noteAr: 'ثاني أكبر ملاعب البطولة', palette: ['#5d3f8f', '#c0c0c0', '#e0e0e0'] },
  { id: 'paf', cityId: 'jeddah', nameAr: 'ستاد مدينة الأمير عبدالله الفيصل الرياضية', nameEn: 'Prince Abdullah Al Faisal Sports City Stadium', capacity: 26000, palette: ['#c62828', '#fbc02d', '#eeeeee'] },
  { id: 'aramco', cityId: 'khobar', nameAr: 'ملعب أرامكو', nameEn: 'Aramco Stadium', capacity: 47000, noteAr: 'ملعب جديد بُني للبطولة', palette: ['#00a3e0', '#84bd00', '#eceff1'] },
];

export type LandmarkModel = 'tower_arch' | 'mud_fort' | 'arch_gate' | 'coral_houses' | 'fountain' | 'corniche' | 'water_mosque' | 'water_tower' | 'pebbles' | 'bay';

export interface LandmarkDefinition {
  readonly id: string;
  readonly cityId: CityId;
  readonly nameAr: string;
  readonly nameEn: string;
  /** Short "why visit" copy for the marketing postcard. */
  readonly blurbAr: string;
  readonly model: LandmarkModel;
  readonly rarity: Rarity;
  readonly unesco?: boolean;
}

export const LANDMARKS: readonly LandmarkDefinition[] = [
  { id: 'kingdom_centre', cityId: 'riyadh', nameAr: 'برج المملكة', nameEn: 'Kingdom Centre', blurbAr: 'من أشهر معالم الرياض، واطلالة جسر السماء فوقه تخليك تشوف المدينة كلها.', model: 'tower_arch', rarity: 'epic' },
  { id: 'turaif', cityId: 'riyadh', nameAr: 'الدرعية – حي الطريف', nameEn: 'Diriyah – At-Turaif', blurbAr: 'موقع تراث عالمي لليونسكو ومهد الدولة السعودية الأولى، بيوت طين ومطاعم وأجواء ليلية.', model: 'mud_fort', rarity: 'legendary', unesco: true },
  { id: 'boulevard', cityId: 'riyadh', nameAr: 'بوليفارد سيتي', nameEn: 'Boulevard City', blurbAr: 'وجهة ترفيه من موسم الرياض: عروض ومطاعم وفعاليات لين آخر الليل.', model: 'arch_gate', rarity: 'rare' },
  { id: 'masmak', cityId: 'riyadh', nameAr: 'قصر المصمك', nameEn: 'Masmak Fortress', blurbAr: 'قلعة طينية تاريخية في قلب الرياض القديمة، قصة توحيد المملكة تبدأ من هنا.', model: 'mud_fort', rarity: 'rare' },
  { id: 'al_balad', cityId: 'jeddah', nameAr: 'جدة التاريخية (البلد)', nameEn: 'Historic Jeddah (Al-Balad)', blurbAr: 'موقع تراث عالمي لليونسكو برواشينه الخشبية وبيوته المرجانية وأسواقه القديمة.', model: 'coral_houses', rarity: 'legendary', unesco: true },
  { id: 'fountain', cityId: 'jeddah', nameAr: 'نافورة الملك فهد', nameEn: 'King Fahd Fountain', blurbAr: 'من أعلى النوافير في العالم، أحلى منظر لها بالليل من الكورنيش.', model: 'fountain', rarity: 'epic' },
  { id: 'jeddah_waterfront', cityId: 'jeddah', nameAr: 'واجهة جدة البحرية', nameEn: 'Jeddah Waterfront', blurbAr: 'ممشى طويل على البحر الأحمر للمشي والغروب والجلسات.', model: 'corniche', rarity: 'common' },
  { id: 'floating_mosque', cityId: 'jeddah', nameAr: 'مسجد الرحمة (المسجد العائم)', nameEn: 'Al-Rahma Mosque', blurbAr: 'مسجد مبني فوق مياه البحر الأحمر، كأنه عايم وقت المد.', model: 'water_mosque', rarity: 'rare' },
  { id: 'khobar_corniche', cityId: 'khobar', nameAr: 'كورنيش الخبر', nameEn: 'Al Khobar Corniche', blurbAr: 'كورنيش على الخليج العربي للمشي والدراجات وجلسات البحر.', model: 'corniche', rarity: 'common' },
  { id: 'water_tower', cityId: 'khobar', nameAr: 'برج الخبر (برج الماء)', nameEn: 'Al Khobar Water Tower', blurbAr: 'معلم الخبر الشهير على الكورنيش، وإطلالته على الخليج تستاهل.', model: 'water_tower', rarity: 'rare' },
  { id: 'ithra', cityId: 'khobar', nameAr: 'إثراء – مركز الملك عبدالعزيز الثقافي العالمي', nameEn: 'Ithra', blurbAr: 'في الظهران القريبة: متحف ومكتبة وسينما ومعارض بتصميم يشبه الحصى.', model: 'pebbles', rarity: 'epic' },
  { id: 'half_moon_bay', cityId: 'khobar', nameAr: 'شاطئ نصف القمر', nameEn: 'Half Moon Bay', blurbAr: 'شاطئ مشهور في الشرقية للسباحة والرحلات والكشتات البحرية.', model: 'bay', rarity: 'rare' },
];

export function teamById(id: string): TeamDefinition | undefined { return TEAMS.find((t) => t.id === id); }
export function cityById(id: string): CityDefinition | undefined { return CITIES.find((c) => c.id === id); }
export function venueById(id: string): VenueDefinition | undefined { return VENUES.find((v) => v.id === id); }
export function landmarkById(id: string): LandmarkDefinition | undefined { return LANDMARKS.find((l) => l.id === id); }

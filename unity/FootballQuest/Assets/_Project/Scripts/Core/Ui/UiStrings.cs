using System.Collections.Generic;

namespace FootballQuest.Core.Ui
{
    /// <summary>
    /// نصوص الواجهة العامة (أزرار وعناوين). نصوص الأزرار الواردة في PERMISSION_AND_ERROR_STATES.md منقولة حرفيًا،
    /// والباقي نصوص واجهة من المطوّر بنفس اللهجة. حالات الخطأ والأذونات في StateCatalog.
    /// </summary>
    public static class UiStrings
    {
        public const string Allow = "allow";
        public const string NotNow = "not_now";
        public const string EnableFromSettings = "enable_from_settings";
        public const string OpenSettings = "open_settings";
        public const string Later = "later";
        public const string ManualEntry = "manual_entry";
        public const string Continue = "continue";
        public const string Confirm = "confirm";
        public const string Cancel = "cancel";
        public const string Ok = "ok";
        public const string Retry = "retry";
        public const string UpdateNow = "update_now";
        public const string ChooseCity = "choose_city";
        public const string ChooseCityHint = "choose_city_hint";
        public const string CityRuh = "city_RUH";
        public const string CityJed = "city_JED";
        public const string CityKhb = "city_KHB";
        public const string BirthYear = "birth_year";
        public const string Disclaimer = "disclaimer";
        public const string Settings = "settings";
        public const string About = "about";
        public const string Language = "language";
        public const string LanguageName = "language_name";
        public const string LinkApple = "link_apple";
        public const string LinkGoogle = "link_google";
        public const string LinkedWith = "linked_with";
        public const string DeleteAccount = "delete_account";
        public const string CheckNearby = "check_nearby";
        public const string ScanBranch = "scan_branch";
        public const string MapComingSoon = "map_coming_soon";
        public const string ChangeCity = "change_city";
        public const string OpenSourceLicenses = "open_source_licenses";
        public const string Back = "back";
        public const string TodayMatches = "today_matches";
        public const string NoMatchesToday = "no_matches_today";
        public const string Results = "results";
        public const string EnterStadium = "enter_stadium";
        public const string Close = "close";
        public const string BackToMap = "back_to_map";
        public const string DigitalVisit = "digital_visit";
        public const string VisitedToday = "visited_today";
        public const string XpGained = "xp_gained";
        public const string DailyLoginReward = "daily_login_reward";
        public const string HudLevel = "hud_level";
        public const string HudPacks = "hud_packs";
        public const string HudFanPoints = "hud_fan_points";
        public const string Album = "album";
        public const string AlbumProgress = "album_progress";
        public const string Packs = "packs";
        public const string OpenPack = "open_pack";
        public const string PackStandard = "pack_standard";
        public const string PackEpic = "pack_epic";
        public const string PackLegendary = "pack_legendary";
        public const string NoPacks = "no_packs";
        public const string PackOdds = "pack_odds";
        public const string NewCard = "new_card";
        public const string DuplicateCard = "duplicate_card";
        public const string PityTriggered = "pity_triggered";
        public const string AchievementUnlocked = "achievement_unlocked";
        public const string ExchangeFor = "exchange_for";
        public const string NotExchangeable = "not_exchangeable";
        public const string NeedFanPoints = "need_fan_points";
        public const string OwnedTimes = "owned_times";
        public const string NotOwned = "not_owned";
        public const string Wallet = "wallet";
        public const string WalletEmpty = "wallet_empty";
        public const string ScanHint = "scan_hint";
        public const string InvoiceCode = "invoice_code";
        public const string InvoiceHint = "invoice_hint";
        public const string ShowToCashier = "show_to_cashier";
        public const string ManualCode = "manual_code";
        public const string ValidUntil = "valid_until";
        public const string RedeemedOn = "redeemed_on";
        public const string ReissueCode = "reissue_code";
        public const string Terms = "terms";

        private static readonly Dictionary<string, string[]> Table = new Dictionary<string, string[]>
        {
            // [عربي، English]
            { Allow, new[] { "سماح", "Allow" } },
            { NotNow, new[] { "ليس الآن", "Not now" } },
            { EnableFromSettings, new[] { "تفعيل من الإعدادات", "Enable in Settings" } },
            { OpenSettings, new[] { "فتح الإعدادات", "Open Settings" } },
            { Later, new[] { "لاحقًا", "Later" } },
            { ManualEntry, new[] { "إدخال يدوي", "Enter manually" } },
            { Continue, new[] { "يلا نبدأ", "Let's go" } },
            { Confirm, new[] { "تأكيد", "Confirm" } },
            { Cancel, new[] { "إلغاء", "Cancel" } },
            { Ok, new[] { "تمام", "OK" } },
            { Retry, new[] { "جرّب مرة ثانية", "Try again" } },
            { UpdateNow, new[] { "تحديث", "Update" } },
            { ChooseCity, new[] { "وش مدينتك؟", "Which city are you in?" } },
            { ChooseCityHint, new[] { "تحدد لوحة المتصدرين حقتك. تقدر تغيّرها مرة كل 30 يوم.", "Sets your city leaderboard. You can change it once every 30 days." } },
            { CityRuh, new[] { "الرياض", "Riyadh" } },
            { CityJed, new[] { "جدة", "Jeddah" } },
            { CityKhb, new[] { "الخبر", "Al Khobar" } },
            { BirthYear, new[] { "سنة الميلاد", "Birth year" } },
            // نص الإفصاح — RIGHTS_REGISTER.md §4 (TODO(owner) Q3: تأكيد النسخة المعتمدة مقابل PRODUCT_BRIEF §7).
            // يُستبدل من Remote Config `disclaimer_text` إذا وُجد.
            { Disclaimer, new[]
                {
                    "Football Quest لعبة مستقلة وغير رسمية، وغير معتمدة من الاتحاد الآسيوي لكرة القدم (AFC) أو أي اتحاد وطني أو منظم للبطولة. أسماء المنتخبات والملاعب مستخدمة كمعلومات عامة فقط.",
                    "Football Quest is an independent, unofficial game, not endorsed by the Asian Football Confederation (AFC), any national federation or the tournament organisers. Team and stadium names are used as general information only.",
                }
            },
            { Settings, new[] { "الإعدادات", "Settings" } },
            { About, new[] { "عن اللعبة", "About" } },
            { Language, new[] { "اللغة", "Language" } },
            { LanguageName, new[] { "العربية", "English" } },
            { LinkApple, new[] { "ربط الحساب مع Apple", "Link with Apple" } },
            { LinkGoogle, new[] { "ربط الحساب مع Google", "Link with Google" } },
            { LinkedWith, new[] { "حسابك مربوط مع {provider}", "Linked with {provider}" } },
            { DeleteAccount, new[] { "حذف الحساب", "Delete account" } },
            { CheckNearby, new[] { "تحقق من قربي", "Check if I'm nearby" } },
            { ScanBranch, new[] { "امسح رمز الفرع", "Scan branch code" } },
            { MapComingSoon, new[] { "خارطة الملاعب", "Stadium map" } },
            { ChangeCity, new[] { "تغيير المدينة", "Change city" } },
            { OpenSourceLicenses, new[] { "تراخيص مفتوحة المصدر", "Open-source licenses" } },
            { Back, new[] { "رجوع", "Back" } },
            { TodayMatches, new[] { "مباريات اليوم هنا", "Today's matches here" } },
            { NoMatchesToday, new[] { "ما فيه مباريات في هذا الملعب اليوم.", "No matches at this stadium today." } },
            { Results, new[] { "النتائج", "Results" } },
            { EnterStadium, new[] { "ادخل الملعب", "Enter stadium" } },
            { Close, new[] { "إغلاق", "Close" } },
            { BackToMap, new[] { "الخارطة", "Map" } },
            { DigitalVisit, new[] { "زيارة رقمية (+5 XP)", "Digital visit (+5 XP)" } },
            { VisitedToday, new[] { "زرت هذا الملعب اليوم ✓", "Visited this stadium today ✓" } },
            { XpGained, new[] { "+{xp} XP", "+{xp} XP" } },
            { DailyLoginReward, new[] { "مكافأة الدخول اليومي: +{xp} XP و{packs} حزمة منتخب", "Daily login: +{xp} XP and {packs} team pack" } },
            { HudLevel, new[] { "مستوى {level}", "Level {level}" } },
            { HudPacks, new[] { "حزم {packs}", "Packs {packs}" } },
            { HudFanPoints, new[] { "FP {fp}", "FP {fp}" } },
            { Album, new[] { "الألبوم", "Album" } },
            { AlbumProgress, new[] { "{teams}/24 منتخب • {variants}/96 نسخة", "{teams}/24 teams • {variants}/96 editions" } },
            { Packs, new[] { "الحزم ({count})", "Packs ({count})" } },
            { OpenPack, new[] { "افتح", "Open" } },
            { PackStandard, new[] { "حزمة منتخب ×{count}", "Team pack ×{count}" } },
            { PackEpic, new[] { "حزمة ملحمية مضمونة ×{count}", "Guaranteed Epic pack ×{count}" } },
            { PackLegendary, new[] { "حزمة أسطورية مضمونة ×{count}", "Guaranteed Legendary pack ×{count}" } },
            { NoPacks, new[] { "ما عندك حزم الحين. ادخل بكرة أو زر الملاعب والفروع عشان تجمع حزم.", "No packs right now. Come back tomorrow or visit stadiums and branches to earn more." } },
            { PackOdds, new[] { "احتمالات الحزم", "Pack odds" } },
            { NewCard, new[] { "بطاقة جديدة!", "New card!" } },
            { DuplicateCard, new[] { "مكررة: +{fp} نقطة مشجع", "Duplicate: +{fp} fan points" } },
            { PityTriggered, new[] { "حماية سوء الحظ اشتغلت — ملحمية مضمونة!", "Bad-luck protection kicked in — guaranteed Epic!" } },
            { AchievementUnlocked, new[] { "إنجاز جديد: {name}", "Achievement: {name}" } },
            { ExchangeFor, new[] { "استبدلها بـ {cost} FP", "Get it for {cost} FP" } },
            { NotExchangeable, new[] { "هذي النسخة ما تُستبدل — تطلع من الحزم بس.", "This edition can't be exchanged — packs only." } },
            { NeedFanPoints, new[] { "تحتاج {cost} FP (عندك {fp})", "Needs {cost} FP (you have {fp})" } },
            { OwnedTimes, new[] { "مملوكة ×{count}", "Owned ×{count}" } },
            { NotOwned, new[] { "غير مملوكة", "Not owned" } },
            { Wallet, new[] { "المحفظة", "Wallet" } },
            { WalletEmpty, new[] { "ما عندك قسائم للحين. امسح رمز الفرع أو أدخل رمز فاتورة.", "No coupons yet. Scan a branch code or enter an invoice code." } },
            { ScanHint, new[] { "وجّه الكاميرا على رمز الفرع", "Point the camera at the branch code" } },
            { InvoiceCode, new[] { "رمز الفاتورة", "Invoice code" } },
            { InvoiceHint, new[] { "اكتب الرمز من الفاتورة (6 أحرف)", "Type the code from your receipt (6 characters)" } },
            { ShowToCashier, new[] { "اعرض الرمز للكاشير", "Show this to the cashier" } },
            { ManualCode, new[] { "الرمز اليدوي: {code}", "Manual code: {code}" } },
            { ValidUntil, new[] { "صالحة لين {date}", "Valid until {date}" } },
            { RedeemedOn, new[] { "استُخدمت في {date}", "Used on {date}" } },
            { ReissueCode, new[] { "اعرض رمز جديد", "Show a new code" } },
            { Terms, new[] { "الشروط", "Terms" } },
        };

        public static IEnumerable<string> Keys => Table.Keys;

        public static string Get(string key, Ui.Language language)
        {
            if (!Table.TryGetValue(key, out var pair)) return key;
            return language == Ui.Language.Arabic ? pair[0] : pair[1];
        }

        public static string CityName(string cityCode, Ui.Language language) => Get("city_" + cityCode, language);

        /// <summary>أسماء الإنجازات — GAME_RULES §3.5 (شارة «جامع آسيا»).</summary>
        public static string AchievementName(string id, Ui.Language language)
        {
            var ar = language == Ui.Language.Arabic;
            switch (id)
            {
                case "teams_6": return ar ? "6 منتخبات" : "6 teams";
                case "teams_12": return ar ? "12 منتخبًا" : "12 teams";
                case "teams_24": return ar ? "جامع آسيا" : "Asia Collector";
                default:
                    if (id != null && id.StartsWith("group_"))
                        return (ar ? "المجموعة " : "Group ") + id.Substring(6) + (ar ? " كاملة" : " complete");
                    return id;
            }
        }
    }
}

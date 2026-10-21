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
        };

        public static IEnumerable<string> Keys => Table.Keys;

        public static string Get(string key, Ui.Language language)
        {
            if (!Table.TryGetValue(key, out var pair)) return key;
            return language == Ui.Language.Arabic ? pair[0] : pair[1];
        }

        public static string CityName(string cityCode, Ui.Language language) => Get("city_" + cityCode, language);
    }
}

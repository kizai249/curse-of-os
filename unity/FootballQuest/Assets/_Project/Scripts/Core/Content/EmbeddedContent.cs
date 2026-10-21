using System.Collections.Generic;

namespace FootballQuest.Core.Content
{
    /// <summary>
    /// نسخة مدمجة من shared/contracts/content (احتياط بدون اتصال قبل أول تحميل). يتأكد ContentTests إنها
    /// مطابقة للملفات المشتركة، فأي تعديل يبدأ من JSON ثم هنا.
    /// </summary>
    public static class EmbeddedContent
    {
        public static List<TeamInfo> Teams() => new List<TeamInfo>
        {
                Team("KSA", "السعودية", "Saudi Arabia", true),
                Team("AUS", "أستراليا", "Australia"),
                Team("BHR", "البحرين", "Bahrain"),
                Team("CHN", "الصين", "China"),
                Team("IDN", "إندونيسيا", "Indonesia"),
                Team("IRN", "إيران", "Iran"),
                Team("IRQ", "العراق", "Iraq"),
                Team("JPN", "اليابان", "Japan"),
                Team("JOR", "الأردن", "Jordan"),
                Team("KUW", "الكويت", "Kuwait"),
                Team("KGZ", "قيرغيزستان", "Kyrgyzstan"),
                Team("PRK", "كوريا الشمالية", "North Korea"),
                Team("OMA", "عُمان", "Oman"),
                Team("PLE", "فلسطين", "Palestine"),
                Team("QAT", "قطر", "Qatar"),
                Team("SGP", "سنغافورة", "Singapore"),
                Team("KOR", "كوريا الجنوبية", "South Korea"),
                Team("SYR", "سوريا", "Syria"),
                Team("TJK", "طاجيكستان", "Tajikistan"),
                Team("THA", "تايلاند", "Thailand"),
                Team("UAE", "الإمارات", "United Arab Emirates"),
                Team("UZB", "أوزبكستان", "Uzbekistan"),
                Team("VIE", "فيتنام", "Vietnam"),
                Team("YEM", "اليمن", "Yemen"),
        };

        public static List<StadiumInfo> Stadiums() => new List<StadiumInfo>
        {
                Stadium("STD_RUH_KFS", "RUH", "ستاد مدينة الملك فهد الرياضية", "King Fahd Sports City Stadium", 2000),
                Stadium("STD_RUH_KSU", "RUH", "ستاد جامعة الملك سعود", "King Saud University Stadium", 1500),
                Stadium("STD_RUH_KAR", "RUH", "المملكة أرينا", "Kingdom Arena", 1500),
                Stadium("STD_RUH_IMS", "RUH", "ستاد جامعة الإمام محمد بن سعود", "Imam Mohammad Ibn Saud University Stadium", 1500),
                Stadium("STD_RUH_SHB", "RUH", "ستاد نادي الشباب", "Al Shabab Club Stadium", 1000),
                Stadium("STD_JED_KAS", "JED", "ستاد مدينة الملك عبدالله الرياضية", "King Abdullah Sports City Stadium", 2000),
                Stadium("STD_JED_PAF", "JED", "ستاد مدينة الأمير عبدالله الفيصل الرياضية", "Prince Abdullah Al Faisal Sports City Stadium", 1500),
                Stadium("STD_KHB_ARM", "KHB", "استاد أرامكو", "Aramco Stadium", 2000),
        };

        private static TeamInfo Team(string code, string ar, string en, bool host = false) =>
            new TeamInfo { Code = code, NameAr = ar, NameEn = en, Host = host };

        private static StadiumInfo Stadium(string id, string city, string ar, string en, int radiusM) =>
            new StadiumInfo { Id = id, City = city, NameAr = ar, NameEn = en, RadiusM = radiusM };
    }
}

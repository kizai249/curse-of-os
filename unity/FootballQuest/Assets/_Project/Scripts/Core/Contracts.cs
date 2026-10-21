using System.Collections.Generic;

namespace FootballQuest.Core
{
    /// <summary>المفردات المشتركة مع الخادم — DATA_CONTRACTS.md §0.</summary>
    public static class TeamCodes
    {
        public static readonly IReadOnlyList<string> All = new[]
        {
            "KSA", "AUS", "BHR", "CHN", "IDN", "IRN", "IRQ", "JPN", "JOR", "KUW", "KGZ", "PRK",
            "OMA", "PLE", "QAT", "SGP", "KOR", "SYR", "TJK", "THA", "UAE", "UZB", "VIE", "YEM",
        };

        public static bool IsValid(string code)
        {
            for (var i = 0; i < All.Count; i++)
            {
                if (All[i] == code) return true;
            }
            return false;
        }
    }

    public static class CityCodes
    {
        public const string Riyadh = "RUH";
        public const string Jeddah = "JED";
        public const string Khobar = "KHB";

        public static readonly IReadOnlyList<string> All = new[] { Riyadh, Jeddah, Khobar };
    }
}

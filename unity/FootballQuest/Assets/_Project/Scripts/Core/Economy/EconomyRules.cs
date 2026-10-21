using System.Collections.Generic;

namespace FootballQuest.Core.Economy
{
    /// <summary>
    /// نسخة العرض من أرقام GAME_RULES (shared/contracts/economy.json). الخادم هو اللي يطبّق؛ العميل يعرض الاحتمالات
    /// والأسعار بنفس الأرقام (EconomyRulesTests يتأكد من التطابق).
    /// </summary>
    public static class EconomyRules
    {
        public static readonly string[] Variants = { "common", "rare", "epic", "legendary" };

        public static readonly IReadOnlyDictionary<string, int> PackOdds = new Dictionary<string, int>
        {
            { "common", 70 }, { "rare", 22 }, { "epic", 7 }, { "legendary", 1 },
        };

        public const int PityThreshold = 14;
        public const int MatchdayWeight = 3;

        public static readonly IReadOnlyDictionary<string, int> DuplicateFp = new Dictionary<string, int>
        {
            { "common", 10 }, { "rare", 25 }, { "epic", 60 }, { "legendary", 150 },
        };

        public static readonly IReadOnlyDictionary<string, int> ExchangeCost = new Dictionary<string, int>
        {
            { "common", 100 }, { "rare", 300 },
        };

        public const int MaxLevel = 30;
        public const int DailyXpCap = 600;
        public const int DailyLoginXp = 10;
        public const int DailyLoginPacks = 1;
        public const int DigitalVisitXp = 5;

        public static int Rank(string variant) => System.Array.IndexOf(Variants, variant);

        /// <summary>XP التراكمية لبلوغ المستوى (100 × المستوى للتالي — GAME_RULES §9.1).</summary>
        public static int XpForLevel(int level) => 50 * level * (level - 1);
    }
}

using System.Collections.Generic;

namespace FootballQuest.Core.Backend
{
    /// <summary>مفاتيح Remote Config — ARCHITECTURE.md §7. القيم الافتراضية تخفي ميزات R2/R3 (MVP_SCOPE §6).</summary>
    public static class RemoteConfigKeys
    {
        public const string FeatureCoop = "feature_coop";
        public const string FeatureWordGame = "feature_wordgame";
        public const string FeatureLeaderboard = "feature_leaderboard";
        public const string FeaturePlayerCards = "feature_player_cards";
        public const string FeatureStreak = "feature_streak";
        public const string SeasonContent = "season_content";
        public const string PackOdds = "pack_odds";
        public const string WordBankMeta = "word_bank_meta";
        public const string MinAppVersion = "min_app_version";
        public const string DisclaimerText = "disclaimer_text";

        public static readonly IReadOnlyDictionary<string, string> Defaults = new Dictionary<string, string>
        {
            { FeatureCoop, "false" },
            { FeatureWordGame, "false" },
            { FeatureLeaderboard, "false" },
            { FeaturePlayerCards, "false" },
            { FeatureStreak, "false" },
            { SeasonContent, "{}" },
            { PackOdds, "{\"common\":70,\"rare\":22,\"epic\":7,\"legendary\":1}" },
            { WordBankMeta, "{}" },
            { MinAppVersion, "0.0.0" },
            // فارغ = استخدم UiStrings.Disclaimer. القيمة البعيدة بصيغة {"ar":"…","en":"…"}.
            { DisclaimerText, "" },
        };
    }
}

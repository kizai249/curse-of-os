using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Collection
{
    /// <summary>أسماء النسخ الأربع وأشكالها — GAME_RULES §3.1. الندرة على النسخة مو على المنتخب (PRODUCT_BRIEF ت4).</summary>
    public static class Variants
    {
        public static string RarityName(string variant, Language language)
        {
            var ar = language == Language.Arabic;
            switch (variant)
            {
                case "common": return ar ? "شائعة" : "Common";
                case "rare": return ar ? "نادرة" : "Rare";
                case "epic": return ar ? "ملحمية" : "Epic";
                case "legendary": return ar ? "أسطورية" : "Legendary";
                default: return variant;
            }
        }

        /// <summary>اسم النسخة (الشكل): الأساسية، وليلة الملعب، والمدرج، والذهبية.</summary>
        public static string EditionName(string variant, Language language)
        {
            var ar = language == Language.Arabic;
            switch (variant)
            {
                case "common": return ar ? "الأساسية" : "Base";
                case "rare": return ar ? "ليلة الملعب" : "Stadium Night";
                case "epic": return ar ? "المدرج" : "The Stands";
                case "legendary": return ar ? "الذهبية" : "Gold";
                default: return variant;
            }
        }
    }
}

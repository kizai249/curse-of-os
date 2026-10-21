namespace FootballQuest.Core.Ui
{
    /// <summary>العربية الافتراضية، والإنجليزية ترجمة (MVP_SCOPE §3).</summary>
    public enum Language
    {
        Arabic,
        English,
    }

    public static class LanguageExtensions
    {
        public static bool IsRightToLeft(this Language language) => language == Language.Arabic;

        public static string Code(this Language language) => language == Language.Arabic ? "ar" : "en";

        public static Language FromCode(string code) => code == "en" ? Language.English : Language.Arabic;
    }
}

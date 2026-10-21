namespace FootballQuest.App
{
    /// <summary>المشاهد الثلاثة — ARCHITECTURE.md §2 (Boot، وHub يحمل لوحة المدينة Additive، وStadium مُعاد الاستخدام).</summary>
    public static class SceneNames
    {
        public const string Boot = "Boot";
        public const string Hub = "Hub";
        public const string Stadium = "Stadium";

        public static readonly string[] BuildOrder = { Boot, Hub, Stadium };
    }
}

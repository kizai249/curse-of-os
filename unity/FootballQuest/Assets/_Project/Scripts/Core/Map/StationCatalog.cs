using System.Collections.Generic;

namespace FootballQuest.Core.Map
{
    /// <summary>أنواع السقف الثلاثة لعُدّة الملعب — ARCHITECTURE §3.</summary>
    public enum RoofType
    {
        FullRing,
        SideCanopies,
        Arch,
    }

    /// <summary>
    /// تعريف محطة: ملعب واحد من العُدّة بمعاملات مختلفة (عدد طبقات المدرج، وشكل السقف، ولون الإبراز، ولافتة الاسم،
    /// والموضع على لوحة المدينة). الموضع توضيحي وما يمثل الموقع الجغرافي (GAME_RULES §2.2).
    /// </summary>
    public sealed class StationSpec
    {
        public StationSpec(string stadiumId, string city, int tiers, RoofType roof, string accentHex, float boardX, float boardZ)
        {
            StadiumId = stadiumId;
            City = city;
            Tiers = tiers;
            Roof = roof;
            AccentHex = accentHex;
            BoardX = boardX;
            BoardZ = boardZ;
        }

        public string StadiumId { get; }
        public string City { get; }
        public int Tiers { get; }
        public RoofType Roof { get; }
        public string AccentHex { get; }
        public float BoardX { get; }
        public float BoardZ { get; }
    }

    /// <summary>
    /// القيم الافتراضية للمحطات الثمانية. ProjectSetup ينشئ منها ScriptableObjects (Resources/Stations) يعدّلها المصمم،
    /// وهذي القيم احتياط إذا ما وُجدت. كل محطة بتركيبة (طبقات، سقف) فريدة عشان تتميز بصريًا.
    /// </summary>
    public static class StationCatalog
    {
        public static readonly IReadOnlyList<StationSpec> Defaults = new[]
        {
            new StationSpec("STD_RUH_KFS", "RUH", 3, RoofType.FullRing, "#1FB5A8", -8f, 7f),
            new StationSpec("STD_RUH_KSU", "RUH", 2, RoofType.SideCanopies, "#F2B23A", 8f, 8f),
            new StationSpec("STD_RUH_KAR", "RUH", 2, RoofType.Arch, "#8A5CF6", 0f, -1f),
            new StationSpec("STD_RUH_IMS", "RUH", 1, RoofType.SideCanopies, "#3BA7F0", -9f, -9f),
            new StationSpec("STD_RUH_SHB", "RUH", 1, RoofType.FullRing, "#F2705A", 9f, -8f),
            new StationSpec("STD_JED_KAS", "JED", 3, RoofType.Arch, "#9BD14B", -5f, 5f),
            new StationSpec("STD_JED_PAF", "JED", 2, RoofType.FullRing, "#E0529C", 6f, -5f),
            new StationSpec("STD_KHB_ARM", "KHB", 3, RoofType.SideCanopies, "#F28C28", 0f, 0f),
        };

        public static StationSpec Find(string stadiumId)
        {
            foreach (var s in Defaults) if (s.StadiumId == stadiumId) return s;
            return null;
        }

        public static IEnumerable<StationSpec> ForCity(string city)
        {
            foreach (var s in Defaults) if (s.City == city) yield return s;
        }
    }
}

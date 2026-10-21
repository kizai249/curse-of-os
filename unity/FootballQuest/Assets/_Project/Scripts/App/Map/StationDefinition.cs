using System.Collections.Generic;
using FootballQuest.Core.Map;
using UnityEngine;

namespace FootballQuest.App.Map
{
    /// <summary>
    /// تعريف محطة كـ ScriptableObject — ARCHITECTURE §3 (عدد الطبقات، وشكل السقف، ولون الإبراز، وموضعها على لوحة المدينة).
    /// لافتة الاسم تأتي من المحتوى (content/stadiums). ProjectSetup ينشئ الثمانية من StationCatalog إذا ما وُجدت.
    /// </summary>
    [CreateAssetMenu(menuName = "Football Quest/Station Definition", fileName = "Station")]
    public sealed class StationDefinition : ScriptableObject
    {
        public string stadiumId;
        public string city;
        [Range(1, 3)] public int tiers = 2;
        public RoofType roof = RoofType.FullRing;
        public Color accent = Color.white;
        public Vector2 boardPosition;

        public StationSpec ToSpec() =>
            new StationSpec(stadiumId, city, tiers, roof, "#" + ColorUtility.ToHtmlStringRGB(accent), boardPosition.x, boardPosition.y);

        public void CopyFrom(StationSpec spec)
        {
            stadiumId = spec.StadiumId;
            city = spec.City;
            tiers = spec.Tiers;
            roof = spec.Roof;
            accent = MaterialPalette.Hex(spec.AccentHex);
            boardPosition = new Vector2(spec.BoardX, spec.BoardZ);
        }
    }

    /// <summary>يحمّل المحطات من Resources/Stations، ويكمّل الناقص من StationCatalog.</summary>
    public static class StationLibrary
    {
        public const string ResourcesFolder = "Stations";
        private static List<StationSpec> specs;

        public static IReadOnlyList<StationSpec> All
        {
            get
            {
                if (specs != null) return specs;
                var byId = new Dictionary<string, StationSpec>();
                foreach (var d in Resources.LoadAll<StationDefinition>(ResourcesFolder))
                {
                    if (!string.IsNullOrEmpty(d.stadiumId)) byId[d.stadiumId] = d.ToSpec();
                }
                specs = new List<StationSpec>();
                foreach (var fallback in StationCatalog.Defaults)
                {
                    specs.Add(byId.TryGetValue(fallback.StadiumId, out var s) ? s : fallback);
                }
                return specs;
            }
        }

        public static StationSpec Find(string stadiumId)
        {
            foreach (var s in All) if (s.StadiumId == stadiumId) return s;
            return null;
        }

        public static IEnumerable<StationSpec> ForCity(string city)
        {
            foreach (var s in All) if (s.City == city) yield return s;
        }
    }
}

using System.Collections.Generic;
using FootballQuest.Core.Geometry;
using FootballQuest.Core.Map;
using UnityEngine;

namespace FootballQuest.App.Map
{
    /// <summary>ألوان الأجزاء. لون الإبراز للمحطة يُعاد تلوين المقاعد وحافة السقف به (إعادة تلوين العُدّة).</summary>
    public static class MapPalette
    {
        public static Dictionary<string, Color> Stadium(StationSpec spec)
        {
            var accent = MaterialPalette.Hex(spec.AccentHex);
            return new Dictionary<string, Color>
            {
                { StadiumMeshBuilder.Pitch, new Color32(0x3E, 0x9B, 0x4F, 0xFF) },
                { StadiumMeshBuilder.Lines, new Color32(0xF2, 0xF4, 0xF0, 0xFF) },
                { StadiumMeshBuilder.Seats, accent },
                { StadiumMeshBuilder.Concrete, new Color32(0xCF, 0xCC, 0xC4, 0xFF) },
                { StadiumMeshBuilder.Roof, new Color32(0xEE, 0xEE, 0xEA, 0xFF) },
                { StadiumMeshBuilder.RoofEdge, Color.Lerp(accent, Color.white, 0.25f) },
                { StadiumMeshBuilder.Steel, new Color32(0x8A, 0x92, 0x9E, 0xFF) },
            };
        }

        public static Dictionary<string, Color> Board(string city)
        {
            Color ground;
            switch (city)
            {
                case "JED": ground = new Color32(0xD9, 0xC7, 0x9E, 0xFF); break;
                case "KHB": ground = new Color32(0xD4, 0xC9, 0xA8, 0xFF); break;
                default: ground = new Color32(0xE0, 0xB9, 0x82, 0xFF); break;
            }
            return new Dictionary<string, Color>
            {
                { CityBoardBuilder.Ground, ground },
                { CityBoardBuilder.Water, new Color32(0x2F, 0x8F, 0xC2, 0xFF) },
                { CityBoardBuilder.Dune, Color.Lerp(ground, Color.white, 0.15f) },
                { CityBoardBuilder.PalmTrunk, new Color32(0x8A, 0x63, 0x3E, 0xFF) },
                { CityBoardBuilder.PalmLeaf, new Color32(0x4F, 0x9A, 0x48, 0xFF) },
                { CityBoardBuilder.Tower, new Color32(0xB7, 0xC3, 0xD6, 0xFF) },
                { CityBoardBuilder.Plaza, new Color32(0xF1, 0xEA, 0xDC, 0xFF) },
            };
        }
    }
}

using System;
using System.Collections.Generic;
using FootballQuest.Core.Map;

namespace FootballQuest.Core.Geometry
{
    /// <summary>
    /// لوحة مدينة Low-poly توضيحية (GAME_RULES §2.2): أرضية، ونخيل، وأبراج عامة، وبحر لجدة والخبر، وكثبان للرياض.
    /// أشكال عامة فقط بدون أي معلم مميز (RIGHTS_REGISTER الصف 12). مولّدة ببذرة ثابتة فتطلع نفسها كل مرة.
    /// الأجزاء: ground، وwater، وdune، وpalmTrunk، وpalmLeaf، وtower، وplaza.
    /// </summary>
    public static class CityBoardBuilder
    {
        public const float HalfSize = 16f;
        public const float StationClearance = 6.3f;

        public const string Ground = "ground";
        public const string Water = "water";
        public const string Dune = "dune";
        public const string PalmTrunk = "palmTrunk";
        public const string PalmLeaf = "palmLeaf";
        public const string Tower = "tower";
        public const string Plaza = "plaza";

        private static readonly Vec3 Up = new Vec3(0, 1, 0);

        public sealed class Feature
        {
            public string Kind;
            public float X;
            public float Z;
            public float Size;
        }

        /// <summary>الساحل: جدة غرب اللوحة، والخبر شرقها. الرياض بدون بحر. يرجع null إذا ما فيه.</summary>
        public static float? CoastX(string city)
        {
            switch (city)
            {
                case "JED": return -11f; // البحر من -16 إلى -11
                case "KHB": return 11f;  // البحر من 11 إلى 16
                default: return null;
            }
        }

        public static List<Feature> Layout(string city)
        {
            var rng = new Random(Seed(city));
            var stations = new List<StationSpec>(StationCatalog.ForCity(city));
            var features = new List<Feature>();
            var coast = CoastX(city);
            int towers = city == "RUH" ? 14 : 10, palms = city == "RUH" ? 10 : 16, dunes = city == "RUH" ? 6 : 0;

            void Place(string kind, int count, float minSize, float maxSize)
            {
                for (int placed = 0, attempts = 0; placed < count && attempts < count * 40; attempts++)
                {
                    var x = (float)(rng.NextDouble() * 2 - 1) * (HalfSize - 1.5f);
                    var z = (float)(rng.NextDouble() * 2 - 1) * (HalfSize - 1.5f);
                    if (!IsFree(x, z, stations, coast, features)) continue;
                    features.Add(new Feature { Kind = kind, X = x, Z = z, Size = minSize + (float)rng.NextDouble() * (maxSize - minSize) });
                    placed++;
                }
            }

            Place(Tower, towers, 1.5f, 5f);
            Place(PalmTrunk, palms, 0.8f, 1.3f);
            Place(Dune, dunes, 1.5f, 2.5f);
            return features;
        }

        public static bool IsFree(float x, float z, IEnumerable<StationSpec> stations, float? coast, List<Feature> placed)
        {
            foreach (var s in stations)
            {
                var dx = x - s.BoardX;
                var dz = z - s.BoardZ;
                if (dx * dx + dz * dz < StationClearance * StationClearance) return false;
            }
            if (coast.HasValue && (coast.Value < 0 ? x < coast.Value + 1f : x > coast.Value - 1f)) return false;
            foreach (var f in placed)
            {
                var dx = x - f.X;
                var dz = z - f.Z;
                if (dx * dx + dz * dz < 2.2f * 2.2f) return false;
            }
            return true;
        }

        public static ModelData Build(string city)
        {
            var model = new ModelData();
            var ground = model.Part(Ground);
            const float t = 0.6f; // سماكة اللوحة
            ground.Box(new Vec3(0, -t / 2f, 0), new Vec3(HalfSize * 2, t, HalfSize * 2));

            var coast = CoastX(city);
            if (coast.HasValue)
            {
                var water = model.Part(Water);
                var x0 = coast.Value < 0 ? -HalfSize : coast.Value;
                var x1 = coast.Value < 0 ? coast.Value : HalfSize;
                water.Quad(new Vec3(x0, 0.02f, -HalfSize), new Vec3(x0, 0.02f, HalfSize), new Vec3(x1, 0.02f, HalfSize), new Vec3(x1, 0.02f, -HalfSize), Up);
            }

            var plaza = model.Part(Plaza);
            foreach (var s in StationCatalog.ForCity(city))
            {
                plaza.Box(new Vec3(s.BoardX, 0.03f, s.BoardZ), new Vec3(10f, 0.06f, 7.5f));
            }

            foreach (var f in Layout(city))
            {
                switch (f.Kind)
                {
                    case Tower:
                        model.Part(Tower).Box(new Vec3(f.X, f.Size * 1.2f, f.Z), new Vec3(1.1f, f.Size * 2.4f, 1.1f), f.X);
                        break;
                    case PalmTrunk:
                        var h = 1.6f * f.Size;
                        model.Part(PalmTrunk).Box(new Vec3(f.X, h / 2f, f.Z), new Vec3(0.18f, h, 0.18f));
                        model.Part(PalmLeaf).Box(new Vec3(f.X, h, f.Z), new Vec3(1.2f * f.Size, 0.12f, 0.35f), f.Z);
                        model.Part(PalmLeaf).Box(new Vec3(f.X, h, f.Z), new Vec3(1.2f * f.Size, 0.12f, 0.35f), f.Z + 1.57f);
                        break;
                    case Dune:
                        model.Part(Dune).Box(new Vec3(f.X, 0.2f, f.Z), new Vec3(f.Size * 1.6f, 0.4f, f.Size), f.X * 0.3f);
                        break;
                }
            }
            return model;
        }

        private static int Seed(string city)
        {
            var hash = 17;
            foreach (var c in city ?? string.Empty) hash = hash * 31 + c;
            return hash;
        }
    }
}

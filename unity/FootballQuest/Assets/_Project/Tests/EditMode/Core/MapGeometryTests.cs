using System;
using System.Collections.Generic;
using System.Linq;
using FootballQuest.Core.Content;
using FootballQuest.Core.Geometry;
using FootballQuest.Core.Map;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class MapGeometryTests
    {
        /// <summary>ميزانية المثلثات: الأداء ≥ 30 إطار/ث على جهاز متوسط (ARCHITECTURE §2.2، AT-09).</summary>
        private const int StadiumHighBudget = 6000;
        private const int StadiumLowBudget = 2000;
        private const int BoardBudget = 3000;

        [Test]
        public void EightStationsMatchTheStadiumContent()
        {
            var stadiums = EmbeddedContent.Stadiums().ToDictionary(s => s.Id);
            Assert.That(StationCatalog.Defaults.Count, Is.EqualTo(8));
            foreach (var spec in StationCatalog.Defaults)
            {
                Assert.That(stadiums.ContainsKey(spec.StadiumId), spec.StadiumId);
                Assert.That(spec.City, Is.EqualTo(stadiums[spec.StadiumId].City), spec.StadiumId);
            }
        }

        [Test]
        public void EveryStationLooksDifferent()
        {
            var combos = StationCatalog.Defaults.Select(s => s.Tiers + ":" + s.Roof).ToList();
            Assert.That(combos.Distinct().Count(), Is.EqualTo(8), "unique tiers/roof per station");
            Assert.That(StationCatalog.Defaults.Select(s => s.AccentHex).Distinct().Count(), Is.EqualTo(8));
            Assert.That(Enum.GetValues(typeof(RoofType)).Length, Is.EqualTo(3), "three roof types (ARCHITECTURE §3)");
        }

        [Test]
        public void StationsFitOnTheirBoardWithoutOverlap()
        {
            foreach (var city in new[] { "RUH", "JED", "KHB" })
            {
                var specs = StationCatalog.ForCity(city).ToList();
                foreach (var s in specs)
                {
                    Assert.That(Math.Abs(s.BoardX), Is.LessThan(CityBoardBuilder.HalfSize - 4f), s.StadiumId);
                    Assert.That(Math.Abs(s.BoardZ), Is.LessThan(CityBoardBuilder.HalfSize - 3f), s.StadiumId);
                    var coast = CityBoardBuilder.CoastX(city);
                    if (coast.HasValue) Assert.That(Math.Abs(s.BoardX - coast.Value), Is.GreaterThan(4f), s.StadiumId + " not in the sea");
                }
                for (var i = 0; i < specs.Count; i++)
                for (var j = i + 1; j < specs.Count; j++)
                {
                    var dx = specs[i].BoardX - specs[j].BoardX;
                    var dz = specs[i].BoardZ - specs[j].BoardZ;
                    Assert.That(Math.Sqrt(dx * dx + dz * dz), Is.GreaterThan(8.0), specs[i].StadiumId + "/" + specs[j].StadiumId);
                }
            }
        }

        [Test]
        public void StadiumModelsStayWithinBudgetAndAreValid()
        {
            foreach (var spec in StationCatalog.Defaults)
            {
                foreach (var detail in new[] { Detail.Low, Detail.High })
                {
                    var model = StadiumMeshBuilder.Build(spec, detail);
                    var budget = detail == Detail.High ? StadiumHighBudget : StadiumLowBudget;
                    Assert.That(model.TriangleCount, Is.LessThan(budget), spec.StadiumId + " " + detail);
                    AssertValid(model, spec.StadiumId);
                }
            }
        }

        [Test]
        public void TiersAndRoofsChangeTheGeometry()
        {
            var one = StadiumMeshBuilder.Build(new StationSpec("x", "RUH", 1, RoofType.FullRing, "#fff", 0, 0), Detail.Low);
            var three = StadiumMeshBuilder.Build(new StationSpec("x", "RUH", 3, RoofType.FullRing, "#fff", 0, 0), Detail.Low);
            Assert.That(three.Parts[StadiumMeshBuilder.Seats].TriangleCount, Is.EqualTo(3 * one.Parts[StadiumMeshBuilder.Seats].TriangleCount));

            var ring = StadiumMeshBuilder.Build(new StationSpec("x", "RUH", 2, RoofType.FullRing, "#fff", 0, 0), Detail.Low);
            var sides = StadiumMeshBuilder.Build(new StationSpec("x", "RUH", 2, RoofType.SideCanopies, "#fff", 0, 0), Detail.Low);
            var arch = StadiumMeshBuilder.Build(new StationSpec("x", "RUH", 2, RoofType.Arch, "#fff", 0, 0), Detail.Low);
            Assert.That(sides.Parts[StadiumMeshBuilder.Roof].TriangleCount, Is.LessThan(ring.Parts[StadiumMeshBuilder.Roof].TriangleCount));
            Assert.That(arch.Parts[StadiumMeshBuilder.RoofEdge].TriangleCount, Is.GreaterThan(ring.Parts[StadiumMeshBuilder.RoofEdge].TriangleCount));
            Assert.Throws<ArgumentOutOfRangeException>(() => StadiumMeshBuilder.Build(new StationSpec("x", "RUH", 4, RoofType.Arch, "#fff", 0, 0), Detail.Low));
        }

        [Test]
        public void VisibleSurfacesFaceTheRightWay()
        {
            var model = StadiumMeshBuilder.Build(StationCatalog.Find("STD_RUH_KFS"), Detail.High);
            foreach (var n in Normals(model.Parts[StadiumMeshBuilder.Pitch])) Assert.That(n.Y, Is.GreaterThan(0.99f), "pitch faces up");
            foreach (var n in Normals(model.Parts[StadiumMeshBuilder.Seats])) Assert.That(n.Y, Is.GreaterThan(0f), "seats face the sky");

            var concrete = model.Parts[StadiumMeshBuilder.Concrete];
            for (var t = 0; t < concrete.Triangles.Count; t += 3)
            {
                var a = concrete.Vertices[concrete.Triangles[t]];
                var b = concrete.Vertices[concrete.Triangles[t + 1]];
                var c = concrete.Vertices[concrete.Triangles[t + 2]];
                var n = Vec3.Cross(b - a, c - a);
                var centroid = (a + b + c) * (1f / 3f);
                var radial = new Vec3(centroid.X / (StadiumMeshBuilder.InnerA * StadiumMeshBuilder.InnerA), 0, centroid.Z / (StadiumMeshBuilder.InnerB * StadiumMeshBuilder.InnerB));
                // كل حائط يواجه إما الخارج (الحائط الخارجي) أو الملعب (الواجهة)، وما فيه حائط أفقي.
                Assert.That(Math.Abs(n.Y), Is.LessThan(1e-3f));
                Assert.That(Math.Abs(Vec3.Dot(VecMath.Normalize(n), VecMath.Normalize(radial))), Is.GreaterThan(0.5f));
            }
        }

        [Test]
        public void CityBoardsAreDeterministicAndKeepStationsClear()
        {
            foreach (var city in new[] { "RUH", "JED", "KHB" })
            {
                var a = CityBoardBuilder.Layout(city);
                var b = CityBoardBuilder.Layout(city);
                Assert.That(a.Select(f => f.Kind + f.X + f.Z), Is.EqualTo(b.Select(f => f.Kind + f.X + f.Z)), city + " deterministic");
                Assert.That(a.Count, Is.GreaterThan(10), city);
                foreach (var f in a)
                {
                    Assert.That(Math.Abs(f.X), Is.LessThanOrEqualTo(CityBoardBuilder.HalfSize));
                    Assert.That(Math.Abs(f.Z), Is.LessThanOrEqualTo(CityBoardBuilder.HalfSize));
                    foreach (var s in StationCatalog.ForCity(city))
                    {
                        var d = Math.Sqrt((f.X - s.BoardX) * (f.X - s.BoardX) + (f.Z - s.BoardZ) * (f.Z - s.BoardZ));
                        Assert.That(d, Is.GreaterThanOrEqualTo(CityBoardBuilder.StationClearance), city + " " + f.Kind);
                    }
                }
                var model = CityBoardBuilder.Build(city);
                Assert.That(model.TriangleCount, Is.LessThan(BoardBudget), city);
                AssertValid(model, city);
                Assert.That(model.Parts.ContainsKey(CityBoardBuilder.Water), Is.EqualTo(city != "RUH"), city + " sea");
            }
        }

        private static IEnumerable<Vec3> Normals(MeshData mesh)
        {
            for (var t = 0; t < mesh.Triangles.Count; t += 3)
            {
                var a = mesh.Vertices[mesh.Triangles[t]];
                yield return VecMath.Normalize(Vec3.Cross(mesh.Vertices[mesh.Triangles[t + 1]] - a, mesh.Vertices[mesh.Triangles[t + 2]] - a));
            }
        }

        private static void AssertValid(ModelData model, string label)
        {
            foreach (var part in model.Parts)
            {
                Assert.That(part.Value.Triangles.Count % 3, Is.EqualTo(0), label + "/" + part.Key);
                Assert.That(part.Value.Triangles.All(i => i >= 0 && i < part.Value.Vertices.Count), Is.True, label + "/" + part.Key);
                Assert.That(part.Value.Vertices.All(v => v.IsFinite), Is.True, label + "/" + part.Key);
                Assert.That(part.Value.Vertices.Count, Is.LessThan(65535), "16-bit index buffer");
                foreach (var n in Normals(part.Value)) Assert.That(n.IsFinite && Vec3.Dot(n, n) > 0.5f, Is.True, label + "/" + part.Key + " degenerate triangle");
            }
        }
    }
}

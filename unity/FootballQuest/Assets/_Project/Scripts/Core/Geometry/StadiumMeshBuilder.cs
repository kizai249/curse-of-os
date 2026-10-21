using System;
using FootballQuest.Core.Map;

namespace FootballQuest.Core.Geometry
{
    public enum Detail
    {
        /// <summary>على لوحة المدينة (8 ملاعب كحد أقصى في المشهد).</summary>
        Low,
        /// <summary>مشهد الملعب.</summary>
        High,
    }

    /// <summary>
    /// عُدّة الملعب Low-poly (ARCHITECTURE §3): أرضية، ومدرج من 1–3 طبقات بيضاوية، وسقف من 3 أنواع، وأعمدة، وأبراج إضاءة.
    /// شكل عام أصلي ما يطابق أي مبنى حقيقي (RIGHTS_REGISTER الصف 11). الوحدة ≈ 10 م.
    /// الأجزاء: pitch، وlines، وseats (لون الإبراز)، وconcrete، وroof، وroofEdge (لون الإبراز)، وsteel.
    /// </summary>
    public static class StadiumMeshBuilder
    {
        public const string Pitch = "pitch";
        public const string Lines = "lines";
        public const string Seats = "seats";
        public const string Concrete = "concrete";
        public const string Roof = "roof";
        public const string RoofEdge = "roofEdge";
        public const string Steel = "steel";

        public const float PitchLength = 10.5f;
        public const float PitchWidth = 6.8f;
        public const float InnerA = 6.4f; // نصف المحور الطويل لحافة المدرج الداخلية
        public const float InnerB = 4.6f;
        public const float TierDepth = 1.6f;
        public const float TierRise = 1.1f;
        public const float BaseHeight = 0.25f;

        private static readonly Vec3 Up = new Vec3(0, 1, 0);

        public static int Segments(Detail detail) => detail == Detail.High ? 32 : 16;

        public static ModelData Build(StationSpec spec, Detail detail)
        {
            if (spec.Tiers < 1 || spec.Tiers > 3) throw new ArgumentOutOfRangeException(nameof(spec), "tiers must be 1–3");
            var model = new ModelData();
            var segments = Segments(detail);

            BuildPitch(model);
            for (var tier = 0; tier < spec.Tiers; tier++) BuildTier(model, tier, segments);

            var outer = OuterScale(spec.Tiers);
            var topHeight = BaseHeight + spec.Tiers * TierRise;
            var roofHeight = topHeight + 1.2f;
            BuildRoof(model, spec.Roof, outer, roofHeight, segments, detail);
            BuildColumns(model, outer, roofHeight, detail == Detail.High ? 12 : 8);
            if (detail == Detail.High) BuildFloodlights(model, outer, roofHeight + 1.5f);
            return model;
        }

        /// <summary>مقياس الحافة الخارجية لآخر طبقة (نسبة إلى الحافة الداخلية).</summary>
        public static float OuterScale(int tiers) => 1f + tiers * TierDepth / InnerB;

        /// <summary>نقطة على قطع ناقص بمقياس s وارتفاع y.</summary>
        public static Vec3 Ellipse(float angle, float scale, float y) =>
            new Vec3((float)Math.Cos(angle) * InnerA * scale, y, (float)Math.Sin(angle) * InnerB * scale);

        private static void BuildPitch(ModelData model)
        {
            var pitch = model.Part(Pitch);
            var hx = InnerA * 0.98f;
            var hz = InnerB * 0.98f;
            pitch.Quad(new Vec3(-hx, 0, -hz), new Vec3(-hx, 0, hz), new Vec3(hx, 0, hz), new Vec3(hx, 0, -hz), Up);

            var lines = model.Part(Lines);
            const float y = 0.01f;
            const float w = 0.05f;
            var lx = PitchLength / 2f;
            var lz = PitchWidth / 2f;
            // خط المنتصف والحدود الأربعة.
            lines.Quad(new Vec3(-w, y, -lz), new Vec3(-w, y, lz), new Vec3(w, y, lz), new Vec3(w, y, -lz), Up);
            lines.Quad(new Vec3(-lx, y, lz - w), new Vec3(-lx, y, lz + w), new Vec3(lx, y, lz + w), new Vec3(lx, y, lz - w), Up);
            lines.Quad(new Vec3(-lx, y, -lz - w), new Vec3(-lx, y, -lz + w), new Vec3(lx, y, -lz + w), new Vec3(lx, y, -lz - w), Up);
            lines.Quad(new Vec3(-lx - w, y, -lz), new Vec3(-lx - w, y, lz), new Vec3(-lx + w, y, lz), new Vec3(-lx + w, y, -lz), Up);
            lines.Quad(new Vec3(lx - w, y, -lz), new Vec3(lx - w, y, lz), new Vec3(lx + w, y, lz), new Vec3(lx + w, y, -lz), Up);
        }

        private static void BuildTier(ModelData model, int tier, int segments)
        {
            var seats = model.Part(Seats);
            var concrete = model.Part(Concrete);
            var s0 = 1f + tier * TierDepth / InnerB;
            var s1 = 1f + (tier + 1) * TierDepth / InnerB;
            var y0 = BaseHeight + tier * TierRise;
            var y1 = y0 + TierRise;
            for (var i = 0; i < segments; i++)
            {
                var a0 = (float)(2 * Math.PI * i / segments);
                var a1 = (float)(2 * Math.PI * (i + 1) / segments);
                var mid = (a0 + a1) / 2f;
                var outward = new Vec3((float)Math.Cos(mid), 0, (float)Math.Sin(mid));
                var inward = outward * -1f;

                // سطح المقاعد المائل (يواجه الداخل والأعلى).
                var seatFacing = new Vec3(inward.X * 0.6f, 1f, inward.Z * 0.6f);
                seats.Quad(Ellipse(a0, s0, y0), Ellipse(a1, s0, y0), Ellipse(a1, s1, y1), Ellipse(a0, s1, y1), seatFacing);
                // الواجهة الأمامية للطبقة (حائط قصير نحو الملعب).
                concrete.Quad(Ellipse(a0, s0, y0 - (tier == 0 ? BaseHeight : 0.15f)), Ellipse(a1, s0, y0 - (tier == 0 ? BaseHeight : 0.15f)),
                    Ellipse(a1, s0, y0), Ellipse(a0, s0, y0), inward);
                // الحائط الخارجي من الأرض حتى أعلى الطبقة.
                concrete.Quad(Ellipse(a0, s1, 0f), Ellipse(a1, s1, 0f), Ellipse(a1, s1, y1), Ellipse(a0, s1, y1), outward);
            }
        }

        private static void BuildRoof(ModelData model, RoofType type, float outer, float height, int segments, Detail detail)
        {
            var roof = model.Part(Roof);
            var edge = model.Part(RoofEdge);
            var inner = outer - 1.2f * TierDepth / InnerB;
            for (var i = 0; i < segments; i++)
            {
                var a0 = (float)(2 * Math.PI * i / segments);
                var a1 = (float)(2 * Math.PI * (i + 1) / segments);
                var mid = (a0 + a1) / 2f;
                if (type == RoofType.SideCanopies && Math.Abs(Math.Sin(mid)) < 0.55) continue;

                roof.DoubleQuad(Ellipse(a0, inner, height), Ellipse(a1, inner, height),
                    Ellipse(a1, outer + 0.05f, height), Ellipse(a0, outer + 0.05f, height), Up);
                var inward = new Vec3(-(float)Math.Cos(mid), 0, -(float)Math.Sin(mid));
                edge.Quad(Ellipse(a0, inner, height - 0.25f), Ellipse(a1, inner, height - 0.25f),
                    Ellipse(a1, inner, height), Ellipse(a0, inner, height), inward);
            }

            if (type == RoofType.Arch)
            {
                // قوس عام فوق الملعب على المحور القصير (شكل أصلي — ما يقلد سقفًا حقيقيًا).
                var steps = detail == Detail.High ? 14 : 8;
                var span = InnerB * outer;
                var rise = height + 3.5f;
                for (var i = 0; i < steps; i++)
                {
                    var t0 = (float)i / steps;
                    var t1 = (float)(i + 1) / steps;
                    edge.Beam(ArchPoint(t0, span, height, rise), ArchPoint(t1, span, height, rise), 0.35f);
                }
            }
        }

        private static Vec3 ArchPoint(float t, float span, float baseHeight, float top)
        {
            var z = -span + 2f * span * t;
            var y = baseHeight + (top - baseHeight) * (float)Math.Sin(Math.PI * t);
            return new Vec3(0, y, z);
        }

        private static void BuildColumns(ModelData model, float outer, float height, int count)
        {
            var steel = model.Part(Steel);
            for (var i = 0; i < count; i++)
            {
                var a = (float)(2 * Math.PI * (i + 0.5) / count);
                var p = Ellipse(a, outer + 0.08f, height / 2f);
                steel.Box(p, new Vec3(0.18f, height, 0.18f), -a);
            }
        }

        private static void BuildFloodlights(ModelData model, float outer, float height)
        {
            var steel = model.Part(Steel);
            var edge = model.Part(RoofEdge);
            foreach (var angle in new[] { 0.6f, (float)Math.PI - 0.6f, (float)Math.PI + 0.6f, -0.6f })
            {
                var basePoint = Ellipse(angle, outer + 0.4f, 0f);
                steel.Box(new Vec3(basePoint.X, height / 2f, basePoint.Z), new Vec3(0.15f, height, 0.15f));
                edge.Box(new Vec3(basePoint.X, height, basePoint.Z), new Vec3(0.9f, 0.5f, 0.25f), -angle);
            }
        }
    }
}

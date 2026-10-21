using System;
using System.Collections.Generic;

namespace FootballQuest.Core.Geometry
{
    /// <summary>متجه ثلاثي بسيط بدون UnityEngine (نظام Unity: Y للأعلى، والمثلث باتجاه عقارب الساعة = وجه أمامي).</summary>
    public readonly struct Vec3
    {
        public Vec3(float x, float y, float z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public float X { get; }
        public float Y { get; }
        public float Z { get; }

        public static Vec3 operator +(Vec3 a, Vec3 b) => new Vec3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
        public static Vec3 operator -(Vec3 a, Vec3 b) => new Vec3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        public static Vec3 operator *(Vec3 a, float s) => new Vec3(a.X * s, a.Y * s, a.Z * s);

        public static Vec3 Cross(Vec3 a, Vec3 b) => new Vec3(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
        public static float Dot(Vec3 a, Vec3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;

        public bool IsFinite => !float.IsNaN(X) && !float.IsNaN(Y) && !float.IsNaN(Z) && !float.IsInfinity(X) && !float.IsInfinity(Y) && !float.IsInfinity(Z);

        public override string ToString() => $"({X:0.##}, {Y:0.##}, {Z:0.##})";
    }

    /// <summary>شبكة جزء واحد (مادة واحدة). رؤوس غير مشتركة بين الأوجه للتظليل المسطح Low-poly.</summary>
    public sealed class MeshData
    {
        public readonly List<Vec3> Vertices = new List<Vec3>();
        public readonly List<int> Triangles = new List<int>();

        public int TriangleCount => Triangles.Count / 3;

        /// <summary>رباعي a-b-c-d. `facing` اتجاه الوجه المطلوب: يُعكس الترتيب تلقائيًا إذا لزم.</summary>
        public void Quad(Vec3 a, Vec3 b, Vec3 c, Vec3 d, Vec3 facing)
        {
            if (Vec3.Dot(Vec3.Cross(b - a, c - a), facing) < 0f)
            {
                var t = b;
                b = d;
                d = t;
            }
            var i = Vertices.Count;
            Vertices.Add(a);
            Vertices.Add(b);
            Vertices.Add(c);
            Vertices.Add(d);
            Triangles.Add(i);
            Triangles.Add(i + 1);
            Triangles.Add(i + 2);
            Triangles.Add(i);
            Triangles.Add(i + 2);
            Triangles.Add(i + 3);
        }

        /// <summary>رباعي بوجهين (للأسقف الرقيقة).</summary>
        public void DoubleQuad(Vec3 a, Vec3 b, Vec3 c, Vec3 d, Vec3 facing)
        {
            Quad(a, b, c, d, facing);
            Quad(a, b, c, d, facing * -1f);
        }

        /// <summary>عارضة مربعة المقطع بين نقطتين (للأقواس والأبراج المائلة).</summary>
        public void Beam(Vec3 from, Vec3 to, float thickness)
        {
            var d = VecMath.Normalize(to - from);
            var reference = Math.Abs(d.Y) > 0.95f ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);
            var s = VecMath.Normalize(Vec3.Cross(d, reference)) * (thickness / 2f);
            var u = VecMath.Normalize(Vec3.Cross(s, d)) * (thickness / 2f);
            Vec3 A(Vec3 p, float i, float j) => p + s * i + u * j;
            Quad(A(from, -1, 1), A(to, -1, 1), A(to, 1, 1), A(from, 1, 1), u);
            Quad(A(from, -1, -1), A(to, -1, -1), A(to, 1, -1), A(from, 1, -1), u * -1f);
            Quad(A(from, 1, -1), A(to, 1, -1), A(to, 1, 1), A(from, 1, 1), s);
            Quad(A(from, -1, -1), A(to, -1, -1), A(to, -1, 1), A(from, -1, 1), s * -1f);
            Quad(A(from, -1, -1), A(from, 1, -1), A(from, 1, 1), A(from, -1, 1), d * -1f);
            Quad(A(to, -1, -1), A(to, 1, -1), A(to, 1, 1), A(to, -1, 1), d);
        }

        /// <summary>صندوق محوري حول مركز، بدوران حول Y.</summary>
        public void Box(Vec3 center, Vec3 size, float yawRadians = 0f)
        {
            var hx = size.X / 2f;
            var hy = size.Y / 2f;
            var hz = size.Z / 2f;
            var cos = (float)Math.Cos(yawRadians);
            var sin = (float)Math.Sin(yawRadians);
            Vec3 P(float x, float y, float z) => new Vec3(center.X + x * cos + z * sin, center.Y + y, center.Z - x * sin + z * cos);
            Vec3 Dir(float x, float y, float z) => new Vec3(x * cos + z * sin, y, -x * sin + z * cos);

            var p000 = P(-hx, -hy, -hz); var p100 = P(hx, -hy, -hz); var p110 = P(hx, hy, -hz); var p010 = P(-hx, hy, -hz);
            var p001 = P(-hx, -hy, hz); var p101 = P(hx, -hy, hz); var p111 = P(hx, hy, hz); var p011 = P(-hx, hy, hz);
            Quad(p010, p011, p111, p110, Dir(0, 1, 0));   // أعلى
            Quad(p000, p100, p101, p001, Dir(0, -1, 0));  // أسفل
            Quad(p000, p010, p110, p100, Dir(0, 0, -1));  // أمام
            Quad(p001, p101, p111, p011, Dir(0, 0, 1));   // خلف
            Quad(p000, p001, p011, p010, Dir(-1, 0, 0));  // يسار
            Quad(p100, p110, p111, p101, Dir(1, 0, 0));   // يمين
        }
    }

    public static class VecMath
    {
        public static Vec3 Normalize(Vec3 v)
        {
            var len = (float)Math.Sqrt(Vec3.Dot(v, v));
            return len < 1e-6f ? new Vec3(0, 0, 0) : v * (1f / len);
        }
    }

    /// <summary>نموذج من عدة أجزاء، كل جزء بمادة (اللون يحدده العرض).</summary>
    public sealed class ModelData
    {
        public readonly Dictionary<string, MeshData> Parts = new Dictionary<string, MeshData>();

        public MeshData Part(string name)
        {
            if (!Parts.TryGetValue(name, out var mesh)) Parts[name] = mesh = new MeshData();
            return mesh;
        }

        public int TriangleCount
        {
            get
            {
                var total = 0;
                foreach (var p in Parts.Values) total += p.TriangleCount;
                return total;
            }
        }
    }
}

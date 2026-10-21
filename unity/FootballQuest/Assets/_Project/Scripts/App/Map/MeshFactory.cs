using System.Collections.Generic;
using FootballQuest.Core.Geometry;
using UnityEngine;
using UnityEngine.Rendering;

namespace FootballQuest.App.Map
{
    /// <summary>يحوّل ModelData (من Core) إلى GameObjects بشبكات Unity، جزء لكل مادة.</summary>
    public static class MeshFactory
    {
        public static GameObject Create(string name, ModelData model, IDictionary<string, Color> colors, Transform parent, bool castShadows)
        {
            var root = new GameObject(name);
            root.transform.SetParent(parent, false);
            foreach (var part in model.Parts)
            {
                if (part.Value.TriangleCount == 0) continue;
                var go = new GameObject(part.Key);
                go.transform.SetParent(root.transform, false);
                go.AddComponent<MeshFilter>().sharedMesh = ToMesh(name + "_" + part.Key, part.Value);
                var renderer = go.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = MaterialPalette.Get(colors.TryGetValue(part.Key, out var c) ? c : Color.magenta);
                renderer.shadowCastingMode = castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
                renderer.receiveShadows = castShadows;
            }
            return root;
        }

        public static Mesh ToMesh(string name, MeshData data)
        {
            var vertices = new Vector3[data.Vertices.Count];
            for (var i = 0; i < vertices.Length; i++)
            {
                var v = data.Vertices[i];
                vertices[i] = new Vector3(v.X, v.Y, v.Z);
            }
            var mesh = new Mesh { name = name };
            mesh.SetVertices(vertices);
            mesh.SetTriangles(data.Triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            mesh.UploadMeshData(true);
            return mesh;
        }
    }

    /// <summary>
    /// مادة URP Simple Lit واحدة لكل لون (متوافقة مع SRP Batcher). الأصل في Resources/Materials/FQ_Lit
    /// (ينشئه ProjectSetup فيضمن دخول الـShader في البناء).
    /// </summary>
    public static class MaterialPalette
    {
        private static readonly Dictionary<Color, Material> Cache = new Dictionary<Color, Material>();
        private static Material template;

        public static Material Get(Color color)
        {
            if (Cache.TryGetValue(color, out var m)) return m;
            if (template == null)
            {
                template = Resources.Load<Material>("Materials/FQ_Lit");
                if (template == null) template = new Material(Shader.Find("Universal Render Pipeline/Simple Lit"));
            }
            m = new Material(template) { name = "FQ_" + ColorUtility.ToHtmlStringRGB(color) };
            m.SetColor("_BaseColor", color);
            m.color = color;
            Cache[color] = m;
            return m;
        }

        public static Color Hex(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.magenta;
    }
}

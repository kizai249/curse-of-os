using FootballQuest.Core.Geometry;
using FootballQuest.Core.Map;
using UnityEngine;

namespace FootballQuest.App.Map
{
    /// <summary>
    /// مشهد الملعب المُعاد استخدامه للمحطات الثمانية (ARCHITECTURE §2): نفس العُدّة بتفاصيل أعلى، وضوء واحد
    /// بظل ديناميكي واحد فقط، وكاميرا تدور ببطء.
    /// </summary>
    public sealed class StadiumSceneController : MonoBehaviour
    {
        private const float OrbitDegreesPerSecond = 6f;

        private Camera cam;
        private float angle = 200f;

        public static StadiumSceneController Create(StationSpec spec)
        {
            var go = new GameObject("Stadium_" + spec.StadiumId);
            var controller = go.AddComponent<StadiumSceneController>();
            controller.Build(spec);
            return controller;
        }

        private void Build(StationSpec spec)
        {
            cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
                cam = camGo.AddComponent<Camera>();
            }
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color32(0x16, 0x22, 0x40, 0xFF);
            cam.fieldOfView = 45f;

            var sun = FindAnyObjectByType<Light>();
            if (sun == null) sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.Hard; // الظل الديناميكي الوحيد (ARCHITECTURE §2)
            sun.intensity = 1.2f;
            sun.transform.rotation = Quaternion.Euler(48f, -30f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.45f, 0.5f, 0.6f);

            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            Destroy(ground.GetComponent<Collider>());
            ground.transform.SetParent(transform, false);
            ground.transform.localScale = new Vector3(6f, 1f, 6f);
            ground.transform.localPosition = new Vector3(0f, -0.02f, 0f);
            ground.GetComponent<MeshRenderer>().sharedMaterial = MaterialPalette.Get(new Color32(0xC9, 0xB0, 0x86, 0xFF));

            MeshFactory.Create(spec.StadiumId, StadiumMeshBuilder.Build(spec, Detail.High), MapPalette.Stadium(spec), transform, true);
            UpdateCamera();
        }

        private void Update()
        {
            angle += OrbitDegreesPerSecond * Time.deltaTime;
            UpdateCamera();
        }

        private void UpdateCamera()
        {
            if (cam == null) return;
            var rad = angle * Mathf.Deg2Rad;
            cam.transform.position = new Vector3(Mathf.Cos(rad) * 24f, 14f, Mathf.Sin(rad) * 24f);
            cam.transform.LookAt(new Vector3(0f, 1.5f, 0f));
        }
    }
}

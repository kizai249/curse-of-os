using System;
using FootballQuest.Core.Geometry;
using UnityEngine;
using UnityEngine.EventSystems;

namespace FootballQuest.App.Map
{
    /// <summary>علامة على مجسم المحطة في اللوحة (للاختيار باللمس).</summary>
    public sealed class StationMarker : MonoBehaviour
    {
        public string stadiumId;
    }

    /// <summary>
    /// خارطة الملاعب في مشهد Hub: لوحة مدينة واحدة ظاهرة (3 مدن)، والتنقل باللمس — سحب للتحريك، وسحبة أفقية
    /// سريعة لتغيير المدينة، ونقرة على محطة لفتحها (GAME_RULES §2.2). بدون ظلال ديناميكية لتوفير الأداء.
    /// </summary>
    public sealed class MapController : MonoBehaviour
    {
        public static readonly string[] CityOrder = { "RUH", "JED", "KHB" };

        private const float StationScale = 0.36f;
        private const float VisibleHalfWidth = 12f;
        private const float PanLimit = 9f;
        private const float SwipeFraction = 0.28f;
        private const float SwipeSeconds = 0.35f;
        private const float TapPixels = 18f;

        private Camera cam;
        private Transform boardRoot;
        private Vector3 focus;
        private Vector2 pressPosition;
        private Vector2 lastPosition;
        private float pressTime;
        private bool dragging;

        public event Action<string> StationTapped;
        public event Action<string> CityChanged;

        public string City { get; private set; }

        public static MapController Create(string city)
        {
            var go = new GameObject("Map");
            var map = go.AddComponent<MapController>();
            map.SetupScene();
            map.ShowCity(city);
            return map;
        }

        private void SetupScene()
        {
            cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
                cam = camGo.AddComponent<Camera>();
            }
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color32(0x9F, 0xD3, 0xF0, 0xFF);
            cam.fieldOfView = 40f;
            cam.nearClipPlane = 0.5f;
            cam.farClipPlane = 200f;

            var sun = FindAnyObjectByType<Light>();
            if (sun == null) sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.None;
            sun.intensity = 1.15f;
            sun.transform.rotation = Quaternion.Euler(52f, -35f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.62f, 0.66f, 0.72f);
        }

        public void ShowCity(string city)
        {
            if (Array.IndexOf(CityOrder, city) < 0) city = CityOrder[0];
            if (city == City && boardRoot != null) return;
            City = city;
            if (boardRoot != null) Destroy(boardRoot.gameObject);

            boardRoot = MeshFactory.Create("Board_" + city, CityBoardBuilder.Build(city), MapPalette.Board(city), transform, false).transform;
            foreach (var spec in StationLibrary.ForCity(city))
            {
                var model = StadiumMeshBuilder.Build(spec, Detail.Low);
                var station = MeshFactory.Create(spec.StadiumId, model, MapPalette.Stadium(spec), boardRoot, false);
                station.transform.localPosition = new Vector3(spec.BoardX, 0f, spec.BoardZ);
                station.transform.localScale = Vector3.one * StationScale;
                var collider = station.AddComponent<BoxCollider>();
                collider.center = new Vector3(0f, 2f, 0f);
                collider.size = new Vector3(StadiumMeshBuilder.InnerA * 4.2f, 4f, StadiumMeshBuilder.InnerB * 4.2f);
                station.AddComponent<StationMarker>().stadiumId = spec.StadiumId;
            }
            focus = Vector3.zero;
            PlaceCamera();
            CityChanged?.Invoke(city);
        }

        public void NextCity(int direction)
        {
            var i = Array.IndexOf(CityOrder, City);
            ShowCity(CityOrder[(i + direction + CityOrder.Length) % CityOrder.Length]);
        }

        private void PlaceCamera()
        {
            // شاشة طولية: نحسب المسافة بحيث يظهر ±12 وحدة أفقيًا من اللوحة (32 وحدة)، والباقي بالسحب.
            var halfFov = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
            var distance = Mathf.Clamp(VisibleHalfWidth / (Mathf.Tan(halfFov) * Mathf.Max(0.3f, cam.aspect)), 30f, 80f);
            cam.transform.position = focus + new Vector3(0f, 0.78f, -0.62f) * distance;
            cam.transform.LookAt(focus);
        }

        private void Update()
        {
            if (cam == null) return;
            if (Input.touchCount > 0) HandlePointer(Input.GetTouch(0).position, Input.GetTouch(0).phase == TouchPhase.Began,
                Input.GetTouch(0).phase == TouchPhase.Ended, Input.GetTouch(0).fingerId);
            else if (Input.GetMouseButtonDown(0)) HandlePointer(Input.mousePosition, true, false, -1);
            else if (Input.GetMouseButton(0)) HandlePointer(Input.mousePosition, false, false, -1);
            else if (Input.GetMouseButtonUp(0)) HandlePointer(Input.mousePosition, false, true, -1);
        }

        private void HandlePointer(Vector2 position, bool began, bool ended, int pointerId)
        {
            if (began)
            {
                // اللمس فوق الواجهة (أزرار، Sheets) ما يحرك الخارطة.
                if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject(pointerId)) return;
                dragging = true;
                pressPosition = lastPosition = position;
                pressTime = Time.unscaledTime;
                return;
            }
            if (!dragging) return;

            if (!ended)
            {
                var delta = position - lastPosition;
                lastPosition = position;
                var scale = 30f / Screen.height;
                focus += new Vector3(-delta.x * scale, 0f, -delta.y * scale);
                focus.x = Mathf.Clamp(focus.x, -PanLimit, PanLimit);
                focus.z = Mathf.Clamp(focus.z, -PanLimit, PanLimit);
                PlaceCamera();
                return;
            }

            dragging = false;
            var total = position - pressPosition;
            var quick = Time.unscaledTime - pressTime < SwipeSeconds;
            if (quick && Mathf.Abs(total.x) > Screen.width * SwipeFraction && Mathf.Abs(total.x) > Mathf.Abs(total.y) * 2f)
            {
                // سحبة لليسار = المدينة التالية (والاتجاه نفسه بالعربي والإنجليزي لأن الخارطة مكان مو نص).
                NextCity(total.x < 0 ? 1 : -1);
                return;
            }
            if (total.magnitude < TapPixels && Physics.Raycast(cam.ScreenPointToRay(position), out var hit, 300f))
            {
                var marker = hit.collider.GetComponentInParent<StationMarker>();
                if (marker != null) StationTapped?.Invoke(marker.stadiumId);
            }
        }
    }
}

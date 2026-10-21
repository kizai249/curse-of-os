using System;
using System.Collections;
using FootballQuest.Core.Ui;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace FootballQuest.App.UI
{
    public sealed class SheetButton
    {
        public SheetButton(string label, Action onClick, ButtonStyle style = ButtonStyle.Primary)
        {
            Label = label;
            OnClick = onClick;
            Style = style;
        }

        public string Label { get; }
        public Action OnClick { get; }
        public ButtonStyle Style { get; }
    }

    /// <summary>
    /// جذر الواجهة: طبقة الشاشات (داخل Safe Area) + طبقة الشريط العلوي + طبقة Sheet/Dialog + طبقة Toast.
    /// أنواع العرض حسب PERMISSION_AND_ERROR_STATES.md.
    /// </summary>
    public sealed class UiRoot : MonoBehaviour
    {
        private GameObject backdrop;
        private RectTransform safeArea;
        private RectTransform screenLayer;
        private RectTransform bannerLayer;
        private RectTransform modalLayer;
        private RectTransform toastLayer;
        private Rect appliedSafeArea;
        private Coroutine toastRoutine;

        public RectTransform Screen => screenLayer;

        public static UiRoot Create()
        {
            var go = new GameObject("UiRoot");
            DontDestroyOnLoad(go);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(UiTheme.ReferenceWidth, UiTheme.ReferenceHeight);
            scaler.matchWidthOrHeight = 0.5f;
            go.AddComponent<GraphicRaycaster>();

            if (FindAnyObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                DontDestroyOnLoad(es);
            }

            var root = go.AddComponent<UiRoot>();
            root.Build();
            return root;
        }

        private void Build()
        {
            var bg = UiFactory.Panel(transform, "Background", UiTheme.Background);
            UiFactory.Stretch(bg);
            backdrop = bg.gameObject;
            safeArea = UiFactory.Rect(transform, "SafeArea");
            ApplySafeArea();
            screenLayer = UiFactory.Rect(safeArea, "Screens");
            UiFactory.Stretch(screenLayer);
            bannerLayer = UiFactory.Rect(safeArea, "Banner");
            bannerLayer.anchorMin = new Vector2(0f, 1f);
            bannerLayer.anchorMax = new Vector2(1f, 1f);
            bannerLayer.pivot = new Vector2(0.5f, 1f);
            bannerLayer.sizeDelta = new Vector2(0f, 0f);
            modalLayer = UiFactory.Rect(transform, "Modals");
            UiFactory.Stretch(modalLayer);
            toastLayer = UiFactory.Rect(safeArea, "Toasts");
            UiFactory.Stretch(toastLayer);
        }

        private void Update()
        {
            if (appliedSafeArea != UnityEngine.Screen.safeArea) ApplySafeArea();
        }

        private void ApplySafeArea()
        {
            appliedSafeArea = UnityEngine.Screen.safeArea;
            var w = Mathf.Max(1f, UnityEngine.Screen.width);
            var h = Mathf.Max(1f, UnityEngine.Screen.height);
            safeArea.anchorMin = new Vector2(appliedSafeArea.xMin / w, appliedSafeArea.yMin / h);
            safeArea.anchorMax = new Vector2(appliedSafeArea.xMax / w, appliedSafeArea.yMax / h);
            safeArea.offsetMin = Vector2.zero;
            safeArea.offsetMax = Vector2.zero;
        }

        /// <summary>
        /// يمسح الشاشة الحالية ويرجع عمودًا جديدًا يملأ الشاشة. `backdrop = false` يخلي المشهد ثلاثي الأبعاد ظاهرًا خلف الواجهة
        /// (الخارطة ومشهد الملعب)؛ العمود نفسه بدون Image فما يحجب اللمس إلا عناصره.
        /// </summary>
        public RectTransform NewScreen(string name, bool backdrop = true)
        {
            this.backdrop.SetActive(backdrop);
            Clear(screenLayer);
            var column = UiFactory.VStack(screenLayer, name);
            UiFactory.Stretch(column);
            return column;
        }

        public void Toast(string text, Language language)
        {
            Clear(toastLayer);
            var panel = UiFactory.Panel(toastLayer, "Toast", UiTheme.SurfaceRaised);
            panel.anchorMin = new Vector2(0.05f, 0.04f);
            panel.anchorMax = new Vector2(0.95f, 0.04f);
            panel.pivot = new Vector2(0.5f, 0f);
            panel.sizeDelta = new Vector2(0f, 160f);
            var label = UiFactory.Label(panel, text, language, UiTheme.BodySize, center: true);
            UiFactory.Stretch(label.rectTransform, 20f);
            if (toastRoutine != null) StopCoroutine(toastRoutine);
            toastRoutine = StartCoroutine(HideAfter(panel.gameObject, UiTheme.ToastSeconds));
        }

        /// <summary>لوحة سفلية بزر أو زرين (`sheet`).</summary>
        public void Sheet(string title, string body, Language language, params SheetButton[] buttons)
        {
            var scrim = OpenModal();
            var sheet = UiFactory.VStack(scrim, "Sheet");
            sheet.gameObject.AddComponent<Image>().color = UiTheme.Surface;
            sheet.anchorMin = new Vector2(0f, 0f);
            sheet.anchorMax = new Vector2(1f, 0f);
            sheet.pivot = new Vector2(0.5f, 0f);
            UiFactory.Fit(sheet);
            Fill(sheet, title, body, language, buttons);
        }

        /// <summary>نافذة وسط الشاشة (`dialog`) للقرارات المهمة.</summary>
        public void Dialog(string body, Language language, params SheetButton[] buttons)
        {
            var scrim = OpenModal();
            var dialog = UiFactory.VStack(scrim, "Dialog");
            dialog.gameObject.AddComponent<Image>().color = UiTheme.Surface;
            dialog.anchorMin = new Vector2(0.06f, 0.5f);
            dialog.anchorMax = new Vector2(0.94f, 0.5f);
            dialog.pivot = new Vector2(0.5f, 0.5f);
            UiFactory.Fit(dialog);
            Fill(dialog, null, body, language, buttons);
        }

        public void CloseModal() => Clear(modalLayer);

        /// <summary>شريط ثابت أعلى الشاشة (`NET_OFFLINE`). null يخفيه.</summary>
        public void Banner(string text, Language language)
        {
            Clear(bannerLayer);
            bannerLayer.sizeDelta = new Vector2(0f, text == null ? 0f : 110f);
            screenLayer.offsetMax = new Vector2(0f, text == null ? 0f : -110f);
            if (text == null) return;
            var panel = UiFactory.Panel(bannerLayer, "BannerPanel", UiTheme.Warning);
            UiFactory.Stretch(panel);
            var label = UiFactory.Label(panel, text, language, UiTheme.SmallSize, color: UiTheme.AccentText, center: true);
            UiFactory.Stretch(label.rectTransform, 12f);
        }

        private RectTransform OpenModal()
        {
            Clear(modalLayer);
            var scrim = UiFactory.Panel(modalLayer, "Scrim", UiTheme.Scrim);
            UiFactory.Stretch(scrim);
            return scrim;
        }

        private void Fill(RectTransform container, string title, string body, Language language, SheetButton[] buttons)
        {
            if (!string.IsNullOrEmpty(title)) UiFactory.Label(container, title, language, UiTheme.HeadingSize, bold: true);
            if (!string.IsNullOrEmpty(body)) UiFactory.Label(container, body, language);
            foreach (var b in buttons)
            {
                var button = b;
                UiFactory.Button(container, button.Label, language, () =>
                {
                    CloseModal();
                    button.OnClick?.Invoke();
                }, button.Style);
            }
        }

        private static IEnumerator HideAfter(GameObject go, float seconds)
        {
            yield return new WaitForSecondsRealtime(seconds);
            if (go != null) Destroy(go);
        }

        private static void Clear(Transform t)
        {
            for (var i = t.childCount - 1; i >= 0; i--) Destroy(t.GetChild(i).gameObject);
        }
    }
}

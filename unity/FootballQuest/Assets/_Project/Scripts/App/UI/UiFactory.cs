using System;
using FootballQuest.Core.Ui;
using RTLTMPro;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace FootballQuest.App.UI
{
    public enum ButtonStyle
    {
        Primary,
        Secondary,
        Danger,
        Ghost,
    }

    /// <summary>
    /// بناء الواجهة بالكود (uGUI + RTLTextMeshPro). كل نص يمر عبر RTLTMPro للتشكيل العربي،
    /// والمحاذاة والترتيب الأفقي يُعكسان حسب اللغة (AT-11).
    /// </summary>
    public static class UiFactory
    {
        public static RectTransform Rect(Transform parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.layer = 5; // UI
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            return rt;
        }

        public static void Stretch(RectTransform rt, float inset = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(inset, inset);
            rt.offsetMax = new Vector2(-inset, -inset);
        }

        public static RectTransform Panel(Transform parent, string name, Color color)
        {
            var rt = Rect(parent, name);
            var image = rt.gameObject.AddComponent<Image>();
            image.color = color;
            return rt;
        }

        public static RectTransform VStack(Transform parent, string name, float spacing = UiTheme.Spacing, int padding = (int)UiTheme.Gutter)
        {
            var rt = Rect(parent, name);
            var layout = rt.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.spacing = spacing;
            layout.padding = new RectOffset(padding, padding, padding, padding);
            layout.childAlignment = TextAnchor.UpperCenter;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            return rt;
        }

        public static RectTransform HStack(Transform parent, string name, Language language, float spacing = UiTheme.Spacing)
        {
            var rt = Rect(parent, name);
            var layout = rt.gameObject.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = spacing;
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            // RTL: أول عنصر على اليمين.
            layout.reverseArrangement = language.IsRightToLeft();
            return rt;
        }

        /// <summary>صف يوسّط عنصرًا بعرضه المفضل (مثل البطاقة) بدل ما يمده لعرض الشاشة.</summary>
        public static RectTransform Centered(Transform parent, string name, float height)
        {
            var rt = Rect(parent, name);
            var layout = rt.gameObject.AddComponent<HorizontalLayoutGroup>();
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandWidth = false;
            layout.childForceExpandHeight = false;
            Size(rt, height, height);
            return rt;
        }

        public static void Fit(RectTransform rt)
        {
            var fitter = rt.gameObject.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        }

        public static LayoutElement Size(Component c, float minHeight = -1f, float preferredHeight = -1f, float flexibleHeight = -1f)
        {
            // ما نستخدم ?? مع UnityEngine.Object (المقارنة بالـnull مخصصة في Unity).
            var le = c.GetComponent<LayoutElement>();
            if (le == null) le = c.gameObject.AddComponent<LayoutElement>();
            le.minHeight = minHeight;
            le.preferredHeight = preferredHeight;
            le.flexibleHeight = flexibleHeight;
            return le;
        }

        public static RTLTextMeshPro Label(Transform parent, string text, Language language, float size = UiTheme.BodySize,
            bool bold = false, Color? color = null, bool center = false)
        {
            var rt = Rect(parent, "Label");
            var label = rt.gameObject.AddComponent<RTLTextMeshPro>();
            label.font = bold ? UiFonts.Bold : UiFonts.Regular;
            label.fontSize = size;
            label.color = color ?? UiTheme.Text;
            label.Farsi = false;
            label.PreserveNumbers = true;
            label.FixTags = true;
            label.textWrappingMode = TextWrappingModes.Normal;
            label.raycastTarget = false;
            label.alignment = center
                ? TextAlignmentOptions.Center
                : language.IsRightToLeft() ? TextAlignmentOptions.Right : TextAlignmentOptions.Left;
            label.text = text ?? string.Empty;
            return label;
        }

        public static Button Button(Transform parent, string text, Language language, Action onClick, ButtonStyle style = ButtonStyle.Primary)
        {
            var rt = Panel(parent, "Button", Background(style));
            var button = rt.gameObject.AddComponent<Button>();
            button.targetGraphic = rt.GetComponent<Image>();
            button.onClick.AddListener(() => onClick?.Invoke());
            Size(rt, UiTheme.ButtonHeight, UiTheme.ButtonHeight);

            var label = Label(rt, text, language, UiTheme.BodySize, bold: true,
                color: style == ButtonStyle.Primary ? UiTheme.AccentText : UiTheme.Text, center: true);
            Stretch(label.rectTransform, 12f);
            return button;
        }

        public static RectTransform Spacer(Transform parent, float flexible = 1f)
        {
            var rt = Rect(parent, "Spacer");
            Size(rt, 0f, 0f, flexible);
            return rt;
        }

        /// <summary>منطقة قابلة للتمرير؛ يرجع المحتوى (VStack).</summary>
        public static RectTransform Scroll(Transform parent, string name)
        {
            var viewport = Rect(parent, name);
            Size(viewport, 0f, 0f, 1f);
            viewport.gameObject.AddComponent<RectMask2D>();
            var scroll = viewport.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.movementType = ScrollRect.MovementType.Clamped;

            var content = VStack(viewport, "Content");
            content.anchorMin = new Vector2(0f, 1f);
            content.anchorMax = new Vector2(1f, 1f);
            content.pivot = new Vector2(0.5f, 1f);
            content.offsetMin = Vector2.zero;
            content.offsetMax = Vector2.zero;
            Fit(content);

            scroll.viewport = viewport;
            scroll.content = content;
            return content;
        }

        private static Color Background(ButtonStyle style)
        {
            switch (style)
            {
                case ButtonStyle.Primary: return UiTheme.Accent;
                case ButtonStyle.Danger: return UiTheme.Danger;
                case ButtonStyle.Ghost: return new Color(1f, 1f, 1f, 0.06f);
                default: return UiTheme.SurfaceRaised;
            }
        }
    }
}

using UnityEngine;

namespace FootballQuest.App.UI
{
    /// <summary>ألوان وأحجام أصلية للمشروع (بدون أي هوية للبطولة أو ألوان أعلام — RIGHTS_REGISTER).</summary>
    public static class UiTheme
    {
        public static readonly Color Background = new Color32(0x0B, 0x14, 0x2A, 0xFF);
        public static readonly Color Surface = new Color32(0x16, 0x22, 0x40, 0xFF);
        public static readonly Color SurfaceRaised = new Color32(0x1F, 0x2E, 0x55, 0xFF);
        public static readonly Color Accent = new Color32(0x2E, 0xD1, 0x8C, 0xFF);
        public static readonly Color AccentText = new Color32(0x06, 0x1A, 0x10, 0xFF);
        public static readonly Color Danger = new Color32(0xE5, 0x4B, 0x4B, 0xFF);
        public static readonly Color Text = new Color32(0xF4, 0xF6, 0xFB, 0xFF);
        public static readonly Color TextMuted = new Color32(0xA9, 0xB4, 0xCC, 0xFF);
        public static readonly Color Scrim = new Color(0f, 0f, 0f, 0.6f);
        public static readonly Color Warning = new Color32(0xF2, 0xB2, 0x3A, 0xFF);

        public const float ReferenceWidth = 1080f;
        public const float ReferenceHeight = 1920f;
        public const float TitleSize = 64f;
        public const float HeadingSize = 48f;
        public const float BodySize = 38f;
        public const float SmallSize = 30f;
        public const float ButtonHeight = 132f;
        public const float Gutter = 48f;
        public const float Spacing = 28f;
        public const float ToastSeconds = 3f;
    }
}

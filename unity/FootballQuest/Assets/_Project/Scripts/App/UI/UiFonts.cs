using TMPro;
using UnityEngine;

namespace FootballQuest.App.UI
{
    /// <summary>
    /// IBM Plex Sans Arabic (SIL OFL 1.1). ProjectSetup ينشئ «… SDF» كـ Font Asset ديناميكي في Resources؛
    /// وإذا ما وُجد ننشئه وقت التشغيل من ملف TTF.
    /// </summary>
    public static class UiFonts
    {
        public const string RegularName = "Fonts/IBMPlexSansArabic-Regular";
        public const string BoldName = "Fonts/IBMPlexSansArabic-Bold";

        private static TMP_FontAsset regular;
        private static TMP_FontAsset bold;

        public static TMP_FontAsset Regular => regular ? regular : (regular = Load(RegularName));
        public static TMP_FontAsset Bold => bold ? bold : (bold = Load(BoldName));

        private static TMP_FontAsset Load(string name)
        {
            var asset = Resources.Load<TMP_FontAsset>(name + " SDF");
            if (asset != null) return asset;
            var font = Resources.Load<Font>(name);
            if (font != null) return TMP_FontAsset.CreateFontAsset(font);
            Debug.LogError("[UiFonts] missing font " + name);
            return TMP_Settings.defaultFontAsset;
        }
    }
}

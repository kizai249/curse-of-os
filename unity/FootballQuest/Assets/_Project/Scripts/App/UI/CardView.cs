using System.Collections;
using FootballQuest.Core.Collection;
using FootballQuest.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace FootballQuest.App.UI
{
    /// <summary>
    /// بطاقة منتخب برسم أصلي عام (RIGHTS_REGISTER الصفوف 3–5 و9): اسم المنتخب نصًا ورمزه الثلاثي فقط،
    /// وبدون علم أو شعار أو ألوان طقم — الألوان حسب النسخة (GAME_RULES §3.1)، مو حسب المنتخب:
    /// الأساسية خلفية مدينة، وليلة الملعب إضاءة ليلية، والمدرج جمهور Low-poly، والذهبية إطار ذهبي.
    /// TODO(art, RIGHTS_REGISTER الصف 9): استبدال الرسم المولّد بملفات المصمم (24 × 4) مع الحفاظ على نفس القواعد.
    /// </summary>
    public static class CardView
    {
        public const float Width = 420f;
        public const float Height = 588f;

        public static RectTransform Build(Transform parent, string teamName, string teamCode, string variant, Language language, bool owned = true)
        {
            var root = UiFactory.Panel(parent, "Card_" + teamCode + "_" + variant, owned ? Frame(variant) : UiTheme.SurfaceRaised);
            UiFactory.Size(root, Height, Height);
            var le = root.GetComponent<LayoutElement>();
            le.preferredWidth = Width;

            var art = UiFactory.Panel(root, "Art", owned ? Background(variant) : UiTheme.Surface);
            UiFactory.Stretch(art, variant == "legendary" ? 22f : 10f);
            if (owned) Decorate(art, variant, teamCode);

            var code = UiFactory.Label(art, teamCode, Language.English, 120f, bold: true, color: new Color(1f, 1f, 1f, owned ? 0.92f : 0.25f), center: true);
            Place(code.rectTransform, 0.42f, 0.78f);
            var name = UiFactory.Label(art, teamName, language, 44f, bold: true, color: owned ? UiTheme.Text : UiTheme.TextMuted, center: true);
            Place(name.rectTransform, 0.2f, 0.36f);
            var edition = UiFactory.Label(art, Variants.RarityName(variant, language) + " • " + Variants.EditionName(variant, language),
                language, 28f, color: owned ? new Color(1f, 1f, 1f, 0.85f) : UiTheme.TextMuted, center: true);
            Place(edition.rectTransform, 0.05f, 0.18f);
            return root;
        }

        private static void Place(RectTransform rt, float yMin, float yMax)
        {
            rt.anchorMin = new Vector2(0.04f, yMin);
            rt.anchorMax = new Vector2(0.96f, yMax);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        public static Color Frame(string variant)
        {
            switch (variant)
            {
                case "rare": return new Color32(0x3B, 0x6E, 0xD8, 0xFF);
                case "epic": return new Color32(0x9B, 0x5C, 0xF6, 0xFF);
                case "legendary": return new Color32(0xE2, 0xB0, 0x2E, 0xFF);
                default: return new Color32(0xC9, 0xB0, 0x86, 0xFF);
            }
        }

        private static Color Background(string variant)
        {
            switch (variant)
            {
                case "rare": return new Color32(0x10, 0x1C, 0x3E, 0xFF);
                case "epic": return new Color32(0x3A, 0x1F, 0x5E, 0xFF);
                case "legendary": return new Color32(0x2A, 0x22, 0x10, 0xFF);
                default: return new Color32(0x7A, 0x9C, 0xB8, 0xFF);
            }
        }

        /// <summary>زخارف مولّدة ببذرة من الرمز (نفس البطاقة تطلع بنفس الشكل دائمًا).</summary>
        private static void Decorate(RectTransform art, string variant, string seedText)
        {
            var rng = new System.Random(seedText.GetHashCode() ^ variant.GetHashCode());
            switch (variant)
            {
                case "common": // أفق مدينة عام
                    for (var i = 0; i < 9; i++)
                    {
                        var h = 0.08f + (float)rng.NextDouble() * 0.22f;
                        Shape(art, new Color32(0x4C, 0x66, 0x80, 0xFF), i / 9f, (i + 0.85f) / 9f, 0.3f, 0.3f + h);
                    }
                    Shape(art, new Color32(0xD9, 0xC2, 0x8F, 0xFF), 0f, 1f, 0f, 0.3f);
                    break;
                case "rare": // إضاءة ليلية: نقاط ضوء وأبراج إضاءة
                    for (var i = 0; i < 26; i++)
                    {
                        var x = (float)rng.NextDouble();
                        var y = 0.45f + (float)rng.NextDouble() * 0.5f;
                        Shape(art, new Color(1f, 0.95f, 0.7f, 0.8f), x, x + 0.012f, y, y + 0.008f);
                    }
                    Shape(art, new Color32(0x2E, 0xD1, 0x8C, 0x55), 0f, 1f, 0f, 0.22f);
                    break;
                case "epic": // صفوف جمهور Low-poly
                    for (var row = 0; row < 4; row++)
                    for (var i = 0; i < 12; i++)
                    {
                        var c = Color.HSVToRGB((float)rng.NextDouble(), 0.35f, 0.9f);
                        Shape(art, c, i / 12f + 0.01f, (i + 0.7f) / 12f, 0.05f + row * 0.07f, 0.1f + row * 0.07f);
                    }
                    break;
                case "legendary": // إطار داخلي ولمعة
                    Shape(art, new Color32(0xE2, 0xB0, 0x2E, 0x66), 0.03f, 0.97f, 0.96f, 0.975f);
                    Shape(art, new Color32(0xE2, 0xB0, 0x2E, 0x66), 0.03f, 0.97f, 0.025f, 0.04f);
                    Shape(art, new Color(1f, 1f, 1f, 0.12f), 0.55f, 0.62f, 0f, 1f);
                    break;
            }
        }

        private static void Shape(RectTransform parent, Color color, float xMin, float xMax, float yMin, float yMax)
        {
            var rt = UiFactory.Panel(parent, "Deco", color);
            rt.GetComponent<Image>().raycastTarget = false;
            rt.anchorMin = new Vector2(xMin, yMin);
            rt.anchorMax = new Vector2(xMax, yMax);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }
    }

    /// <summary>حركة كشف البطاقة: تكبير من الصغر مع ارتداد خفيف، ونبضة للأسطورية.</summary>
    public sealed class PopIn : MonoBehaviour
    {
        public float duration = 0.4f;
        public bool pulse;

        private IEnumerator Start()
        {
            var t = 0f;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                var p = Mathf.Clamp01(t / duration);
                var s = 1f + 0.12f * Mathf.Sin(p * Mathf.PI) - (1f - p) * 0.8f;
                transform.localScale = Vector3.one * Mathf.Max(0.05f, s);
                yield return null;
            }
            transform.localScale = Vector3.one;
            while (pulse)
            {
                transform.localScale = Vector3.one * (1f + 0.025f * Mathf.Sin(Time.unscaledTime * 4f));
                yield return null;
            }
        }
    }
}

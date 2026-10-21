using System.Collections.Generic;
using System.IO;
using System.Linq;
using FootballQuest.Core.Ui;
using FootballQuest.Tests.Core;
using NUnit.Framework;
using RTLTMPro;

namespace FootballQuest.Tools.FontCoverage
{
    /// <summary>
    /// AT-11: كل حرف يظهر في نصوص الواجهة — بعد التشكيل العربي (Presentation Forms) — موجود في الخط
    /// (IBM Plex Sans Arabic، Regular وBold)، فما يظهر مربع فاضي.
    /// </summary>
    public class FontCoverageTests
    {
        /// <summary>
        /// رموز معروفة خارج الخط:
        /// ✗ في نصوص الموظف (لوحة الويب فقط)، و🎉 (CPN_ISSUED — S7) و🏆 (ROUND_WON — S8).
        /// TODO(S7/S8): Sprite Asset لـ 🎉 و🏆 قبل استخدام الحالتين في Unity.
        /// </summary>
        private static readonly int[] KnownGaps = { 0x2717, 0x1F389, 0x1F3C6 };

        [TestCase("IBMPlexSansArabic-Regular.ttf")]
        [TestCase("IBMPlexSansArabic-Bold.ttf")]
        public void FontCoversAllUiText(string file)
        {
            var path = Path.Combine(SharedVectors.ContractsDir(), "..", "..", "unity", "FootballQuest", "Assets", "_Project", "Resources", "Fonts", file);
            var cmap = FontCmap.Read(path);
            Assert.That(cmap.Count, Is.GreaterThan(500));

            var missing = new SortedSet<int>();
            foreach (var text in AllTexts())
            {
                foreach (var cp in CodePoints(text))
                {
                    if (cp >= 0x20 && !cmap.Contains(cp)) missing.Add(cp);
                }
            }
            Assert.That(missing.ToArray(), Is.EquivalentTo(KnownGaps), "missing: " + string.Join(", ", missing.Select(c => "U+" + c.ToString("X4"))));
        }

        private static IEnumerable<string> AllTexts()
        {
            foreach (var s in StateCatalog.All)
            {
                foreach (var t in new[] { s.TitleAr, s.BodyAr })
                {
                    if (!string.IsNullOrEmpty(t)) { yield return t; yield return Shape(t); }
                }
                foreach (var t in new[] { s.TitleEn, s.BodyEn })
                {
                    if (!string.IsNullOrEmpty(t)) yield return t;
                }
            }
            foreach (var key in UiStrings.Keys)
            {
                var ar = UiStrings.Get(key, Language.Arabic);
                yield return ar;
                yield return Shape(ar);
                yield return UiStrings.Get(key, Language.English);
            }
        }

        private static string Shape(string text)
        {
            var output = new FastStringBuilder(RTLSupport.DefaultBufferSize);
            RTLSupport.FixRTL(text, output, farsi: false, fixTextTags: true, preserveNumbers: true);
            return output.ToString();
        }

        private static IEnumerable<int> CodePoints(string s)
        {
            for (var i = 0; i < s.Length; i++)
            {
                if (char.IsHighSurrogate(s[i]) && i + 1 < s.Length) { yield return char.ConvertToUtf32(s[i], s[i + 1]); i++; }
                else yield return s[i];
            }
        }
    }
}

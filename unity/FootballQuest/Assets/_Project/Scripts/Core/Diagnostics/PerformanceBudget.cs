using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using FootballQuest.Core.Onboarding;

namespace FootballQuest.Core.Diagnostics
{
    /// <summary>
    /// ميزانية الأداء (ARCHITECTURE §2.2) ومعيار قبول AT-09. التطبيق يكتب سطور سجل ثابتة الصيغة
    /// (`FQ-BOOT` و`FQ-PERF`)، وسكربت tools/perf/at09-android.sh يقرأها من logcat ويحكم بنفس القواعد.
    /// </summary>
    public static class PerformanceBudget
    {
        public const double ColdStartMs = 5000;
        public const int ColdStartRuns = 10;
        public const int ColdStartPassesRequired = 9;
        public const double MinFps = 30;
        public const double MaxMemoryMb = 600;
        public const double MaxDownloadMb = 150;

        /// <summary>أول شاشة تفاعلية: أي خطوة فيها أزرار (مو شاشة التحميل أو الإرسال).</summary>
        public static bool IsInteractive(OnboardingStep step) =>
            step != OnboardingStep.Starting && step != OnboardingStep.Submitting;

        /// <summary>AT-09: الإقلاع البارد &lt; 5 ث في 9 من 10 تشغيلات.</summary>
        public static bool ColdStartPasses(IReadOnlyCollection<double> runsMs)
        {
            if (runsMs == null || runsMs.Count < ColdStartRuns) return false;
            return runsMs.Count(ms => ms < ColdStartMs) * ColdStartRuns >= ColdStartPassesRequired * runsMs.Count;
        }

        public static string BootLine(double interactiveMs, string firstScreen) =>
            string.Format(CultureInfo.InvariantCulture, "FQ-BOOT interactive_ms={0:0} screen={1}", interactiveMs, firstScreen);

        public static string PerfLine(string scene, double avgFps, double memoryMb) =>
            string.Format(CultureInfo.InvariantCulture, "FQ-PERF scene={0} fps={1:0.0} mem_mb={2:0}", scene, avgFps, memoryMb);

        private static readonly Regex BootPattern = new Regex(@"FQ-BOOT interactive_ms=(\d+)", RegexOptions.CultureInvariant);

        /// <summary>يقرأ زمن الإقلاع من سطر سجل (لاختبار الصيغة اللي يعتمد عليها السكربت).</summary>
        public static double? ParseBoot(string line)
        {
            var m = BootPattern.Match(line ?? string.Empty);
            return m.Success ? double.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture) : (double?)null;
        }
    }

    /// <summary>متوسط الإطارات في نافذة زمنية (دقيقة في AT-09). بدون UnityEngine عشان يُختبر.</summary>
    public sealed class FrameWindow
    {
        private readonly double windowSeconds;
        private double elapsed;
        private int frames;

        public FrameWindow(double windowSeconds = 60) => this.windowSeconds = windowSeconds;

        /// <summary>يضيف إطارًا. يرجع متوسط الإطارات لما تكتمل النافذة، وإلا null.</summary>
        public double? Add(double deltaSeconds)
        {
            if (deltaSeconds <= 0) return null;
            elapsed += deltaSeconds;
            frames++;
            if (elapsed < windowSeconds) return null;
            var fps = frames / elapsed;
            Reset();
            return fps;
        }

        public void Reset()
        {
            elapsed = 0;
            frames = 0;
        }
    }
}

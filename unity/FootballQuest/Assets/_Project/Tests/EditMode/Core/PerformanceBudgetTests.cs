using System.Linq;
using FootballQuest.Core.Diagnostics;
using FootballQuest.Core.Onboarding;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class PerformanceBudgetTests
    {
        [Test]
        public void ColdStartNeedsNineOfTenUnderFiveSeconds()
        {
            var nine = Enumerable.Repeat(3200.0, 9).Append(6100).ToList();
            var eight = Enumerable.Repeat(3200.0, 8).Concat(new[] { 5000.0, 6100 }).ToList();
            Assert.That(PerformanceBudget.ColdStartPasses(nine), Is.True);
            Assert.That(PerformanceBudget.ColdStartPasses(eight), Is.False, "5000 ms is not < 5 s");
            Assert.That(PerformanceBudget.ColdStartPasses(nine.Take(9).ToList()), Is.False, "AT-09 needs 10 runs");
        }

        [Test]
        public void BootLineRoundTripsForTheHarness()
        {
            var line = PerformanceBudget.BootLine(3456.7, "Disclaimer");
            Assert.That(line, Is.EqualTo("FQ-BOOT interactive_ms=3457 screen=Disclaimer"));
            Assert.That(PerformanceBudget.ParseBoot("I/Unity (123): " + line), Is.EqualTo(3457));
            Assert.That(PerformanceBudget.ParseBoot("unrelated"), Is.Null);
            Assert.That(PerformanceBudget.PerfLine("Hub", 31.25, 412.4), Is.EqualTo("FQ-PERF scene=Hub fps=31.3 mem_mb=412"));
        }

        [Test]
        public void LoadingStepsAreNotInteractive()
        {
            Assert.That(PerformanceBudget.IsInteractive(OnboardingStep.Starting), Is.False);
            Assert.That(PerformanceBudget.IsInteractive(OnboardingStep.Submitting), Is.False);
            Assert.That(PerformanceBudget.IsInteractive(OnboardingStep.Disclaimer), Is.True);
            Assert.That(PerformanceBudget.IsInteractive(OnboardingStep.Ready), Is.True);
        }

        [Test]
        public void FrameWindowAveragesOverTheWindow()
        {
            var window = new FrameWindow(1);
            double? fps = null;
            for (var i = 0; i < 30 && fps == null; i++) fps = window.Add(1 / 30.0 + 1e-9);
            Assert.That(fps, Is.EqualTo(30).Within(0.01));
            Assert.That(window.Add(0), Is.Null);
            Assert.That(window.Add(0.5), Is.Null, "window restarts after reporting");
        }
    }
}

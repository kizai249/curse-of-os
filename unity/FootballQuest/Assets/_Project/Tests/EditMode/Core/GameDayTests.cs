using System;
using System.Globalization;
using System.Linq;
using FootballQuest.Core;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class GameDayTests
    {
        [Test]
        public void SharedVectorsAreLoaded()
        {
            Assert.That(SharedVectors.GameDay().Count(), Is.GreaterThanOrEqualTo(7));
        }

        [Test]
        public void MatchesSharedVectors()
        {
            foreach (var v in SharedVectors.GameDay())
            {
                var instant = DateTimeOffset.Parse(v.Instant, CultureInfo.InvariantCulture);
                Assert.That(GameDay.IdFor(instant), Is.EqualTo(v.Day), "day for " + v.Instant);

                var expectedNext = DateTimeOffset.Parse(v.NextRollover, CultureInfo.InvariantCulture);
                Assert.That(GameDay.NextRollover(instant), Is.EqualTo(expectedNext), "next rollover for " + v.Instant);
            }
        }

        [Test]
        public void NextRolloverStartsANewDay()
        {
            var instant = new DateTimeOffset(2027, 1, 15, 18, 20, 0, TimeSpan.Zero);
            var next = GameDay.NextRollover(instant);
            Assert.That(GameDay.IdFor(next), Is.Not.EqualTo(GameDay.IdFor(instant)));
            Assert.That(GameDay.IdFor(next.AddTicks(-1)), Is.EqualTo(GameDay.IdFor(instant)));
        }
    }
}

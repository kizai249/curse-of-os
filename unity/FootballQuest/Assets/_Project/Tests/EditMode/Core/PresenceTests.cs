using System;
using System.IO;
using System.Linq;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Location;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class PresenceTests
    {
        private static object Result(string sample) => JsonFields.Obj(MiniJson.Parse(SharedVectors.Sample(sample)), "result");
        private static string Name(string id) => id == "STD_RUH_KFS" ? "ستاد مدينة الملك فهد الرياضية" : id;

        [Test]
        public void ClientAccuracyLimitMatchesSharedVectors()
        {
            var shared = MiniJson.Parse(File.ReadAllText(Path.Combine(SharedVectors.ContractsDir(), "presence.vectors.json")));
            Assert.That(PresencePolicy.MaxAccuracyM, Is.EqualTo(JsonFields.Int(shared, "maxAccuracyM")));
        }

        [Test]
        public void ParsesNativeReadings()
        {
            var ok = LocationReading.Parse("{\"status\":\"ok\",\"lat\":21.5512345,\"lng\":39.1712345,\"accuracyM\":12.5,\"isMock\":false}");
            Assert.That(ok.Status, Is.EqualTo(ReadingStatus.Ok));
            Assert.That(ok.Lat, Is.EqualTo(21.5512345).Within(1e-9));
            Assert.That(ok.AccuracyM, Is.EqualTo(12.5));
            Assert.That(LocationReading.Parse("{\"status\":\"timeout\"}").Status, Is.EqualTo(ReadingStatus.Timeout));
            Assert.That(LocationReading.Parse("not json").Status, Is.EqualTo(ReadingStatus.Error));
        }

        [Test]
        public void WeakOrMissingReadingsNeverReachTheServer()
        {
            var weak = new LocationReading { Status = ReadingStatus.Ok, Lat = 21.5, Lng = 39.1, AccuracyM = 180 };
            Assert.That(PresencePolicy.LocalCheck(weak, PresenceTrigger.Manual).StateId, Is.EqualTo(StateCatalog.LocWeak));
            Assert.That(PresencePolicy.LocalCheck(weak, PresenceTrigger.AppOpen).StateId, Is.Null, "automatic checks stay silent");
            var timeout = new LocationReading { Status = ReadingStatus.Timeout };
            Assert.That(PresencePolicy.LocalCheck(timeout, PresenceTrigger.Manual).StateId, Is.EqualTo(StateCatalog.LocTimeout));
            var good = new LocationReading { Status = ReadingStatus.Ok, Lat = 21.5, Lng = 39.1, AccuracyM = 100 };
            Assert.That(PresencePolicy.LocalCheck(good, PresenceTrigger.Manual), Is.Null, "≤ 100 m goes to the server");
        }

        [Test]
        public void FeedbackForRewardsAndBranchCard()
        {
            var result = PresenceApi.Parse(Result("verifyPresence.ok"));
            Assert.That(result.Status, Is.EqualTo("ok"));
            Assert.That(result.Branches[0].ActiveCampaigns, Is.EqualTo(2));
            var feedback = PresencePolicy.Feedback(result, PresenceTrigger.AppOpen, Name, Language.Arabic);
            Assert.That(feedback.Select(f => f.StateId), Is.EqualTo(new[] { StateCatalog.ZoneStadiumOk, StateCatalog.ZoneBranchNearby }));
            Assert.That(feedback[0].Values["stadium"], Is.EqualTo("ستاد مدينة الملك فهد الرياضية"));
            Assert.That(feedback[1].Values["branch"], Is.EqualTo("هاف مليون — فرع التحلية"));
            Assert.That(feedback[1].Values["count"], Is.EqualTo("2"));
            Assert.That(feedback[1].BranchId, Is.EqualTo("br_hm_jed_tahlia"));
        }

        [Test]
        public void ManualChecksExplainNegativeOutcomesAutomaticOnesStaySilent()
        {
            var empty = new PresenceResult { Status = "ok" };
            Assert.That(PresencePolicy.Feedback(empty, PresenceTrigger.Manual, Name, Language.Arabic).Single().StateId, Is.EqualTo(StateCatalog.LocOutOfZone));
            Assert.That(PresencePolicy.Feedback(empty, PresenceTrigger.Resume, Name, Language.Arabic), Is.Empty);

            var mock = new PresenceResult { Status = "unverifiable" };
            Assert.That(PresencePolicy.Feedback(mock, PresenceTrigger.Manual, Name, Language.Arabic).Single().StateId, Is.EqualTo(StateCatalog.LocMock));
            Assert.That(PresencePolicy.Feedback(mock, PresenceTrigger.AppOpen, Name, Language.Arabic), Is.Empty);

            var done = new PresenceResult { Status = "ok" };
            done.Stadiums.Add(new StadiumHit { StadiumId = "STD_RUH_KFS", Rewarded = false });
            Assert.That(PresencePolicy.Feedback(done, PresenceTrigger.Manual, Name, Language.Arabic).Single().StateId, Is.EqualTo(StateCatalog.ZoneStadiumDone));
            Assert.That(PresencePolicy.Feedback(done, PresenceTrigger.AppOpen, Name, Language.Arabic), Is.Empty);
        }

        [Test]
        public void AutomaticChecksAreThrottled()
        {
            var now = new DateTimeOffset(2027, 1, 10, 12, 0, 0, TimeSpan.Zero);
            Assert.That(PresencePolicy.ShouldAutoCheck(null, now), Is.True);
            Assert.That(PresencePolicy.ShouldAutoCheck(now.AddSeconds(-30), now), Is.False);
            Assert.That(PresencePolicy.ShouldAutoCheck(now.AddMinutes(-2), now), Is.True);
        }
    }
}

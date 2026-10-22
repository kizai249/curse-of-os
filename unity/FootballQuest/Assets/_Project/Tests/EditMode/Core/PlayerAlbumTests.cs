using System.Collections.Generic;
using System.IO;
using System.Linq;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Collection;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class PlayerAlbumTests
    {
        private static List<PlayerCharacter> Characters() =>
            PlayerCharacter.ParseContent(MiniJson.Parse(File.ReadAllText(Path.Combine(SharedVectors.ContractsDir(), "content", "players.json"))));

        [Test]
        public void ParsesTheThirtyCharactersOfTheSharedContent()
        {
            var all = Characters();
            Assert.That(all, Has.Count.EqualTo(30));
            Assert.That(all.All(c => c.Stats.Count == 5 && c.Stats.Values.All(v => v >= 40 && v <= 90)), Is.True);
            Assert.That(all.Count(c => c.Rarity == "legendary"), Is.EqualTo(2));
        }

        [Test]
        public void OrdersByPositionThenRarityAndCountsOwned()
        {
            var owned = PlayerAlbum.ParseOwned(new List<object>
            {
                new Dictionary<string, object> { { "playerId", "p01" }, { "count", 2.0 } },
                new Dictionary<string, object> { { "playerId", "p30" }, { "count", 1.0 } },
                new Dictionary<string, object> { { "count", 1.0 } },
            });
            var album = new PlayerAlbum(Characters(), owned);
            Assert.That(album.Total, Is.EqualTo(30));
            Assert.That(album.OwnedCount, Is.EqualTo(2));
            Assert.That(album.Entries.Select(e => e.Character.Position).Distinct(), Is.EqualTo(PlayerAlbum.PositionOrder));
            var gk = album.Entries.Where(e => e.Character.Position == "GK").Select(e => e.Character.Rarity).ToList();
            Assert.That(gk.First(), Is.EqualTo("epic"), "highest rarity first within a position");
            Assert.That(album.Entries.Single(e => e.Character.Id == "p01").Count, Is.EqualTo(2));

            album.Add("p05");
            Assert.That(album.OwnedCount, Is.EqualTo(3));
        }
    }
}

namespace FootballQuest.Tests.Core
{
    public class StreakTests
    {
        [Test]
        public void ParsesTheStreakOfTheScanSample()
        {
            var scan = FootballQuest.Core.Coupons.ScanResult.Parse(JsonFields.Obj(MiniJson.Parse(SharedVectors.Sample("scanBranchCode.verified")), "result"));
            Assert.That(scan.Streak.Count, Is.EqualTo(1));
            Assert.That(scan.Streak.HasReward, Is.False);
            Assert.That(scan.Streak.Lines("نص مليون", FootballQuest.Core.Ui.Language.Arabic), Is.EqualTo(new[] { "سلسلة نص مليون: 1 يوم ورا بعض" }));
        }

        [Test]
        public void DayFiveAndSevenRewardLines()
        {
            var day5 = FootballQuest.Core.Coupons.StreakInfo.Parse(MiniJson.Parse(
                "{\"brandId\":\"b\",\"count\":5,\"reward\":{\"day\":5,\"packs\":0,\"epicPacks\":0,\"playerCardId\":\"p12\",\"playerCardName\":{\"ar\":\"صخرة الوادي\",\"en\":\"Valley Rock\"},\"couponIssued\":false}}"));
            Assert.That(day5.Lines("B", FootballQuest.Core.Ui.Language.English), Is.EqualTo(new[] { "B streak: 5 days in a row", "New player card: Valley Rock" }));
            var day3 = FootballQuest.Core.Coupons.StreakInfo.Parse(MiniJson.Parse("{\"brandId\":\"b\",\"count\":3,\"reward\":{\"day\":3,\"packs\":2,\"epicPacks\":0,\"playerCardId\":null,\"playerCardName\":null,\"couponIssued\":false}}"));
            Assert.That(day3.Lines("ب", FootballQuest.Core.Ui.Language.Arabic)[1], Is.EqualTo("مكافأة السلسلة: +2 حزمة منتخب"));
            var day7 = FootballQuest.Core.Coupons.StreakInfo.Parse(MiniJson.Parse("{\"brandId\":\"b\",\"count\":7,\"reward\":{\"day\":7,\"packs\":0,\"epicPacks\":1,\"playerCardId\":null,\"playerCardName\":null,\"couponIssued\":true}}"));
            Assert.That(day7.CouponIssued, Is.True);
            Assert.That(day7.Lines("B", FootballQuest.Core.Ui.Language.English)[1], Is.EqualTo("+1 guaranteed Epic pack"));
        }
    }
}

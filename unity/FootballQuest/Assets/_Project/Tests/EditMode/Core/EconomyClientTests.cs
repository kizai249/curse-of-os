using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Economy;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class EconomyClientTests
    {
        private static object Result(string sample) => JsonFields.Obj(MiniJson.Parse(SharedVectors.Sample(sample)), "result");

        [Test]
        public void ParsesOpenPackSample()
        {
            var r = EconomyApi.ParseCard(Result("openPack.ok"));
            Assert.That(r.Card.TeamCode, Is.EqualTo("KSA"));
            Assert.That(r.Card.Variant, Is.EqualTo("rare"));
            Assert.That(r.Card.NewTeam, Is.True);
            Assert.That(r.Achievements[0].Id, Is.EqualTo("teams_6"));
            Assert.That(r.Achievements[0].Packs, Is.EqualTo(2));
            Assert.That(r.Balances.Packs, Is.EqualTo(2));
            Assert.That(r.Balances.PityCount, Is.EqualTo(1));
        }

        [Test]
        public void ParsesStadiumVisitSample()
        {
            var r = EconomyApi.ParseVisit(Result("stadiumVisit.ok"));
            Assert.That(r.AlreadyVisited, Is.False);
            Assert.That(r.XpGained, Is.EqualTo(5));
            Assert.That(r.VisitedToday, Is.EqualTo(new[] { "STD_RUH_KFS" }));
            Assert.That(r.Balances.Xp, Is.EqualTo(15));
        }

        [Test]
        public void ParsesBootstrapBalancesAndDailyLogin()
        {
            var r = AccountApi.ParseBootstrap(Result("bootstrap.ok"));
            Assert.That(r.DailyLogin.Granted, Is.True);
            Assert.That(r.DailyLogin.Packs, Is.EqualTo(1));
            Assert.That(r.Profile.Balances.EpicPacks, Is.EqualTo(1));
            Assert.That(r.Profile.Balances.TotalPacks, Is.EqualTo(3));
            Assert.That(r.Profile.OwnedTeams, Is.EqualTo(new[] { "JPN", "KSA" }));
            Assert.That(r.Profile.VisitedToday, Is.EqualTo(new[] { "STD_JED_KAS" }));
            Assert.That(r.Profile.Badges, Does.Contain("asia_collector"));
        }

        [Test]
        public void OldProfilesWithoutBalancesStillParse()
        {
            var r = AccountApi.ParseSetAgeAndCity(Result("setAgeAndCity.ok"));
            Assert.That(r.Profile.Balances.Level, Is.EqualTo(1));
            Assert.That(r.Profile.OwnedTeams, Is.Empty);
        }
    }
}

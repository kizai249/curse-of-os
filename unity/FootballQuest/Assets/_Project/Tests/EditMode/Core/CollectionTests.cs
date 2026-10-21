using System.IO;
using System.Linq;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Collection;
using FootballQuest.Core.Content;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class CollectionTests
    {
        [Test]
        public void ClientRulesMatchSharedEconomyContract()
        {
            var shared = MiniJson.Parse(File.ReadAllText(Path.Combine(SharedVectors.ContractsDir(), "economy.json")));
            foreach (var v in EconomyRules.Variants)
            {
                Assert.That(EconomyRules.PackOdds[v], Is.EqualTo(JsonFields.Int(JsonFields.Obj(shared, "packOdds"), v)), v);
                Assert.That(EconomyRules.DuplicateFp[v], Is.EqualTo(JsonFields.Int(JsonFields.Obj(shared, "duplicateFp"), v)), v);
            }
            var exchange = JsonFields.Obj(shared, "exchangeCost");
            Assert.That(EconomyRules.ExchangeCost.Keys, Is.EquivalentTo(exchange.Keys));
            foreach (var kv in EconomyRules.ExchangeCost) Assert.That(kv.Value, Is.EqualTo(JsonFields.Int(exchange, kv.Key)));
            Assert.That(EconomyRules.PityThreshold, Is.EqualTo(JsonFields.Int(shared, "pityThreshold")));
            Assert.That(EconomyRules.MatchdayWeight, Is.EqualTo(JsonFields.Int(shared, "matchdayWeight")));
            Assert.That(EconomyRules.MaxLevel, Is.EqualTo(JsonFields.Int(shared, "maxLevel")));
            Assert.That(EconomyRules.DailyXpCap, Is.EqualTo(JsonFields.Int(shared, "dailyXpCap")));
            Assert.That(EconomyRules.DailyLoginXp, Is.EqualTo(JsonFields.Int(JsonFields.Obj(shared, "dailyLogin"), "xp")));
            Assert.That(EconomyRules.DailyLoginPacks, Is.EqualTo(JsonFields.Int(JsonFields.Obj(shared, "dailyLogin"), "packs")));
            Assert.That(EconomyRules.DigitalVisitXp, Is.EqualTo(JsonFields.Int(shared, "digitalVisitXp")));
            Assert.That(EconomyRules.XpForLevel(3), Is.EqualTo(300));
        }

        [Test]
        public void AlbumHas96SlotsAndTracksOwnership()
        {
            var cards = Album.ParseCards(new object[]
            {
                MiniJson.Parse("{\"teamCode\":\"KSA\",\"variant\":\"common\",\"count\":3}"),
                MiniJson.Parse("{\"teamCode\":\"KSA\",\"variant\":\"legendary\",\"count\":1}"),
                MiniJson.Parse("{\"teamCode\":\"JPN\",\"variant\":\"rare\"}"),
                MiniJson.Parse("{\"teamCode\":\"JPN\",\"variant\":\"mythic\"}"),
            });
            Assert.That(cards.Count, Is.EqualTo(3), "unknown variants are ignored");

            var album = new Album(EmbeddedContent.Teams(), cards);
            Assert.That(album.Rows.Count, Is.EqualTo(24));
            Assert.That(album.TotalVariants, Is.EqualTo(96));
            Assert.That(album.OwnedTeams, Is.EqualTo(2));
            Assert.That(album.OwnedVariants, Is.EqualTo(3));
            Assert.That(album.Slot("KSA", "common").Count, Is.EqualTo(3));
            Assert.That(album.Rows[0].Slots.Select(s => s.Variant), Is.EqualTo(EconomyRules.Variants));

            album.Apply(new CardGain { TeamCode = "IRQ", Variant = "epic" });
            Assert.That(album.OwnedTeams, Is.EqualTo(3));
            Assert.That(album.Slot("IRQ", "epic").Owned, Is.True);
        }

        [Test]
        public void ExchangeEligibility()
        {
            var album = new Album(EmbeddedContent.Teams(), new[] { new OwnedCard { TeamCode = "KSA", Variant = "common", Count = 1 } });
            Assert.That(Exchange.Check(album.Slot("KSA", "common"), 1000), Is.EqualTo(ExchangeBlock.AlreadyOwned));
            Assert.That(Exchange.Check(album.Slot("KSA", "rare"), 299), Is.EqualTo(ExchangeBlock.NotEnoughFanPoints));
            Assert.That(Exchange.Check(album.Slot("KSA", "rare"), 300), Is.EqualTo(ExchangeBlock.None));
            Assert.That(Exchange.Check(album.Slot("JPN", "epic"), 9999), Is.EqualTo(ExchangeBlock.NotExchangeable));
            Assert.That(Exchange.Check(album.Slot("JPN", "legendary"), 9999), Is.EqualTo(ExchangeBlock.NotExchangeable));
            Assert.That(Exchange.Cost("common"), Is.EqualTo(100));
        }

        [Test]
        public void OddsDisclosureUsesValidRemoteValuesOnly()
        {
            Assert.That(OddsDisclosure.Resolve(null)["common"], Is.EqualTo(70));
            Assert.That(OddsDisclosure.Resolve("{\"common\":70,\"rare\":22,\"epic\":7,\"legendary\":1}")["legendary"], Is.EqualTo(1));
            Assert.That(OddsDisclosure.Resolve("{\"common\":90,\"rare\":22,\"epic\":7,\"legendary\":1}")["common"], Is.EqualTo(70), "sum ≠ 100");
            Assert.That(OddsDisclosure.Resolve("{\"common\":99,\"rare\":1}")["epic"], Is.EqualTo(7), "missing rarity");
            Assert.That(OddsDisclosure.Resolve("garbage")["rare"], Is.EqualTo(22));

            var ar = OddsDisclosure.Text(EconomyRules.PackOdds, Language.Arabic);
            Assert.That(ar, Does.Contain("شائعة (الأساسية): 70%"));
            Assert.That(ar, Does.Contain("أسطورية (الذهبية): 1%"));
            Assert.That(ar, Does.Contain("14"));
            var en = OddsDisclosure.Text(EconomyRules.PackOdds, Language.English);
            Assert.That(en, Does.Contain("Epic (The Stands): 7%"));
        }

        [Test]
        public void RemoteConfigDefaultOddsMatchTheRules()
        {
            var odds = OddsDisclosure.Resolve(RemoteConfigKeys.Defaults[RemoteConfigKeys.PackOdds]);
            foreach (var v in EconomyRules.Variants) Assert.That(odds[v], Is.EqualTo(EconomyRules.PackOdds[v]));
        }
    }
}

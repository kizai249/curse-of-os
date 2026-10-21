using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FootballQuest.Core;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Content;
using FootballQuest.Core.Map;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class ContentTests
    {
        private static object SharedContent(string name) =>
            MiniJson.Parse(File.ReadAllText(Path.Combine(SharedVectors.ContractsDir(), "content", name + ".json")));

        [Test]
        public void EmbeddedContentMatchesSharedJson()
        {
            var teams = ContentParser.Teams(SharedContent("teams"));
            var embedded = EmbeddedContent.Teams();
            Assert.That(teams.Count, Is.EqualTo(24));
            Assert.That(embedded.Select(t => t.Code + t.NameAr + t.NameEn + t.Host), Is.EqualTo(teams.Select(t => t.Code + t.NameAr + t.NameEn + t.Host)));
            Assert.That(teams.Select(t => t.Code), Is.EqualTo(TeamCodes.All), "same order as DATA_CONTRACTS §0");

            var stadiums = ContentParser.Stadiums(SharedContent("stadiums"));
            Assert.That(EmbeddedContent.Stadiums().Select(s => s.Id + s.City + s.NameAr + s.NameEn + s.RadiusM),
                Is.EqualTo(stadiums.Select(s => s.Id + s.City + s.NameAr + s.NameEn + s.RadiusM)));
        }

        [Test]
        public void StadiumRadiiFollowGameRules()
        {
            var radius = EmbeddedContent.Stadiums().ToDictionary(s => s.Id, s => s.RadiusM);
            Assert.That(radius["STD_RUH_KFS"], Is.EqualTo(2000));
            Assert.That(radius["STD_RUH_SHB"], Is.EqualTo(1000));
            Assert.That(radius.Values.All(r => r >= 1000 && r <= 2000), Is.True, "stadium zones are 1–2 km");
        }

        [Test]
        public void ParsesScheduleSample()
        {
            var matches = ContentParser.Matches(MiniJson.Parse(SharedVectors.Sample("content.schedule")));
            Assert.That(matches.Count, Is.EqualTo(2));
            Assert.That(matches[0].Home, Is.EqualTo("KSA"));
            Assert.That(matches[0].StadiumId, Is.EqualTo("STD_RUH_KFS"));
            Assert.That(matches[0].Finished, Is.False);
            Assert.That(matches[1].StadiumId, Is.Null);
        }

        [Test]
        public void DecodesFirestoreRestDocuments()
        {
            var rest = MiniJson.Parse(
                "{\"name\":\"projects/demo-fq/databases/(default)/documents/content/schedule\",\"fields\":{" +
                "\"matches\":{\"arrayValue\":{\"values\":[{\"mapValue\":{\"fields\":{" +
                "\"matchId\":{\"stringValue\":\"m02\"},\"matchNo\":{\"integerValue\":\"2\"},\"day\":{\"stringValue\":\"2027-01-08\"}," +
                "\"stadiumId\":{\"stringValue\":\"STD_JED_KAS\"},\"home\":{\"stringValue\":\"JPN\"},\"away\":{\"stringValue\":\"IRQ\"}," +
                "\"status\":{\"stringValue\":\"finished\"},\"group\":{\"nullValue\":null}," +
                "\"score\":{\"mapValue\":{\"fields\":{\"home\":{\"integerValue\":\"1\"},\"away\":{\"integerValue\":\"3\"}}}}}}}]}}," +
                "\"updatedAt\":{\"timestampValue\":\"2027-01-08T20:00:00Z\"},\"empty\":{\"arrayValue\":{}}}}");
            var doc = FirestoreRest.DecodeDocument(rest);
            Assert.That(doc["updatedAt"], Is.EqualTo("2027-01-08T20:00:00Z"));
            Assert.That(doc["empty"], Is.Empty);
            var m = ContentParser.Matches(doc).Single();
            Assert.That(m.MatchNo, Is.EqualTo(2));
            Assert.That(m.Group, Is.Null);
            Assert.That(m.Finished, Is.True);
            Assert.That((m.HomeScore, m.AwayScore), Is.EqualTo(((int?)1, (int?)3)));
        }

        [Test]
        public async Task RepositoryCachesAndFallsBackOffline()
        {
            var now = new DateTimeOffset(2027, 1, 7, 12, 0, 0, TimeSpan.Zero);
            var source = new FakeSource();
            source.Docs[ContentRepository.TeamsPath] = SharedContent("teams");
            source.Docs[ContentRepository.StadiumsPath] = SharedContent("stadiums");
            source.Docs[ContentRepository.SchedulePath] = MiniJson.Parse(SharedVectors.Sample("content.schedule"));
            var cache = new MemoryCache();
            var repo = new ContentRepository(source, cache, () => now);

            var first = await repo.LoadAsync();
            Assert.That(first.Matches.Count, Is.EqualTo(2));
            Assert.That(source.Reads, Is.EqualTo(3));

            await repo.LoadAsync();
            Assert.That(source.Reads, Is.EqualTo(3), "all fresh in cache");

            now = now.AddMinutes(16);
            await repo.LoadAsync();
            Assert.That(source.Reads, Is.EqualTo(4), "only the schedule (15 min TTL) is refetched");

            now = now.AddHours(25);
            source.Offline = true;
            var offline = await repo.LoadAsync();
            Assert.That(offline.Teams.Count, Is.EqualTo(24));
            Assert.That(offline.Matches.Count, Is.EqualTo(2), "stale cache beats nothing");
        }

        [Test]
        public async Task FirstRunOfflineUsesEmbeddedCatalog()
        {
            var repo = new ContentRepository(new FakeSource { Offline = true }, new MemoryCache());
            var content = await repo.LoadAsync();
            Assert.That(content.Teams.Count, Is.EqualTo(24));
            Assert.That(content.Stadiums.Count, Is.EqualTo(8));
            Assert.That(content.Matches, Is.Empty);
        }

        [Test]
        public void StationScheduleShowsTodayAndPastResultsHereOnly()
        {
            var matches = new List<MatchInfo>
            {
                new MatchInfo { MatchId = "a", MatchNo = 1, Day = "2027-01-07", StadiumId = "STD_RUH_KFS", Home = "KSA", Away = "PLE", Finished = true, HomeScore = 2, AwayScore = 0 },
                new MatchInfo { MatchId = "b", MatchNo = 9, Day = "2027-01-10", StadiumId = "STD_RUH_KFS", Home = "KSA", Away = "JPN" },
                new MatchInfo { MatchId = "c", MatchNo = 8, Day = "2027-01-10", StadiumId = "STD_JED_KAS", Home = "QAT", Away = "IRN" },
                new MatchInfo { MatchId = "d", MatchNo = 40, Day = "2027-01-10", StadiumId = null, Home = "1A", Away = "3C" },
            };
            var schedule = StationSchedule.For("STD_RUH_KFS", "2027-01-10", matches);
            Assert.That(schedule.Today.Select(m => m.MatchId), Is.EqualTo(new[] { "b" }));
            Assert.That(schedule.Results.Select(m => m.MatchId), Is.EqualTo(new[] { "a" }));

            var content = new ContentSnapshot { Teams = EmbeddedContent.Teams() };
            Assert.That(StationSchedule.Line(matches[0], content, Language.Arabic), Is.EqualTo("السعودية 2 – 0 فلسطين"));
            Assert.That(StationSchedule.Line(matches[3], content, Language.English), Is.EqualTo("1A × 3C"));
        }

        private sealed class FakeSource : IContentSource
        {
            public readonly Dictionary<string, object> Docs = new Dictionary<string, object>();
            public bool Offline;
            public int Reads;

            public Task<object> GetDocumentAsync(string path)
            {
                if (Offline) return Task.FromException<object>(BackendException.Network("offline"));
                Reads++;
                return Task.FromResult(Docs.TryGetValue(path, out var d) ? d : null);
            }
        }

        private sealed class MemoryCache : IContentCache
        {
            private readonly Dictionary<string, (string, DateTimeOffset)> items = new Dictionary<string, (string, DateTimeOffset)>();

            public bool TryRead(string key, out string json, out DateTimeOffset savedAt)
            {
                var ok = items.TryGetValue(key, out var item);
                json = item.Item1;
                savedAt = item.Item2;
                return ok;
            }

            public void Write(string key, string json, DateTimeOffset savedAt) => items[key] = (json, savedAt);
        }
    }
}

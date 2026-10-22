using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Coop;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class CoopTests
    {
        private static object Sample(string name) => MiniJson.Parse(SharedVectors.Sample(name));
        private static object Result(string name) => JsonFields.Obj(Sample(name), "result");

        [Test]
        public void ParsesTheSharedRoomAndView()
        {
            var room = RoomState.Parse("room_x", Sample("room.playing"));
            Assert.That(room.IsPlaying, Is.True);
            Assert.That(room.ActiveMembers.Select(m => m.Alias), Is.EqualTo(new[] { "صقر_جدة_27", "نجم_جدة_14" }));
            Assert.That(room.Placements["s1"], Is.EqualTo("p02"));
            Assert.That(room.SlotOf("p02"), Is.EqualTo("s1"));
            Assert.That(room.Piece("p02").Name.Ar, Is.EqualTo("قفاز الرمال"));
            Assert.That((room.LastCheckCorrect, room.LastCheckTotal, room.PenaltySec), Is.EqualTo((5, 6, 15)));
            Assert.That(room.EndsAt, Is.EqualTo(DateTimeOffset.Parse("2027-01-15T18:22:52Z")));
            Assert.That(room.AllPlaced, Is.True);

            var view = RoomView.Parse(Sample("room.view"));
            Assert.That(view.Slots.Single().Requirement.Ar, Is.EqualTo("حارس: الذكاء 70 أو أكثر"));
            Assert.That(view.InfoCards.Single().Stats["def"], Is.EqualTo(80));
            Assert.That(view.Result, Is.Null);
            Assert.That(view.NotEligible, Is.Null);
        }

        [Test]
        public void ParsesStartAndWinningResponses()
        {
            var start = RoomSummary.Parse(Result("startRound.ok"));
            Assert.That((start.Status, start.CouponMode), Is.EqualTo(("playing", "with_coupons")));
            Assert.That(start.StartAt - start.ServerNow, Is.EqualTo(TimeSpan.FromSeconds(5)));
            Assert.That(start.Correct, Is.Null);

            var won = RoomSummary.Parse(Result("submitLineup.won"));
            Assert.That((won.Status, won.Correct, won.Total), Is.EqualTo(("won", (int?)8, (int?)8)));
            Assert.That(won.Result.Xp, Is.EqualTo(50));
            Assert.That(won.Result.PlayerCardId, Is.EqualTo("p12"));
            Assert.That(won.Result.PlayerCardName.Ar, Is.EqualTo("صخرة الوادي"));
            Assert.That(won.Codes.Manual, Is.EqualTo("K7MP3QXA"));
        }

        [Test]
        public void ClockCountsFromServerTime()
        {
            var clock = new RoundClock();
            var local = DateTimeOffset.Parse("2027-01-15T18:00:00Z");
            // ساعة الجهاز متأخرة دقيقتين عن الخادم.
            clock.Sync(local.AddMinutes(2), local);
            var endsAt = local.AddMinutes(2).AddSeconds(180);
            Assert.That(clock.SecondsUntil(endsAt, local), Is.EqualTo(180));
            Assert.That(clock.SecondsUntil(endsAt, local.AddSeconds(179.2)), Is.EqualTo(1));
            Assert.That(clock.SecondsUntil(endsAt, local.AddSeconds(200)), Is.EqualTo(0));
            Assert.That(RoundClock.Format(125), Is.EqualTo("2:05"));
        }

        [Test]
        public void NoticesForHostChangePlayerLeftAndWrongLineup()
        {
            var before = RoomState.Parse("r", Sample("room.playing"));
            var after = RoomState.Parse("r", Sample("room.playing"));
            after.Members[0].Active = false;
            after.HostUid = "u_19aa";
            after.LastCheckAt = before.LastCheckAt.Value.AddSeconds(20);
            after.LastCheckCorrect = 4;

            var notices = CoopRules.Notices(before, after);
            Assert.That(notices.Select(n => n.StateId), Is.EqualTo(new[] { StateCatalog.RoundPlayerLeft, StateCatalog.RoundHostChanged, StateCatalog.RoundWrong }));
            Assert.That(notices[0].Values["name"], Is.EqualTo("صقر_جدة_27"));
            Assert.That(notices[1].Values["name"], Is.EqualTo("نجم_جدة_14"));
            Assert.That(StateCatalog.Get(StateCatalog.RoundWrong).Format(Language.Arabic, notices[2].Values), Is.EqualTo("4 من 6 صحيحة — −15 ثانية."));
            Assert.That(CoopRules.Notices(before, before), Is.Empty);
            Assert.That(CoopRules.Notices(null, after), Is.Empty);
        }

        [Test]
        public void ChoicesAreSamePositionAndNotUsedElsewhere()
        {
            var room = RoomState.Parse("r", Sample("room.playing"));
            room.Slots.Add(new RoomSlot { SlotId = "s2", Position = "GK", OwnerUid = "u_19aa" });
            room.Pieces.Add(new RoomPiece { PlayerId = "p01", Position = "GK", Name = new FootballQuest.Core.Coupons.Localized() });
            room.Pieces.Add(new RoomPiece { PlayerId = "p20", Position = "MID", Name = new FootballQuest.Core.Coupons.Localized() });
            Assert.That(CoopRules.Choices(room, "s1").Select(p => p.PlayerId), Is.EquivalentTo(new[] { "p02", "p01" }));
            Assert.That(CoopRules.Choices(room, "s2").Select(p => p.PlayerId), Is.EquivalentTo(new[] { "p01" }));
            Assert.That(room.AllPlaced, Is.False);
        }

        [Test]
        public void CountdownAnnouncesCouponsAndPersonalEligibility()
        {
            Assert.That(CoopRules.CountdownStates("with_coupons", null), Is.EqualTo(new[] { StateCatalog.RoundWithCoupons }));
            Assert.That(CoopRules.CountdownStates("no_coupons", null), Is.EqualTo(new[] { StateCatalog.RoundNoCoupons }));
            Assert.That(CoopRules.CountdownStates("with_coupons", "campaign_limit"), Is.EqualTo(new[] { StateCatalog.RoundWithCoupons, StateCatalog.RoundUserNotEligible }));
            Assert.That(CoopRules.CountdownStates("no_campaign", "daily_cap"), Is.EqualTo(new[] { StateCatalog.RoundDailyCap }));
        }

        [Test]
        public async Task StartAndSubmitRetryWithTheSameRequestId()
        {
            var functions = new FlakyFunctions(Result("startRound.ok"));
            var api = new CoopApi(functions);
            var started = await api.StartAsync("room_x");
            Assert.That(started.Status, Is.EqualTo("playing"));
            Assert.That(functions.Calls, Has.Count.EqualTo(2));
            Assert.That(functions.Calls.Select(c => c.Name).Distinct(), Is.EqualTo(new[] { "startRound" }));
            Assert.That(functions.Calls.Select(c => (string)c.Data["requestId"]).Distinct().Count(), Is.EqualTo(1));

            await api.PlaceAsync("room_x", "s1", null);
            Assert.That(functions.Calls.Last().Data.ContainsKey("playerId") && functions.Calls.Last().Data["playerId"] == null, Is.True, "null lifts the piece");
        }

        private sealed class FlakyFunctions : IFunctionsClient
        {
            private readonly object response;
            private bool failed;
            public readonly List<(string Name, IDictionary<string, object> Data)> Calls = new List<(string, IDictionary<string, object>)>();

            public FlakyFunctions(object response)
            {
                this.response = response;
            }

            public Task<object> CallAsync(string name, IDictionary<string, object> data)
            {
                Calls.Add((name, data));
                if (!failed)
                {
                    failed = true;
                    throw new BackendException("UNAVAILABLE", "SRV_BUSY");
                }
                return Task.FromResult(response);
            }
        }
    }
}

namespace FootballQuest.Tests.Core
{
    public class CoopContentTests
    {
        [Test]
        public void LabelsMatchThePlayersContent()
        {
            var content = MiniJson.Parse(System.IO.File.ReadAllText(System.IO.Path.Combine(SharedVectors.ContractsDir(), "content", "players.json")));
            foreach (var key in RoomView.StatKeys)
            {
                var stat = JsonFields.Obj(JsonFields.Obj(content, "stats"), key);
                Assert.That(CoopText.Stat(key, Language.Arabic), Is.EqualTo(JsonFields.Str(stat, "ar")));
                Assert.That(CoopText.Stat(key, Language.English), Is.EqualTo(JsonFields.Str(stat, "en")));
            }
            foreach (var pos in new[] { "GK", "DEF", "MID", "FWD" })
            {
                var p = JsonFields.Obj(JsonFields.Obj(content, "positions"), pos);
                Assert.That(CoopText.Position(pos, Language.Arabic), Is.EqualTo(JsonFields.Str(p, "ar")));
                Assert.That(CoopText.Position(pos, Language.English), Is.EqualTo(JsonFields.Str(p, "en")));
            }
        }

        [Test]
        public void CheckInIsRememberedForTheGameDayOnly()
        {
            var store = new MemoryStore();
            var memory = new CheckInMemory(store);
            var at = DateTimeOffset.Parse("2027-01-15T18:00:00+03:00");
            Assert.That(memory.Today(at), Is.Null);
            memory.Remember("br_a", new FootballQuest.Core.Coupons.Localized { Ar = "فرع التحلية|جدة", En = "Tahlia" }, at);
            var today = memory.Today(at.AddHours(9)).Value; // 03:00 الفجر: نفس يوم اللعبة.
            Assert.That(today.BranchId, Is.EqualTo("br_a"));
            Assert.That(today.Name.Ar, Is.EqualTo("فرع التحلية جدة"));
            Assert.That(memory.Today(at.AddHours(11)), Is.Null, "after 04:00 the next day");
        }

        private sealed class MemoryStore : FootballQuest.Core.Accounts.ILocalStore
        {
            private readonly Dictionary<string, string> values = new Dictionary<string, string>();
            public bool GetBool(string key, bool fallback = false) => values.TryGetValue(key, out var v) ? v == "1" : fallback;
            public void SetBool(string key, bool value) => values[key] = value ? "1" : "0";
            public string GetString(string key, string fallback = null) => values.TryGetValue(key, out var v) ? v : fallback;
            public void SetString(string key, string value) => values[key] = value;
        }
    }
}

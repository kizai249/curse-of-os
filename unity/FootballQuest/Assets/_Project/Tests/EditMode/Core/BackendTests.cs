using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class BackendTests
    {
        [Test]
        public void MiniJsonRoundTrip()
        {
            var parsed = (IDictionary<string, object>)MiniJson.Parse("{\"a\":1.5,\"b\":[true,null,\"x\\\"y\"],\"c\":{\"d\":\"عربي\"},\"e\":-2e3}");
            Assert.That(parsed["a"], Is.EqualTo(1.5));
            Assert.That(((List<object>)parsed["b"])[2], Is.EqualTo("x\"y"));
            Assert.That(JsonFields.Str(parsed["c"], "d"), Is.EqualTo("عربي"));
            Assert.That(parsed["e"], Is.EqualTo(-2000.0));
            var again = MiniJson.Parse(MiniJson.Serialize(parsed));
            Assert.That(MiniJson.Serialize(again), Is.EqualTo(MiniJson.Serialize(parsed)));
            Assert.That(MiniJson.Serialize(new Dictionary<string, object> { { "city", "JED" }, { "birthYear", 2000 }, { "confirm", true } }),
                Is.EqualTo("{\"city\":\"JED\",\"birthYear\":2000,\"confirm\":true}"));
        }

        [Test]
        public void MiniJsonRejectsGarbage()
        {
            Assert.Throws<System.FormatException>(() => MiniJson.Parse("{\"a\":}"));
            Assert.Throws<System.FormatException>(() => MiniJson.Parse("[1,2] x"));
        }

        [TestCase("1.0.0", "1.0.0", false)]
        [TestCase("1.0.0", "1.0.1", true)]
        [TestCase("1.2", "1.10.0", true)]
        [TestCase("2.0.0-beta", "1.9.9", false)]
        [TestCase("1.0.0", "", false)]
        [TestCase("1.0.0", "garbage", false)]
        [TestCase("garbage", "9.9.9", false)]
        public void ForceUpdateComparison(string current, string minimum, bool expected)
        {
            Assert.That(AppVersion.RequiresUpdate(current, minimum), Is.EqualTo(expected));
        }

        [Test]
        public void ErrorStatesMapping()
        {
            Assert.That(ErrorStates.ToStateId(new BackendException("FAILED_PRECONDITION", "CITY_CHANGE_LOCKED",
                new Dictionary<string, string> { { "stateId", "CITY_CHANGE_LOCKED" } })), Is.EqualTo(StateCatalog.CityChangeLocked));
            Assert.That(ErrorStates.ToStateId(BackendException.Network("timeout")), Is.EqualTo(StateCatalog.NetOffline));
            Assert.That(ErrorStates.ToStateId(new BackendException("UNAUTHENTICATED", "Unauthenticated")), Is.EqualTo(StateCatalog.AppIntegrity));
            Assert.That(ErrorStates.ToStateId(new BackendException("UNAUTHENTICATED", "AUTH_REQUIRED")), Is.Null);
            Assert.That(ErrorStates.ToStateId(new BackendException("UNAVAILABLE", "x")), Is.EqualTo(StateCatalog.SrvBusy));
            Assert.That(ErrorStates.ToStateId(new BackendException("INVALID_ARGUMENT", "INVALID_CITY")), Is.Null);
        }

        [Test]
        public async Task RetryReusesTheRequestIdAndStopsAfterThreeAttempts()
        {
            var ids = new List<string>();
            var ex = Assert.ThrowsAsync<BackendException>(() => Retry.RunAsync<int>(id =>
            {
                ids.Add(id);
                throw new BackendException("UNAVAILABLE", "busy");
            }, _ => Task.CompletedTask));
            Assert.That(ex.Status, Is.EqualTo("UNAVAILABLE"));
            Assert.That(ids.Count, Is.EqualTo(3));
            Assert.That(ids[0], Is.EqualTo(ids[1]).And.EqualTo(ids[2]));

            var calls = 0;
            var value = await Retry.RunAsync(id =>
            {
                calls++;
                if (calls < 2) throw new BackendException("ABORTED", "contention");
                return Task.FromResult(42);
            }, _ => Task.CompletedTask);
            Assert.That(value, Is.EqualTo(42));
            Assert.That(calls, Is.EqualTo(2));
        }

        [Test]
        public void RetryDoesNotRepeatBusinessErrors()
        {
            var calls = 0;
            Assert.ThrowsAsync<BackendException>(() => Retry.RunAsync<int>(_ =>
            {
                calls++;
                throw new BackendException("FAILED_PRECONDITION", "CITY_CHANGE_LOCKED");
            }, _ => Task.CompletedTask));
            Assert.That(calls, Is.EqualTo(1));
        }

        [Test]
        public void ParsesSharedServerSamples()
        {
            var ok = AccountApi.ParseBootstrap(Result("bootstrap.ok"));
            Assert.That(ok.Status, Is.EqualTo(BootstrapStatus.Ok));
            Assert.That(ok.GameDay, Is.EqualTo("2027-01-15"));
            Assert.That(ok.Profile.City, Is.EqualTo("JED"));
            Assert.That(ok.Profile.DisplayName, Is.EqualTo("صقر_جدة_27"));
            Assert.That(ok.Profile.Xp, Is.EqualTo(1820));
            Assert.That(ok.Profile.IsGuest, Is.False);

            Assert.That(AccountApi.ParseBootstrap(Result("bootstrap.needs_onboarding")).Status, Is.EqualTo(BootstrapStatus.NeedsOnboarding));

            var set = AccountApi.ParseSetAgeAndCity(Result("setAgeAndCity.ok"));
            Assert.That(set.Under15, Is.False);
            Assert.That(set.Profile.IsMinor, Is.True);
            Assert.That(AccountApi.ParseSetAgeAndCity(Result("setAgeAndCity.under_15")).Under15, Is.True);

            var error = AccountApi.ParseError(JsonFields.Obj(MiniJson.Parse(SharedVectors.Sample("error.city_change_locked")), "error"));
            Assert.That(error.Status, Is.EqualTo("FAILED_PRECONDITION"));
            Assert.That(error.StateId, Is.EqualTo(StateCatalog.CityChangeLocked));
            Assert.That(error.Details["unlockAt"], Is.EqualTo("2027-02-06T16:02:30.000Z"));
        }

        private static object Result(string sample) => JsonFields.Obj(MiniJson.Parse(SharedVectors.Sample(sample)), "result");
    }
}

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Onboarding;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class OnboardingTests
    {
        private static readonly DateTimeOffset Now = new DateTimeOffset(2027, 1, 10, 12, 0, 0, TimeSpan.Zero);

        [Test]
        public void AgeGateMatchesSharedVectors()
        {
            foreach (var v in SharedVectors.AgeBand())
            {
                var now = DateTimeOffset.Parse(v.Instant, CultureInfo.InvariantCulture);
                Assert.That(AgeGate.ToContract(AgeGate.Evaluate(v.BirthYear, now)), Is.EqualTo(v.Band), v.ToString());
            }
            Assert.That(SharedVectors.AgeBand().Count(), Is.GreaterThanOrEqualTo(10));
        }

        [Test]
        public async Task FirstRunShowsDisclaimerThenAgeGate()
        {
            var h = new Harness();
            await h.Flow.StartAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Disclaimer));
            Assert.That(h.Auth.SignInCalls, Is.EqualTo(0), "no account before the age gate");

            await h.Flow.AcknowledgeDisclaimerAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.AgeGate));
            Assert.That(h.Store.GetBool(OnboardingFlow.DisclaimerSeenKey), Is.True);
        }

        [Test]
        public async Task Under15NeverCreatesAnAccount()
        {
            var h = new Harness();
            h.Store.SetBool(OnboardingFlow.DisclaimerSeenKey, true);
            await h.Flow.StartAsync();
            Assert.That(h.Flow.SubmitBirthYear(2013), Is.EqualTo(AgeGateResult.Under15));
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Under15));
            Assert.That(h.Auth.SignInCalls, Is.EqualTo(0));
            Assert.That(h.Api.SetCalls, Is.EqualTo(0));
        }

        [Test]
        public async Task HappyPathCreatesGuestAndProfile()
        {
            var h = new Harness();
            h.Store.SetBool(OnboardingFlow.DisclaimerSeenKey, true);
            await h.Flow.StartAsync();
            Assert.That(h.Flow.SubmitBirthYear(2000), Is.EqualTo(AgeGateResult.Adult));
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.CityPick));

            await h.Flow.SubmitCityAsync("JED");
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Ready));
            Assert.That(h.Auth.SignInCalls, Is.EqualTo(1));
            Assert.That(h.Api.LastBirthYear, Is.EqualTo(2000));
            Assert.That(h.Api.LastCity, Is.EqualTo("JED"));
            Assert.That(h.Flow.Profile.City, Is.EqualTo("JED"));
            Assert.That(h.Flow.LastBootstrap.DailyLogin.Granted, Is.True, "first bootstrap after onboarding grants the daily login");
        }

        [Test]
        public async Task ReturningPlayerGoesStraightToReady()
        {
            var h = new Harness();
            h.Store.SetBool(OnboardingFlow.DisclaimerSeenKey, true);
            h.Auth.IsSignedIn = true;
            h.Api.Bootstrap = new BootstrapResult { Status = BootstrapStatus.Ok, Profile = new PlayerProfile { City = "RUH" } };
            await h.Flow.StartAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Ready));
            Assert.That(h.Flow.Profile.City, Is.EqualTo("RUH"));
        }

        [Test]
        public async Task ForceUpdateBlocksEverything()
        {
            var h = new Harness();
            h.Config.Values[RemoteConfigKeys.MinAppVersion] = "1.1.0";
            await h.Flow.StartAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.ForceUpdate));
        }

        [Test]
        public async Task RemoteConfigFailureDoesNotBlockStart()
        {
            var h = new Harness();
            h.Config.FailFetch = true;
            await h.Flow.StartAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Disclaimer));
        }

        [Test]
        public async Task ServerUnder15SignsOut()
        {
            var h = new Harness();
            h.Store.SetBool(OnboardingFlow.DisclaimerSeenKey, true);
            await h.Flow.StartAsync();
            h.Flow.SubmitBirthYear(2012);
            h.Api.SetResult = new SetAgeAndCityResult { Under15 = true };
            await h.Flow.SubmitCityAsync("RUH");
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Under15));
            Assert.That(h.Auth.IsSignedIn, Is.False);
        }

        [Test]
        public async Task TransientErrorsAreRetriedThenShownAsSrvBusy()
        {
            var h = new Harness();
            h.Store.SetBool(OnboardingFlow.DisclaimerSeenKey, true);
            await h.Flow.StartAsync();
            h.Flow.SubmitBirthYear(2000);
            h.Api.SetError = new BackendException("UNAVAILABLE", "busy");
            await h.Flow.SubmitCityAsync("KHB");
            Assert.That(h.Api.SetCalls, Is.EqualTo(Retry.MaxAttempts));
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Error));
            Assert.That(h.Flow.ErrorStateId, Is.EqualTo(StateCatalog.SrvBusy));

            h.Api.SetError = null;
            await h.Flow.RetryAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.CityPick), "signed in but not onboarded yet → back to city");
            await h.Flow.SubmitCityAsync("KHB");
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Ready));
        }

        [Test]
        public async Task DeletionPendingThenStartOver()
        {
            var h = new Harness();
            h.Store.SetBool(OnboardingFlow.DisclaimerSeenKey, true);
            h.Auth.IsSignedIn = true;
            h.Api.Bootstrap = new BootstrapResult { Status = BootstrapStatus.DeletionPending };
            await h.Flow.StartAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.DeletionPending));
            await h.Flow.AcknowledgeDeletionAsync();
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.AgeGate));
            Assert.That(h.Auth.IsSignedIn, Is.False);
        }

        [Test]
        public void InvalidYearKeepsTheGateOpen()
        {
            var h = new Harness();
            Assert.That(h.Flow.SubmitBirthYear(2030), Is.EqualTo(AgeGateResult.Invalid));
            Assert.That(h.Flow.Step, Is.EqualTo(OnboardingStep.Starting));
        }

        private sealed class Harness
        {
            public readonly FakeAuth Auth = new FakeAuth();
            public readonly FakeApi Api = new FakeApi();
            public readonly FakeConfig Config = new FakeConfig();
            public readonly MemoryStore Store = new MemoryStore();
            public readonly OnboardingFlow Flow;

            public Harness()
            {
                Flow = new OnboardingFlow(Auth, Api, Config, Store, "1.0.0", () => Now, _ => Task.CompletedTask);
            }
        }

        private sealed class FakeAuth : IAuthGateway
        {
            public int SignInCalls;
            public bool IsSignedIn { get; set; }
            public string Uid => IsSignedIn ? "u1" : null;
            public string Provider => "anonymous";

            public Task SignInAnonymouslyAsync()
            {
                SignInCalls++;
                IsSignedIn = true;
                return Task.CompletedTask;
            }

            public Task LinkAsync(LinkProvider provider) => Task.CompletedTask;

            public Task SignOutAsync()
            {
                IsSignedIn = false;
                return Task.CompletedTask;
            }
        }

        private sealed class FakeApi : IAccountApi
        {
            public BootstrapResult Bootstrap = new BootstrapResult { Status = BootstrapStatus.NeedsOnboarding };
            public SetAgeAndCityResult SetResult;
            public BackendException SetError;
            public int SetCalls;
            public int? LastBirthYear;
            public string LastCity;

            public Task<BootstrapResult> BootstrapAsync() => Task.FromResult(Bootstrap);

            public Task<SetAgeAndCityResult> SetAgeAndCityAsync(int? birthYear, string city)
            {
                SetCalls++;
                LastBirthYear = birthYear;
                LastCity = city;
                if (SetError != null) throw SetError;
                var result = SetResult ?? new SetAgeAndCityResult { Profile = new PlayerProfile { City = city, AgeBand = "18_plus" } };
                // بعد الإنشاء الخادم يرجع الملف في bootstrap (مع الدخول اليومي).
                if (!result.Under15) Bootstrap = new BootstrapResult { Status = BootstrapStatus.Ok, Profile = result.Profile, DailyLogin = new FootballQuest.Core.Economy.DailyLogin { Granted = true, Xp = 10, Packs = 1 } };
                return Task.FromResult(result);
            }

            public Task<bool> DeleteAccountAsync() => Task.FromResult(false);
        }

        private sealed class FakeConfig : IRemoteConfig
        {
            public readonly Dictionary<string, string> Values = new Dictionary<string, string>(RemoteConfigKeys.Defaults);
            public bool FailFetch;

            public Task FetchAsync() => FailFetch ? Task.FromException(new Exception("offline")) : Task.CompletedTask;
            public string GetString(string key) => Values.TryGetValue(key, out var v) ? v : "";
            public bool GetBool(string key) => GetString(key) == "true";
        }

        private sealed class MemoryStore : ILocalStore
        {
            private readonly Dictionary<string, string> values = new Dictionary<string, string>();
            public bool GetBool(string key, bool fallback = false) => values.TryGetValue(key, out var v) ? v == "1" : fallback;
            public void SetBool(string key, bool value) => values[key] = value ? "1" : "0";
            public string GetString(string key, string fallback = null) => values.TryGetValue(key, out var v) ? v : fallback;
            public void SetString(string key, string value) => values[key] = value;
        }
    }
}

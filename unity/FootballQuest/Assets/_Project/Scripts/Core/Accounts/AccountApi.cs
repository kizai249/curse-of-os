using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Economy;

namespace FootballQuest.Core.Accounts
{
    /// <summary>
    /// IAccountApi فوق IFunctionsClient. أشكال الردود مثبتة في shared/contracts/samples ويختبرها الطرفان
    /// (AccountApiTests في C#، وusers.test.ts في المحاكي).
    /// </summary>
    public sealed class AccountApi : IAccountApi
    {
        private readonly IFunctionsClient functions;

        public AccountApi(IFunctionsClient functions)
        {
            this.functions = functions;
        }

        public async Task<BootstrapResult> BootstrapAsync()
        {
            var result = await functions.CallAsync("bootstrap", null);
            return ParseBootstrap(result);
        }

        public async Task<SetAgeAndCityResult> SetAgeAndCityAsync(int? birthYear, string city)
        {
            var data = new Dictionary<string, object> { { "city", city } };
            if (birthYear.HasValue) data["birthYear"] = birthYear.Value;
            var result = await functions.CallAsync("setAgeAndCity", data);
            return ParseSetAgeAndCity(result);
        }

        public async Task<bool> DeleteAccountAsync()
        {
            var result = await functions.CallAsync("deleteAccount", new Dictionary<string, object> { { "confirm", true } });
            return JsonFields.Str(result, "status") == "deleted";
        }

        public static BootstrapResult ParseBootstrap(object result)
        {
            var status = JsonFields.Str(result, "status");
            return new BootstrapResult
            {
                Status = status == "ok" ? BootstrapStatus.Ok
                    : status == "deletion_pending" ? BootstrapStatus.DeletionPending
                    : BootstrapStatus.NeedsOnboarding,
                Profile = ParseProfile(JsonFields.Obj(result, "profile")),
                ServerTime = JsonFields.Str(result, "serverTime"),
                GameDay = JsonFields.Str(result, "gameDay"),
                DailyLogin = new DailyLogin
                {
                    Granted = JsonFields.Bool(JsonFields.Obj(result, "dailyLogin"), "granted"),
                    Xp = JsonFields.Int(JsonFields.Obj(result, "dailyLogin"), "xp"),
                    Packs = JsonFields.Int(JsonFields.Obj(result, "dailyLogin"), "packs"),
                },
            };
        }

        public static SetAgeAndCityResult ParseSetAgeAndCity(object result) => new SetAgeAndCityResult
        {
            Under15 = JsonFields.Str(result, "status") == "under_15",
            Profile = ParseProfile(JsonFields.Obj(result, "profile")),
        };

        public static PlayerProfile ParseProfile(IDictionary<string, object> p)
        {
            if (p == null) return null;
            var profile = new PlayerProfile
            {
                AgeBand = JsonFields.Str(p, "ageBand"),
                City = JsonFields.Str(p, "city"),
                DisplayName = JsonFields.Str(p, "displayName"),
                CityChangedAt = JsonFields.Str(p, "cityChangedAt"),
                AuthProvider = JsonFields.Str(p, "authProvider") ?? "anonymous",
                Level = JsonFields.Int(p, "level"),
                Xp = JsonFields.Int(p, "xp"),
                FanPoints = JsonFields.Int(p, "fanPoints"),
                Packs = JsonFields.Int(p, "packs"),
            };
            var balances = JsonFields.Obj(p, "balances");
            profile.Balances = balances != null
                ? Balances.Parse(balances)
                : new Balances { Packs = profile.Packs, FanPoints = profile.FanPoints, Xp = profile.Xp, Level = System.Math.Max(1, profile.Level) };
            profile.OwnedTeams = Strings(p, "ownedTeams");
            profile.Achievements = Strings(p, "achievements");
            profile.Badges = Strings(p, "badges");
            profile.VisitedToday = Strings(p, "visitedToday");
            return profile;
        }

        private static List<string> Strings(object o, string key)
        {
            var list = new List<string>();
            foreach (var item in JsonFields.List(o, key)) if (item is string s) list.Add(s);
            return list;
        }

        /// <summary>يحوّل غلاف خطأ Callable ({status, message, details}) إلى BackendException.</summary>
        public static BackendException ParseError(object error)
        {
            var details = new Dictionary<string, string>();
            var d = JsonFields.Obj(error, "details");
            if (d != null)
            {
                foreach (var kv in d)
                {
                    if (kv.Value != null) details[kv.Key] = kv.Value as string ?? kv.Value.ToString();
                }
            }
            return new BackendException(JsonFields.Str(error, "status"), JsonFields.Str(error, "message"), details);
        }
    }
}

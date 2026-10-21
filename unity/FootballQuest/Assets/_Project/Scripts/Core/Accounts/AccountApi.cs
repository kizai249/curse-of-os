using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;

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
            return new PlayerProfile
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

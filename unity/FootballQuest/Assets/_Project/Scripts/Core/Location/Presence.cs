using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Location
{
    public enum ReadingStatus
    {
        Ok,
        Timeout,
        Error,
    }

    /// <summary>قراءة موقع وحدة (Foreground فقط). ما تُخزن في أي مكان — تُرسل لـ verifyPresence فقط.</summary>
    public sealed class LocationReading
    {
        public ReadingStatus Status;
        public double Lat;
        public double Lng;
        public double AccuracyM;
        public bool IsMock;

        public static LocationReading Parse(string json)
        {
            try
            {
                var o = MiniJson.Parse(json);
                var status = JsonFields.Str(o, "status");
                if (status != "ok") return new LocationReading { Status = status == "timeout" ? ReadingStatus.Timeout : ReadingStatus.Error };
                return new LocationReading
                {
                    Status = ReadingStatus.Ok,
                    Lat = Num(o, "lat"),
                    Lng = Num(o, "lng"),
                    AccuracyM = Num(o, "accuracyM"),
                    IsMock = JsonFields.Bool(o, "isMock"),
                };
            }
            catch (FormatException)
            {
                return new LocationReading { Status = ReadingStatus.Error };
            }
        }

        private static double Num(object o, string key) =>
            o is IDictionary<string, object> d && d.TryGetValue(key, out var v) && v is double x ? x : double.NaN;
    }

    /// <summary>القراءة الأصلية: CoreLocation requestLocation في iOS، وFusedLocationProvider getCurrentLocation في Android.</summary>
    public interface ILocationService
    {
        /// <summary>قراءة وحدة بحد انتظار (ARCHITECTURE §2.1: 8 ثوانٍ).</summary>
        Task<LocationReading> ReadOnceAsync(int timeoutMs);
    }

    public sealed class StadiumHit
    {
        public string StadiumId;
        public bool Rewarded;
        public int Xp;
        public int Packs;
    }

    public sealed class BranchHit
    {
        public string BranchId;
        public string BrandId;
        public string NameAr;
        public string NameEn;
        public string BrandAr;
        public string BrandEn;
        public int ZoneRadiusM;
        public int ActiveCampaigns;
        public bool Rewarded;
        public int Xp;

        public string Name(Language language) => language == Language.Arabic ? NameAr : NameEn;
        public string Brand(Language language) => language == Language.Arabic ? BrandAr : BrandEn;
    }

    public sealed class PresenceResult
    {
        public string Status;
        public string AccuracyBand;
        public List<StadiumHit> Stadiums = new List<StadiumHit>();
        public List<BranchHit> Branches = new List<BranchHit>();
        public Balances Balances;
    }

    public interface IPresenceApi
    {
        Task<PresenceResult> VerifyAsync(LocationReading reading, string platform);
    }

    public sealed class PresenceApi : IPresenceApi
    {
        private readonly IFunctionsClient functions;

        public PresenceApi(IFunctionsClient functions)
        {
            this.functions = functions;
        }

        public async Task<PresenceResult> VerifyAsync(LocationReading reading, string platform)
        {
            var result = await functions.CallAsync("verifyPresence", new Dictionary<string, object>
            {
                { "lat", reading.Lat },
                { "lng", reading.Lng },
                { "accuracyM", reading.AccuracyM },
                { "isMock", reading.IsMock },
                { "platform", platform },
            });
            return Parse(result);
        }

        public static PresenceResult Parse(object result)
        {
            var parsed = new PresenceResult
            {
                Status = JsonFields.Str(result, "status"),
                AccuracyBand = JsonFields.Str(result, "accuracyBand"),
                Balances = JsonFields.Obj(result, "balances") == null ? null : Balances.Parse(JsonFields.Obj(result, "balances")),
            };
            foreach (var s in JsonFields.List(result, "stadiums"))
            {
                parsed.Stadiums.Add(new StadiumHit
                {
                    StadiumId = JsonFields.Str(s, "stadiumId"),
                    Rewarded = JsonFields.Bool(s, "rewarded"),
                    Xp = JsonFields.Int(s, "xp"),
                    Packs = JsonFields.Int(s, "packs"),
                });
            }
            foreach (var b in JsonFields.List(result, "branches"))
            {
                var name = JsonFields.Obj(b, "name");
                var brand = JsonFields.Obj(b, "brandName");
                parsed.Branches.Add(new BranchHit
                {
                    BranchId = JsonFields.Str(b, "branchId"),
                    BrandId = JsonFields.Str(b, "brandId"),
                    NameAr = JsonFields.Str(name, "ar"),
                    NameEn = JsonFields.Str(name, "en"),
                    BrandAr = JsonFields.Str(brand, "ar"),
                    BrandEn = JsonFields.Str(brand, "en"),
                    ZoneRadiusM = JsonFields.Int(b, "zoneRadiusM"),
                    ActiveCampaigns = JsonFields.Int(b, "activeCampaigns"),
                    Rewarded = JsonFields.Bool(b, "rewarded"),
                    Xp = JsonFields.Int(b, "xp"),
                });
            }
            return parsed;
        }
    }

    public enum PresenceTrigger
    {
        /// <summary>فتح التطبيق.</summary>
        AppOpen,
        /// <summary>رجوع من الخلفية.</summary>
        Resume,
        /// <summary>اللاعب ضغط «تحقق من قربي».</summary>
        Manual,
    }

    public sealed class PresenceFeedback
    {
        public PresenceFeedback(string stateId, IDictionary<string, string> values = null, string branchId = null)
        {
            StateId = stateId;
            Values = values ?? new Dictionary<string, string>();
            BranchId = branchId;
        }

        public string StateId { get; }
        public IDictionary<string, string> Values { get; }
        /// <summary>للبطاقة ZONE_BRANCH_NEARBY (حدث branch_nearby_shown).</summary>
        public string BranchId { get; }
    }

    /// <summary>
    /// قواعد الموقع في الواجهة — GAME_RULES §6.1 وPERMISSION_AND_ERROR_STATES §2:
    /// - التحقق التلقائي فقط عند الفتح والرجوع، وفقط إذا الإذن الدقيق ممنوح (ما نطلب إذن تلقائيًا)، وبحد أدنى بين القراءات.
    /// - الدقة أسوأ من 100 م: LOC_WEAK بدون إرسال الإحداثيات للخادم أصلًا.
    /// - التحقق التلقائي صامت إلا للمكافآت وبطاقة الفرع؛ الرسائل السلبية للتحقق اليدوي فقط.
    /// </summary>
    public static class PresencePolicy
    {
        public const int ReadTimeoutMs = 8000;
        public const double MaxAccuracyM = 100;
        public static readonly TimeSpan AutoInterval = TimeSpan.FromMinutes(2);

        public static bool ShouldAutoCheck(DateTimeOffset? lastCheck, DateTimeOffset now) =>
            lastCheck == null || now - lastCheck.Value >= AutoInterval;

        /// <summary>null = أرسل للخادم. غير ذلك: الرسالة المحلية بدون إرسال.</summary>
        public static PresenceFeedback LocalCheck(LocationReading reading, PresenceTrigger trigger)
        {
            if (reading.Status == ReadingStatus.Timeout || reading.Status == ReadingStatus.Error || double.IsNaN(reading.Lat))
                return trigger == PresenceTrigger.Manual ? new PresenceFeedback(StateCatalog.LocTimeout) : Silent;
            if (reading.AccuracyM > MaxAccuracyM)
                return trigger == PresenceTrigger.Manual ? new PresenceFeedback(StateCatalog.LocWeak) : Silent;
            return null;
        }

        /// <summary>معرّف خاص يعني «لا تعرض شي».</summary>
        public static readonly PresenceFeedback Silent = new PresenceFeedback(null);

        public static List<PresenceFeedback> Feedback(PresenceResult result, PresenceTrigger trigger,
            Func<string, string> stadiumName, Language language)
        {
            var list = new List<PresenceFeedback>();
            var manual = trigger == PresenceTrigger.Manual;
            switch (result.Status)
            {
                case "weak_signal":
                    if (manual) list.Add(new PresenceFeedback(StateCatalog.LocWeak));
                    return list;
                case "unverifiable":
                    if (manual) list.Add(new PresenceFeedback(StateCatalog.LocMock));
                    return list;
            }

            foreach (var s in result.Stadiums)
            {
                if (s.Rewarded) list.Add(new PresenceFeedback(StateCatalog.ZoneStadiumOk, new Dictionary<string, string> { { "stadium", stadiumName(s.StadiumId) } }));
                else if (manual) list.Add(new PresenceFeedback(StateCatalog.ZoneStadiumDone));
            }
            foreach (var b in result.Branches)
            {
                list.Add(new PresenceFeedback(StateCatalog.ZoneBranchNearby, new Dictionary<string, string>
                {
                    { "branch", b.Brand(language) + " — " + b.Name(language) },
                    { "count", b.ActiveCampaigns.ToString(CultureInfo.InvariantCulture) },
                }, b.BranchId));
            }
            // TODO(owner): PERMISSION_AND_ERROR_STATES ما فيه نص لـ «ما فيه ملعب ولا فرع قريب»؛ نستخدم LOC_OUT_OF_ZONE للتحقق اليدوي.
            if (manual && list.Count == 0) list.Add(new PresenceFeedback(StateCatalog.LocOutOfZone));
            return list;
        }
    }
}

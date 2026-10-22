using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Location;
using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Coupons
{
    public sealed class Localized
    {
        public string Ar;
        public string En;
        public string Get(Language language) => language == Language.Arabic ? Ar : En;

        public static Localized Parse(object o) => new Localized { Ar = JsonFields.Str(o, "ar") ?? "", En = JsonFields.Str(o, "en") ?? "" };
    }

    /// <summary>قسيمة في المحفظة (DATA_CONTRACTS §5 — بدون البصمات).</summary>
    public sealed class CouponInfo
    {
        public string CouponId;
        public string CampaignId;
        public Localized Title = new Localized();
        public Localized Terms = new Localized();
        public string Status;
        public DateTimeOffset ExpiresAt;
        public DateTimeOffset? RedeemedAt;

        public bool IsUsable(DateTimeOffset now) => Status == "issued" && ExpiresAt > now;

        /// <summary>الحجز المؤقت في «منتخبنا يجمعنا» (reserved/released) ما يظهر في المحفظة (§8.4).</summary>
        public bool IsInWallet => Status == "issued" || Status == "redeemed" || Status == "expired";

        public static CouponInfo Parse(string id, object doc) => new CouponInfo
        {
            CouponId = id,
            CampaignId = JsonFields.Str(doc, "campaignId"),
            Title = Localized.Parse(JsonFields.Obj(doc, "title")),
            Terms = Localized.Parse(JsonFields.Obj(doc, "terms")),
            Status = JsonFields.Str(doc, "status"),
            ExpiresAt = Date(JsonFields.Str(doc, "expiresAt")) ?? DateTimeOffset.MinValue,
            RedeemedAt = Date(JsonFields.Str(doc, "redeemedAt")),
        };

        public static DateTimeOffset? Date(string iso) =>
            DateTimeOffset.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var d) ? d : (DateTimeOffset?)null;
    }

    /// <summary>القسيمة وقت المنح: الرمزان الصريحان يوصلان هنا مرة وحدة فقط.</summary>
    public sealed class IssuedCoupon
    {
        public string CouponId;
        public Localized Title;
        public DateTimeOffset ExpiresAt;
        public string RedeemToken;
        public string ManualCode;

        public static IssuedCoupon Parse(object o) => new IssuedCoupon
        {
            CouponId = JsonFields.Str(o, "couponId"),
            Title = Localized.Parse(JsonFields.Obj(o, "title")),
            ExpiresAt = CouponInfo.Date(JsonFields.Str(o, "expiresAt")) ?? DateTimeOffset.MinValue,
            RedeemToken = JsonFields.Str(o, "redeemToken"),
            ManualCode = JsonFields.Str(o, "manualCode"),
        };
    }

    public sealed class CampaignNote
    {
        public string CampaignId;
        public Localized Title;
        public string Reason;
    }

    public sealed class ScanResult
    {
        public string Status;
        public bool Verified;
        public string BranchId;
        public Localized BranchName;
        public Localized BrandName;
        public int RewardXp;
        public int RewardPacks;
        public List<IssuedCoupon> Coupons = new List<IssuedCoupon>();
        public List<CampaignNote> Notes = new List<CampaignNote>();
        public Balances Balances;

        public static ScanResult Parse(object r)
        {
            var branch = JsonFields.Obj(r, "branch");
            var rewards = JsonFields.Obj(r, "rewards");
            var parsed = new ScanResult
            {
                Status = JsonFields.Str(r, "status"),
                Verified = JsonFields.Bool(r, "verified"),
                BranchId = JsonFields.Str(branch, "branchId"),
                BranchName = Localized.Parse(JsonFields.Obj(branch, "name")),
                BrandName = Localized.Parse(JsonFields.Obj(branch, "brandName")),
                RewardXp = JsonFields.Int(rewards, "xp"),
                RewardPacks = JsonFields.Int(rewards, "packs"),
                Balances = Balances.Parse(JsonFields.Obj(r, "balances")),
            };
            foreach (var c in JsonFields.List(r, "coupons")) parsed.Coupons.Add(IssuedCoupon.Parse(c));
            foreach (var n in JsonFields.List(r, "campaignNotes"))
            {
                parsed.Notes.Add(new CampaignNote
                {
                    CampaignId = JsonFields.Str(n, "campaignId"),
                    Title = Localized.Parse(JsonFields.Obj(n, "title")),
                    Reason = JsonFields.Str(n, "reason"),
                });
            }
            return parsed;
        }
    }

    public sealed class InvoiceResult
    {
        public IssuedCoupon Coupon;
        public string RejectedStateId;

        public static InvoiceResult Parse(object r) => JsonFields.Str(r, "status") == "issued"
            ? new InvoiceResult { Coupon = IssuedCoupon.Parse(JsonFields.Obj(r, "coupon")) }
            : new InvoiceResult { RejectedStateId = JsonFields.Str(r, "stateId") };
    }

    public interface ICouponsApi
    {
        Task<ScanResult> ScanBranchCodeAsync(string code, LocationReading reading, string platform, string appVersion);
        Task<InvoiceResult> SubmitInvoiceCodeAsync(string code);
        Task<RedeemCodes> ReissueAsync(string couponId);
    }

    /// <summary>قسائم اللاعب (Firestore: where uid == me).</summary>
    public interface ICouponSource
    {
        Task<List<CouponInfo>> GetMyCouponsAsync(string uid);
    }

    public sealed class CouponsApi : ICouponsApi
    {
        private readonly IFunctionsClient functions;

        public CouponsApi(IFunctionsClient functions)
        {
            this.functions = functions;
        }

        /// <summary>الإحداثيات تُرسل فقط إذا القراءة صالحة ودقتها ≤ 100 م؛ وإلا تسجيل حضور بدون تحقق.</summary>
        public async Task<ScanResult> ScanBranchCodeAsync(string code, LocationReading reading, string platform, string appVersion)
        {
            var data = new Dictionary<string, object> { { "code", code }, { "platform", platform }, { "appVersion", appVersion } };
            if (ScanFlow.ShouldAttachLocation(reading))
            {
                data["lat"] = reading.Lat;
                data["lng"] = reading.Lng;
                data["accuracyM"] = reading.AccuracyM;
                data["isMock"] = reading.IsMock;
            }
            return ScanResult.Parse(await functions.CallAsync("scanBranchCode", data));
        }

        public async Task<InvoiceResult> SubmitInvoiceCodeAsync(string code) =>
            InvoiceResult.Parse(await functions.CallAsync("submitInvoiceCode", new Dictionary<string, object> { { "code", code } }));

        public async Task<RedeemCodes> ReissueAsync(string couponId)
        {
            var r = await functions.CallAsync("reissueRedeemCode", new Dictionary<string, object> { { "couponId", couponId } });
            return new RedeemCodes { Token = JsonFields.Str(r, "redeemToken"), Manual = JsonFields.Str(r, "manualCode") };
        }
    }

    public sealed class RedeemCodes
    {
        public string Token;
        public string Manual;
    }

    /// <summary>تخزين آمن على الجهاز (Keychain في iOS، وEncryptedSharedPreferences/Keystore في Android).</summary>
    public interface ISecureStore
    {
        string Get(string key);
        void Set(string key, string value);
        void Delete(string key);
    }

    /// <summary>رموز الاسترداد الصريحة محفوظة مشفرة على الجهاز فقط (DATA_CONTRACTS §5).</summary>
    public sealed class RedeemCodeVault
    {
        private readonly ISecureStore store;

        public RedeemCodeVault(ISecureStore store)
        {
            this.store = store;
        }

        private static string Key(string couponId) => "fq.coupon." + couponId;

        public void Save(string couponId, RedeemCodes codes) =>
            store.Set(Key(couponId), MiniJson.Serialize(new Dictionary<string, object> { { "t", codes.Token }, { "m", codes.Manual } }));

        public RedeemCodes Load(string couponId)
        {
            var raw = store.Get(Key(couponId));
            if (string.IsNullOrEmpty(raw)) return null;
            try
            {
                var o = MiniJson.Parse(raw);
                return new RedeemCodes { Token = JsonFields.Str(o, "t"), Manual = JsonFields.Str(o, "m") };
            }
            catch (FormatException)
            {
                return null;
            }
        }

        public void Forget(string couponId) => store.Delete(Key(couponId));
    }

    public sealed class Feedback
    {
        public Feedback(string stateId, IDictionary<string, string> values = null)
        {
            StateId = stateId;
            Values = values ?? new Dictionary<string, string>();
        }

        public string StateId { get; }
        public IDictionary<string, string> Values { get; }
    }

    /// <summary>
    /// تحويل نتيجة المسح ورمز الفاتورة إلى حالات PERMISSION_AND_ERROR_STATES §3–§4.
    /// </summary>
    public static class ScanFlow
    {
        public const string BranchCodePrefix = "FQB1:";

        public static bool LooksLikeBranchCode(string text) => text != null && text.StartsWith(BranchCodePrefix, StringComparison.Ordinal);

        public static bool ShouldAttachLocation(LocationReading reading) =>
            reading != null && reading.Status == ReadingStatus.Ok && !double.IsNaN(reading.Lat) && reading.AccuracyM <= PresencePolicy.MaxAccuracyM;

        public static string FormatDate(DateTimeOffset date) =>
            date.ToOffset(TimeSpan.FromHours(3)).ToString("yyyy/MM/dd", CultureInfo.InvariantCulture);

        public static List<Feedback> ForScan(ScanResult r, LocationReading reading, Language language)
        {
            var list = new List<Feedback>();
            var branch = r.BrandName.Get(language) + " — " + r.BranchName.Get(language);
            switch (r.Status)
            {
                case "already":
                    list.Add(new Feedback(StateCatalog.QrAlreadyToday));
                    return list;
                case "verified":
                    list.Add(new Feedback(StateCatalog.QrCheckinVerified, new Dictionary<string, string> { { "branch", branch } }));
                    break;
                default:
                    // قراءة ضعيفة وقت المسح (AT-02a): تسجيل حضور غير محقق + توضيح السبب.
                    if (reading != null && reading.Status == ReadingStatus.Ok && reading.AccuracyM > PresencePolicy.MaxAccuracyM)
                        list.Add(new Feedback(StateCatalog.LocWeak));
                    list.Add(new Feedback(StateCatalog.QrCheckinUnverified));
                    break;
            }
            foreach (var c in r.Coupons) list.Add(Issued(c, language));
            foreach (var n in r.Notes)
            {
                switch (n.Reason)
                {
                    case "need_location": list.Add(new Feedback(StateCatalog.CpnNeedLocation)); break;
                    case "user_limit": list.Add(new Feedback(StateCatalog.CpnUserLimit)); break;
                    default: list.Add(new Feedback(StateCatalog.CpnSoldOutBranch)); break;
                }
            }
            return list;
        }

        public static Feedback Issued(IssuedCoupon c, Language language) =>
            new Feedback(StateCatalog.CpnIssued, new Dictionary<string, string> { { "title", c.Title.Get(language) }, { "date", FormatDate(c.ExpiresAt) } });

        public static string NormalizeInvoice(string input) =>
            (input ?? string.Empty).Replace(" ", string.Empty).Replace("-", string.Empty).ToUpperInvariant();
    }
}

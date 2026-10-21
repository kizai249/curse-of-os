using System.Threading.Tasks;

namespace FootballQuest.Core.Accounts
{
    /// <summary>Firebase Auth (أو بديل المحاكي). العميل ما يحمل أي بيانات شخصية (PRODUCT_BRIEF ت6).</summary>
    public interface IAuthGateway
    {
        bool IsSignedIn { get; }
        string Uid { get; }
        /// <summary>"anonymous" أو "apple" أو "google".</summary>
        string Provider { get; }
        Task SignInAnonymouslyAsync();
        /// <summary>ربط الحساب المجهول الحالي بـ Apple أو Google مع الاحتفاظ بنفس uid.</summary>
        Task LinkAsync(LinkProvider provider);
        Task SignOutAsync();
    }

    /// <summary>الدوال الخاصة بالحساب — ARCHITECTURE.md §5.</summary>
    public interface IAccountApi
    {
        Task<BootstrapResult> BootstrapAsync();
        Task<SetAgeAndCityResult> SetAgeAndCityAsync(int? birthYear, string city);
        /// <summary>يرجع true إذا الحذف فوري (ما فيه ملف)، وfalse إذا مجدول خلال 30 يومًا.</summary>
        Task<bool> DeleteAccountAsync();
    }

    public interface IRemoteConfig
    {
        Task FetchAsync();
        string GetString(string key);
        bool GetBool(string key);
    }

    /// <summary>تخزين محلي غير حساس (PlayerPrefs). الأسرار في Keychain/Keystore (S7).</summary>
    public interface ILocalStore
    {
        bool GetBool(string key, bool fallback = false);
        void SetBool(string key, bool value);
        string GetString(string key, string fallback = null);
        void SetString(string key, string value);
    }
}

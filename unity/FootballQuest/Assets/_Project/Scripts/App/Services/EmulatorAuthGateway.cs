using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using UnityEngine;

namespace FootballQuest.App.Services
{
    /// <summary>
    /// Auth عبر REST لمحاكي Firebase Auth — للتطوير بدون Firebase SDK. الربط بـ Apple/Google غير متاح هنا
    /// (يحتاج SDK وأجهزة حقيقية)، فيرمي NotSupportedException وتعرض الإعدادات ذلك.
    /// </summary>
    public sealed class EmulatorAuthGateway : IAuthGateway
    {
        private const string UidKey = "fq.emu.uid";
        private const string IdTokenKey = "fq.emu.id_token";
        private const string RefreshTokenKey = "fq.emu.refresh_token";
        private const string ExpiresKey = "fq.emu.expires_at";

        public bool IsSignedIn => !string.IsNullOrEmpty(PlayerPrefs.GetString(UidKey, string.Empty));
        public string Uid => IsSignedIn ? PlayerPrefs.GetString(UidKey) : null;
        public string Provider => "anonymous";

        public async Task SignInAnonymouslyAsync()
        {
            var url = BackendSettings.AuthBaseUrl + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key";
            var res = await UnityHttp.PostJsonAsync(url, "{\"returnSecureToken\":true}");
            if (res.Status != 200) throw new BackendException("UNAVAILABLE", "auth emulator " + res.Status);
            var body = MiniJson.Parse(res.Body);
            Store(JsonFields.Str(body, "localId"), JsonFields.Str(body, "idToken"), JsonFields.Str(body, "refreshToken"), JsonFields.Str(body, "expiresIn"));
        }

        public Task LinkAsync(LinkProvider provider) =>
            Task.FromException(new NotSupportedException("Account linking needs the Firebase SDK (FQ_FIREBASE)."));

        public Task SignOutAsync()
        {
            PlayerPrefs.DeleteKey(UidKey);
            PlayerPrefs.DeleteKey(IdTokenKey);
            PlayerPrefs.DeleteKey(RefreshTokenKey);
            PlayerPrefs.DeleteKey(ExpiresKey);
            PlayerPrefs.Save();
            return Task.CompletedTask;
        }

        /// <summary>رمز صالح (يُجدد قبل انتهائه بدقيقة).</summary>
        public async Task<string> GetIdTokenAsync()
        {
            if (!IsSignedIn) return null;
            var expiresAt = long.TryParse(PlayerPrefs.GetString(ExpiresKey, "0"), out var e) ? e : 0;
            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() < expiresAt - 60) return PlayerPrefs.GetString(IdTokenKey);

            var url = BackendSettings.AuthBaseUrl + "/securetoken.googleapis.com/v1/token?key=fake-api-key";
            var payload = MiniJson.Serialize(new Dictionary<string, object>
            {
                { "grant_type", "refresh_token" },
                { "refresh_token", PlayerPrefs.GetString(RefreshTokenKey) },
            });
            var res = await UnityHttp.PostJsonAsync(url, payload);
            if (res.Status != 200)
            {
                // المستخدم انحذف أو تعطّل (حذف الحساب / أقل من 15): نبدأ من جديد.
                await SignOutAsync();
                return null;
            }
            var body = MiniJson.Parse(res.Body);
            Store(JsonFields.Str(body, "user_id"), JsonFields.Str(body, "id_token"), JsonFields.Str(body, "refresh_token"), JsonFields.Str(body, "expires_in"));
            return PlayerPrefs.GetString(IdTokenKey);
        }

        private static void Store(string uid, string idToken, string refreshToken, string expiresIn)
        {
            var seconds = long.TryParse(expiresIn, out var s) ? s : 3600;
            PlayerPrefs.SetString(UidKey, uid);
            PlayerPrefs.SetString(IdTokenKey, idToken);
            PlayerPrefs.SetString(RefreshTokenKey, refreshToken);
            PlayerPrefs.SetString(ExpiresKey, (DateTimeOffset.UtcNow.ToUnixTimeSeconds() + seconds).ToString());
            PlayerPrefs.Save();
        }
    }
}

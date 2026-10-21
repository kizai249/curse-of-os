using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Firebase;
using Firebase.AppCheck;
using Firebase.Auth;
using Firebase.Firestore;
using Firebase.Functions;
using Firebase.RemoteConfig;
using FootballQuest.App.Platform;
using FootballQuest.App.Services;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Collection;
using FootballQuest.Core.Content;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Location;
using UnityEngine;

namespace FootballQuest.FirebaseServices
{
    /// <summary>
    /// تنفيذ الخدمات فوق Firebase Unity SDK. التجميعة كلها مشروطة بـ FQ_FIREBASE (يتفعل تلقائيًا عند وجود
    /// حزمة com.google.firebase.functions ≥ 12)، فبدون SDK يبقى التطبيق على وضع المحاكي.
    /// TODO(Q7): إضافة حزم Firebase وتجربة هذا الملف على أجهزة حقيقية (ما تُبنى في CI قبلها).
    /// </summary>
    internal static class FirebaseInstaller
    {
        public static Task<FirebaseApp> Ready { get; private set; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Register()
        {
            // App Check قبل أي استخدام لـ Firebase (ARCHITECTURE §4: Play Integrity / App Attest).
            if (Debug.isDebugBuild || Application.isEditor)
                FirebaseAppCheck.SetAppCheckProviderFactory(DebugAppCheckProviderFactory.Instance);
            else if (Application.platform == RuntimePlatform.Android)
                FirebaseAppCheck.SetAppCheckProviderFactory(PlayIntegrityProviderFactory.Instance);
            else if (Application.platform == RuntimePlatform.IPhonePlayer)
                FirebaseAppCheck.SetAppCheckProviderFactory(AppAttestProviderFactory.Instance);

            Ready = FirebaseApp.CheckAndFixDependenciesAsync().ContinueWith(t =>
            {
                if (t.Result != DependencyStatus.Available) throw new InvalidOperationException("Firebase unavailable: " + t.Result);
                return FirebaseApp.DefaultInstance;
            });

            AppServices.FirebaseFactory = () =>
            {
                var functions = new FirebaseFunctionsClient();
                return new AppServices
                {
                    Auth = new FirebaseAuthGateway(),
                    Functions = functions,
                    Accounts = new AccountApi(functions),
                    Economy = new EconomyApi(functions),
                    Presence = new PresenceApi(functions),
                    Location = NativeLocationService.Create(),
                    RemoteConfig = new FirebaseRemoteConfigGateway(),
                    Store = new PlayerPrefsStore(),
                    Permissions = NativePermissionService.Create(),
                    Content = new ContentRepository(new FirestoreContentSource(), new FileContentCache()),
                    Collection = new FirestoreCollectionSource(),
                    Coupons = new CouponsApi(functions),
                    Wallet = new FirestoreCouponSource(),
                    Vault = new RedeemCodeVault(SecureStore.Create()),
                    UsesEmulator = false,
                };
            };
        }
    }

    internal sealed class FirebaseAuthGateway : IAuthGateway
    {
        private static FirebaseAuth Auth => FirebaseAuth.DefaultInstance;
        private static bool Initialized => FirebaseInstaller.Ready != null && FirebaseInstaller.Ready.Status == TaskStatus.RanToCompletion;

        public bool IsSignedIn => Initialized && Auth.CurrentUser != null;
        public string Uid => IsSignedIn ? Auth.CurrentUser.UserId : null;

        public string Provider
        {
            get
            {
                if (!IsSignedIn || Auth.CurrentUser.IsAnonymous) return "anonymous";
                var ids = Auth.CurrentUser.ProviderData.Select(p => p.ProviderId).ToList();
                return ids.Contains("apple.com") ? "apple" : ids.Contains("google.com") ? "google" : "anonymous";
            }
        }

        public async Task SignInAnonymouslyAsync()
        {
            await FirebaseInstaller.Ready;
            await Auth.SignInAnonymouslyAsync();
        }

        /// <summary>
        /// ربط الحساب المجهول بنفس uid. Apple عبر FederatedOAuthProvider.
        /// TODO(Q9): التحقق من Google عبر FederatedOAuthProvider على الأجهزة؛ وإذا ما نفع نحتاج إضافة
        /// Google Sign-In plugin (يتطلب تسجيله في RIGHTS_REGISTER).
        /// </summary>
        public async Task LinkAsync(LinkProvider provider)
        {
            await FirebaseInstaller.Ready;
            var data = new FederatedOAuthProviderData
            {
                ProviderId = provider == LinkProvider.Apple ? "apple.com" : "google.com",
            };
            var oauth = new FederatedOAuthProvider();
            oauth.SetProviderData(data);
            await Auth.CurrentUser.LinkWithProviderAsync(oauth);
            await Auth.CurrentUser.TokenAsync(true);
        }

        public async Task SignOutAsync()
        {
            await FirebaseInstaller.Ready;
            Auth.SignOut();
        }
    }

    internal sealed class FirebaseFunctionsClient : IFunctionsClient
    {
        public async Task<object> CallAsync(string name, IDictionary<string, object> data)
        {
            var app = await FirebaseInstaller.Ready;
            var callable = FirebaseFunctions.GetInstance(app, BackendSettings.Region).GetHttpsCallable(name);
            try
            {
                var result = await callable.CallAsync(data);
                return Normalize(result.Data);
            }
            catch (FunctionsException ex)
            {
                // الـSDK ما يكشف `details`؛ الخادم يحط stateId في الرسالة نفسها (BackendException.StateId يرجع لها).
                throw new BackendException(ToStatus(ex.ErrorCode.ToString()), ex.Message);
            }
            catch (AggregateException ex) when (ex.InnerException is FunctionsException inner)
            {
                throw new BackendException(ToStatus(inner.ErrorCode.ToString()), inner.Message);
            }
        }

        /// <summary>Firebase يرجع Dictionary&lt;object, object&gt; وأرقام long — نوحّدها لشكل MiniJson.</summary>
        internal static object Normalize(object value)
        {
            switch (value)
            {
                case IDictionary dict:
                    var map = new Dictionary<string, object>();
                    foreach (DictionaryEntry e in dict) map[e.Key.ToString()] = Normalize(e.Value);
                    return map;
                case string s:
                    return s;
                case IEnumerable list:
                    return list.Cast<object>().Select(Normalize).ToList();
                case Timestamp ts:
                    return ts.ToDateTime().ToUniversalTime().ToString("o");
                case long l:
                    return (double)l;
                case int i:
                    return (double)i;
                default:
                    return value;
            }
        }

        /// <summary>FailedPrecondition ← FAILED_PRECONDITION.</summary>
        private static string ToStatus(string pascal)
        {
            var sb = new StringBuilder();
            for (var i = 0; i < pascal.Length; i++)
            {
                if (i > 0 && char.IsUpper(pascal[i])) sb.Append('_');
                sb.Append(char.ToUpperInvariant(pascal[i]));
            }
            return sb.ToString();
        }
    }

    /// <summary>المحتوى العام من Firestore (القواعد: قراءة للمسجلين). الكاش المحلي يقلل القراءات (ARCHITECTURE §11).</summary>
    internal sealed class FirestoreContentSource : IContentSource
    {
        public async Task<object> GetDocumentAsync(string path)
        {
            await FirebaseInstaller.Ready;
            var snapshot = await FirebaseFirestore.DefaultInstance.Document(path).GetSnapshotAsync(Source.Server);
            return snapshot.Exists ? FirebaseFunctionsClient.Normalize(snapshot.ToDictionary()) : null;
        }
    }

    internal sealed class FirestoreCollectionSource : ICollectionSource
    {
        public async Task<List<OwnedCard>> GetTeamCardsAsync(string uid)
        {
            await FirebaseInstaller.Ready;
            var snapshot = await FirebaseFirestore.DefaultInstance.Collection($"users/{uid}/teamCards").GetSnapshotAsync();
            return Album.ParseCards(snapshot.Documents.Select(d => FirebaseFunctionsClient.Normalize(d.ToDictionary())).ToList());
        }
    }

    internal sealed class FirestoreCouponSource : ICouponSource
    {
        public async Task<List<CouponInfo>> GetMyCouponsAsync(string uid)
        {
            await FirebaseInstaller.Ready;
            // الفلتر على uid شرط قاعدة الأمان (اللاعب يقرأ قسائمه فقط).
            var snapshot = await FirebaseFirestore.DefaultInstance.Collection("coupons").WhereEqualTo("uid", uid).GetSnapshotAsync();
            return snapshot.Documents.Select(d => CouponInfo.Parse(d.Id, FirebaseFunctionsClient.Normalize(d.ToDictionary()))).ToList();
        }
    }

    internal sealed class FirebaseRemoteConfigGateway : IRemoteConfig
    {
        private bool ready;

        public async Task FetchAsync()
        {
            await FirebaseInstaller.Ready;
            var config = FirebaseRemoteConfig.DefaultInstance;
            await config.SetDefaultsAsync(RemoteConfigKeys.Defaults.ToDictionary(kv => kv.Key, kv => (object)kv.Value));
            ready = true;
            await config.FetchAndActivateAsync();
        }

        public string GetString(string key)
        {
            if (!ready) return RemoteConfigKeys.Defaults.TryGetValue(key, out var v) ? v : string.Empty;
            return FirebaseRemoteConfig.DefaultInstance.GetValue(key).StringValue;
        }

        public bool GetBool(string key) => GetString(key) == "true";
    }
}

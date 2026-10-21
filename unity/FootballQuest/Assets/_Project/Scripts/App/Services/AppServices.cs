using System;
using FootballQuest.App.Platform;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Analytics;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Collection;
using FootballQuest.Core.Content;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Location;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;

namespace FootballQuest.App.Services
{
    /// <summary>
    /// جذر التركيب (Composition Root). الافتراضي: المحاكي عبر HTTP. لما تُضاف حزم Firebase SDK،
    /// تجميعة FootballQuest.Firebase (FQ_FIREBASE) تسجّل `FirebaseFactory` قبل تحميل أي مشهد.
    /// </summary>
    public sealed class AppServices
    {
        public const string LanguageKey = "fq.language";

        /// <summary>تسجّله تجميعة Firebase. null = وضع المحاكي.</summary>
        public static Func<AppServices> FirebaseFactory;

        public static AppServices Current { get; private set; }

        public IAuthGateway Auth { get; set; }
        public IFunctionsClient Functions { get; set; }
        public IAccountApi Accounts { get; set; }
        public IEconomyApi Economy { get; set; }
        public IPresenceApi Presence { get; set; }
        public ILocationService Location { get; set; }
        public IRemoteConfig RemoteConfig { get; set; }
        public ILocalStore Store { get; set; }
        public IPermissionService Permissions { get; set; }
        public ContentRepository Content { get; set; }
        public ICollectionSource Collection { get; set; }
        public ICouponsApi Coupons { get; set; }
        public ICouponSource Wallet { get; set; }
        public RedeemCodeVault Vault { get; set; }
        public EventQueue Events { get; set; }
        public bool UsesEmulator { get; set; }

        public Language Language
        {
            get => LanguageExtensions.FromCode(Store.GetString(LanguageKey, "ar"));
            set => Store.SetString(LanguageKey, value.Code());
        }

        public static AppServices Create()
        {
            Current = FirebaseFactory != null ? FirebaseFactory() : CreateEmulator();
            var platform = UnityEngine.Application.platform == UnityEngine.RuntimePlatform.IPhonePlayer ? "ios" : "android";
            Current.Events = new EventQueue(Current.Functions, platform, UnityEngine.Application.version);
            return Current;
        }

        public static AppServices CreateEmulator()
        {
            var auth = new EmulatorAuthGateway();
            var functions = new EmulatorFunctionsClient(auth);
            return new AppServices
            {
                Auth = auth,
                Functions = functions,
                Accounts = new AccountApi(functions),
                Economy = new EconomyApi(functions),
                Presence = new PresenceApi(functions),
                Location = NativeLocationService.Create(),
                RemoteConfig = new LocalRemoteConfig(),
                Store = new PlayerPrefsStore(),
                Permissions = NativePermissionService.Create(),
                Content = new ContentRepository(new EmulatorContentSource(auth), new FileContentCache()),
                Collection = new EmulatorCollectionSource(auth),
                Coupons = new CouponsApi(functions),
                Wallet = new EmulatorCouponSource(auth),
                Vault = new RedeemCodeVault(SecureStore.Create()),
                UsesEmulator = true,
            };
        }
    }
}

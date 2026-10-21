using System;
using FootballQuest.App.Platform;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Content;
using FootballQuest.Core.Economy;
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
        public IRemoteConfig RemoteConfig { get; set; }
        public ILocalStore Store { get; set; }
        public IPermissionService Permissions { get; set; }
        public ContentRepository Content { get; set; }
        public bool UsesEmulator { get; set; }

        public Language Language
        {
            get => LanguageExtensions.FromCode(Store.GetString(LanguageKey, "ar"));
            set => Store.SetString(LanguageKey, value.Code());
        }

        public static AppServices Create()
        {
            Current = FirebaseFactory != null ? FirebaseFactory() : CreateEmulator();
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
                RemoteConfig = new LocalRemoteConfig(),
                Store = new PlayerPrefsStore(),
                Permissions = NativePermissionService.Create(),
                Content = new ContentRepository(new EmulatorContentSource(auth), new FileContentCache()),
                UsesEmulator = true,
            };
        }
    }
}

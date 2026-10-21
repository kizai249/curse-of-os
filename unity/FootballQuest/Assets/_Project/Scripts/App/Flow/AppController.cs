using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.App.Services;
using FootballQuest.App.UI;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Onboarding;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace FootballQuest.App.Flow
{
    /// <summary>
    /// يدير التطبيق من الإقلاع: الـOnboarding ثم الـHub والإعدادات. يعيش طوال الجلسة (DontDestroyOnLoad).
    /// المنطق كله في FootballQuest.Core (مختبر بـ dotnet)، وهذا الصنف يربطه بالواجهة فقط.
    /// </summary>
    public sealed partial class AppController : MonoBehaviour
    {
        private const float ReachabilityPollSeconds = 2f;

        private AppServices services;
        private UiRoot ui;
        private OnboardingFlow onboarding;
        private PermissionFlow locationFlow;
        private PermissionFlow cameraFlow;
        private bool offline;

        public static AppController Instance { get; private set; }

        private Language Lang => services.Language;

        public static void Launch()
        {
            if (Instance != null) return;
            var go = new GameObject("AppController");
            DontDestroyOnLoad(go);
            Instance = go.AddComponent<AppController>();
        }

        private void Awake()
        {
            services = AppServices.Create();
            ui = UiRoot.Create();
            locationFlow = new PermissionFlow(PermissionKind.Location);
            cameraFlow = new PermissionFlow(PermissionKind.Camera);
            NewOnboarding();
            SceneManager.sceneLoaded += OnSceneLoaded;
            InvokeRepeating(nameof(PollReachability), 0f, ReachabilityPollSeconds);
        }

        private void Start() => Run(onboarding.StartAsync());

        private void NewOnboarding()
        {
            onboarding = new OnboardingFlow(services.Auth, services.Accounts, services.RemoteConfig, services.Store, Application.version);
            onboarding.StepChanged += RenderOnboarding;
        }

        /// <summary>NET_OFFLINE: شريط ثابت، والتصفح يكمل (PERMISSION_AND_ERROR_STATES §7).</summary>
        private void PollReachability()
        {
            var nowOffline = Application.internetReachability == NetworkReachability.NotReachable;
            if (nowOffline == offline) return;
            offline = nowOffline;
            ui.Banner(offline ? State(StateCatalog.NetOffline) : null, Lang);
        }

        private string T(string key) => UiStrings.Get(key, Lang);

        private string State(string id, IDictionary<string, string> values = null) =>
            StateCatalog.Get(id)?.Format(Lang, values) ?? id;

        /// <summary>يعرض حالة حسب نوع عرضها (toast/sheet/dialog). inline تتعامل معها الشاشة نفسها.</summary>
        private void ShowState(string id, IDictionary<string, string> values = null, params SheetButton[] buttons)
        {
            var state = StateCatalog.Get(id);
            if (state == null) return;
            var body = state.Format(Lang, values);
            switch (state.Presentation)
            {
                case Presentation.Toast:
                    ui.Toast(body, Lang);
                    break;
                case Presentation.Dialog:
                    ui.Dialog(body, Lang, buttons.Length > 0 ? buttons : new[] { new SheetButton(T(UiStrings.Ok), null) });
                    break;
                case Presentation.Sheet:
                    ui.Sheet(state.Title(Lang), body, Lang, buttons.Length > 0 ? buttons : new[] { new SheetButton(T(UiStrings.Ok), null) });
                    break;
                case Presentation.Hidden:
                    break;
                default:
                    ui.Toast(body, Lang);
                    break;
            }
        }

        private void ShowError(Exception ex)
        {
            if (ex is BackendException backend)
            {
                ShowState(ErrorStates.ToStateId(backend) ?? StateCatalog.SrvBusy);
                return;
            }
            Debug.LogException(ex);
            ShowState(StateCatalog.SrvBusy);
        }

        /// <summary>تشغيل Task من حدث واجهة مع تسجيل أي استثناء غير متوقع.</summary>
        private void Run(Task task)
        {
            task.ContinueWith(t =>
            {
                if (t.Exception != null) Debug.LogException(t.Exception);
            }, TaskScheduler.FromCurrentSynchronizationContext());
        }

        private void OnDestroy() => SceneManager.sceneLoaded -= OnSceneLoaded;
    }
}

using System;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Onboarding
{
    public enum OnboardingStep
    {
        Starting,
        /// <summary>FORCE_UPDATE — شاشة كاملة.</summary>
        ForceUpdate,
        /// <summary>شاشة البداية بالإفصاح (أول تشغيل) — RIGHTS_REGISTER §4.</summary>
        Disclaimer,
        /// <summary>AGE_GATE.</summary>
        AgeGate,
        /// <summary>AGE_UNDER_15 — بدون إنشاء حساب.</summary>
        Under15,
        CityPick,
        Submitting,
        /// <summary>الحساب في انتظار الحذف (ACC_DELETE_DONE).</summary>
        DeletionPending,
        /// <summary>خطأ قابل لإعادة المحاولة (ErrorStateId).</summary>
        Error,
        Ready,
    }

    /// <summary>
    /// تدفق أول تشغيل: التحديث الإجباري ← الإفصاح ← بوابة العمر ← المدينة ← حساب ضيف ← `setAgeAndCity`.
    /// بوابة العمر قبل تسجيل الدخول عشان من هو أقل من 15 ما يُنشأ له أي حساب (GAME_RULES §9.5).
    /// اللاعب العائد: `bootstrap` مباشرة.
    /// </summary>
    public sealed class OnboardingFlow
    {
        public const string DisclaimerSeenKey = "fq.disclaimer_seen";

        private readonly IAuthGateway auth;
        private readonly IAccountApi api;
        private readonly IRemoteConfig remoteConfig;
        private readonly ILocalStore store;
        private readonly string appVersion;
        private readonly Func<DateTimeOffset> clock;
        private readonly Func<int, Task> retryDelay;

        private int? birthYear;

        public OnboardingFlow(
            IAuthGateway auth,
            IAccountApi api,
            IRemoteConfig remoteConfig,
            ILocalStore store,
            string appVersion,
            Func<DateTimeOffset> clock = null,
            Func<int, Task> retryDelay = null)
        {
            this.auth = auth;
            this.api = api;
            this.remoteConfig = remoteConfig;
            this.store = store;
            this.appVersion = appVersion;
            this.clock = clock ?? (() => DateTimeOffset.UtcNow);
            this.retryDelay = retryDelay;
        }

        public event Action<OnboardingStep> StepChanged;

        public OnboardingStep Step { get; private set; } = OnboardingStep.Starting;
        public string ErrorStateId { get; private set; }
        public PlayerProfile Profile { get; private set; }

        /// <summary>آخر نتيجة `bootstrap` (ومنها الدخول اليومي) — null قبل أول نجاح.</summary>
        public BootstrapResult LastBootstrap { get; private set; }

        /// <summary>يُستدعى عند الإقلاع.</summary>
        public async Task StartAsync()
        {
            try
            {
                await remoteConfig.FetchAsync();
            }
            catch (Exception)
            {
                // Remote Config اختياري عند الإقلاع: القيم الافتراضية تكفي، وما نمنع اللعب بدون اتصال.
            }

            if (AppVersion.RequiresUpdate(appVersion, remoteConfig.GetString(RemoteConfigKeys.MinAppVersion)))
            {
                Go(OnboardingStep.ForceUpdate);
                return;
            }

            if (!store.GetBool(DisclaimerSeenKey))
            {
                Go(OnboardingStep.Disclaimer);
                return;
            }

            await ResumeAsync();
        }

        public Task AcknowledgeDisclaimerAsync()
        {
            store.SetBool(DisclaimerSeenKey, true);
            return ResumeAsync();
        }

        /// <summary>اختيار سنة الميلاد. ما يُرسل شي للخادم هنا.</summary>
        public AgeGateResult SubmitBirthYear(int year)
        {
            var result = AgeGate.Evaluate(year, clock());
            switch (result)
            {
                case AgeGateResult.Invalid:
                    return result;
                case AgeGateResult.Under15:
                    birthYear = null;
                    Go(OnboardingStep.Under15);
                    return result;
                default:
                    birthYear = year;
                    Go(OnboardingStep.CityPick);
                    return result;
            }
        }

        public async Task SubmitCityAsync(string cityCode)
        {
            if (Array.IndexOf(new[] { "RUH", "JED", "KHB" }, cityCode) < 0) throw new ArgumentException("unknown city " + cityCode);
            if (birthYear == null) throw new InvalidOperationException("birth year must be submitted first");

            Go(OnboardingStep.Submitting);
            try
            {
                if (!auth.IsSignedIn) await auth.SignInAnonymouslyAsync();
                var result = await Retry.RunAsync(_ => api.SetAgeAndCityAsync(birthYear, cityCode), retryDelay);
                if (result.Under15)
                {
                    // الخادم حذف المستخدم المجهول؛ ننظف الجلسة المحلية.
                    await auth.SignOutAsync();
                    birthYear = null;
                    Go(OnboardingStep.Under15);
                    return;
                }
                Profile = result.Profile;
                // بعد إنشاء الملف: bootstrap يعطي الأرصدة والدخول اليومي الأول.
                await ResumeAsync();
            }
            catch (BackendException ex)
            {
                Fail(ex);
            }
        }

        /// <summary>زر «جرّب مرة ثانية» في حالة الخطأ.</summary>
        public Task RetryAsync() => ResumeAsync();

        /// <summary>بعد ACC_DELETE_DONE: تسجيل خروج والبدء من بوابة العمر كلاعب جديد.</summary>
        public async Task AcknowledgeDeletionAsync()
        {
            await auth.SignOutAsync();
            Profile = null;
            Go(OnboardingStep.AgeGate);
        }

        private async Task ResumeAsync()
        {
            if (!auth.IsSignedIn)
            {
                Go(birthYear == null ? OnboardingStep.AgeGate : OnboardingStep.CityPick);
                return;
            }

            Go(OnboardingStep.Submitting);
            try
            {
                var result = await Retry.RunAsync(_ => api.BootstrapAsync(), retryDelay);
                LastBootstrap = result;
                switch (result.Status)
                {
                    case BootstrapStatus.Ok:
                        Profile = result.Profile;
                        Go(OnboardingStep.Ready);
                        break;
                    case BootstrapStatus.DeletionPending:
                        Go(OnboardingStep.DeletionPending);
                        break;
                    default:
                        Go(birthYear == null ? OnboardingStep.AgeGate : OnboardingStep.CityPick);
                        break;
                }
            }
            catch (BackendException ex)
            {
                Fail(ex);
            }
        }

        private void Fail(BackendException ex)
        {
            ErrorStateId = ErrorStates.ToStateId(ex) ?? StateCatalog.SrvBusy;
            Go(OnboardingStep.Error);
        }

        private void Go(OnboardingStep step)
        {
            if (step != OnboardingStep.Error) ErrorStateId = null;
            Step = step;
            StepChanged?.Invoke(step);
        }
    }
}

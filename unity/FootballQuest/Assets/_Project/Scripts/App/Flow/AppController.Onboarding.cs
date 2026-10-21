using FootballQuest.App.UI;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Onboarding;
using FootballQuest.Core.Ui;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    public sealed partial class AppController
    {
        // TODO(owner): معرّف التطبيق في App Store بعد إنشائه (S10a). Android يستخدم معرّف الحزمة.
        private const string AppStoreUrl = "";

        private int pickerYear;

        private void RenderOnboarding(OnboardingStep step)
        {
            switch (step)
            {
                case OnboardingStep.ForceUpdate: RenderForceUpdate(); break;
                case OnboardingStep.Disclaimer: RenderDisclaimer(); break;
                case OnboardingStep.AgeGate: RenderAgeGate(); break;
                case OnboardingStep.Under15: RenderMessage(StateCatalog.AgeUnder15); break; // بدون أزرار: ما يُنشأ حساب.
                case OnboardingStep.CityPick: RenderCityPick(); break;
                case OnboardingStep.DeletionPending: RenderDeletionPending(); break;
                case OnboardingStep.Error: RenderError(); break;
                case OnboardingStep.Ready:
                    hubVisible = true;
                    RenderHub();
                    AutoPresence(FootballQuest.Core.Location.PresenceTrigger.AppOpen);
                    break;
                default: RenderLoading(); break;
            }
        }

        private void RenderLoading()
        {
            var screen = ui.NewScreen("Loading");
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, "…", Lang, UiTheme.TitleSize, center: true);
            UiFactory.Spacer(screen);
        }

        private void RenderDisclaimer()
        {
            var screen = ui.NewScreen("Disclaimer");
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, "Football Quest", Lang, UiTheme.TitleSize, bold: true, color: UiTheme.Accent, center: true);
            UiFactory.Label(screen, DisclaimerText(), Lang, UiTheme.BodySize, color: UiTheme.TextMuted);
            UiFactory.Spacer(screen);
            LanguageToggle(screen, RenderDisclaimer);
            UiFactory.Button(screen, T(UiStrings.Continue), Lang, () => Run(onboarding.AcknowledgeDisclaimerAsync()));
        }

        private void RenderAgeGate()
        {
            if (pickerYear == 0) pickerYear = AgeGate.DefaultPickerYear(System.DateTimeOffset.UtcNow);
            var screen = ui.NewScreen("AgeGate");
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, State(StateCatalog.AgeGate), Lang, UiTheme.HeadingSize, bold: true);

            var row = UiFactory.HStack(screen, "YearPicker", Lang);
            UiFactory.Size(row, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            // الأسهم تتبع اتجاه القراءة: «التالي» يقلل العمر ← سنة أكبر.
            UiFactory.Button(row, "−10", Lang, () => StepYear(-10), ButtonStyle.Secondary);
            UiFactory.Button(row, "−1", Lang, () => StepYear(-1), ButtonStyle.Secondary);
            UiFactory.Label(row, pickerYear.ToString(), Lang, UiTheme.TitleSize, bold: true, center: true);
            UiFactory.Button(row, "+1", Lang, () => StepYear(1), ButtonStyle.Secondary);
            UiFactory.Button(row, "+10", Lang, () => StepYear(10), ButtonStyle.Secondary);
            UiFactory.Label(screen, T(UiStrings.BirthYear), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted, center: true);

            UiFactory.Spacer(screen);
            UiFactory.Button(screen, T(UiStrings.Confirm), Lang, () => onboarding.SubmitBirthYear(pickerYear));
        }

        private void StepYear(int delta)
        {
            var max = AgeGate.RiyadhYear(System.DateTimeOffset.UtcNow);
            pickerYear = Mathf.Clamp(pickerYear + delta, max - 100, max);
            RenderAgeGate();
        }

        private void RenderCityPick()
        {
            var screen = ui.NewScreen("CityPick");
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, T(UiStrings.ChooseCity), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Label(screen, T(UiStrings.ChooseCityHint), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
            foreach (var city in new[] { "RUH", "JED", "KHB" })
            {
                var code = city;
                UiFactory.Button(screen, UiStrings.CityName(code, Lang), Lang, () => Run(onboarding.SubmitCityAsync(code)), ButtonStyle.Secondary);
            }
            UiFactory.Spacer(screen);
        }

        private RectTransform RenderMessage(string stateId)
        {
            var screen = ui.NewScreen(stateId);
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, State(stateId), Lang, UiTheme.HeadingSize, bold: true, center: true);
            UiFactory.Spacer(screen);
            return screen;
        }

        private void RenderForceUpdate()
        {
            var screen = RenderMessage(StateCatalog.ForceUpdate);
            UiFactory.Button(screen, T(UiStrings.UpdateNow), Lang, OpenStore);
        }

        private void RenderError()
        {
            var screen = ui.NewScreen("Error");
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, State(onboarding.ErrorStateId ?? StateCatalog.SrvBusy), Lang, UiTheme.HeadingSize, center: true);
            UiFactory.Spacer(screen);
            if (onboarding.ErrorStateId == StateCatalog.AppIntegrity)
            {
                UiFactory.Button(screen, T(UiStrings.UpdateNow), Lang, OpenStore, ButtonStyle.Secondary);
            }
            UiFactory.Button(screen, T(UiStrings.Retry), Lang, () => Run(onboarding.RetryAsync()));
        }

        private void RenderDeletionPending()
        {
            RenderLoading();
            ui.Dialog(State(StateCatalog.AccDeleteDone), Lang,
                new SheetButton(T(UiStrings.Ok), () => Run(onboarding.AcknowledgeDeletionAsync())));
        }

        private string DisclaimerText()
        {
            // Remote Config `disclaimer_text` = {"ar": "...", "en": "..."} يتقدم على النص المدمج.
            var raw = services.RemoteConfig.GetString(RemoteConfigKeys.DisclaimerText);
            if (!string.IsNullOrEmpty(raw))
            {
                try
                {
                    var remote = JsonFields.Str(MiniJson.Parse(raw), Lang.Code());
                    if (!string.IsNullOrEmpty(remote)) return remote;
                }
                catch (System.FormatException)
                {
                    Debug.LogWarning("[Disclaimer] invalid disclaimer_text in Remote Config");
                }
            }
            return T(UiStrings.Disclaimer);
        }

        private void LanguageToggle(Transform parent, System.Action rerender)
        {
            var other = Lang == Language.Arabic ? Language.English : Language.Arabic;
            UiFactory.Button(parent, UiStrings.Get(UiStrings.LanguageName, other), Lang, () =>
            {
                services.Language = other;
                rerender();
            }, ButtonStyle.Ghost);
        }

        private static void OpenStore()
        {
            if (Application.platform == RuntimePlatform.Android) Application.OpenURL("market://details?id=" + Application.identifier);
            else if (!string.IsNullOrEmpty(AppStoreUrl)) Application.OpenURL(AppStoreUrl);
        }
    }
}

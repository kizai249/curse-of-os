using FootballQuest.App.UI;
using FootballQuest.Core.Onboarding;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    public sealed partial class AppController
    {
        private bool hubVisible;

        /// <summary>
        /// الـHub في S2: الملف + بطاقة المكافآت الميدانية (حالات الإذن) + الإعدادات.
        /// TODO(S3): الخارطة ثلاثية الأبعاد (لوحات المدن والمحطات) خلف هذي الطبقة.
        /// </summary>
        private void RenderHub()
        {
            hubVisible = true;
            var profile = onboarding.Profile;
            var screen = ui.NewScreen("Hub");

            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, profile?.DisplayName ?? string.Empty, Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.Settings), Lang, RenderSettings, ButtonStyle.Ghost);

            if (profile != null)
            {
                UiFactory.Label(screen, UiStrings.CityName(profile.City, Lang), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
            }

            UiFactory.Label(screen, T(UiStrings.MapComingSoon), Lang, UiTheme.TitleSize, bold: true, color: UiTheme.Accent, center: true);
            UiFactory.Spacer(screen);

            // بطاقة المكافآت الميدانية: حالة الإذن تظهر inline فقط، بدون أي طلب تلقائي.
            var card = UiFactory.VStack(screen, "FieldRewards", padding: 32);
            card.gameObject.AddComponent<UnityEngine.UI.Image>().color = UiTheme.Surface;
            var status = services.Permissions.GetStatus(PermissionKind.Location);
            var passive = PermissionFlow.PassiveStateFor(PermissionKind.Location, status);
            if (passive != null)
            {
                UiFactory.Label(card, State(passive), Lang, UiTheme.SmallSize, color: UiTheme.Warning);
                if (status == PermissionStatus.Denied)
                {
                    UiFactory.Button(card, T(UiStrings.EnableFromSettings), Lang, services.Permissions.OpenAppSettings, ButtonStyle.Secondary);
                }
            }
            // TODO(S6): verifyPresence بعد جاهزية الإذن (نقاط القرب وبطاقة «أنت قريب من فرع»).
            UiFactory.Button(card, T(UiStrings.CheckNearby), Lang,
                () => RequestFieldFeature(PermissionKind.Location, () => Debug.Log("[Hub] location ready — verifyPresence arrives in S6")),
                ButtonStyle.Secondary);
            // TODO(S7): ماسح QR (ZXing.Net) ثم scanBranchCode، والإدخال اليدوي.
            UiFactory.Button(card, T(UiStrings.ScanBranch), Lang,
                () => RequestFieldFeature(PermissionKind.Camera, () => Debug.Log("[Hub] camera ready — scanner arrives in S7")),
                ButtonStyle.Primary);
        }

        private void RefreshHubIfVisible()
        {
            if (hubVisible && onboarding.Step == OnboardingStep.Ready) RenderHub();
        }

        /// <summary>رجوع من الخلفية: نحدّث حالة الإذن (اللاعب ممكن فعّله من الإعدادات).</summary>
        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus) RefreshHubIfVisible();
        }
    }
}

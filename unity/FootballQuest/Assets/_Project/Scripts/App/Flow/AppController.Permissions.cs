using System;
using System.Threading.Tasks;
using FootballQuest.App.UI;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;

namespace FootballQuest.App.Flow
{
    public sealed partial class AppController
    {
        /// <summary>
        /// يمرّر ضغطة ميزة ميدانية عبر PermissionFlow: شرح مسبق ← إذن النظام ← الحالة المناسبة.
        /// `onReady` يُستدعى فقط إذا الإذن جاهز. ما فيه أي مسار يمنع اللعب الرقمي (AT-01).
        /// </summary>
        private void RequestFieldFeature(PermissionKind kind, Action onReady, Action onManualEntry = null)
        {
            var flow = kind == PermissionKind.Location ? locationFlow : cameraFlow;
            Handle(flow.OnFeatureRequested(services.Permissions.GetStatus(kind)));

            void Handle(PermissionDecision decision)
            {
                switch (decision.Action)
                {
                    case PermissionAction.Proceed:
                        onReady?.Invoke();
                        break;
                    case PermissionAction.ShowPrePrompt:
                        ShowState(decision.StateId, null,
                            new SheetButton(T(UiStrings.Allow), () => Handle(flow.OnPrePromptAnswered(true))),
                            new SheetButton(T(UiStrings.NotNow), () => Handle(flow.OnPrePromptAnswered(false)), ButtonStyle.Ghost));
                        break;
                    case PermissionAction.RequestSystem:
                        Run(RequestSystemAsync());
                        break;
                    case PermissionAction.ShowState:
                        ShowPermissionState(decision.StateId, onManualEntry);
                        break;
                    case PermissionAction.SkipSilently:
                        RefreshHubIfVisible();
                        break;
                }
            }

            async Task RequestSystemAsync()
            {
                var status = await services.Permissions.RequestAsync(kind);
                Handle(flow.OnSystemResult(status));
                RefreshHubIfVisible();
            }
        }

        private void ShowPermissionState(string stateId, Action onManualEntry)
        {
            switch (stateId)
            {
                case StateCatalog.LocApproxOnly:
                    ShowState(stateId, null,
                        new SheetButton(T(UiStrings.OpenSettings), services.Permissions.OpenAppSettings),
                        new SheetButton(T(UiStrings.Later), null, ButtonStyle.Ghost));
                    break;
                case StateCatalog.CamDenied:
                    ShowState(stateId, null,
                        new SheetButton(T(UiStrings.ManualEntry), onManualEntry),
                        new SheetButton(T(UiStrings.OpenSettings), services.Permissions.OpenAppSettings, ButtonStyle.Secondary));
                    break;
                default:
                    // LOC_DENIED وLOC_RESTRICTED: inline في بطاقة المكافآت الميدانية — ما فيه نافذة ولا إعادة طلب.
                    RefreshHubIfVisible();
                    break;
            }
        }
    }
}

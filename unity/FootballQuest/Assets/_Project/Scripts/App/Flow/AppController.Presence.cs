using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FootballQuest.App.UI;
using FootballQuest.Core.Location;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    /// <summary>
    /// الموقع في الواجهة فقط (S6) — GAME_RULES §6.1–6.2 وARCHITECTURE §2.1:
    /// قراءة وحدة عند الفتح، أو الرجوع من الخلفية، أو ضغط «تحقق من قربي». ما فيه أي طلب إذن تلقائي.
    /// </summary>
    public sealed partial class AppController
    {
        private DateTimeOffset? lastPresenceCheck;
        private bool presenceRunning;

        private static string Platform => Application.platform == RuntimePlatform.IPhonePlayer ? "ios" : "android";

        /// <summary>تلقائي: فقط إذا الإذن الدقيق ممنوح من قبل (ما نعرض أي طلب)، وبحد أدنى بين القراءات للبطارية.</summary>
        private void AutoPresence(PresenceTrigger trigger)
        {
            if (services.Permissions.GetStatus(PermissionKind.Location) != PermissionStatus.Granted) return;
            if (!PresencePolicy.ShouldAutoCheck(lastPresenceCheck, DateTimeOffset.UtcNow)) return;
            Run(CheckPresenceAsync(trigger));
        }

        private async Task CheckPresenceAsync(PresenceTrigger trigger)
        {
            if (presenceRunning) return;
            presenceRunning = true;
            lastPresenceCheck = DateTimeOffset.UtcNow;
            try
            {
                var reading = await services.Location.ReadOnceAsync(PresencePolicy.ReadTimeoutMs);
                var local = PresencePolicy.LocalCheck(reading, trigger);
                if (local != null)
                {
                    if (local.StateId != null) ShowState(local.StateId);
                    return;
                }
                var result = await services.Presence.VerifyAsync(reading, Platform);
                if (result.Balances != null) ApplyBalances(result.Balances);
                ShowPresenceFeedback(PresencePolicy.Feedback(result, trigger, id => content.Stadium(id)?.Name(Lang) ?? id, Lang));
                foreach (var b in result.Branches)
                {
                    services.Events.BranchNearbyShown(b.BranchId, b.BrandId, b.ZoneRadiusM, result.AccuracyBand, b.ActiveCampaigns);
                }
                if (hubVisible) RenderHub();
            }
            catch (Exception ex)
            {
                if (trigger == PresenceTrigger.Manual) ShowError(ex);
                else Debug.LogWarning("[Presence] " + ex.Message);
            }
            finally
            {
                presenceRunning = false;
            }
        }

        /// <summary>الرسائل القصيرة مجمّعة في Toast، وبطاقة الفرع (sheet) بعدها.</summary>
        private void ShowPresenceFeedback(List<PresenceFeedback> feedback)
        {
            var toast = new StringBuilder();
            PresenceFeedback sheet = null;
            foreach (var f in feedback)
            {
                var state = StateCatalog.Get(f.StateId);
                if (state == null) continue;
                if (state.Presentation == Presentation.Sheet && sheet == null)
                {
                    sheet = f;
                    continue;
                }
                if (toast.Length > 0) toast.Append('\n');
                toast.Append(state.Format(Lang, f.Values));
            }
            if (toast.Length > 0) ui.Toast(toast.ToString(), Lang);
            if (sheet != null)
            {
                ShowState(sheet.StateId, sheet.Values);
            }
        }
    }
}

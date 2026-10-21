using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Backend
{
    /// <summary>يحوّل أخطاء الخادم لحالات PERMISSION_AND_ERROR_STATES.md §7.</summary>
    public static class ErrorStates
    {
        /// <summary>رسالة غلاف الخادم لما ما فيه Auth (firebase/functions/src/shared/callable.ts).</summary>
        public const string AuthRequiredMessage = "AUTH_REQUIRED";

        public static bool IsTransient(BackendException ex)
        {
            switch (ex.Status)
            {
                case "UNAVAILABLE":
                case "ABORTED":
                case "DEADLINE_EXCEEDED":
                case "INTERNAL":
                case "RESOURCE_EXHAUSTED":
                    return true;
                default:
                    return false;
            }
        }

        /// <summary>معرّف الحالة المعروضة، أو null إذا الخطأ يخص الشاشة نفسها وتتعامل معه.</summary>
        public static string ToStateId(BackendException ex)
        {
            if (StateCatalog.Contains(ex.StateId)) return ex.StateId;
            if (ex.Status == BackendException.NetworkStatus) return StateCatalog.NetOffline;
            // App Check المرفوض يرجع UNAUTHENTICATED من إطار Firebase نفسه، بدون رسالة غلافنا.
            if (ex.Status == "UNAUTHENTICATED" && ex.ServerMessage != AuthRequiredMessage) return StateCatalog.AppIntegrity;
            if (IsTransient(ex) || ex.Status == "UNKNOWN") return StateCatalog.SrvBusy;
            return null;
        }
    }
}

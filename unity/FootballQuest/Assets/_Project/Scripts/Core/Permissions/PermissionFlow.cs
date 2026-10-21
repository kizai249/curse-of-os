using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Permissions
{
    /// <summary>حالة الإذن كما يرجعها النظام (الطبقة الأصلية تحوّل حالات iOS/Android لهذي القيم).</summary>
    public enum PermissionStatus
    {
        NotDetermined,
        Granted,
        /// <summary>iOS «موقع تقريبي» أو Android COARSE فقط.</summary>
        GrantedApproximate,
        Denied,
        /// <summary>مقيد بسياسة الجهاز أو الرقابة الأبوية (iOS).</summary>
        Restricted,
    }

    public enum PermissionKind
    {
        Location,
        Camera,
    }

    public enum PermissionAction
    {
        /// <summary>الإذن جاهز — كمّل الميزة.</summary>
        Proceed,
        /// <summary>اعرض شاشة الشرح المسبق (PERM_LOC_PRE / PERM_CAM_PRE).</summary>
        ShowPrePrompt,
        /// <summary>اطلب إذن النظام الحين (بعد «سماح» في الشرح المسبق).</summary>
        RequestSystem,
        /// <summary>اعرض حالة (StateId) بدون طلب.</summary>
        ShowState,
        /// <summary>«ليس الآن» في هذي الجلسة: ما نطلب ولا نعرض شي، والميزة الرقمية تكمل.</summary>
        SkipSilently,
    }

    public sealed class PermissionDecision
    {
        public PermissionDecision(PermissionAction action, string stateId = null)
        {
            Action = action;
            StateId = stateId;
        }

        public PermissionAction Action { get; }
        public string StateId { get; }
        public override string ToString() => StateId == null ? Action.ToString() : Action + ":" + StateId;
    }

    /// <summary>
    /// قواعد طلب الأذونات — PERMISSION_AND_ERROR_STATES.md §1:
    /// ما فيه طلب عند التشغيل، والطلب أول ما يضغط اللاعب ميزة ميدانية، وقبله شرح مسبق، و«ليس الآن» يمنع
    /// طلب النظام لباقي الجلسة، والرفض ما يُعاد طلبه تلقائيًا (فقط زر «تفعيل من الإعدادات»).
    /// </summary>
    public sealed class PermissionFlow
    {
        private bool declinedThisSession;

        public PermissionFlow(PermissionKind kind)
        {
            Kind = kind;
        }

        public PermissionKind Kind { get; }

        public bool DeclinedThisSession => declinedThisSession;

        /// <summary>اللاعب ضغط ميزة تحتاج هذا الإذن.</summary>
        public PermissionDecision OnFeatureRequested(PermissionStatus status)
        {
            switch (status)
            {
                case PermissionStatus.Granted:
                    return new PermissionDecision(PermissionAction.Proceed);
                case PermissionStatus.GrantedApproximate:
                    // الكاميرا ما لها «تقريبي». للموقع: اللعب يكمل، ونعرض طلب الدقة.
                    return Kind == PermissionKind.Location
                        ? new PermissionDecision(PermissionAction.ShowState, StateCatalog.LocApproxOnly)
                        : new PermissionDecision(PermissionAction.Proceed);
                case PermissionStatus.Restricted:
                    return new PermissionDecision(PermissionAction.ShowState,
                        Kind == PermissionKind.Location ? StateCatalog.LocRestricted : StateCatalog.CamDenied);
                case PermissionStatus.Denied:
                    return new PermissionDecision(PermissionAction.ShowState, DeniedState);
                default:
                    return declinedThisSession
                        ? new PermissionDecision(PermissionAction.SkipSilently)
                        : new PermissionDecision(PermissionAction.ShowPrePrompt, PrePromptState);
            }
        }

        /// <summary>رد اللاعب على الشرح المسبق.</summary>
        public PermissionDecision OnPrePromptAnswered(bool allow)
        {
            if (allow) return new PermissionDecision(PermissionAction.RequestSystem);
            declinedThisSession = true;
            return new PermissionDecision(PermissionAction.SkipSilently);
        }

        /// <summary>نتيجة طلب النظام.</summary>
        public PermissionDecision OnSystemResult(PermissionStatus status)
        {
            // بعد طلب النظام ما يرجع NotDetermined إلا إذا أغلق اللاعب الحوار بدون قرار — نعامله كـ «ليس الآن».
            if (status == PermissionStatus.NotDetermined)
            {
                declinedThisSession = true;
                return new PermissionDecision(PermissionAction.SkipSilently);
            }
            return OnFeatureRequested(status);
        }

        /// <summary>
        /// الحالة الظاهرة في بطاقة المكافآت الميدانية بدون أي طلب (عند فتح الشاشة). null = ما فيه شي يُعرض.
        /// </summary>
        public static string PassiveStateFor(PermissionKind kind, PermissionStatus status)
        {
            if (kind != PermissionKind.Location) return null;
            switch (status)
            {
                case PermissionStatus.Denied: return StateCatalog.LocDenied;
                case PermissionStatus.Restricted: return StateCatalog.LocRestricted;
                default: return null;
            }
        }

        private string PrePromptState => Kind == PermissionKind.Location ? StateCatalog.PermLocPre : StateCatalog.PermCamPre;

        private string DeniedState => Kind == PermissionKind.Location ? StateCatalog.LocDenied : StateCatalog.CamDenied;
    }
}

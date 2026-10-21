using System.Collections.Generic;

namespace FootballQuest.Core.Ui
{
    /// <summary>
    /// كل حالات docs/design/PERMISSION_AND_ERROR_STATES.md v1.0 بنصوصها كما وردت.
    /// الأقواس [..] في الوثيقة صارت عناصر نائبة {..}. والحالات اللي ما لها نص إنجليزي في الوثيقة
    /// ترجمتها مسودة ومعلّمة EnglishIsDraft (ContractsTests يتأكد من التغطية).
    /// </summary>
    public static class StateCatalog
    {
        // §1.2 الشرح المسبق
        public const string PermLocPre = "PERM_LOC_PRE";
        public const string PermCamPre = "PERM_CAM_PRE";
        // §1.4 حالات الإذن
        public const string LocDenied = "LOC_DENIED";
        public const string LocRestricted = "LOC_RESTRICTED";
        public const string LocApproxOnly = "LOC_APPROX_ONLY";
        public const string CamDenied = "CAM_DENIED";
        // §2 الموقع والمناطق
        public const string LocTimeout = "LOC_TIMEOUT";
        public const string LocWeak = "LOC_WEAK";
        public const string LocOutOfZone = "LOC_OUT_OF_ZONE";
        public const string LocMock = "LOC_MOCK";
        public const string ZoneStadiumOk = "ZONE_STADIUM_OK";
        public const string ZoneStadiumDone = "ZONE_STADIUM_DONE";
        public const string ZoneBranchNearby = "ZONE_BRANCH_NEARBY";
        // §3 رمز الفرع
        public const string QrCheckinVerified = "QR_CHECKIN_VERIFIED";
        public const string QrCheckinUnverified = "QR_CHECKIN_UNVERIFIED";
        public const string QrAlreadyToday = "QR_ALREADY_TODAY";
        public const string QrInvalid = "QR_INVALID";
        public const string QrBranchInactive = "QR_BRANCH_INACTIVE";
        // §4 القسائم
        public const string CpnIssued = "CPN_ISSUED";
        public const string CpnSoldOutBranch = "CPN_SOLD_OUT_BRANCH";
        public const string CpnUserLimit = "CPN_USER_LIMIT";
        public const string CpnNeedLocation = "CPN_NEED_LOCATION";
        public const string CpnExpired = "CPN_EXPIRED";
        // §4.1 شاشة الموظف (تُعرض في لوحة الشركاء، وموجودة هنا للتوحيد)
        public const string StaffRedeemOk = "STAFF_REDEEM_OK";
        public const string StaffRedeemUsed = "STAFF_REDEEM_USED";
        public const string StaffRedeemExpired = "STAFF_REDEEM_EXPIRED";
        public const string StaffRedeemWrongBranch = "STAFF_REDEEM_WRONG_BRANCH";
        public const string StaffRedeemNotFound = "STAFF_REDEEM_NOT_FOUND";
        public const string StaffRateLimit = "STAFF_RATE_LIMIT";
        // §4.2 رمز الفاتورة
        public const string InvOk = "INV_OK";
        public const string InvUsed = "INV_USED";
        public const string InvExpired = "INV_EXPIRED";
        public const string InvInvalid = "INV_INVALID";
        // §5 منتخبنا يجمعنا
        public const string RoomNeedCheckin = "ROOM_NEED_CHECKIN";
        public const string RoomNotFound = "ROOM_NOT_FOUND";
        public const string RoomFull = "ROOM_FULL";
        public const string RoomStarted = "ROOM_STARTED";
        public const string RoomLobbyExpired = "ROOM_LOBBY_EXPIRED";
        public const string RoomNeedTwo = "ROOM_NEED_TWO";
        public const string RoundWithCoupons = "ROUND_WITH_COUPONS";
        public const string RoundNoCoupons = "ROUND_NO_COUPONS";
        public const string RoundUserNotEligible = "ROUND_USER_NOT_ELIGIBLE";
        public const string RoundWrong = "ROUND_WRONG";
        public const string RoundHostChanged = "ROUND_HOST_CHANGED";
        public const string RoundPlayerLeft = "ROUND_PLAYER_LEFT";
        public const string RoundReconnecting = "ROUND_RECONNECTING";
        public const string RoundWon = "ROUND_WON";
        public const string RoundLost = "ROUND_LOST";
        public const string RoundDailyCap = "ROUND_DAILY_CAP";
        // §6 الحساب والعمر
        public const string AgeGate = "AGE_GATE";
        public const string AgeUnder15 = "AGE_UNDER_15";
        public const string AccGuestLink = "ACC_GUEST_LINK";
        public const string AccDeleteConfirm = "ACC_DELETE_CONFIRM";
        public const string AccDeleteDone = "ACC_DELETE_DONE";
        public const string CityChangeLocked = "CITY_CHANGE_LOCKED";
        // §7 حالات عامة
        public const string NetOffline = "NET_OFFLINE";
        public const string SrvBusy = "SRV_BUSY";
        public const string AppIntegrity = "APP_INTEGRITY";
        public const string ForceUpdate = "FORCE_UPDATE";
        public const string FeatureSoon = "FEATURE_SOON";

        private static readonly Dictionary<string, UiState> States = new Dictionary<string, UiState>();

        static StateCatalog()
        {
            // §1.2
            Add(PermLocPre, Presentation.Sheet,
                "موقعك يفتح مكافآت إضافية",
                "نستخدم موقعك مرة وحدة بس وقت ما تفتح اللعبة أو تمسح رمز فرع، عشان نعرف إذا أنت قريب من ملعب أو فرع شريك. ما نتابعك في الخلفية، وما نحفظ موقعك، وما نشاركه مع أي جهة.",
                "Your location unlocks extra rewards",
                "We check your location once only when you open the game or scan a branch code, to see if you're near a stadium or partner branch. No background tracking, nothing stored, nothing shared.");
            Add(PermCamPre, Presentation.Sheet,
                "الكاميرا لمسح الرموز",
                "نحتاج الكاميرا عشان تمسح رمز الفرع أو رمز القسيمة. ما نصوّر ولا نحفظ أي صورة.",
                "Camera to scan codes",
                "We need the camera to scan branch or coupon codes. We don't take or keep any photos.");

            // §1.4
            Draft(LocDenied, Presentation.Inline,
                "مكافآت القرب متوقفة لأن الموقع غير مفعّل. اللعب الرقمي شغّال كامل.",
                "Proximity rewards are off because location is disabled. Digital play works fully.");
            Draft(LocRestricted, Presentation.Inline,
                "الموقع مقيد على هذا الجهاز، فمكافآت القرب غير متاحة.",
                "Location is restricted on this device, so proximity rewards aren't available.");
            Draft(LocApproxOnly, Presentation.Sheet,
                "الموقع التقريبي ما يكفي للتحقق من الفروع. فعّل «الموقع الدقيق» عشان تحصل على مكافآت الفروع.",
                "Approximate location isn't enough to verify branches. Turn on \"Precise Location\" to get branch rewards.");
            Draft(CamDenied, Presentation.Sheet,
                "ما نقدر نمسح بدون الكاميرا. تقدر تكتب الرمز يدويًا بدلًا منه.",
                "We can't scan without the camera. You can type the code manually instead.");

            // §2
            Add(LocTimeout, Presentation.Toast, "ما قدرنا نحدد موقعك الحين. جرّب مرة ثانية.", "Couldn't get your location. Try again.");
            Add(LocWeak, Presentation.Sheet, "الإشارة ضعيفة — جرّب قرب النافذة أو خارج المبنى.", "Weak signal — try near a window or outside.");
            Add(LocOutOfZone, Presentation.Toast, "أنت خارج نطاق الفرع. قرّب شوي وجرّب.", "You're outside the branch area. Move closer and retry.");
            Add(LocMock, Presentation.Toast, "ما قدرنا نتحقق من موقعك على هذا الجهاز.", "We couldn't verify your location on this device.");
            Add(ZoneStadiumOk, Presentation.Toast, "أنت قرب {stadium}! +حزمة منتخب و20 XP", "You're near {stadium}! +1 pack, 20 XP");
            Add(ZoneStadiumDone, Presentation.Inline, "أخذت مكافأة هذا الملعب اليوم. ترجع بكرة!", "Already collected here today. Back tomorrow!");
            Add(ZoneBranchNearby, Presentation.Sheet, "أنت قريب من {branch} — {count} حملات نشطة.", "You're near {branch} — {count} active offers.");

            // §3
            Add(QrCheckinVerified, Presentation.Sheet,
                "زيارة محققة في {branch}! +حزمة و30 XP. الغرف والمهام مفتوحة لك اليوم.",
                "Verified visit at {branch}! +1 pack, 30 XP. Rooms unlocked today.");
            Add(QrCheckinUnverified, Presentation.Sheet,
                "تم تسجيل حضورك والغرف مفتوحة. فعّل الموقع عند المسح عشان تُحتسب زيارة محققة وقسائم الزيارة.",
                "Checked in, rooms unlocked. Enable location when scanning for a verified visit and visit coupons.");
            Add(QrAlreadyToday, Presentation.Toast, "مسجّل حضورك هنا اليوم ✓", "Already checked in here today ✓");
            Add(QrInvalid, Presentation.Sheet, "الرمز غير صالح — امسح رمز اليوم في الفرع.", "Invalid code — scan today's code at the branch.");
            Add(QrBranchInactive, Presentation.Sheet, "هذا الفرع غير مشارك حاليًا.", "This branch isn't participating right now.");

            // §4
            Add(CpnIssued, Presentation.Sheet, "🎉 قسيمة جديدة: {title}. صالحة لين {date}.", "New coupon: {title}. Valid until {date}.");
            Add(CpnSoldOutBranch, Presentation.Inline, "نفدت قسائم هذا الفرع. مكافآتك الثانية محسوبة.", "This branch is out of coupons. Your other rewards still count.");
            Add(CpnUserLimit, Presentation.Inline, "استلمت الحد الأقصى من هذي الحملة.", "You've reached this offer's limit.");
            Add(CpnNeedLocation, Presentation.Inline, "فعّل الموقع عند المسح عشان تحصل على هذي القسيمة.", "Enable location when scanning to get this coupon.");
            Add(CpnExpired, Presentation.Inline, "انتهت صلاحية هذي القسيمة في {date}.", "This coupon expired on {date}.");

            // §4.1
            Draft(StaffRedeemOk, Presentation.Inline, "✓ تم الاسترداد: {title} — {time}", "✓ Redeemed: {title} — {time}");
            Draft(StaffRedeemUsed, Presentation.Inline, "✗ القسيمة مستخدمة — استُردت في {branch} الساعة {time}.", "✗ Coupon already used — redeemed at {branch} at {time}.");
            Draft(StaffRedeemExpired, Presentation.Inline, "✗ القسيمة منتهية الصلاحية.", "✗ This coupon has expired.");
            Draft(StaffRedeemWrongBranch, Presentation.Inline, "✗ هذي القسيمة غير صالحة في هذا الفرع.", "✗ This coupon isn't valid at this branch.");
            Draft(StaffRedeemNotFound, Presentation.Inline, "✗ رمز غير معروف. تأكد من الإدخال.", "✗ Unknown code. Check the entry.");
            Draft(StaffRateLimit, Presentation.Inline, "محاولات كثيرة — انتظر دقيقة.", "Too many attempts — wait a minute.");

            // §4.2 — INV_OK يحوّل إلى CPN_ISSUED وما له نص خاص.
            Add(InvOk, Presentation.Hidden, "", "");
            Add(InvUsed, Presentation.Inline, "هذا الرمز مستخدم من قبل.", "This code was already used.");
            Add(InvExpired, Presentation.Inline, "انتهت صلاحية الرمز. اطلب رمزًا جديدًا من الكاشير.", "Code expired. Ask the cashier for a new one.");
            Add(InvInvalid, Presentation.Inline, "الرمز غير صحيح. تأكد من الأحرف.", "Incorrect code. Check the letters.");

            // §5
            Add(RoomNeedCheckin, Presentation.Sheet, "امسح رمز الفرع أول عشان تفتح الغرف.", "Scan the branch code first to unlock rooms.");
            Add(RoomNotFound, Presentation.Inline, "ما فيه غرفة بهذا الرمز هنا.", "No room with this code here.");
            Add(RoomFull, Presentation.Inline, "الغرفة مكتملة (6 لاعبين).", "Room is full (6 players).");
            Add(RoomStarted, Presentation.Inline, "الجولة بدأت. انتظرهم أو افتح غرفة جديدة.", "Round already started. Wait or open a new room.");
            Add(RoomLobbyExpired, Presentation.Dialog, "انتهت مهلة الغرفة. افتحوا غرفة جديدة.", "Room timed out. Open a new one.");
            Add(RoomNeedTwo, Presentation.Toast, "تحتاجون لاعبين اثنين على الأقل.", "You need at least 2 players.");
            Add(RoundWithCoupons, Presentation.Dialog, "الجولة بقسيمة لكل لاعب إذا فزتوا!", "Win and everyone gets a coupon!");
            Add(RoundNoCoupons, Presentation.Dialog,
                "المكافأة المتبقية في هذا الفرع لا تكفي الفريق — ستلعبون بدون قسائم. والفوز يعطي كل لاعب حزمة ملحمية مضمونة.",
                "Not enough coupons left for the whole team — you'll play without coupons. Winning gives each player a guaranteed Epic pack.");
            Add(RoundUserNotEligible, Presentation.Inline,
                "استلمت حد هذي الحملة، فمكافأتك عند الفوز حزمة ملحمية بدل القسيمة.",
                "You've reached this offer's limit — your win reward is an Epic pack instead.");
            Add(RoundWrong, Presentation.Toast, "{correct} من {total} صحيحة — −15 ثانية.", "{correct} of {total} correct — −15s.");
            Add(RoundHostChanged, Presentation.Toast, "انتقلت القيادة إلى {name}.", "{name} is now the host.");
            Add(RoundPlayerLeft, Presentation.Toast, "{name} طلع — وزّعنا خاناته عليكم.", "{name} left — their slots are now yours.");
            Add(RoundReconnecting, Presentation.Banner, "الاتصال ضعيف… نحاول نرجعك. الوقت ما يتوقف.", "Reconnecting… the clock keeps running.");
            Add(RoundWon, Presentation.Result, "فزتوا كلكم! 🏆", "You all won! 🏆");
            Add(RoundLost, Presentation.Result, "خلص الوقت. تقدرون تجربون مرة ثانية.", "Time's up. Try again together.");
            Add(RoundDailyCap, Presentation.Inline, "وصلت حد مكافآت الفوز اليوم. تقدر تلعب للمتعة.", "Daily win-reward cap reached. Play for fun.");

            // §6
            Draft(AgeGate, Presentation.FullScreen, "كم عمرك؟ اختر سنة ميلادك. (نحفظ الفئة العمرية فقط)", "How old are you? Choose your birth year. (We only keep your age group)");
            Draft(AgeUnder15, Presentation.FullScreen, "اللعبة مخصصة لعمر 15 سنة فأكثر. نشوفك قريب!", "This game is for ages 15 and up. See you soon!");
            Draft(AccGuestLink, Presentation.Sheet, "احفظ قسائمك وتقدمك: اربط حسابك مع Apple أو Google.", "Keep your coupons and progress: link your account with Apple or Google.");
            Draft(AccDeleteConfirm, Presentation.Dialog,
                "حذف الحساب نهائي: تقدمك وقسائمك غير المستردة تنحذف خلال 30 يومًا. متأكد؟",
                "Deleting your account is permanent: your progress and unredeemed coupons are deleted within 30 days. Are you sure?");
            Draft(AccDeleteDone, Presentation.Dialog, "استلمنا طلبك، وبينحذف حسابك خلال 30 يومًا.", "Request received. Your account will be deleted within 30 days.");
            Draft(CityChangeLocked, Presentation.Inline, "تقدر تغيّر مدينتك بعد {date}.", "You can change your city after {date}.");

            // §7
            Add(NetOffline, Presentation.Banner,
                "أنت غير متصل. تقدر تتصفح الخريطة والمجموعة، والمكافآت تحتاج اتصال.",
                "You're offline. Browse the map and collection; rewards need a connection.");
            Add(SrvBusy, Presentation.Toast, "الضغط عالي الحين. جرّب بعد شوي.", "We're busy right now. Try again shortly.");
            Add(AppIntegrity, Presentation.Dialog, "ما قدرنا نتحقق من نسخة التطبيق. حدّث اللعبة من المتجر.", "We couldn't verify this app version. Please update from the store.");
            Add(ForceUpdate, Presentation.FullScreen, "فيه تحديث مهم للعبة. حدّثها عشان تكمل.", "An important update is available. Update to continue.");
            Add(FeatureSoon, Presentation.Hidden, "", "");
        }

        public static IReadOnlyCollection<UiState> All => States.Values;

        public static UiState Get(string id) => States.TryGetValue(id, out var s) ? s : null;

        public static bool Contains(string id) => id != null && States.ContainsKey(id);

        private static void Add(string id, Presentation p, string titleAr, string bodyAr, string titleEn, string bodyEn) =>
            States.Add(id, new UiState(id, p, titleAr, bodyAr, titleEn, bodyEn));

        private static void Add(string id, Presentation p, string bodyAr, string bodyEn) =>
            States.Add(id, new UiState(id, p, null, bodyAr, null, bodyEn));

        private static void Draft(string id, Presentation p, string bodyAr, string bodyEn) =>
            States.Add(id, new UiState(id, p, null, bodyAr, null, bodyEn, englishIsDraft: true));
    }
}

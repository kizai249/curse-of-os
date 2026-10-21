namespace FootballQuest.Core.Permissions
{
    /// <summary>
    /// نصوص حوارات النظام — PERMISSION_AND_ERROR_STATES.md §1.3. تُكتب في Info.plist وar.lproj/en.lproj
    /// (IosBuildPostProcess)، ونصوص Android تأتي من الشرح المسبق لأن Android ما يعرض نص التطبيق.
    /// </summary>
    public static class SystemPermissionTexts
    {
        public const string LocationWhenInUseAr = "نستخدم موقعك أثناء استخدام اللعبة فقط لمعرفة قربك من الملاعب والفروع الشريكة ومنحك مكافآت القرب.";
        public const string LocationWhenInUseEn = "Used only while you use the game to check if you're near stadiums or partner branches and give proximity rewards.";
        public const string CameraAr = "لمسح رموز QR في الفروع الشريكة ورموز القسائم.";
        public const string CameraEn = "To scan QR codes at partner branches and coupon codes.";

        /// <summary>أذونات Android المسموحة. ACCESS_BACKGROUND_LOCATION ممنوع (§1.3).</summary>
        public static readonly string[] AndroidRequired =
        {
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.ACCESS_COARSE_LOCATION",
            "android.permission.CAMERA",
        };

        public const string AndroidForbidden = "android.permission.ACCESS_BACKGROUND_LOCATION";
    }
}

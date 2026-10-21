namespace FootballQuest.Core.Ui
{
    /// <summary>أنواع العرض — PERMISSION_AND_ERROR_STATES.md (قواعد هذا الملف).</summary>
    public enum Presentation
    {
        /// <summary>شريط قصير يختفي بعد 3 ثوانٍ.</summary>
        Toast,
        /// <summary>لوحة سفلية بزر أو زرين.</summary>
        Sheet,
        /// <summary>نافذة وسط الشاشة للقرارات المهمة فقط.</summary>
        Dialog,
        /// <summary>نص داخل الشاشة نفسها.</summary>
        Inline,
        /// <summary>شاشة كاملة (AGE_GATE، وFORCE_UPDATE...).</summary>
        FullScreen,
        /// <summary>شريط ثابت أعلى الشاشة (NET_OFFLINE، وROUND_RECONNECTING).</summary>
        Banner,
        /// <summary>شاشة نتيجة (ROUND_WON / ROUND_LOST).</summary>
        Result,
        /// <summary>ما يظهر أصلًا (FEATURE_SOON).</summary>
        Hidden,
    }
}

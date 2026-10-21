using System;

namespace FootballQuest.Core.Accounts
{
    public enum AgeGateResult
    {
        Invalid,
        Under15,
        Minor,
        Adult,
    }

    /// <summary>
    /// نفس قاعدة firebase/functions/src/users/ageBand.ts (والمتجهات المشتركة age-band.vectors.json).
    /// العميل يستخدمها عشان ما يُنشأ أي حساب لمن هو أقل من 15، والخادم يعيد الحكم دائمًا.
    /// </summary>
    public static class AgeGate
    {
        public const int MinAge = 15;
        public const int AdultAge = 18;
        public const int OldestBirthYear = 1900;

        public static int RiyadhYear(DateTimeOffset now) => now.ToUniversalTime().UtcDateTime.AddHours(3).Year;

        public static AgeGateResult Evaluate(int birthYear, DateTimeOffset now)
        {
            var year = RiyadhYear(now);
            if (birthYear < OldestBirthYear || birthYear > year) return AgeGateResult.Invalid;
            var ageThisYear = year - birthYear;
            if (ageThisYear < MinAge) return AgeGateResult.Under15;
            if (ageThisYear <= AdultAge) return AgeGateResult.Minor;
            return AgeGateResult.Adult;
        }

        /// <summary>رمز الفئة كما في DATA_CONTRACTS §1، أو "under_15" / "invalid".</summary>
        public static string ToContract(AgeGateResult result)
        {
            switch (result)
            {
                case AgeGateResult.Minor: return "15_17";
                case AgeGateResult.Adult: return "18_plus";
                case AgeGateResult.Under15: return "under_15";
                default: return "invalid";
            }
        }

        /// <summary>السنة الافتراضية في محدد السنة (لا تُرسل إلا إذا أكدها اللاعب).</summary>
        public static int DefaultPickerYear(DateTimeOffset now) => RiyadhYear(now) - 20;
    }
}

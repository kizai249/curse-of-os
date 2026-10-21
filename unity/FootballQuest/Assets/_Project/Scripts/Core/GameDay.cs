using System;
using System.Globalization;

namespace FootballQuest.Core
{
    /// <summary>
    /// يوم اللعبة: يبدأ 04:00 بتوقيت الرياض (UTC+3، بدون توقيت صيفي) — GAME_RULES.md §1.
    /// نفس الخوارزمية في firebase/functions/src/shared/gameDay.ts، وكلاهما مُختبر بنفس المتجهات
    /// في shared/contracts/game-day.vectors.json. الخادم هو المرجع؛ العميل يستخدمها للعرض فقط.
    /// </summary>
    public static class GameDay
    {
        public static readonly TimeSpan RiyadhOffset = TimeSpan.FromHours(3);
        public static readonly TimeSpan RolloverHour = TimeSpan.FromHours(4);

        /// <summary>معرّف اليوم بصيغة YYYY-MM-DD كما في DATA_CONTRACTS.md §0.</summary>
        public static string IdFor(DateTimeOffset instant)
        {
            var shifted = instant.ToUniversalTime().UtcDateTime + RiyadhOffset - RolloverHour;
            return shifted.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        /// <summary>اللحظة (UTC) اللي يبدأ فيها يوم اللعبة التالي.</summary>
        public static DateTimeOffset NextRollover(DateTimeOffset instant)
        {
            var shifted = instant.ToUniversalTime().UtcDateTime + RiyadhOffset - RolloverHour;
            var nextDayStartShifted = shifted.Date.AddDays(1);
            var utc = nextDayStartShifted - RiyadhOffset + RolloverHour;
            return new DateTimeOffset(DateTime.SpecifyKind(utc, DateTimeKind.Utc));
        }
    }
}

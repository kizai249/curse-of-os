using System;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Coupons;

namespace FootballQuest.Core.Coop
{
    /// <summary>
    /// قراءة حالة الغرفة ومنظور اللاعب. المحاكي: طلب REST كل ثانية. Firebase: مستمع (Snapshot listener)
    /// يحدّث نسخة محلية، و`Get` يرجعها بدون قراءة إضافية.
    /// </summary>
    public interface IRoomFeed
    {
        Task<RoomState> GetRoomAsync(string roomId);
        Task<RoomView> GetViewAsync(string roomId, string uid);
        /// <summary>يوقف أي مستمع للغرفة (الخروج أو النهاية).</summary>
        void Stop();
    }

    /// <summary>
    /// تسجيل الحضور اليوم يفتح الغرف في نفس الفرع (§7.2). يُحفظ محليًا للعرض فقط — الخادم يتحقق من `visits` نفسه.
    /// </summary>
    public sealed class CheckInMemory
    {
        public const string Key = "fq.checkin_today";
        private readonly ILocalStore store;

        public CheckInMemory(ILocalStore store)
        {
            this.store = store;
        }

        public void Remember(string branchId, Localized branchName, DateTimeOffset now)
        {
            if (string.IsNullOrEmpty(branchId)) return;
            store.SetString(Key, string.Join("|", GameDay.IdFor(now), branchId, Clean(branchName?.Ar), Clean(branchName?.En)));
        }

        /// <summary>فرع اليوم، أو null إذا ما فيه تسجيل حضور بعد 04:00 اليوم.</summary>
        public (string BranchId, Localized Name)? Today(DateTimeOffset now)
        {
            var parts = (store.GetString(Key, string.Empty) ?? string.Empty).Split('|');
            if (parts.Length != 4 || parts[0] != GameDay.IdFor(now)) return null;
            return (parts[1], new Localized { Ar = parts[2], En = parts[3] });
        }

        private static string Clean(string s) => (s ?? string.Empty).Replace("|", " ");
    }
}

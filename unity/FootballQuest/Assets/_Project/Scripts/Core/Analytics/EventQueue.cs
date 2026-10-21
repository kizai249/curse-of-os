using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;

namespace FootballQuest.Core.Analytics
{
    /// <summary>
    /// أحداث العميل على دفعات — ARCHITECTURE §10: تُرسل لـ logEvents كل 30 ثانية أو عند الخروج للخلفية.
    /// الخادم يقبل قائمة أحداث محددة وخصائص محددة فقط (DATA_CONTRACTS §9). ما فيه أي إحداثيات أو اسم.
    /// كل حدث بمعرّف ثابت، فإعادة الإرسال بعد فشل ما تكرر الحدث في الخادم.
    /// </summary>
    public sealed class EventQueue
    {
        public const int MaxBatch = 50;
        public const int MaxQueued = 200;
        public static readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(30);

        private readonly IFunctionsClient functions;
        private readonly string platform;
        private readonly string appVersion;
        private readonly List<Dictionary<string, object>> pending = new List<Dictionary<string, object>>();
        private bool flushing;

        public EventQueue(IFunctionsClient functions, string platform, string appVersion)
        {
            this.functions = functions;
            this.platform = platform;
            this.appVersion = appVersion;
        }

        public int Count => pending.Count;

        /// <summary>branch_nearby_shown — عرض بطاقة «أنت قريب من فرع» بعد قبول verifyPresence (DATA_CONTRACTS §9.2).</summary>
        public void BranchNearbyShown(string branchId, string brandId, int zoneRadiusM, string accuracyBand, int activeCampaigns) =>
            Enqueue("branch_nearby_shown", new Dictionary<string, object>
            {
                { "branchId", branchId },
                { "brandId", brandId },
                { "zoneRadiusM", zoneRadiusM },
                { "accuracyBand", accuracyBand },
                { "activeCampaigns", activeCampaigns },
            });

        private void Enqueue(string name, Dictionary<string, object> props)
        {
            if (pending.Count >= MaxQueued) pending.RemoveAt(0);
            pending.Add(new Dictionary<string, object>
            {
                { "eventId", Guid.NewGuid().ToString("N") },
                { "name", name },
                { "props", props },
            });
        }

        /// <summary>يرسل دفعة؛ عند الفشل تبقى الأحداث للمحاولة التالية بنفس المعرّفات.</summary>
        public async Task<bool> FlushAsync()
        {
            if (flushing || pending.Count == 0) return true;
            flushing = true;
            var batch = pending.GetRange(0, Math.Min(MaxBatch, pending.Count));
            try
            {
                await functions.CallAsync("logEvents", new Dictionary<string, object>
                {
                    { "platform", platform },
                    { "appVersion", appVersion },
                    { "events", new List<object>(batch) },
                });
                pending.RemoveRange(0, batch.Count);
                return true;
            }
            catch (BackendException)
            {
                return false;
            }
            finally
            {
                flushing = false;
            }
        }
    }
}

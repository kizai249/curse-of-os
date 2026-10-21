using System;
using System.Threading.Tasks;

namespace FootballQuest.Core.Backend
{
    /// <summary>
    /// إعادة المحاولة — PERMISSION_AND_ERROR_STATES.md §7: كل طلب يغير رصيدًا يُعاد تلقائيًا حتى 3 مرات
    /// بنفس `requestId`، فالخادم يرجع نفس النتيجة ولا تتكرر المكافأة.
    /// </summary>
    public static class Retry
    {
        public const int MaxAttempts = 3;

        public static async Task<T> RunAsync<T>(
            Func<string, Task<T>> call,
            Func<int, Task> delay = null,
            string requestId = null,
            int maxAttempts = MaxAttempts)
        {
            requestId = requestId ?? NewRequestId();
            delay = delay ?? (attempt => Task.Delay(200 * (1 << attempt)));
            for (var attempt = 1; ; attempt++)
            {
                try
                {
                    return await call(requestId);
                }
                catch (BackendException ex) when (ErrorStates.IsTransient(ex) && attempt < maxAttempts)
                {
                    await delay(attempt);
                }
            }
        }

        public static string NewRequestId() => Guid.NewGuid().ToString("N");
    }
}

using System.Globalization;
using System.Threading.Tasks;
using FootballQuest.Core.Location;
using UnityEngine;
#if UNITY_IOS && !UNITY_EDITOR
using System.Runtime.InteropServices;
using AOT;
#endif

namespace FootballQuest.App.Platform
{
    /// <summary>
    /// قراءة موقع وحدة أثناء استخدام التطبيق فقط — ARCHITECTURE §2.1. ما فيه أي قراءة في الخلفية.
    /// Editor: موقع محاكى من PlayerPrefs «fq.editor_location» = "lat,lng,accuracy[,mock]" (لتجربة AT-02 بدون جهاز).
    /// </summary>
    public static class NativeLocationService
    {
        public static ILocationService Create()
        {
#if UNITY_EDITOR
            return new EditorLocationService();
#elif UNITY_ANDROID
            return new AndroidLocationService();
#elif UNITY_IOS
            return new IosLocationService();
#else
            return new EditorLocationService();
#endif
        }

        /// <summary>يحد القراءة بزمن، والنتيجة ترجع للـmain thread عبر await (SynchronizationContext).</summary>
        public static async Task<LocationReading> WithTimeout(Task<LocationReading> read, int timeoutMs)
        {
            var finished = await Task.WhenAny(read, Task.Delay(timeoutMs + 500));
            return finished == read ? read.Result : new LocationReading { Status = ReadingStatus.Timeout };
        }
    }

    public sealed class EditorLocationService : ILocationService
    {
        public const string PrefKey = "fq.editor_location";

        public Task<LocationReading> ReadOnceAsync(int timeoutMs)
        {
            var raw = PlayerPrefs.GetString(PrefKey, string.Empty).Split(',');
            if (raw.Length < 3) return Task.FromResult(new LocationReading { Status = ReadingStatus.Timeout });
            return Task.FromResult(new LocationReading
            {
                Status = ReadingStatus.Ok,
                Lat = double.Parse(raw[0], CultureInfo.InvariantCulture),
                Lng = double.Parse(raw[1], CultureInfo.InvariantCulture),
                AccuracyM = double.Parse(raw[2], CultureInfo.InvariantCulture),
                IsMock = raw.Length > 3 && raw[3].Trim() == "mock",
            });
        }
    }

#if UNITY_ANDROID && !UNITY_EDITOR
    public sealed class AndroidLocationService : ILocationService
    {
        private sealed class Callback : AndroidJavaProxy
        {
            private readonly TaskCompletionSource<LocationReading> tcs;

            public Callback(TaskCompletionSource<LocationReading> tcs) : base("com.usersx.footballquest.location.FQLocation$Callback")
            {
                this.tcs = tcs;
            }

            // يُستدعى من خيط Java؛ الـawait يرجع للـmain thread.
            public void onResult(string json) => tcs.TrySetResult(LocationReading.Parse(json));
        }

        public Task<LocationReading> ReadOnceAsync(int timeoutMs)
        {
            var tcs = new TaskCompletionSource<LocationReading>();
            using (var unity = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var activity = unity.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var plugin = new AndroidJavaClass("com.usersx.footballquest.location.FQLocation"))
            {
                plugin.CallStatic("getCurrent", activity, new Callback(tcs), timeoutMs);
            }
            return NativeLocationService.WithTimeout(tcs.Task, timeoutMs);
        }
    }
#endif

#if UNITY_IOS && !UNITY_EDITOR
    public sealed class IosLocationService : ILocationService
    {
        private delegate void LocationCallback(string json);

        [DllImport("__Internal")] private static extern void FQ_ReadLocation(LocationCallback callback);

        private static TaskCompletionSource<LocationReading> pending;

        [MonoPInvokeCallback(typeof(LocationCallback))]
        private static void OnLocation(string json) => pending?.TrySetResult(LocationReading.Parse(json));

        public Task<LocationReading> ReadOnceAsync(int timeoutMs)
        {
            pending?.TrySetResult(new LocationReading { Status = ReadingStatus.Timeout });
            pending = new TaskCompletionSource<LocationReading>();
            FQ_ReadLocation(OnLocation);
            return NativeLocationService.WithTimeout(pending.Task, timeoutMs);
        }
    }
#endif
}

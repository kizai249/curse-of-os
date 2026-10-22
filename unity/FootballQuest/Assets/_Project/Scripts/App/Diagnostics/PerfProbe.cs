using FootballQuest.Core.Diagnostics;
using UnityEngine;
using UnityEngine.Profiling;
using UnityEngine.SceneManagement;

namespace FootballQuest.App.Diagnostics
{
    /// <summary>
    /// قياسات AT-09 في كل البنيات (سطر واحد عند الإقلاع وسطر كل دقيقة — كلفة مهملة):
    /// زمن أول شاشة تفاعلية من بدء العملية، ومتوسط الإطارات والذاكرة لكل مشهد.
    /// السجل ما فيه أي بيانات لاعب (AT-10).
    /// </summary>
    public sealed class PerfProbe : MonoBehaviour
    {
        private static bool bootMarked;
        private readonly FrameWindow window = new FrameWindow();

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Create()
        {
            var go = new GameObject("PerfProbe");
            DontDestroyOnLoad(go);
            go.AddComponent<PerfProbe>();
        }

        /// <summary>يُستدعى عند رسم أول شاشة فيها أزرار. المرات اللاحقة تُتجاهل.</summary>
        public static void MarkInteractive(string screen)
        {
            if (bootMarked) return;
            bootMarked = true;
            Debug.Log(PerformanceBudget.BootLine(MillisSinceProcessStart(), screen));
        }

        private void Update()
        {
            var fps = window.Add(Time.unscaledDeltaTime);
            if (fps == null) return;
            var memoryMb = Profiler.GetTotalReservedMemoryLong() / (1024.0 * 1024.0);
            Debug.Log(PerformanceBudget.PerfLine(SceneManager.GetActiveScene().name, fps.Value, memoryMb));
        }

        /// <summary>النافذة تبدأ من جديد بعد الرجوع من الخلفية عشان ما يدخل وقت التوقف في المتوسط.</summary>
        private void OnApplicationPause(bool paused)
        {
            if (!paused) window.Reset();
        }

        /// <summary>Android: من بدء العملية (يشمل شاشة Unity الأولى). غيره: من تشغيل المحرك.</summary>
        private static double MillisSinceProcessStart()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var process = new AndroidJavaClass("android.os.Process"))
                using (var clock = new AndroidJavaClass("android.os.SystemClock"))
                {
                    return clock.CallStatic<long>("elapsedRealtime") - process.CallStatic<long>("getStartElapsedRealtime");
                }
            }
            catch (AndroidJavaException)
            {
                // يرجع للقياس العام تحت.
            }
#endif
            return Time.realtimeSinceStartupAsDouble * 1000.0;
        }
    }
}

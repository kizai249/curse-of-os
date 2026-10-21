using UnityEngine;
using UnityEngine.SceneManagement;

namespace FootballQuest.App
{
    /// <summary>
    /// نقطة الدخول قبل تحميل أي مشهد. ما تعتمد على محتوى المشاهد عشان تبقى المشاهد خفيفة
    /// وزمن الإقلاع &lt; 5 ثوانٍ (ARCHITECTURE.md §2.2).
    /// </summary>
    public static class AppBootstrap
    {
        /// <summary>سقف الإطارات: الحد الأدنى المطلوب 30، والسقف 30 يوفّر البطارية. يُراجع في Slice 10.</summary>
        public const int TargetFrameRate = 30;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Initialize()
        {
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = TargetFrameRate;
            Screen.orientation = ScreenOrientation.Portrait;
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void ContinueFromBoot()
        {
            if (SceneManager.GetActiveScene().name == SceneNames.Boot)
            {
                // Slice 2 يضيف هنا: Auth، وRemote Config، والـOnboarding قبل الانتقال.
                SceneManager.LoadScene(SceneNames.Hub);
            }
        }
    }
}

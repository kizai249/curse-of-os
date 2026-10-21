using System.Runtime.InteropServices;
using System.Threading.Tasks;
using FootballQuest.Core.Permissions;
using UnityEngine;
#if UNITY_ANDROID
using UnityEngine.Android;
#endif

namespace FootballQuest.App.Platform
{
    /// <summary>
    /// الأذونات الأصلية. الموقع «أثناء الاستخدام» فقط: CoreLocation When In Use في iOS، وFINE/COARSE في Android.
    /// ممنوع ACCESS_BACKGROUND_LOCATION (PERMISSION_AND_ERROR_STATES §1.3) — يفرضه AndroidManifestGuard وقت البناء.
    /// </summary>
    public abstract class NativePermissionService : IPermissionService
    {
        public static IPermissionService Create()
        {
#if UNITY_EDITOR
            return new EditorPermissionService();
#elif UNITY_ANDROID
            return new AndroidPermissionService();
#elif UNITY_IOS
            return new IosPermissionService();
#else
            return new EditorPermissionService();
#endif
        }

        public abstract PermissionStatus GetStatus(PermissionKind kind);
        public abstract Task<PermissionStatus> RequestAsync(PermissionKind kind);
        public abstract void OpenAppSettings();
    }

    /// <summary>
    /// محاكاة في Editor: الحالة من PlayerPrefs «fq.editor_perm.Location» / «.Camera» (0–4 بترتيب PermissionStatus)
    /// عشان نجرّب كل حالات PERMISSION_AND_ERROR_STATES بدون جهاز.
    /// </summary>
    public sealed class EditorPermissionService : NativePermissionService
    {
        private static string Key(PermissionKind kind) => "fq.editor_perm." + kind;

        public override PermissionStatus GetStatus(PermissionKind kind) => (PermissionStatus)PlayerPrefs.GetInt(Key(kind), 0);

        public override Task<PermissionStatus> RequestAsync(PermissionKind kind)
        {
            var status = GetStatus(kind);
            if (status == PermissionStatus.NotDetermined)
            {
                status = PermissionStatus.Granted;
                PlayerPrefs.SetInt(Key(kind), (int)status);
            }
            return Task.FromResult(status);
        }

        public override void OpenAppSettings() => Debug.Log("[Permissions] OpenAppSettings (editor no-op)");
    }

#if UNITY_ANDROID
    public sealed class AndroidPermissionService : NativePermissionService
    {
        private const string Coarse = "android.permission.ACCESS_COARSE_LOCATION";
        private static string AskedKey(PermissionKind kind) => "fq.perm_asked." + kind;

        public override PermissionStatus GetStatus(PermissionKind kind)
        {
            if (kind == PermissionKind.Camera)
            {
                if (Permission.HasUserAuthorizedPermission(Permission.Camera)) return PermissionStatus.Granted;
                return Asked(kind) ? PermissionStatus.Denied : PermissionStatus.NotDetermined;
            }
            if (Permission.HasUserAuthorizedPermission(Permission.FineLocation)) return PermissionStatus.Granted;
            if (Permission.HasUserAuthorizedPermission(Coarse)) return PermissionStatus.GrantedApproximate;
            return Asked(kind) ? PermissionStatus.Denied : PermissionStatus.NotDetermined;
        }

        public override Task<PermissionStatus> RequestAsync(PermissionKind kind)
        {
            var tcs = new TaskCompletionSource<PermissionStatus>();
            var callbacks = new PermissionCallbacks();
            var pending = kind == PermissionKind.Camera ? 1 : 2;
            void Done(string _)
            {
                if (--pending > 0) return;
                PlayerPrefs.SetInt(AskedKey(kind), 1);
                PlayerPrefs.Save();
                tcs.TrySetResult(GetStatus(kind));
            }
            callbacks.PermissionGranted += Done;
            // Unity 6: PermissionDenied يُطلق لكل رفض (ومنه «لا تسأل مرة ثانية»).
            callbacks.PermissionDenied += Done;
            var permissions = kind == PermissionKind.Camera
                ? new[] { Permission.Camera }
                // Android 12+: طلب FINE وCOARSE معًا، واللاعب يقدر يختار «تقريبي» (LOC_APPROX_ONLY).
                : new[] { Permission.FineLocation, Coarse };
            Permission.RequestUserPermissions(permissions, callbacks);
            return tcs.Task;
        }

        public override void OpenAppSettings()
        {
            using (var unity = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var activity = unity.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var uriClass = new AndroidJavaClass("android.net.Uri"))
            using (var uri = uriClass.CallStatic<AndroidJavaObject>("fromParts", "package", Application.identifier, null))
            using (var intent = new AndroidJavaObject("android.content.Intent", "android.settings.APPLICATION_DETAILS_SETTINGS", uri))
            {
                intent.Call<AndroidJavaObject>("addFlags", 0x10000000); // FLAG_ACTIVITY_NEW_TASK
                activity.Call("startActivity", intent);
            }
        }

        private static bool Asked(PermissionKind kind) => PlayerPrefs.GetInt(AskedKey(kind), 0) == 1;
    }
#endif

#if UNITY_IOS
    public sealed class IosPermissionService : NativePermissionService
    {
        // Plugins/iOS/FQPermissions.mm — القيم بنفس ترتيب PermissionStatus.
        [DllImport("__Internal")] private static extern int FQ_LocationStatus();
        [DllImport("__Internal")] private static extern void FQ_RequestLocation();
        [DllImport("__Internal")] private static extern int FQ_CameraStatus();
        [DllImport("__Internal")] private static extern void FQ_RequestCamera();
        [DllImport("__Internal")] private static extern void FQ_OpenSettings();

        public override PermissionStatus GetStatus(PermissionKind kind) =>
            (PermissionStatus)(kind == PermissionKind.Location ? FQ_LocationStatus() : FQ_CameraStatus());

        public override async Task<PermissionStatus> RequestAsync(PermissionKind kind)
        {
            if (kind == PermissionKind.Location) FQ_RequestLocation();
            else FQ_RequestCamera();

            // حوار النظام غير متزامن؛ ننتظر تغيّر الحالة (حد أقصى دقيقتين).
            for (var i = 0; i < 480; i++)
            {
                await Task.Delay(250);
                var status = GetStatus(kind);
                if (status != PermissionStatus.NotDetermined) return status;
            }
            return PermissionStatus.NotDetermined;
        }

        public override void OpenAppSettings() => FQ_OpenSettings();
    }
#endif
}

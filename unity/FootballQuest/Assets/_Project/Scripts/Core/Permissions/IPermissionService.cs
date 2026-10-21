using System.Threading.Tasks;

namespace FootballQuest.Core.Permissions
{
    /// <summary>الطبقة الأصلية للأذونات (iOS: CoreLocation/AVFoundation، Android: Runtime Permissions).</summary>
    public interface IPermissionService
    {
        PermissionStatus GetStatus(PermissionKind kind);
        /// <summary>يعرض حوار النظام (يُستدعى فقط بعد «سماح» في الشرح المسبق).</summary>
        Task<PermissionStatus> RequestAsync(PermissionKind kind);
        /// <summary>يفتح إعدادات التطبيق في النظام (زر «تفعيل من الإعدادات»).</summary>
        void OpenAppSettings();
    }
}

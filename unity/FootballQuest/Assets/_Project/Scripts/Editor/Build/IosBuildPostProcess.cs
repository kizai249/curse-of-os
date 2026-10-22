#if UNITY_IOS
using System.IO;
using FootballQuest.Core.Permissions;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;

namespace FootballQuest.EditorTools.Build
{
    /// <summary>
    /// iOS: نصوص الأذونات بالعربية والإنجليزية (§1.3)، والعربية لغة التطوير، وقدرة Sign in with Apple (AT-11)،
    /// وقيم الخصوصية وPrivacy Manifest (AT-10).
    /// </summary>
    public static class IosBuildPostProcess
    {
        [PostProcessBuild(100)]
        public static void OnPostProcessBuild(BuildTarget target, string path)
        {
            if (target != BuildTarget.iOS) return;

            var plistPath = Path.Combine(path, "Info.plist");
            var plist = new PlistDocument();
            plist.ReadFromFile(plistPath);
            var root = plist.root;
            root.SetString("NSLocationWhenInUseUsageDescription", SystemPermissionTexts.LocationWhenInUseEn);
            root.SetString("NSCameraUsageDescription", SystemPermissionTexts.CameraEn);
            root.SetString("CFBundleDevelopmentRegion", "ar");
            var localizations = root.CreateArray("CFBundleLocalizations");
            localizations.AddString("ar");
            localizations.AddString("en");
            // ممنوع: أي مفتاح للموقع الدائم أو وضع الموقع في الخلفية.
            root.values.Remove("NSLocationAlwaysAndWhenInUseUsageDescription");
            root.values.Remove("NSLocationAlwaysUsageDescription");
            // AT-10: لا Analytics ولا إعلانات حتى لو سحبتها مكتبة بالغلط.
            root.SetBoolean("FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED", true);
            root.SetBoolean("GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS", false);
            root.values.Remove("NSUserTrackingUsageDescription");
            // التشفير المستخدم HTTPS فقط (معفى) — يتخطى سؤال الامتثال في كل رفع TestFlight.
            root.SetBoolean("ITSAppUsesNonExemptEncryption", false);
            plist.WriteToFile(plistPath);

            var projectPath = PBXProject.GetPBXProjectPath(path);
            var project = new PBXProject();
            project.ReadFromFile(projectPath);
            var mainTarget = project.GetUnityMainTargetGuid();
            WriteStrings(path, project, mainTarget, "ar", SystemPermissionTexts.LocationWhenInUseAr, SystemPermissionTexts.CameraAr);
            WriteStrings(path, project, mainTarget, "en", SystemPermissionTexts.LocationWhenInUseEn, SystemPermissionTexts.CameraEn);
            AddPrivacyManifest(path, project, mainTarget);
            project.WriteToFile(projectPath);

            var capabilities = new ProjectCapabilityManager(projectPath, "Unity-iPhone/FootballQuest.entitlements", null, mainTarget);
            capabilities.AddSignInWithApple();
            capabilities.WriteToFile();
        }

        private static void WriteStrings(string buildPath, PBXProject project, string target, string language, string location, string camera)
        {
            var folder = language + ".lproj";
            var dir = Path.Combine(buildPath, folder);
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, "InfoPlist.strings"),
                $"\"NSLocationWhenInUseUsageDescription\" = \"{Escape(location)}\";\n\"NSCameraUsageDescription\" = \"{Escape(camera)}\";\n");
            var guid = project.AddFolderReference(dir, folder);
            project.AddFileToBuild(target, guid);
        }

        /// <summary>Apple Privacy Manifest للتطبيق (unity/FootballQuest/Platform/iOS) — مطابق لـ docs/store/PRIVACY_LABELS.md.</summary>
        private static void AddPrivacyManifest(string buildPath, PBXProject project, string target)
        {
            const string name = "PrivacyInfo.xcprivacy";
            var source = Path.Combine(Directory.GetCurrentDirectory(), "Platform", "iOS", name);
            if (!File.Exists(source)) throw new BuildFailedException("missing " + source);
            File.Copy(source, Path.Combine(buildPath, name), overwrite: true);
            var guid = project.FindFileGuidByProjectPath(name) ?? project.AddFile(name, name);
            project.AddFileToBuild(target, guid);
        }

        private static string Escape(string s) => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
#endif

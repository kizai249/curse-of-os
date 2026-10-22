using System;
using System.Linq;
using FootballQuest.App;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace FootballQuest.EditorTools
{
    /// <summary>
    /// نقطة البناء لـ CI (GameCI: buildMethod = FootballQuest.EditorTools.BuildScript.BuildFromCommandLine).
    /// يقرأ وسائط GameCI: -buildTarget، و-customBuildPath، و-buildVersion، و-androidVersionCode،
    /// و-androidExportType، ومفاتيح التوقيع -androidKeystoreName/-androidKeystorePass/-androidKeyaliasName/-androidKeyaliasPass
    /// (GameCI يكتب ملف keystore من السر في جذر المشروع)، و-appleTeamId لـ iOS. بدون مفاتيح ← بناء غير موقّع للتجربة فقط.
    /// </summary>
    public static class BuildScript
    {
        public static void BuildFromCommandLine()
        {
            var args = Environment.GetCommandLineArgs();
            var targetName = ArgValue(args, "-buildTarget") ?? EditorUserBuildSettings.activeBuildTarget.ToString();
            var target = (BuildTarget)Enum.Parse(typeof(BuildTarget), targetName, ignoreCase: true);
            var path = ArgValue(args, "-customBuildPath") ?? DefaultPath(target);

            var version = ArgValue(args, "-buildVersion");
            if (!string.IsNullOrEmpty(version) && version != "none") PlayerSettings.bundleVersion = version;
            var versionCode = ArgValue(args, "-androidVersionCode");
            if (int.TryParse(versionCode, out var code)) PlayerSettings.Android.bundleVersionCode = code;
            if (Array.IndexOf(args, "-releaseBuild") >= 0 && !ReleaseReady(target))
            {
                EditorApplication.Exit(1);
                return;
            }

            var teamId = ArgValue(args, "-appleTeamId");
            if (target == BuildTarget.iOS && !string.IsNullOrEmpty(teamId))
            {
                // توقيع تلقائي في Xcode عبر مفتاح App Store Connect (fastlane/Fastfile).
                PlayerSettings.iOS.appleDeveloperTeamID = teamId;
                PlayerSettings.iOS.appleEnableAutomaticSigning = true;
            }
            if (target == BuildTarget.Android)
            {
                ConfigureAndroidSigning(args);
                if (ArgValue(args, "-androidExportType") == "androidAppBundle" && !path.EndsWith(".aab", StringComparison.OrdinalIgnoreCase))
                    path = System.IO.Path.ChangeExtension(path, ".aab");
            }

            var ok = Build(target, path);
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
        }

        [MenuItem("Football Quest/Build/Android (APK)")]
        public static void BuildAndroid() => Build(BuildTarget.Android, DefaultPath(BuildTarget.Android));

        [MenuItem("Football Quest/Build/iOS (Xcode project)")]
        public static void BuildIos() => Build(BuildTarget.iOS, DefaultPath(BuildTarget.iOS));

        public static bool Build(BuildTarget target, string path)
        {
            ProjectSetup.Apply();
            EditorUserBuildSettings.buildAppBundle = path.EndsWith(".aab", StringComparison.OrdinalIgnoreCase);

            var options = new BuildPlayerOptions
            {
                scenes = SceneNames.BuildOrder.Select(ProjectSetup.ScenePath).ToArray(),
                locationPathName = path,
                target = target,
                options = BuildOptions.None,
            };

            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"[BuildScript] {target} → {summary.result} ({summary.totalSize} bytes, {summary.totalErrors} errors) at {path}");
            return summary.result == BuildResult.Succeeded;
        }

        /// <summary>
        /// بناء المتجر ممنوع بدون Firebase Unity SDK (وإلا يشتغل التطبيق على وضع المحاكي) وبدون ملف إعداد المشروع.
        /// </summary>
        private static bool ReleaseReady(BuildTarget target)
        {
            var manifest = System.IO.File.ReadAllText("Packages/manifest.json");
            var config = target == BuildTarget.Android ? "Assets/google-services.json" : "Assets/GoogleService-Info.plist";
            var ok = true;
            foreach (var package in new[] { "com.google.firebase.functions", "com.google.firebase.crashlytics" })
            {
                if (manifest.Contains("\"" + package + "\"")) continue;
                Debug.LogError($"[BuildScript] release build needs {package} (docs/RUNBOOK.md §3.5).");
                ok = false;
            }
            if (!System.IO.File.Exists(config))
            {
                Debug.LogError($"[BuildScript] release build needs {config}.");
                ok = false;
            }
            return ok;
        }

        /// <summary>توقيع الرفع لـ Google Play (Play App Signing يعيد التوقيع بمفتاح التطبيق).</summary>
        private static void ConfigureAndroidSigning(string[] args)
        {
            var keystore = ArgValue(args, "-androidKeystoreName");
            if (string.IsNullOrEmpty(keystore))
            {
                PlayerSettings.Android.useCustomKeystore = false;
                Debug.LogWarning("[BuildScript] Android build is NOT signed for upload (no keystore args).");
                return;
            }
            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = System.IO.Path.GetFullPath(keystore);
            PlayerSettings.Android.keystorePass = ArgValue(args, "-androidKeystorePass");
            PlayerSettings.Android.keyaliasName = ArgValue(args, "-androidKeyaliasName");
            PlayerSettings.Android.keyaliasPass = ArgValue(args, "-androidKeyaliasPass");
        }

        private static string DefaultPath(BuildTarget target) =>
            target == BuildTarget.Android ? "Builds/Android/FootballQuest.apk" : "Builds/iOS";

        private static string ArgValue(string[] args, string name)
        {
            var i = Array.IndexOf(args, name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
        }
    }
}

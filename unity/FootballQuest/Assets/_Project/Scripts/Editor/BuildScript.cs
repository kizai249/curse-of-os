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
    /// يقرأ وسائط GameCI: -buildTarget، و-customBuildPath، و-buildVersion، و-androidVersionCode.
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

        private static string DefaultPath(BuildTarget target) =>
            target == BuildTarget.Android ? "Builds/Android/FootballQuest.apk" : "Builds/iOS";

        private static string ArgValue(string[] args, string name)
        {
            var i = Array.IndexOf(args, name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
        }
    }
}

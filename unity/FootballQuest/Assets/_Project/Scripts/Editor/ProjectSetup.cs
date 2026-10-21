using System.IO;
using System.Linq;
using FootballQuest.App;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace FootballQuest.EditorTools
{
    /// <summary>
    /// يطبّق إعدادات المشروع برمجيًا (Idempotent) بدل تحرير ملفات ProjectSettings يدويًا:
    /// PlayerSettings للمنصتين، وأصل URP للجوال، والمشاهد الثلاثة، وBuild Settings.
    /// يُستدعى من القائمة «Football Quest ▸ Apply Project Setup» ومن BuildScript قبل كل بناء في CI.
    /// </summary>
    public static class ProjectSetup
    {
        public const string CompanyName = "USERS-X";
        public const string ProductName = "Football Quest";
        // TODO(owner): تأكيد معرّف الحزمة النهائي قبل إنشاء تطبيقي Firebase وحسابات المتجرين.
        public const string ApplicationId = "com.usersx.footballquest";
        public const string IosMinimumVersion = "15.0";

        public const string ScenesFolder = "Assets/_Project/Scenes";
        public const string SettingsFolder = "Assets/_Project/Settings";
        public const string PipelineAssetPath = SettingsFolder + "/URP-Mobile.asset";
        public const string RendererAssetPath = SettingsFolder + "/URP-Mobile-Renderer.asset";

        [MenuItem("Football Quest/Apply Project Setup")]
        public static void Apply()
        {
            ApplyPlayerSettings();
            var pipeline = EnsurePipelineAsset();
            AssignPipeline(pipeline);
            EnsureScenes();
            AssetDatabase.SaveAssets();
            Debug.Log("[ProjectSetup] applied");
        }

        private static void ApplyPlayerSettings()
        {
            EditorSettings.serializationMode = SerializationMode.ForceText;

            PlayerSettings.companyName = CompanyName;
            PlayerSettings.productName = ProductName;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;

            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, ApplicationId);
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, ApplicationId);
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);

            // Firebase Unity SDK يحتاج Android 7.0 (API 24) فأعلى، وARM64 شرط Google Play.
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel24;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.iOS.targetOSVersionString = IosMinimumVersion;
        }

        private static UniversalRenderPipelineAsset EnsurePipelineAsset()
        {
            Directory.CreateDirectory(SettingsFolder);

            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (pipeline == null)
            {
                var renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(renderer, RendererAssetPath);
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                AssetDatabase.CreateAsset(pipeline, PipelineAssetPath);
            }

            // ميزانية الجوال — ARCHITECTURE.md §2: إضاءة مخبوزة، وظل ديناميكي واحد، وبدون HDR أو Post-processing ثقيل.
            // نكتب بالحقول المسلسلة عشان ما نعتمد على Setters تتغير بين نسخ URP.
            var so = new SerializedObject(pipeline);
            SetBool(so, "m_SupportsHDR", false);
            SetInt(so, "m_MSAA", 2);
            SetFloat(so, "m_RenderScale", 1f);
            SetBool(so, "m_MainLightShadowsSupported", true);
            SetInt(so, "m_ShadowCascadeCount", 1);
            SetFloat(so, "m_ShadowDistance", 40f);
            SetBool(so, "m_SoftShadowsSupported", false);
            SetInt(so, "m_AdditionalLightsRenderingMode", (int)LightRenderingMode.Disabled);
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(pipeline);
            return pipeline;
        }

        private static void AssignPipeline(RenderPipelineAsset pipeline)
        {
            GraphicsSettings.defaultRenderPipeline = pipeline;
            var current = QualitySettings.GetQualityLevel();
            for (var i = 0; i < QualitySettings.names.Length; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = pipeline;
            }
            QualitySettings.SetQualityLevel(current, false);
        }

        private static void EnsureScenes()
        {
            Directory.CreateDirectory(ScenesFolder);
            foreach (var name in SceneNames.BuildOrder)
            {
                var path = ScenePath(name);
                if (File.Exists(path)) continue;

                var setup = name == SceneNames.Boot ? NewSceneSetup.EmptyScene : NewSceneSetup.DefaultGameObjects;
                var scene = EditorSceneManager.NewScene(setup, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, path);
            }

            EditorBuildSettings.scenes = SceneNames.BuildOrder
                .Select(n => new EditorBuildSettingsScene(ScenePath(n), true))
                .ToArray();
        }

        public static string ScenePath(string sceneName) => $"{ScenesFolder}/{sceneName}.unity";

        private static void SetBool(SerializedObject so, string field, bool value)
        {
            var p = so.FindProperty(field);
            if (p == null) Debug.LogWarning($"[ProjectSetup] URP field not found: {field}");
            else p.boolValue = value;
        }

        private static void SetInt(SerializedObject so, string field, int value)
        {
            var p = so.FindProperty(field);
            if (p == null) Debug.LogWarning($"[ProjectSetup] URP field not found: {field}");
            else p.intValue = value;
        }

        private static void SetFloat(SerializedObject so, string field, float value)
        {
            var p = so.FindProperty(field);
            if (p == null) Debug.LogWarning($"[ProjectSetup] URP field not found: {field}");
            else p.floatValue = value;
        }
    }
}

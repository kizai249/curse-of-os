using System.IO;
using System.Linq;
using FootballQuest.App;
using FootballQuest.App.Map;
using FootballQuest.Core.Map;
using FootballQuest.Core.Permissions;
using TMPro;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.TextCore.LowLevel;

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
        public const string FontsFolder = "Assets/_Project/Resources/Fonts";
        public static readonly string[] FontNames = { "IBMPlexSansArabic-Regular", "IBMPlexSansArabic-Bold" };
        public const string StationsFolder = "Assets/_Project/Resources/Stations";
        public const string MaterialsFolder = "Assets/_Project/Resources/Materials";
        public const string LitMaterialPath = MaterialsFolder + "/FQ_Lit.mat";

        [MenuItem("Football Quest/Apply Project Setup")]
        public static void Apply()
        {
            ApplyPlayerSettings();
            var pipeline = EnsurePipelineAsset();
            AssignPipeline(pipeline);
            EnsureScenes();
            EnsureTextMeshPro();
            EnsureStations();
            EnsureLitMaterial();
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
            // Google Play يشترط استهداف API 35 للتطبيقات الجديدة (قيمة رقمية لأن اسم الثابت يختلف بين نسخ المحرر).
            PlayerSettings.Android.targetSdkVersion = (AndroidSdkVersions)35;

            // ميزانية الأداء والحجم (ARCHITECTURE §2.2، AT-09): Frame Pacing يثبت 30 إطار ويقلل استهلاك البطارية،
            // وتجريد المحرك يصغّر الحجم. التجريد المُدار «منخفض» لأن Firebase يعتمد على Reflection.
            PlayerSettings.Android.optimizedFramePacing = true;
            PlayerSettings.stripEngineCode = true;
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.Low);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.iOS, ManagedStrippingLevel.Low);
            PlayerSettings.iOS.targetOSVersionString = IosMinimumVersion;
            // نصوص النظام (الإنجليزية أساس، والعربية في ar.lproj عبر IosBuildPostProcess).
            PlayerSettings.iOS.locationUsageDescription = SystemPermissionTexts.LocationWhenInUseEn;
            PlayerSettings.iOS.cameraUsageDescription = SystemPermissionTexts.CameraEn;
        }

        /// <summary>تعريفات المحطات الثمانية كـ ScriptableObjects (ARCHITECTURE §3). الموجود ما يُستبدل (تعديلات المصمم تبقى).</summary>
        private static void EnsureStations()
        {
            Directory.CreateDirectory(StationsFolder);
            foreach (var spec in StationCatalog.Defaults)
            {
                var path = $"{StationsFolder}/{spec.StadiumId}.asset";
                if (File.Exists(path)) continue;
                var definition = ScriptableObject.CreateInstance<StationDefinition>();
                definition.CopyFrom(spec);
                AssetDatabase.CreateAsset(definition, path);
            }
        }

        /// <summary>مادة Simple Lit في Resources تضمن دخول الـShader في البناء؛ الألوان نسخ منها وقت التشغيل.</summary>
        private static void EnsureLitMaterial()
        {
            if (File.Exists(LitMaterialPath)) return;
            var shader = Shader.Find("Universal Render Pipeline/Simple Lit");
            if (shader == null)
            {
                Debug.LogWarning("[ProjectSetup] URP Simple Lit shader not found.");
                return;
            }
            Directory.CreateDirectory(MaterialsFolder);
            var material = new Material(shader) { name = "FQ_Lit", enableInstancing = true };
            AssetDatabase.CreateAsset(material, LitMaterialPath);
        }

        /// <summary>
        /// موارد TMP الأساسية (TMP Settings والـShaders) + Font Assets ديناميكية لخط IBM Plex Sans Arabic.
        /// الناتج يُرفع للمستودع بعد أول تشغيل محلي (RUNBOOK §3.3).
        /// </summary>
        private static void EnsureTextMeshPro()
        {
            if (AssetDatabase.FindAssets("t:TMP_Settings").Length == 0)
            {
                var info = UnityEditor.PackageManager.PackageInfo.FindForAssembly(typeof(TMP_FontAsset).Assembly);
                var package = info == null ? null : Path.Combine(info.resolvedPath, "Package Resources", "TMP Essential Resources.unitypackage");
                if (package != null && File.Exists(package))
                {
                    AssetDatabase.ImportPackage(package, false);
                    AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
                }
                else
                {
                    Debug.LogWarning("[ProjectSetup] TMP Essential Resources package not found — import it from Window ▸ TextMeshPro.");
                }
            }

            if (Shader.Find("TextMeshPro/Mobile/Distance Field") == null && Shader.Find("TextMeshPro/Distance Field") == null)
            {
                Debug.LogWarning("[ProjectSetup] TMP shaders not imported yet — font assets will be created on the next run (runtime falls back to dynamic creation).");
                return;
            }

            foreach (var name in FontNames)
            {
                var assetPath = $"{FontsFolder}/{name} SDF.asset";
                if (File.Exists(assetPath)) continue;
                var font = AssetDatabase.LoadAssetAtPath<Font>($"{FontsFolder}/{name}.ttf");
                if (font == null) continue;
                var asset = TMP_FontAsset.CreateFontAsset(font, 90, 9, GlyphRenderMode.SDFAA, 1024, 1024, AtlasPopulationMode.Dynamic, true);
                if (asset == null) continue;
                asset.name = name + " SDF";
                AssetDatabase.CreateAsset(asset, assetPath);
                asset.atlasTextures[0].name = asset.name + " Atlas";
                AssetDatabase.AddObjectToAsset(asset.atlasTextures[0], asset);
                asset.material.name = asset.name + " Material";
                AssetDatabase.AddObjectToAsset(asset.material, asset);
                EditorUtility.SetDirty(asset);
            }
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

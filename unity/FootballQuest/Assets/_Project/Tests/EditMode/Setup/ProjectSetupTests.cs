using FootballQuest.App;
using FootballQuest.EditorTools;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace FootballQuest.Tests.Setup
{
    /// <summary>يتحقق إن ProjectSetup يضبط URP والمشاهد وإعدادات المنصتين (يشتغل داخل Unity فقط).</summary>
    public class ProjectSetupTests
    {
        [OneTimeSetUp]
        public void ApplySetup() => ProjectSetup.Apply();

        [Test]
        public void UrpIsTheActivePipeline()
        {
            Assert.That(GraphicsSettings.defaultRenderPipeline, Is.InstanceOf<UniversalRenderPipelineAsset>());
            Assert.That(QualitySettings.renderPipeline, Is.InstanceOf<UniversalRenderPipelineAsset>());
        }

        [Test]
        public void MobileBudgetIsApplied()
        {
            var urp = (UniversalRenderPipelineAsset)GraphicsSettings.defaultRenderPipeline;
            Assert.That(urp.supportsHDR, Is.False);
            Assert.That(urp.shadowCascadeCount, Is.EqualTo(1));
        }

        [Test]
        public void ScenesAreInBuildOrder()
        {
            var scenes = EditorBuildSettings.scenes;
            Assert.That(scenes.Length, Is.EqualTo(SceneNames.BuildOrder.Length));
            for (var i = 0; i < scenes.Length; i++)
            {
                Assert.That(scenes[i].path, Is.EqualTo(ProjectSetup.ScenePath(SceneNames.BuildOrder[i])));
                Assert.That(scenes[i].enabled, Is.True);
            }
        }

        [Test]
        public void PlatformSettingsMatchStoreRequirements()
        {
            Assert.That(PlayerSettings.Android.targetArchitectures, Is.EqualTo(AndroidArchitecture.ARM64));
            Assert.That((int)PlayerSettings.Android.minSdkVersion, Is.GreaterThanOrEqualTo(24));
            Assert.That(PlayerSettings.colorSpace, Is.EqualTo(ColorSpace.Linear));
            Assert.That(PlayerSettings.iOS.locationUsageDescription, Is.Not.Empty);
            Assert.That(PlayerSettings.iOS.cameraUsageDescription, Is.Not.Empty);
        }

        [Test]
        public void ArabicFontsAndLicensesAreInResources()
        {
            foreach (var name in ProjectSetup.FontNames)
            {
                Assert.That(Resources.Load<Font>("Fonts/" + name), Is.Not.Null, name);
            }
            Assert.That(Resources.Load<TextAsset>("Fonts/OFL"), Is.Not.Null);
            Assert.That(Resources.Load<TextAsset>("Licenses/RTLTMPro-MIT"), Is.Not.Null);
        }
    }
}

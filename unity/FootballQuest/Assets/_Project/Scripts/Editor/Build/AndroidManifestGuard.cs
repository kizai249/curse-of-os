#if UNITY_ANDROID
using System.IO;
using System.Xml;
using UnityEditor.Android;
using UnityEditor.Build;
using UnityEngine;

namespace FootballQuest.EditorTools.Build
{
    /// <summary>بعد توليد مشروع Gradle: يضيف أذونات الموقع والكاميرا ويُفشل البناء لو ظهر إذن الموقع الخلفي.</summary>
    public sealed class AndroidManifestGuard : IPostGenerateGradleAndroidProject
    {
        public int callbackOrder => 100;

        public void OnPostGenerateGradleAndroidProject(string path)
        {
            var manifestPath = Path.Combine(path, "src", "main", "AndroidManifest.xml");
            var doc = new XmlDocument();
            doc.Load(manifestPath);
            try
            {
                var added = ManifestPermissions.Apply(doc);
                if (added.Count > 0) Debug.Log("[AndroidManifestGuard] added " + string.Join(", ", added));
            }
            catch (System.InvalidOperationException ex)
            {
                throw new BuildFailedException(ex.Message);
            }
            doc.Save(manifestPath);
        }
    }
}
#endif

using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml;
using FootballQuest.Core.Permissions;

namespace FootballQuest.EditorTools.Build
{
    /// <summary>
    /// يضمن أذونات Android المطلوبة ويرفض ACCESS_BACKGROUND_LOCATION (لا Background Location — MVP_SCOPE §2).
    /// منطق XML نقي، فيُختبر في tools/core-tests بدون Unity.
    /// </summary>
    public static class ManifestPermissions
    {
        public const string AndroidNs = "http://schemas.android.com/apk/res/android";
        public const string ToolsNs = "http://schemas.android.com/tools";
        public const string AdIdPermission = "com.google.android.gms.permission.AD_ID";

        /// <summary>
        /// AT-10: ما فيه تحليلات طرف ثالث ولا معرّف إعلان. لو سحبت مكتبة Firebase Analytics بالغلط،
        /// هذي القيم تطفيها، وإذن AD_ID يُشال من الدمج النهائي.
        /// </summary>
        public static readonly (string Name, string Value)[] PrivacyMetaData =
        {
            ("firebase_analytics_collection_deactivated", "true"),
            ("google_analytics_adid_collection_enabled", "false"),
            ("google_analytics_default_allow_ad_personalization_signals", "false"),
        };

        /// <summary>يعدّل المستند ويرجع الأذونات المضافة. يرمي إذا وُجد إذن ممنوع (من أي مكتبة).</summary>
        public static IList<string> Apply(XmlDocument manifest)
        {
            var root = manifest.DocumentElement ?? throw new InvalidOperationException("empty manifest");
            var existing = new HashSet<string>();
            foreach (XmlElement e in root.GetElementsByTagName("uses-permission"))
            {
                var name = e.GetAttribute("name", AndroidNs);
                if (name == SystemPermissionTexts.AndroidForbidden)
                {
                    throw new InvalidOperationException(
                        SystemPermissionTexts.AndroidForbidden + " is forbidden (foreground location only — PERMISSION_AND_ERROR_STATES §1.3).");
                }
                existing.Add(name);
            }

            var added = new List<string>();
            foreach (var permission in SystemPermissionTexts.AndroidRequired)
            {
                if (existing.Contains(permission)) continue;
                var element = manifest.CreateElement("uses-permission");
                var attr = manifest.CreateAttribute("android", "name", AndroidNs);
                attr.Value = permission;
                element.Attributes.Append(attr);
                root.PrependChild(element);
                added.Add(permission);
            }
            return added;
        }

        /// <summary>يضيف قيم الخصوصية تحت &lt;application&gt; وعلامة حذف AD_ID. آمن للتكرار.</summary>
        public static void ApplyPrivacy(XmlDocument manifest)
        {
            var root = manifest.DocumentElement ?? throw new InvalidOperationException("empty manifest");
            if (root.GetAttribute("xmlns:tools") != ToolsNs) root.SetAttribute("xmlns:tools", ToolsNs);
            var application = root.GetElementsByTagName("application").Cast<XmlElement>().FirstOrDefault()
                ?? throw new InvalidOperationException("manifest has no <application>");

            var meta = application.GetElementsByTagName("meta-data").Cast<XmlElement>()
                .ToDictionary(e => e.GetAttribute("name", AndroidNs), e => e);
            foreach (var (name, value) in PrivacyMetaData)
            {
                if (!meta.TryGetValue(name, out var element))
                {
                    element = manifest.CreateElement("meta-data");
                    SetAttr(manifest, element, "android", "name", AndroidNs, name);
                    application.AppendChild(element);
                }
                SetAttr(manifest, element, "android", "value", AndroidNs, value);
            }

            var adId = root.GetElementsByTagName("uses-permission").Cast<XmlElement>()
                .FirstOrDefault(e => e.GetAttribute("name", AndroidNs) == AdIdPermission);
            if (adId == null)
            {
                adId = manifest.CreateElement("uses-permission");
                SetAttr(manifest, adId, "android", "name", AndroidNs, AdIdPermission);
                root.PrependChild(adId);
            }
            SetAttr(manifest, adId, "tools", "node", ToolsNs, "remove");
        }

        private static void SetAttr(XmlDocument doc, XmlElement element, string prefix, string local, string ns, string value)
        {
            var attr = element.GetAttributeNode(local, ns);
            if (attr == null)
            {
                attr = doc.CreateAttribute(prefix, local, ns);
                element.Attributes.Append(attr);
            }
            attr.Value = value;
        }
    }
}

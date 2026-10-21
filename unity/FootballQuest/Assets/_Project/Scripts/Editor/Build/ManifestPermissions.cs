using System;
using System.Collections.Generic;
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
    }
}

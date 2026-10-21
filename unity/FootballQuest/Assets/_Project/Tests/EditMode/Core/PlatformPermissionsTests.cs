using System;
using System.Linq;
using System.Xml;
using FootballQuest.Core.Permissions;
using FootballQuest.EditorTools.Build;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class PlatformPermissionsTests
    {
        private const string Unity =
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
            "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\" package=\"com.unity3d.player\">" +
            "<uses-permission android:name=\"android.permission.INTERNET\" />" +
            "<application /></manifest>";

        [Test]
        public void AddsForegroundLocationAndCamera()
        {
            var doc = new XmlDocument();
            doc.LoadXml(Unity);
            var added = ManifestPermissions.Apply(doc);
            Assert.That(added, Is.EquivalentTo(SystemPermissionTexts.AndroidRequired));
            Assert.That(ManifestPermissions.Apply(doc), Is.Empty, "idempotent");
            var names = doc.GetElementsByTagName("uses-permission").Cast<XmlElement>()
                .Select(e => e.GetAttribute("name", ManifestPermissions.AndroidNs)).ToArray();
            Assert.That(names, Does.Contain("android.permission.ACCESS_FINE_LOCATION"));
            Assert.That(names, Does.Not.Contain(SystemPermissionTexts.AndroidForbidden));
        }

        [Test]
        public void RejectsBackgroundLocationFromAnyLibrary()
        {
            var doc = new XmlDocument();
            doc.LoadXml(Unity.Replace("android.permission.INTERNET", SystemPermissionTexts.AndroidForbidden));
            Assert.Throws<InvalidOperationException>(() => ManifestPermissions.Apply(doc));
        }

        [Test]
        public void SystemTextsMatchTheDesignDocument()
        {
            Assert.That(SystemPermissionTexts.LocationWhenInUseAr,
                Is.EqualTo("نستخدم موقعك أثناء استخدام اللعبة فقط لمعرفة قربك من الملاعب والفروع الشريكة ومنحك مكافآت القرب."));
            Assert.That(SystemPermissionTexts.CameraEn, Is.EqualTo("To scan QR codes at partner branches and coupon codes."));
        }
    }
}

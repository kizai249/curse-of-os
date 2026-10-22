using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Xml;
using FootballQuest.Core.Ui;
using FootballQuest.Tests.Core;
using NUnit.Framework;

namespace FootballQuest.Tests.ReleaseAudit
{
    /// <summary>
    /// فحوص ما قبل الرفع على ملفات المستودع (S10a): الخصوصية (AT-10) وقائمة المتجرين (AT-11، RIGHTS_REGISTER الصف 19).
    /// تشتغل في dotnet فقط لأنها تقرأ ملفات خارج مشروع Unity.
    /// </summary>
    public class ReleaseAuditTests
    {
        private static readonly string Root = Path.GetFullPath(Path.Combine(SharedVectors.ContractsDir(), "..", ".."));
        private static readonly string Unity = Path.Combine(Root, "unity", "FootballQuest");

        /// <summary>SDKs تحليلات أو إعلانات طرف ثالث — ممنوعة (AT-10). Crashlytics مسموح بدون Analytics (Q6).</summary>
        private static readonly string[] ForbiddenSdks =
        {
            "firebase.analytics", "FirebaseAnalytics", "firebase-analytics", "com.unity.analytics", "com.unity.services.analytics",
            "com.unity.ads", "com.unity.services.levelplay", "GoogleMobileAds", "play-services-ads", "com.google.ads",
            "facebook", "appsflyer", "com.adjust", "gameanalytics",
        };

        private static JsonElement Listing() =>
            JsonDocument.Parse(File.ReadAllText(Path.Combine(Root, "docs", "store", "listing.json"))).RootElement;

        [Test]
        public void NoThirdPartyAnalyticsOrAdsInTheBuild()
        {
            var manifest = File.ReadAllText(Path.Combine(Unity, "Packages", "manifest.json"));
            var gradle = Directory.GetFiles(Path.Combine(Unity, "Assets"), "*.gradle", SearchOption.AllDirectories).Select(File.ReadAllText);
            var files = Directory.GetFiles(Path.Combine(Unity, "Assets"), "*", SearchOption.AllDirectories).Select(Path.GetFileName);
            foreach (var sdk in ForbiddenSdks)
            {
                Assert.That(manifest, Does.Not.Contain(sdk).IgnoreCase, "Packages/manifest.json");
                Assert.That(gradle, Has.None.Contains(sdk), "androidlib dependencies");
                Assert.That(files.Where(f => f.IndexOf(sdk, StringComparison.OrdinalIgnoreCase) >= 0), Is.Empty, "Assets files");
            }
        }

        [Test]
        public void IosPrivacyManifestDeclaresNoTracking()
        {
            var doc = new XmlDocument { XmlResolver = null };
            doc.Load(Path.Combine(Unity, "Platform", "iOS", "PrivacyInfo.xcprivacy"));
            var dict = doc.SelectSingleNode("/plist/dict");
            Assert.That(ValueAfterKey(dict, "NSPrivacyTracking")?.Name, Is.EqualTo("false"));
            Assert.That(ValueAfterKey(dict, "NSPrivacyTrackingDomains")?.ChildNodes.Count, Is.EqualTo(0));

            var types = doc.SelectNodes("//dict[key='NSPrivacyCollectedDataType']").Cast<XmlNode>().ToList();
            Assert.That(types, Is.Not.Empty);
            foreach (var type in types) Assert.That(ValueAfterKey(type, "NSPrivacyCollectedDataTypeTracking")?.Name, Is.EqualTo("false"));

            // الإحداثيات الدقيقة ما تُخزن (DATA_CONTRACTS §0) — فما تُعلن كبيانات مجمعة.
            var declared = types.Select(t => ValueAfterKey(t, "NSPrivacyCollectedDataType").InnerText).ToList();
            Assert.That(declared, Does.Not.Contain("NSPrivacyCollectedDataTypePreciseLocation"));
            var labels = File.ReadAllText(Path.Combine(Root, "docs", "store", "PRIVACY_LABELS.md"));
            foreach (var t in declared) Assert.That(labels, Does.Contain(t), "PRIVACY_LABELS.md documents " + t);
        }

        [Test]
        public void ListingStartsWithTheApprovedDisclaimer()
        {
            var listing = Listing();
            foreach (var (lang, language) in new[] { ("ar", Language.Arabic), ("en", Language.English) })
            {
                var description = listing.GetProperty(lang).GetProperty("description").GetString();
                Assert.That(description.Split("\n\n")[0], Is.EqualTo(UiStrings.Get(UiStrings.Disclaimer, language)), lang);
            }
        }

        [Test]
        public void ListingHasNoTournamentMarksAndFitsStoreLimits()
        {
            var listing = Listing();
            var banned = listing.GetProperty("bannedTerms").EnumerateArray().Select(e => e.GetString()).ToList();
            var name = listing.GetProperty("appName").GetString();
            Assert.That(name.Length, Is.LessThanOrEqualTo(30));

            foreach (var lang in new[] { "ar", "en" })
            {
                var l = listing.GetProperty(lang);
                var subtitle = l.GetProperty("subtitle").GetString();
                var shortDescription = l.GetProperty("shortDescription").GetString();
                var keywords = l.GetProperty("keywords").EnumerateArray().Select(e => e.GetString()).ToList();
                var description = l.GetProperty("description").GetString();

                Assert.That(subtitle.Length, Is.LessThanOrEqualTo(30), lang + " App Store subtitle");
                Assert.That(string.Join(",", keywords).Length, Is.LessThanOrEqualTo(100), lang + " App Store keywords");
                Assert.That(shortDescription.Length, Is.LessThanOrEqualTo(80), lang + " Play short description");
                Assert.That(description.Length, Is.LessThanOrEqualTo(4000), lang + " description");

                // الإفصاح (الفقرة الأولى) هو المكان الوحيد المسموح فيه بذكر الاتحاد.
                var body = string.Join("\n\n", description.Split("\n\n").Skip(1));
                var checkedTexts = new List<string> { name, subtitle, shortDescription, body };
                checkedTexts.AddRange(keywords);
                foreach (var term in banned)
                    Assert.That(checkedTexts.Where(t => t.IndexOf(term, StringComparison.OrdinalIgnoreCase) >= 0), Is.Empty, $"{lang}: «{term}»");
            }
        }

        [Test]
        public void ContentRatingMatchesTheProduct()
        {
            var rating = Listing().GetProperty("contentRating");
            Assert.That(rating.GetProperty("targetAge").GetString(), Is.EqualTo("15+"));
            foreach (var flag in new[] { "gambling", "lootBoxesForMoney", "inAppPurchases", "ads", "chat" })
                Assert.That(rating.GetProperty(flag).GetBoolean(), Is.False, flag);
        }

        /// <summary>RIGHTS_REGISTER الصف 16: كل رخصة في صفحة «تراخيص مفتوحة المصدر» لها ملف نص فعلي.</summary>
        [Test]
        public void LicensesPageResourcesExist()
        {
            var settings = File.ReadAllText(Path.Combine(Unity, "Assets", "_Project", "Scripts", "App", "Flow", "AppController.Settings.cs"));
            var resources = System.Text.RegularExpressions.Regex.Matches(settings, "\"((?:Fonts|Licenses)/[^\"]+)\"")
                .Select(m => m.Groups[1].Value).ToList();
            Assert.That(resources, Has.Count.GreaterThanOrEqualTo(5));
            foreach (var r in resources)
                Assert.That(File.Exists(Path.Combine(Unity, "Assets", "_Project", "Resources", r + ".txt")), Is.True, r);
        }

        private static XmlNode ValueAfterKey(XmlNode dict, string key)
        {
            var nodes = dict.ChildNodes.Cast<XmlNode>().Where(n => n.NodeType == XmlNodeType.Element).ToList();
            var i = nodes.FindIndex(n => n.Name == "key" && n.InnerText == key);
            return i >= 0 && i + 1 < nodes.Count ? nodes[i + 1] : null;
        }
    }
}

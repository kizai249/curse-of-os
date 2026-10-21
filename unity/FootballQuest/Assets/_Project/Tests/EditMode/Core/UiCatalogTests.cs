using System.Linq;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class UiCatalogTests
    {
        // كل المعرّفات في PERMISSION_AND_ERROR_STATES.md v1.0 (§1–§7).
        private static readonly string[] DocumentedIds =
        {
            "PERM_LOC_PRE", "PERM_CAM_PRE", "LOC_DENIED", "LOC_RESTRICTED", "LOC_APPROX_ONLY", "CAM_DENIED",
            "LOC_TIMEOUT", "LOC_WEAK", "LOC_OUT_OF_ZONE", "LOC_MOCK", "ZONE_STADIUM_OK", "ZONE_STADIUM_DONE", "ZONE_BRANCH_NEARBY",
            "QR_CHECKIN_VERIFIED", "QR_CHECKIN_UNVERIFIED", "QR_ALREADY_TODAY", "QR_INVALID", "QR_BRANCH_INACTIVE",
            "CPN_ISSUED", "CPN_SOLD_OUT_BRANCH", "CPN_USER_LIMIT", "CPN_NEED_LOCATION", "CPN_EXPIRED",
            "STAFF_REDEEM_OK", "STAFF_REDEEM_USED", "STAFF_REDEEM_EXPIRED", "STAFF_REDEEM_WRONG_BRANCH", "STAFF_REDEEM_NOT_FOUND", "STAFF_RATE_LIMIT",
            "INV_OK", "INV_USED", "INV_EXPIRED", "INV_INVALID",
            "ROOM_NEED_CHECKIN", "ROOM_NOT_FOUND", "ROOM_FULL", "ROOM_STARTED", "ROOM_LOBBY_EXPIRED", "ROOM_NEED_TWO",
            "ROUND_WITH_COUPONS", "ROUND_NO_COUPONS", "ROUND_USER_NOT_ELIGIBLE", "ROUND_WRONG", "ROUND_HOST_CHANGED",
            "ROUND_PLAYER_LEFT", "ROUND_RECONNECTING", "ROUND_WON", "ROUND_LOST", "ROUND_DAILY_CAP",
            "AGE_GATE", "AGE_UNDER_15", "ACC_GUEST_LINK", "ACC_DELETE_CONFIRM", "ACC_DELETE_DONE", "CITY_CHANGE_LOCKED",
            "NET_OFFLINE", "SRV_BUSY", "APP_INTEGRITY", "FORCE_UPDATE", "FEATURE_SOON",
        };

        [Test]
        public void CatalogCoversExactlyTheDocumentedStates()
        {
            var ids = StateCatalog.All.Select(s => s.Id).OrderBy(x => x).ToArray();
            Assert.That(ids, Is.EqualTo(DocumentedIds.OrderBy(x => x).ToArray()));
        }

        [Test]
        public void EveryVisibleStateHasArabicAndEnglishText()
        {
            foreach (var s in StateCatalog.All.Where(s => s.Presentation != Presentation.Hidden))
            {
                Assert.That(s.BodyAr, Is.Not.Null.And.Not.Empty, s.Id + " ar");
                Assert.That(s.BodyEn, Is.Not.Null.And.Not.Empty, s.Id + " en");
                Assert.That(s.BodyAr.Any(c => c >= '؀' && c <= 'ۿ'), Is.True, s.Id + " ar is Arabic");
            }
        }

        [Test]
        public void PlaceholdersMatchBetweenLanguages()
        {
            foreach (var s in StateCatalog.All)
            {
                Assert.That(UiState.PlaceholdersOf(s.BodyEn), Is.EquivalentTo(UiState.PlaceholdersOf(s.BodyAr)), s.Id);
            }
        }

        [Test]
        public void ArabicTextKeepsTheDocumentWording()
        {
            Assert.That(StateCatalog.Get(StateCatalog.QrInvalid).BodyAr, Is.EqualTo("الرمز غير صالح — امسح رمز اليوم في الفرع."));
            Assert.That(StateCatalog.Get(StateCatalog.LocWeak).BodyAr, Is.EqualTo("الإشارة ضعيفة — جرّب قرب النافذة أو خارج المبنى."));
            Assert.That(StateCatalog.Get(StateCatalog.PermLocPre).Presentation, Is.EqualTo(Presentation.Sheet));
            Assert.That(StateCatalog.Get(StateCatalog.LocDenied).Presentation, Is.EqualTo(Presentation.Inline));
        }

        [Test]
        public void FormatFillsPlaceholders()
        {
            var text = StateCatalog.Get(StateCatalog.RoundWrong).Format(Language.Arabic,
                new System.Collections.Generic.Dictionary<string, string> { { "correct", "6" }, { "total", "8" } });
            Assert.That(text, Is.EqualTo("6 من 8 صحيحة — −15 ثانية."));
        }

        [Test]
        public void UiStringsHaveBothLanguages()
        {
            foreach (var key in UiStrings.Keys)
            {
                Assert.That(UiStrings.Get(key, Language.Arabic), Is.Not.Empty.And.Not.EqualTo(key), key);
                Assert.That(UiStrings.Get(key, Language.English), Is.Not.Empty.And.Not.EqualTo(key), key);
            }
            Assert.That(UiStrings.CityName("JED", Language.Arabic), Is.EqualTo("جدة"));
        }

        [Test]
        public void DisclaimerMatchesRightsRegister()
        {
            var ar = UiStrings.Get(UiStrings.Disclaimer, Language.Arabic);
            Assert.That(ar, Does.StartWith("Football Quest لعبة مستقلة وغير رسمية"));
            Assert.That(ar, Does.Contain("(AFC)"));
            Assert.That(UiStrings.Get(UiStrings.Disclaimer, Language.English), Does.Contain("not endorsed by the Asian Football Confederation (AFC)"));
        }

        [Test]
        public void LanguageDirection()
        {
            Assert.That(Language.Arabic.IsRightToLeft(), Is.True);
            Assert.That(Language.English.IsRightToLeft(), Is.False);
            Assert.That(LanguageExtensions.FromCode("en"), Is.EqualTo(Language.English));
            Assert.That(LanguageExtensions.FromCode("xx"), Is.EqualTo(Language.Arabic));
        }
    }
}

using System.Collections.Generic;
using System.Linq;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Location;
using FootballQuest.Core.Qr;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class CouponClientTests
    {
        private static object Result(string sample) => JsonFields.Obj(MiniJson.Parse(SharedVectors.Sample(sample)), "result");

        [Test]
        public void QrRoundTripThroughCameraLikePixels()
        {
            const string code = "FQB1:br_hm_jed_tahlia:2027-01-15:Zm9vYmFyYmF6cXV4MTIzNA";
            var modules = QrCodec.Encode(code, 300);
            var w = modules.GetLength(0);
            var h = modules.GetLength(1);
            var rgba = new byte[w * h * 4];
            for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++)
            {
                var v = modules[x, y] ? (byte)20 : (byte)235;
                var i = (y * w + x) * 4;
                rgba[i] = v; rgba[i + 1] = v; rgba[i + 2] = v; rgba[i + 3] = 255;
            }
            Assert.That(QrCodec.Decode(rgba, w, h), Is.EqualTo(code));
            Assert.That(QrCodec.Decode(new byte[w * h * 4], w, h), Is.Null, "blank frame");
            Assert.That(ScanFlow.LooksLikeBranchCode(code), Is.True);
            Assert.That(ScanFlow.LooksLikeBranchCode("https://example.com"), Is.False);
        }

        [Test]
        public void VerifiedScanFeedback()
        {
            var r = ScanResult.Parse(Result("scanBranchCode.verified"));
            Assert.That(r.Verified, Is.True);
            Assert.That(r.Coupons.Single().ManualCode, Is.EqualTo("K7M2QX9P"));
            var fb = ScanFlow.ForScan(r, null, Language.Arabic);
            Assert.That(fb.Select(f => f.StateId), Is.EqualTo(new[] { StateCatalog.QrCheckinVerified, StateCatalog.CpnIssued, StateCatalog.CpnSoldOutBranch }));
            Assert.That(fb[0].Values["branch"], Is.EqualTo("هاف مليون — فرع التحلية"));
            Assert.That(fb[1].Values["title"], Is.EqualTo("قهوة اليوم"));
            Assert.That(fb[1].Values["date"], Is.EqualTo("2027/01/22"));
            var text = StateCatalog.Get(StateCatalog.CpnIssued).Format(Language.Arabic, fb[1].Values);
            Assert.That(text, Does.Contain("قهوة اليوم").And.Contain("2027/01/22"));
        }

        [Test]
        public void UnverifiedScanExplainsWeakSignalAndLocationCampaigns()
        {
            var r = new ScanResult { Status = "checked_in", BranchName = new Localized(), BrandName = new Localized() };
            r.Notes.Add(new CampaignNote { CampaignId = "c", Title = new Localized(), Reason = "need_location" });
            var weak = new LocationReading { Status = ReadingStatus.Ok, Lat = 21.5, Lng = 39.1, AccuracyM = 180 };
            Assert.That(ScanFlow.ShouldAttachLocation(weak), Is.False, "weak readings are not sent");
            var fb = ScanFlow.ForScan(r, weak, Language.Arabic);
            Assert.That(fb.Select(f => f.StateId), Is.EqualTo(new[] { StateCatalog.LocWeak, StateCatalog.QrCheckinUnverified, StateCatalog.CpnNeedLocation }));
            Assert.That(ScanFlow.ForScan(new ScanResult { Status = "already", BranchName = new Localized(), BrandName = new Localized() }, null, Language.Arabic).Single().StateId,
                Is.EqualTo(StateCatalog.QrAlreadyToday));
            Assert.That(ScanFlow.ShouldAttachLocation(new LocationReading { Status = ReadingStatus.Ok, Lat = 1, Lng = 1, AccuracyM = 40 }), Is.True);
        }

        [Test]
        public void InvoiceAndWalletParsing()
        {
            var inv = InvoiceResult.Parse(Result("submitInvoiceCode.issued"));
            Assert.That(inv.Coupon.CouponId, Is.EqualTo("cp_b7"));
            Assert.That(InvoiceResult.Parse(MiniJson.Parse("{\"status\":\"rejected\",\"stateId\":\"INV_USED\"}")).RejectedStateId, Is.EqualTo("INV_USED"));
            Assert.That(ScanFlow.NormalizeInvoice(" ab2-c3d "), Is.EqualTo("AB2C3D"));

            var wallet = CouponInfo.Parse("cp1", MiniJson.Parse(
                "{\"campaignId\":\"c\",\"title\":{\"ar\":\"قهوة\",\"en\":\"Coffee\"},\"status\":\"issued\",\"expiresAt\":\"2027-01-22T18:00:00Z\"}"));
            Assert.That(wallet.IsUsable(new System.DateTimeOffset(2027, 1, 20, 0, 0, 0, System.TimeSpan.Zero)), Is.True);
            Assert.That(wallet.IsUsable(new System.DateTimeOffset(2027, 1, 23, 0, 0, 0, System.TimeSpan.Zero)), Is.False);
        }

        [Test]
        public void VaultKeepsCodesPerCoupon()
        {
            var store = new MemoryStore();
            var vault = new RedeemCodeVault(store);
            Assert.That(vault.Load("cp1"), Is.Null);
            vault.Save("cp1", new RedeemCodes { Token = "tok", Manual = "K7M2QX9P" });
            Assert.That(vault.Load("cp1").Manual, Is.EqualTo("K7M2QX9P"));
            vault.Forget("cp1");
            Assert.That(vault.Load("cp1"), Is.Null);
        }

        private sealed class MemoryStore : ISecureStore
        {
            private readonly Dictionary<string, string> values = new Dictionary<string, string>();
            public string Get(string key) => values.TryGetValue(key, out var v) ? v : null;
            public void Set(string key, string value) => values[key] = value;
            public void Delete(string key) => values.Remove(key);
        }
    }
}

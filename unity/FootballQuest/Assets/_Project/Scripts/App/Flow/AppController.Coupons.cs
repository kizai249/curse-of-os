using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FootballQuest.App.UI;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Location;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    /// <summary>
    /// رمز الفرع والقسائم (S7): الماسح، وتسجيل الحضور والزيارة المحققة، والمحفظة ورمز الاسترداد، ورمز الفاتورة.
    /// </summary>
    public sealed partial class AppController
    {
        private const string GuestLinkShownKey = "fq.guest_link_shown";
        private QrScanner scanner;
        private Task<LocationReading> scanReading;
        private bool scanning;

        // ── المسح ─────────────────────────────────────────────

        /// <summary>«امسح رمز الفرع»: إذن الكاميرا أولًا. القراءة الموقعية تبدأ مع فتح الماسح إذا الإذن الدقيق ممنوح (§2.1).</summary>
        private void StartBranchScan()
        {
            RequestFieldFeature(PermissionKind.Camera, RenderScanner, RenderInvoiceEntry);
        }

        private void RenderScanner()
        {
            hubVisible = false;
            var screen = ui.NewScreen("Scanner");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.ScanBranch), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, CloseScanner, ButtonStyle.Ghost);
            UiFactory.Label(screen, T(UiStrings.ScanHint), Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
            scanner = QrScanner.Create(screen, code => Run(SubmitScanAsync(code)));
            UiFactory.Button(screen, T(UiStrings.InvoiceCode), Lang, () => { CloseScannerCamera(); RenderInvoiceEntry(); }, ButtonStyle.Secondary);

            scanReading = services.Permissions.GetStatus(PermissionKind.Location) == PermissionStatus.Granted
                ? services.Location.ReadOnceAsync(PresencePolicy.ReadTimeoutMs)
                : null;
        }

        private void CloseScannerCamera()
        {
            if (scanner != null) scanner.Stop();
            scanner = null;
        }

        private void CloseScanner()
        {
            CloseScannerCamera();
            BackToHub();
        }

        private async Task SubmitScanAsync(string code)
        {
            if (scanning) return;
            CloseScannerCamera();
            if (!ScanFlow.LooksLikeBranchCode(code))
            {
                ShowState(StateCatalog.QrInvalid, null, new SheetButton(T(UiStrings.Retry), RenderScanner));
                return;
            }
            scanning = true;
            try
            {
                var reading = scanReading != null ? await scanReading : null;
                var result = await Retry.RunAsync(_ => services.Coupons.ScanBranchCodeAsync(code, reading, Platform, Application.version));
                ApplyBalances(result.Balances);
                foreach (var c in result.Coupons) services.Vault.Save(c.CouponId, new RedeemCodes { Token = c.RedeemToken, Manual = c.ManualCode });
                // TODO(S8): تسجيل الحضور اليوم يفتح غرف «منتخبنا يجمعنا» في هذا الفرع.
                ShowFeedback(ScanFlow.ForScan(result, reading, Lang), result.Coupons.Count > 0);
            }
            catch (BackendException ex) when (ex.StateId == StateCatalog.QrInvalid || ex.StateId == StateCatalog.QrBranchInactive)
            {
                ShowState(ex.StateId, null, new SheetButton(T(UiStrings.Retry), RenderScanner), new SheetButton(T(UiStrings.Close), BackToHub, ButtonStyle.Ghost));
                return;
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            finally
            {
                scanning = false;
            }
            BackToHub();
        }

        /// <summary>الحالات النصية في Sheet واحد بالترتيب، ثم ACC_GUEST_LINK بعد أول قسيمة للضيف.</summary>
        private void ShowFeedback(List<Feedback> feedback, bool gotCoupon)
        {
            var title = (string)null;
            var body = new StringBuilder();
            foreach (var f in feedback)
            {
                var state = StateCatalog.Get(f.StateId);
                if (state == null) continue;
                if (body.Length > 0) body.Append("\n\n");
                body.Append(state.Format(Lang, f.Values));
                title = title ?? state.Title(Lang);
            }
            var buttons = new List<SheetButton>();
            if (gotCoupon) buttons.Add(new SheetButton(T(UiStrings.Wallet), () => Run(RenderWalletAsync())));
            buttons.Add(new SheetButton(T(UiStrings.Ok), MaybeAskGuestToLink, gotCoupon ? ButtonStyle.Ghost : ButtonStyle.Primary));
            ui.Sheet(title, body.ToString(), Lang, buttons.ToArray());
            if (gotCoupon) pendingGuestLink = true;
        }

        private bool pendingGuestLink;

        /// <summary>ACC_GUEST_LINK: ضيف بعد أول قسيمة — مرة وحدة.</summary>
        private void MaybeAskGuestToLink()
        {
            if (!pendingGuestLink || services.Auth.Provider != "anonymous" || services.UsesEmulator) return;
            if (services.Store.GetBool(GuestLinkShownKey)) return;
            pendingGuestLink = false;
            services.Store.SetBool(GuestLinkShownKey, true);
            ShowState(StateCatalog.AccGuestLink, null,
                new SheetButton(T(UiStrings.LinkApple), () => Run(LinkAsync(FootballQuest.Core.Accounts.LinkProvider.Apple))),
                new SheetButton(T(UiStrings.LinkGoogle), () => Run(LinkAsync(FootballQuest.Core.Accounts.LinkProvider.Google)), ButtonStyle.Secondary),
                new SheetButton(T(UiStrings.Later), null, ButtonStyle.Ghost));
        }

        // ── رمز الفاتورة ──────────────────────────────────────

        private string invoiceInline;

        private void RenderInvoiceEntry()
        {
            hubVisible = false;
            var screen = ui.NewScreen("Invoice");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.InvoiceCode), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, () => { invoiceInline = null; BackToHub(); }, ButtonStyle.Ghost);
            UiFactory.Label(screen, T(UiStrings.InvoiceHint), Lang, UiTheme.BodySize, color: UiTheme.TextMuted);
            var input = UiFactory.CodeInput(screen, "ABC123", 6);
            if (invoiceInline != null) UiFactory.Label(screen, State(invoiceInline), Lang, UiTheme.SmallSize, color: UiTheme.Warning);
            UiFactory.Spacer(screen);
            UiFactory.Button(screen, T(UiStrings.Confirm), Lang, () => Run(SubmitInvoiceAsync(input.text)));
        }

        private async Task SubmitInvoiceAsync(string raw)
        {
            var code = ScanFlow.NormalizeInvoice(raw);
            if (code.Length != 6)
            {
                invoiceInline = StateCatalog.InvInvalid;
                RenderInvoiceEntry();
                return;
            }
            try
            {
                var result = await Retry.RunAsync(_ => services.Coupons.SubmitInvoiceCodeAsync(code));
                if (result.Coupon == null)
                {
                    invoiceInline = result.RejectedStateId;
                    RenderInvoiceEntry();
                    return;
                }
                invoiceInline = null;
                services.Vault.Save(result.Coupon.CouponId, new RedeemCodes { Token = result.Coupon.RedeemToken, Manual = result.Coupon.ManualCode });
                BackToHub();
                ShowFeedback(new List<Feedback> { ScanFlow.Issued(result.Coupon, Lang) }, true);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
        }

        // ── المحفظة ───────────────────────────────────────────

        private List<CouponInfo> walletCoupons;

        private async Task RenderWalletAsync()
        {
            hubVisible = false;
            var screen = ui.NewScreen("Wallet");
            WalletHeader(screen, BackToHub);
            UiFactory.Label(screen, "…", Lang, UiTheme.TitleSize, center: true);
            try
            {
                walletCoupons = (await services.Wallet.GetMyCouponsAsync(services.Auth.Uid))
                    .OrderByDescending(c => c.IsUsable(DateTimeOffset.UtcNow)).ThenBy(c => c.ExpiresAt).ToList();
            }
            catch (Exception ex)
            {
                ShowError(ex);
                walletCoupons = walletCoupons ?? new List<CouponInfo>();
            }
            RenderWallet();
        }

        private void WalletHeader(RectTransform screen, Action back)
        {
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.Wallet), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, back, ButtonStyle.Ghost);
        }

        private void RenderWallet()
        {
            var screen = ui.NewScreen("Wallet");
            WalletHeader(screen, BackToHub);
            if (walletCoupons == null || walletCoupons.Count == 0)
            {
                UiFactory.Label(screen, T(UiStrings.WalletEmpty), Lang, UiTheme.BodySize, color: UiTheme.TextMuted, center: true);
                UiFactory.Spacer(screen);
                UiFactory.Button(screen, T(UiStrings.InvoiceCode), Lang, RenderInvoiceEntry, ButtonStyle.Secondary);
                return;
            }
            var list = UiFactory.Scroll(screen, "Coupons");
            var now = DateTimeOffset.UtcNow;
            foreach (var c in walletCoupons)
            {
                var coupon = c;
                var usable = c.IsUsable(now);
                var label = c.Title.Get(Lang) + "\n" + StatusLine(c, now);
                UiFactory.Button(list, label, Lang, () => RenderCoupon(coupon), usable ? ButtonStyle.Secondary : ButtonStyle.Ghost);
            }
            UiFactory.Button(screen, T(UiStrings.InvoiceCode), Lang, RenderInvoiceEntry, ButtonStyle.Ghost);
        }

        private string StatusLine(CouponInfo c, DateTimeOffset now)
        {
            if (c.Status == "redeemed" && c.RedeemedAt.HasValue)
                return UiState.Fill(T(UiStrings.RedeemedOn), new Dictionary<string, string> { { "date", ScanFlow.FormatDate(c.RedeemedAt.Value) } });
            if (!c.IsUsable(now))
                return State(StateCatalog.CpnExpired, new Dictionary<string, string> { { "date", ScanFlow.FormatDate(c.ExpiresAt) } });
            return UiState.Fill(T(UiStrings.ValidUntil), new Dictionary<string, string> { { "date", ScanFlow.FormatDate(c.ExpiresAt) } });
        }

        /// <summary>القسيمة: QR الاسترداد الفردي + الرمز اليدوي (من التخزين الآمن)، أو CPN_EXPIRED inline.</summary>
        private void RenderCoupon(CouponInfo coupon)
        {
            var screen = ui.NewScreen("Coupon");
            WalletHeader(screen, RenderWallet);
            UiFactory.Label(screen, coupon.Title.Get(Lang), Lang, UiTheme.HeadingSize, bold: true, center: true);
            var now = DateTimeOffset.UtcNow;
            if (coupon.IsUsable(now))
            {
                var codes = services.Vault.Load(coupon.CouponId);
                if (codes != null && !string.IsNullOrEmpty(codes.Token))
                {
                    UiFactory.Label(screen, T(UiStrings.ShowToCashier), Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
                    QrView.Build(UiFactory.Centered(screen, "QrRow", 640f), codes.Token, 620f);
                    UiFactory.Label(screen, UiState.Fill(T(UiStrings.ManualCode), new Dictionary<string, string> { { "code", codes.Manual } }),
                        Language.English, UiTheme.HeadingSize, bold: true, center: true);
                }
                else
                {
                    // الرمز ما هو على هذا الجهاز (جهاز جديد أو حذف التطبيق): الخادم يولّد رمزًا جديدًا ويعطّل القديم.
                    UiFactory.Button(screen, T(UiStrings.ReissueCode), Lang, () => Run(ReissueAsync(coupon)));
                }
            }
            UiFactory.Label(screen, StatusLine(coupon, now), Lang, UiTheme.SmallSize, center: true,
                color: coupon.IsUsable(now) ? UiTheme.TextMuted : UiTheme.Warning);
            UiFactory.Label(screen, T(UiStrings.Terms) + ": " + coupon.Terms.Get(Lang), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
        }

        private async Task ReissueAsync(CouponInfo coupon)
        {
            try
            {
                var codes = await services.Coupons.ReissueAsync(coupon.CouponId);
                services.Vault.Save(coupon.CouponId, codes);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            RenderCoupon(coupon);
        }
    }
}

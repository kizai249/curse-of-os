using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using FootballQuest.App.UI;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    public sealed partial class AppController
    {
        private string settingsInlineState;
        private Dictionary<string, string> settingsInlineValues;

        private void RenderSettings()
        {
            hubVisible = false;
            var screen = ui.NewScreen("Settings");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.Settings), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.Back), Lang, () => { settingsInlineState = null; hubVisible = true; RenderHub(); }, ButtonStyle.Ghost);

            var body = UiFactory.Scroll(screen, "Body");
            var profile = onboarding.Profile;

            // اللغة
            UiFactory.Label(body, T(UiStrings.Language), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
            LanguageToggle(body, RenderSettings);

            // المدينة (مرة كل 30 يومًا — CITY_CHANGE_LOCKED)
            if (profile != null)
            {
                UiFactory.Label(body, T(UiStrings.ChangeCity) + ": " + UiStrings.CityName(profile.City, Lang), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
                var cities = UiFactory.HStack(body, "Cities", Lang);
                UiFactory.Size(cities, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
                foreach (var city in new[] { "RUH", "JED", "KHB" })
                {
                    var code = city;
                    UiFactory.Button(cities, UiStrings.CityName(code, Lang), Lang, () => Run(ChangeCityAsync(code)),
                        code == profile.City ? ButtonStyle.Primary : ButtonStyle.Secondary);
                }
                if (settingsInlineState != null)
                {
                    UiFactory.Label(body, State(settingsInlineState, settingsInlineValues), Lang, UiTheme.SmallSize, color: UiTheme.Warning);
                }
            }

            // ربط الحساب (Sign in with Apple بجانب Google — AT-11)
            if (profile != null && services.Auth.Provider == "anonymous" && !services.UsesEmulator)
            {
                UiFactory.Button(body, T(UiStrings.LinkApple), Lang, () => Run(LinkAsync(LinkProvider.Apple)), ButtonStyle.Secondary);
                UiFactory.Button(body, T(UiStrings.LinkGoogle), Lang, () => Run(LinkAsync(LinkProvider.Google)), ButtonStyle.Secondary);
            }
            else if (services.Auth.Provider != "anonymous")
            {
                var provider = services.Auth.Provider == "apple" ? "Apple" : "Google";
                UiFactory.Label(body, UiState.Fill(T(UiStrings.LinkedWith), new Dictionary<string, string> { { "provider", provider } }), Lang, UiTheme.SmallSize);
            }

            // الموقع: الحالة inline، وإعادة الطلب فقط من زر يفتح إعدادات النظام (AT-01).
            var status = services.Permissions.GetStatus(PermissionKind.Location);
            var passive = PermissionFlow.PassiveStateFor(PermissionKind.Location, status);
            if (passive != null) UiFactory.Label(body, State(passive), Lang, UiTheme.SmallSize, color: UiTheme.Warning);
            if (status == PermissionStatus.Denied || status == PermissionStatus.GrantedApproximate)
            {
                UiFactory.Button(body, T(UiStrings.EnableFromSettings), Lang, services.Permissions.OpenAppSettings, ButtonStyle.Secondary);
            }

            // عن اللعبة: الإفصاح دائمًا + التراخيص
            UiFactory.Label(body, T(UiStrings.About), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Label(body, DisclaimerText(), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
            UiFactory.Label(body, "v" + Application.version, Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
            UiFactory.Button(body, T(UiStrings.OpenSourceLicenses), Lang, RenderLicenses, ButtonStyle.Ghost);

            // حذف الحساب من داخل التطبيق (متطلب متاجر)
            UiFactory.Button(body, T(UiStrings.DeleteAccount), Lang, ConfirmDelete, ButtonStyle.Danger);
        }

        private async Task ChangeCityAsync(string city)
        {
            settingsInlineState = null;
            try
            {
                var result = await services.Accounts.SetAgeAndCityAsync(null, city);
                if (result.Profile != null)
                {
                    onboarding.Profile.City = result.Profile.City;
                    onboarding.Profile.CityChangedAt = result.Profile.CityChangedAt;
                }
            }
            catch (BackendException ex) when (ex.StateId == StateCatalog.CityChangeLocked)
            {
                settingsInlineState = StateCatalog.CityChangeLocked;
                settingsInlineValues = new Dictionary<string, string> { { "date", FormatDate(ex.Details.TryGetValue("unlockAt", out var d) ? d : null) } };
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            RenderSettings();
        }

        private async Task LinkAsync(LinkProvider provider)
        {
            try
            {
                await services.Auth.LinkAsync(provider);
                var refreshed = await services.Accounts.BootstrapAsync();
                if (refreshed.Profile != null) onboarding.Profile.AuthProvider = refreshed.Profile.AuthProvider;
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            RenderSettings();
        }

        private void ConfirmDelete()
        {
            ui.Dialog(State(StateCatalog.AccDeleteConfirm), Lang,
                new SheetButton(T(UiStrings.DeleteAccount), () => Run(DeleteAsync()), ButtonStyle.Danger),
                new SheetButton(T(UiStrings.Cancel), null, ButtonStyle.Ghost));
        }

        private async Task DeleteAsync()
        {
            try
            {
                await Retry.RunAsync(_ => services.Accounts.DeleteAccountAsync());
            }
            catch (Exception ex)
            {
                ShowError(ex);
                return;
            }
            hubVisible = false;
            album = null;
            ui.Dialog(State(StateCatalog.AccDeleteDone), Lang, new SheetButton(T(UiStrings.Ok), () =>
            {
                Run(onboarding.AcknowledgeDeletionAsync());
            }));
        }

        private void RenderLicenses()
        {
            var screen = ui.NewScreen("Licenses");
            UiFactory.Button(screen, T(UiStrings.Back), Lang, RenderSettings, ButtonStyle.Ghost);
            var body = UiFactory.Scroll(screen, "Body");
            foreach (var license in Licenses)
            {
                UiFactory.Label(body, license.Title, Language.English, UiTheme.BodySize, bold: true);
                var text = Resources.Load<TextAsset>(license.Resource);
                // نصوص الرخص إنجليزية: محاذاة يسار دائمًا.
                UiFactory.Label(body, text != null ? text.text : license.Resource, Language.English, UiTheme.SmallSize, color: UiTheme.TextMuted);
            }
        }

        /// <summary>RIGHTS_REGISTER الصفان 14 و16: نص رخصة الخط في «عن اللعبة»، وصفحة التراخيص المفتوحة.</summary>
        private static readonly (string Title, string Resource)[] Licenses =
        {
            ("IBM Plex Sans Arabic — SIL Open Font License 1.1", "Fonts/OFL"),
            ("Liberation Sans — SIL Open Font License 1.1", "Licenses/LiberationSans-OFL"),
            ("RTLTMPro — MIT License", "Licenses/RTLTMPro-MIT"),
            ("Firebase, AndroidX, Google Play services", "Licenses/GoogleLibraries"),
            ("ZXing.Net, Firebase, AndroidX — Apache License 2.0", "Licenses/Apache-2.0"),
        };

        private string FormatDate(string iso)
        {
            if (!DateTimeOffset.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date)) return iso ?? string.Empty;
            // بتوقيت الرياض، وأرقام لاتينية (preserveNumbers) لسلامة الاتجاه.
            return date.ToOffset(TimeSpan.FromHours(3)).ToString("yyyy/MM/dd", CultureInfo.InvariantCulture);
        }
    }
}

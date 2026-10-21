using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using FootballQuest.App.Map;
using FootballQuest.App.UI;
using FootballQuest.Core;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Content;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Map;
using FootballQuest.Core.Onboarding;
using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace FootballQuest.App.Flow
{
    public sealed partial class AppController
    {
        private bool hubVisible;
        private MapController map;
        private ContentSnapshot content = new ContentSnapshot
        {
            Teams = EmbeddedContent.Teams(),
            Stadiums = EmbeddedContent.Stadiums(),
        };
        private string currentStadiumId;
        private bool contentLoading;
        private bool dailyLoginShown;

        private string MapCity => map != null ? map.City : onboarding.Profile?.City ?? "RUH";

        /// <summary>
        /// الـHub: خارطة الملاعب ثلاثية الأبعاد خلف الواجهة، وتبويبات المدن، وبطاقة المكافآت الميدانية.
        /// </summary>
        private void RenderHub()
        {
            hubVisible = true;
            if (SceneManager.GetActiveScene().name != SceneNames.Hub)
            {
                // RenderHub ينادى مرة ثانية من OnSceneLoaded بعد تحميل المشهد.
                SceneManager.LoadScene(SceneNames.Hub);
                return;
            }
            if (map == null) CreateMap();
            if (!contentLoading) Run(LoadContentAsync(false));

            var profile = onboarding.Profile;
            var screen = ui.NewScreen("Hub", backdrop: false);

            var header = UiFactory.HStack(screen, "Header", Lang);
            header.gameObject.AddComponent<UnityEngine.UI.Image>().color = UiTheme.Surface;
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, profile?.DisplayName ?? string.Empty, Lang, UiTheme.BodySize, bold: true);
            UiFactory.Button(header, T(UiStrings.Settings), Lang, RenderSettings, ButtonStyle.Ghost);

            // الأرصدة من الخادم فقط (العميل يعرض).
            if (profile != null)
            {
                var b = profile.Balances;
                var hud = UiFactory.HStack(screen, "Hud", Lang);
                hud.gameObject.AddComponent<UnityEngine.UI.Image>().color = UiTheme.SurfaceRaised;
                UiFactory.Size(hud, 72f, 72f);
                UiFactory.Label(hud, Fill(UiStrings.HudLevel, "level", b.Level.ToString()), Lang, UiTheme.SmallSize, center: true);
                UiFactory.Label(hud, b.Xp + " XP", Lang, UiTheme.SmallSize, center: true);
                UiFactory.Label(hud, Fill(UiStrings.HudPacks, "packs", b.TotalPacks.ToString()), Lang, UiTheme.SmallSize, center: true);
                UiFactory.Label(hud, Fill(UiStrings.HudFanPoints, "fp", b.FanPoints.ToString()), Lang, UiTheme.SmallSize, center: true);
            }
            ShowDailyLoginOnce();

            if (profile != null)
            {
                var collection = UiFactory.HStack(screen, "Collection", Lang);
                UiFactory.Size(collection, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
                UiFactory.Button(collection, T(UiStrings.Album), Lang, RenderAlbum, ButtonStyle.Secondary);
                UiFactory.Button(collection, F(UiStrings.Packs, ("count", profile.Balances.TotalPacks.ToString())), Lang,
                    () => { lastReveal = null; RenderPacks(); }, profile.Balances.TotalPacks > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary);
            }

            // التنقل بين المدن الثلاث (مع السحب الأفقي على الخارطة).
            var tabs = UiFactory.HStack(screen, "Cities", Lang);
            UiFactory.Size(tabs, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            foreach (var city in MapController.CityOrder)
            {
                var code = city;
                UiFactory.Button(tabs, UiStrings.CityName(code, Lang), Lang, () => map?.ShowCity(code),
                    code == MapCity ? ButtonStyle.Primary : ButtonStyle.Secondary);
            }

            UiFactory.Spacer(screen);

            // بطاقة المكافآت الميدانية: حالة الإذن تظهر inline فقط، بدون أي طلب تلقائي.
            var card = UiFactory.VStack(screen, "FieldRewards", padding: 32);
            card.gameObject.AddComponent<UnityEngine.UI.Image>().color = UiTheme.Surface;
            var status = services.Permissions.GetStatus(PermissionKind.Location);
            var passive = PermissionFlow.PassiveStateFor(PermissionKind.Location, status);
            if (passive != null)
            {
                UiFactory.Label(card, State(passive), Lang, UiTheme.SmallSize, color: UiTheme.Warning);
                if (status == PermissionStatus.Denied)
                {
                    UiFactory.Button(card, T(UiStrings.EnableFromSettings), Lang, services.Permissions.OpenAppSettings, ButtonStyle.Secondary);
                }
            }
            var actions = UiFactory.HStack(card, "FieldActions", Lang);
            UiFactory.Size(actions, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            // TODO(S6): verifyPresence بعد جاهزية الإذن (نقاط القرب وبطاقة «أنت قريب من فرع»).
            UiFactory.Button(actions, T(UiStrings.CheckNearby), Lang,
                () => RequestFieldFeature(PermissionKind.Location, () => Debug.Log("[Hub] location ready — verifyPresence arrives in S6")),
                ButtonStyle.Secondary);
            // TODO(S7): ماسح QR (ZXing.Net) ثم scanBranchCode، والإدخال اليدوي.
            UiFactory.Button(actions, T(UiStrings.ScanBranch), Lang,
                () => RequestFieldFeature(PermissionKind.Camera, () => Debug.Log("[Hub] camera ready — scanner arrives in S7")),
                ButtonStyle.Primary);
        }

        private string Fill(string key, string name, string value) =>
            UiState.Fill(T(key), new Dictionary<string, string> { { name, value } });

        /// <summary>مكافأة الدخول اليومي يمنحها `bootstrap` في الخادم؛ هنا نعرضها مرة وحدة فقط.</summary>
        private void ShowDailyLoginOnce()
        {
            var daily = onboarding.LastBootstrap?.DailyLogin;
            if (dailyLoginShown || daily == null || !daily.Granted) return;
            dailyLoginShown = true;
            ui.Toast(UiState.Fill(T(UiStrings.DailyLoginReward), new Dictionary<string, string>
            {
                { "xp", daily.Xp.ToString() },
                { "packs", daily.Packs.ToString() },
            }), Lang);
        }

        private void ApplyBalances(Balances balances)
        {
            if (onboarding.Profile == null || balances == null) return;
            onboarding.Profile.Balances = balances;
            onboarding.Profile.Xp = balances.Xp;
            onboarding.Profile.Level = balances.Level;
            onboarding.Profile.FanPoints = balances.FanPoints;
            onboarding.Profile.Packs = balances.Packs;
        }

        /// <summary>stadiumVisit — +5 XP مرة يوميًا لكل ملعب (GAME_RULES §2.2). الخادم يقرر.</summary>
        private async Task DigitalVisitAsync(string stadiumId)
        {
            try
            {
                var result = await Retry.RunAsync(_ => services.Economy.StadiumVisitAsync(stadiumId));
                ApplyBalances(result.Balances);
                if (onboarding.Profile != null) onboarding.Profile.VisitedToday = result.VisitedToday;
                ui.Toast(result.AlreadyVisited
                    ? T(UiStrings.VisitedToday)
                    : UiState.Fill(T(UiStrings.XpGained), new Dictionary<string, string> { { "xp", result.XpGained.ToString() } }), Lang);
                if (hubVisible) RenderHub();
            }
            catch (System.Exception ex)
            {
                ShowError(ex);
            }
        }

        private void CreateMap()
        {
            map = MapController.Create(onboarding.Profile?.City ?? "RUH");
            map.StationTapped += OpenStation;
            map.CityChanged += _ =>
            {
                if (hubVisible) RenderHub();
            };
        }

        private async Task LoadContentAsync(bool force)
        {
            contentLoading = true;
            try
            {
                content = await services.Content.LoadAsync(force);
            }
            finally
            {
                contentLoading = false;
            }
        }

        /// <summary>لوحة المحطة: الاسم (نص فقط)، ومباريات اليوم، والنتائج — GAME_RULES §2.2.</summary>
        private void OpenStation(string stadiumId)
        {
            currentStadiumId = stadiumId;
            var stadium = content.Stadium(stadiumId);
            var visited = onboarding.Profile?.VisitedToday?.Contains(stadiumId) == true;
            var buttons = new List<SheetButton> { new SheetButton(T(UiStrings.EnterStadium), () => EnterStadium(stadiumId)) };
            buttons.Add(visited
                ? new SheetButton(T(UiStrings.VisitedToday), null, ButtonStyle.Secondary)
                : new SheetButton(T(UiStrings.DigitalVisit), () => Run(DigitalVisitAsync(stadiumId)), ButtonStyle.Secondary));
            buttons.Add(new SheetButton(T(UiStrings.Close), null, ButtonStyle.Ghost));
            ui.Sheet(stadium?.Name(Lang) ?? stadiumId, ScheduleText(stadiumId), Lang, buttons.ToArray());
        }

        private string ScheduleText(string stadiumId)
        {
            var schedule = StationSchedule.For(stadiumId, GameDay.IdFor(System.DateTimeOffset.UtcNow), content.Matches);
            var sb = new StringBuilder();
            sb.Append("<b>").Append(T(UiStrings.TodayMatches)).Append("</b>\n");
            if (schedule.Today.Count == 0) sb.Append(T(UiStrings.NoMatchesToday)).Append('\n');
            foreach (var m in schedule.Today) sb.Append(StationSchedule.Line(m, content, Lang)).Append('\n');
            if (schedule.Results.Count > 0)
            {
                sb.Append("\n<b>").Append(T(UiStrings.Results)).Append("</b>\n");
                foreach (var m in schedule.Results) sb.Append(StationSchedule.Line(m, content, Lang)).Append('\n');
            }
            return sb.ToString().TrimEnd('\n');
        }

        private void EnterStadium(string stadiumId)
        {
            hubVisible = false;
            currentStadiumId = stadiumId;
            map = null; // يُدمّر مع مشهد Hub
            SceneManager.LoadScene(SceneNames.Stadium);
        }

        private void RenderStadium()
        {
            var spec = StationLibrary.Find(currentStadiumId);
            if (spec == null)
            {
                RenderHub();
                return;
            }
            StadiumSceneController.Create(spec);

            var screen = ui.NewScreen("Stadium", backdrop: false);
            var header = UiFactory.HStack(screen, "Header", Lang);
            header.gameObject.AddComponent<UnityEngine.UI.Image>().color = UiTheme.Surface;
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, content.Stadium(spec.StadiumId)?.Name(Lang) ?? spec.StadiumId, Lang, UiTheme.BodySize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, RenderHub, ButtonStyle.Ghost);

            UiFactory.Spacer(screen);
            var card = UiFactory.VStack(screen, "Schedule", padding: 32);
            card.gameObject.AddComponent<UnityEngine.UI.Image>().color = UiTheme.Surface;
            UiFactory.Label(card, ScheduleText(spec.StadiumId), Lang, UiTheme.SmallSize);
        }

        private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (onboarding == null || onboarding.Step != OnboardingStep.Ready) return;
            if (scene.name == SceneNames.Hub && hubVisible) RenderHub();
            else if (scene.name == SceneNames.Stadium) RenderStadium();
        }

        private void RefreshHubIfVisible()
        {
            if (hubVisible && onboarding.Step == OnboardingStep.Ready) RenderHub();
        }

        /// <summary>رجوع من الخلفية: نحدّث حالة الإذن (اللاعب ممكن فعّله من الإعدادات).</summary>
        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus) RefreshHubIfVisible();
        }
    }
}

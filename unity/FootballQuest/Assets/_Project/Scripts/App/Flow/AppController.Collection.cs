using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FootballQuest.App.UI;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Collection;
using FootballQuest.Core.Coop;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Ui;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    /// <summary>واجهة التجميع (S5): الألبوم 24 × 4، وفتح الحزم، والاحتمالات المعلنة، والاستبدال بنقاط المشجع.</summary>
    public sealed partial class AppController
    {
        private Album album;
        private CardResult lastReveal;
        private bool opening;

        private string F(string key, params (string, string)[] values)
        {
            var map = new Dictionary<string, string>();
            foreach (var (k, v) in values) map[k] = v;
            return UiState.Fill(T(key), map);
        }

        private Balances CurrentBalances => onboarding.Profile?.Balances ?? new Balances();

        private string TeamName(string code) => content.SideName(code, Lang);

        private async Task<Album> EnsureAlbumAsync()
        {
            if (album != null) return album;
            var cards = await services.Collection.GetTeamCardsAsync(services.Auth.Uid);
            album = new Album(content.Teams, cards);
            return album;
        }

        // ── الحزم ─────────────────────────────────────────────

        private void RenderPacks()
        {
            hubVisible = false;
            var b = CurrentBalances;
            var screen = ui.NewScreen("Packs");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, F(UiStrings.Packs, ("count", b.TotalPacks.ToString())), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, BackToHub, ButtonStyle.Ghost);

            // منطقة الكشف
            var stage = UiFactory.VStack(screen, "Reveal", padding: 16);
            UiFactory.Size(stage, CardView.Height + 220f, CardView.Height + 220f);
            if (lastReveal != null)
            {
                var card = CardView.Build(UiFactory.Centered(stage, "CardRow", CardView.Height), TeamName(lastReveal.Card.TeamCode), lastReveal.Card.TeamCode, lastReveal.Card.Variant, Lang);
                var pop = card.gameObject.AddComponent<PopIn>();
                pop.pulse = lastReveal.Card.Variant == "legendary";
                var info = lastReveal.Card.Duplicate
                    ? F(UiStrings.DuplicateCard, ("fp", lastReveal.Card.FanPointsGained.ToString()))
                    : T(UiStrings.NewCard);
                if (lastReveal.PityTriggered) info += "\n" + T(UiStrings.PityTriggered);
                UiFactory.Label(stage, info, Lang, UiTheme.BodySize, bold: true, center: true, color: UiTheme.Accent);
            }
            else if (b.TotalPacks == 0)
            {
                UiFactory.Spacer(stage);
                UiFactory.Label(stage, T(UiStrings.NoPacks), Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
                UiFactory.Spacer(stage);
            }

            UiFactory.Spacer(screen);
            PackRow(screen, UiStrings.PackStandard, b.Packs, PackKind.Standard);
            if (b.EpicPacks > 0) PackRow(screen, UiStrings.PackEpic, b.EpicPacks, PackKind.Epic);
            if (b.LegendaryPacks > 0) PackRow(screen, UiStrings.PackLegendary, b.LegendaryPacks, PackKind.Legendary);
            // الاحتمالات معلنة داخل اللعبة (AT-11).
            UiFactory.Button(screen, T(UiStrings.PackOdds), Lang, ShowOdds, ButtonStyle.Ghost);
        }

        private void PackRow(Transform parent, string labelKey, int count, PackKind kind)
        {
            var row = UiFactory.HStack(parent, "Pack_" + kind, Lang);
            UiFactory.Size(row, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(row, F(labelKey, ("count", count.ToString())), Lang, UiTheme.BodySize);
            var button = UiFactory.Button(row, T(UiStrings.OpenPack), Lang, () => Run(OpenPackAsync(kind)),
                count > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary);
            button.interactable = count > 0 && !opening;
        }

        private void ShowOdds()
        {
            var odds = OddsDisclosure.Resolve(services.RemoteConfig.GetString(RemoteConfigKeys.PackOdds));
            ui.Sheet(T(UiStrings.PackOdds), OddsDisclosure.Text(odds, Lang), Lang, new SheetButton(T(UiStrings.Ok), null));
        }

        private async Task OpenPackAsync(PackKind kind)
        {
            if (opening) return;
            opening = true;
            try
            {
                // نفس requestId في كل المحاولات — الخادم ما يصرف الحزمة مرتين (ARCHITECTURE §5).
                var result = await Retry.RunAsync(id => services.Economy.OpenPackAsync(kind, id));
                lastReveal = result;
                ApplyCardResult(result);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            finally
            {
                opening = false;
            }
            RenderPacks();
        }

        private void ApplyCardResult(CardResult result)
        {
            ApplyBalances(result.Balances);
            album?.Apply(result.Card);
            var profile = onboarding.Profile;
            if (profile != null && !profile.OwnedTeams.Contains(result.Card.TeamCode)) profile.OwnedTeams.Add(result.Card.TeamCode);
            foreach (var a in result.Achievements)
            {
                profile?.Achievements.Add(a.Id);
                ui.Toast(F(UiStrings.AchievementUnlocked, ("name", UiStrings.AchievementName(a.Id, Lang))), Lang);
            }
        }

        // ── الألبوم ───────────────────────────────────────────

        private void RenderAlbum()
        {
            hubVisible = false;
            var screen = ui.NewScreen("Album");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.Album), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, BackToHub, ButtonStyle.Ghost);
            AlbumTabs(screen, players: false);

            if (album == null)
            {
                UiFactory.Label(screen, "…", Lang, UiTheme.TitleSize, center: true);
                Run(LoadAlbumThenRender());
                return;
            }

            UiFactory.Label(screen, F(UiStrings.AlbumProgress,
                ("teams", album.OwnedTeams.ToString()), ("variants", album.OwnedVariants.ToString())), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);

            var list = UiFactory.Scroll(screen, "Rows");
            foreach (var row in album.Rows)
            {
                var line = UiFactory.HStack(list, row.Team.Code, Lang, 12f);
                UiFactory.Size(line, 150f, 150f);
                var name = UiFactory.Label(line, row.Team.Name(Lang), Lang, UiTheme.SmallSize, bold: row.AnyOwned,
                    color: row.AnyOwned ? UiTheme.Text : UiTheme.TextMuted);
                name.GetComponent<RectTransform>().gameObject.AddComponent<UnityEngine.UI.LayoutElement>().flexibleWidth = 2f;
                foreach (var slot in row.Slots)
                {
                    var s = slot;
                    var tile = UiFactory.Button(line, s.Owned ? "×" + s.Count : "?", Language.English,
                        () => RenderCardDetail(s), s.Owned ? ButtonStyle.Secondary : ButtonStyle.Ghost);
                    tile.GetComponent<UnityEngine.UI.Image>().color = s.Owned ? CardView.Frame(s.Variant) : new Color(1f, 1f, 1f, 0.06f);
                    var le = tile.GetComponent<UnityEngine.UI.LayoutElement>();
                    le.preferredWidth = 120f;
                    le.flexibleWidth = 1f;
                }
            }
        }

        // ── بطاقات اللاعبين (S5b) ───────────────────────────────

        private PlayerAlbum playerAlbum;

        private bool PlayerCardsEnabled => services.RemoteConfig.GetBool(RemoteConfigKeys.FeaturePlayerCards);

        /// <summary>تبويبا الألبوم: المنتخبات واللاعبين (اللاعبين خلف feature_player_cards — R2).</summary>
        private void AlbumTabs(RectTransform screen, bool players)
        {
            if (!PlayerCardsEnabled) return;
            var tabs = UiFactory.HStack(screen, "AlbumTabs", Lang);
            UiFactory.Size(tabs, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Button(tabs, T(UiStrings.AlbumTeams), Lang, RenderAlbum, players ? ButtonStyle.Secondary : ButtonStyle.Primary);
            UiFactory.Button(tabs, T(UiStrings.AlbumPlayers), Lang, RenderPlayerAlbum, players ? ButtonStyle.Primary : ButtonStyle.Secondary);
        }

        private void RenderPlayerAlbum()
        {
            hubVisible = false;
            var screen = ui.NewScreen("PlayerAlbum");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.Album), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.BackToMap), Lang, BackToHub, ButtonStyle.Ghost);
            AlbumTabs(screen, players: true);

            if (playerAlbum == null)
            {
                UiFactory.Label(screen, "…", Lang, UiTheme.TitleSize, center: true);
                Run(LoadPlayerAlbumThenRender());
                return;
            }
            UiFactory.Label(screen, F(UiStrings.PlayerAlbumProgress, ("owned", playerAlbum.OwnedCount.ToString()), ("total", playerAlbum.Total.ToString())),
                Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);
            UiFactory.Label(screen, T(UiStrings.PlayerAlbumHint), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);

            var list = UiFactory.Scroll(screen, "Players");
            foreach (var position in PlayerAlbum.PositionOrder)
            {
                UiFactory.Label(list, CoopText.Position(position, Lang), Lang, UiTheme.BodySize, bold: true);
                foreach (var entry in playerAlbum.Entries.Where(e => e.Character.Position == position))
                {
                    var e = entry;
                    var label = e.Owned
                        ? e.Character.Name.Get(Lang) + "  ×" + e.Count + "\n" + Variants.RarityName(e.Character.Rarity, Lang)
                        : "?\n" + Variants.RarityName(e.Character.Rarity, Lang);
                    var tile = UiFactory.Button(list, label, Lang, () => RenderPlayerCard(e), e.Owned ? ButtonStyle.Secondary : ButtonStyle.Ghost);
                    tile.GetComponent<UnityEngine.UI.Image>().color = e.Owned ? CardView.Frame(e.Character.Rarity) : new Color(1f, 1f, 1f, 0.06f);
                }
            }
        }

        private async Task LoadPlayerAlbumThenRender()
        {
            try
            {
                var contentDoc = await services.Content.LoadPlayersAsync();
                var owned = await services.Collection.GetPlayerCardsAsync(services.Auth.Uid);
                playerAlbum = new PlayerAlbum(PlayerCharacter.ParseContent(contentDoc), owned);
            }
            catch (Exception ex)
            {
                ShowError(ex);
                BackToHub();
                return;
            }
            RenderPlayerAlbum();
        }

        /// <summary>البطاقة: الاسم والمركز والندرة، والإحصاءات للمملوكة فقط.</summary>
        private void RenderPlayerCard(PlayerAlbumEntry entry)
        {
            var screen = ui.NewScreen("PlayerCard");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, entry.Owned ? entry.Character.Name.Get(Lang) : "?", Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.Album), Lang, RenderPlayerAlbum, ButtonStyle.Ghost);
            UiFactory.Label(screen, CoopText.Position(entry.Character.Position, Lang) + " — " + Variants.RarityName(entry.Character.Rarity, Lang),
                Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
            if (entry.Owned)
            {
                foreach (var key in RoomView.StatKeys)
                    UiFactory.Label(screen, CoopText.Stat(key, Lang) + ": " + entry.Character.Stats[key], Lang, UiTheme.BodySize, center: true);
                UiFactory.Label(screen, F(UiStrings.OwnedTimes, ("count", entry.Count.ToString())), Lang, UiTheme.SmallSize, center: true, color: UiTheme.TextMuted);
            }
            else
            {
                UiFactory.Label(screen, T(UiStrings.NotOwned), Lang, UiTheme.BodySize, center: true);
            }
        }

        private async Task LoadAlbumThenRender()
        {
            try
            {
                await EnsureAlbumAsync();
            }
            catch (Exception ex)
            {
                ShowError(ex);
                album = new Album(content.Teams, null);
            }
            RenderAlbum();
        }

        private void RenderCardDetail(AlbumSlot slot)
        {
            var screen = ui.NewScreen("Card");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, TeamName(slot.TeamCode), Lang, UiTheme.HeadingSize, bold: true);
            UiFactory.Button(header, T(UiStrings.Album), Lang, RenderAlbum, ButtonStyle.Ghost);

            var holder = UiFactory.Centered(screen, "Holder", CardView.Height);
            CardView.Build(holder, TeamName(slot.TeamCode), slot.TeamCode, slot.Variant, Lang, slot.Owned);
            UiFactory.Label(screen, slot.Owned ? F(UiStrings.OwnedTimes, ("count", slot.Count.ToString())) : T(UiStrings.NotOwned),
                Lang, UiTheme.BodySize, center: true);
            UiFactory.Spacer(screen);

            var fp = CurrentBalances.FanPoints;
            var cost = Exchange.Cost(slot.Variant);
            switch (Exchange.Check(slot, fp))
            {
                case ExchangeBlock.None:
                    UiFactory.Button(screen, F(UiStrings.ExchangeFor, ("cost", cost.ToString())), Lang, () => Run(ExchangeAsync(slot)));
                    break;
                case ExchangeBlock.NotEnoughFanPoints:
                    UiFactory.Label(screen, F(UiStrings.NeedFanPoints, ("cost", cost.ToString()), ("fp", fp.ToString())), Lang,
                        UiTheme.SmallSize, color: UiTheme.TextMuted, center: true);
                    break;
                case ExchangeBlock.NotExchangeable:
                    if (!slot.Owned) UiFactory.Label(screen, T(UiStrings.NotExchangeable), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted, center: true);
                    break;
            }
        }

        private async Task ExchangeAsync(AlbumSlot slot)
        {
            try
            {
                var result = await Retry.RunAsync(id => services.Economy.ExchangeAsync(slot.TeamCode, slot.Variant, id));
                ApplyCardResult(result);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            RenderCardDetail(album?.Slot(slot.TeamCode, slot.Variant) ?? slot);
        }

        private void BackToHub()
        {
            lastReveal = null;
            hubVisible = true;
            RenderHub();
        }
    }
}

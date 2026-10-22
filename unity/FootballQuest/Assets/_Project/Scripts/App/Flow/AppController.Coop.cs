using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FootballQuest.App.UI;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Coop;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Ui;
using TMPro;
using UnityEngine;

namespace FootballQuest.App.Flow
{
    /// <summary>
    /// «منتخبنا يجمعنا» (S8 — GAME_RULES §7): الدخول من تسجيل حضور اليوم، والردهة، والعد التنازلي بإعلان القسائم،
    /// والجولة (خاناتي، وبطاقات المعلومات، والتشكيلة المشتركة)، والنتيجة. الحالة كلها من الخادم: الشاشة تقرأ
    /// الغرفة كل ثانية، والنبض كل 5 ثوانٍ، والوقت محسوب من serverNow.
    /// </summary>
    public sealed partial class AppController
    {
        private CheckInMemory checkIns;
        private readonly RoundClock coopClock = new RoundClock();
        private string coopRoomId;
        private RoomState coopRoom;
        private RoomView coopView;
        private string coopInline;
        private string coopSignature;
        private bool coopPolling;
        private bool coopBusy;
        private int coopTicks;
        private bool coopAnnounced;
        private bool coopRewardsHandled;
        private TMP_Text coopTimer;

        private CheckInMemory CheckIns => checkIns ?? (checkIns = new CheckInMemory(services.Store));
        private bool CoopEnabled => services.Coop != null && services.RemoteConfig.GetBool(RemoteConfigKeys.FeatureCoop);
        private string MyUid => services.Auth.Uid;

        /// <summary>تسجيل الحضور اليوم يفتح الغرف في نفس الفرع (§7.2).</summary>
        private void RememberCheckIn(ScanResult result) => CheckIns.Remember(result.BranchId, result.BranchName, DateTimeOffset.UtcNow);

        // ── الدخول ─────────────────────────────────────────────

        private void RenderCoopEntry()
        {
            hubVisible = false;
            var screen = CoopScreen("CoopEntry", BackToHub);
            UiFactory.Label(screen, T(UiStrings.CoopIntro), Lang, UiTheme.BodySize, color: UiTheme.TextMuted);
            var today = CheckIns.Today(DateTimeOffset.UtcNow);
            UiFactory.Spacer(screen);
            if (today == null)
            {
                UiFactory.Label(screen, State(StateCatalog.RoomNeedCheckin), Lang, UiTheme.BodySize, color: UiTheme.Warning, center: true);
                UiFactory.Button(screen, T(UiStrings.ScanBranch), Lang, StartBranchScan);
                return;
            }
            var branch = today.Value;
            UiFactory.Label(screen, Fill(UiStrings.CoopAtBranch, "branch", branch.Name.Get(Lang)), Lang, UiTheme.HeadingSize, bold: true, center: true);
            UiFactory.Button(screen, T(UiStrings.OpenRoom), Lang, () => Run(CreateRoomAsync(branch.BranchId)));
            UiFactory.Button(screen, T(UiStrings.JoinRoom), Lang, () => { coopInline = null; RenderCoopJoin(); }, ButtonStyle.Secondary);
        }

        private RectTransform CoopScreen(string name, Action back, string backLabel = null)
        {
            var screen = ui.NewScreen(name);
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            UiFactory.Label(header, T(UiStrings.CoopTitle), Lang, UiTheme.HeadingSize, bold: true);
            if (back != null) UiFactory.Button(header, backLabel ?? T(UiStrings.BackToMap), Lang, back, ButtonStyle.Ghost);
            return screen;
        }

        private void RenderCoopJoin()
        {
            var today = CheckIns.Today(DateTimeOffset.UtcNow);
            if (today == null)
            {
                RenderCoopEntry();
                return;
            }
            var screen = CoopScreen("CoopJoin", RenderCoopEntry, T(UiStrings.Back));
            UiFactory.Label(screen, T(UiStrings.RoomCodeHint), Lang, UiTheme.BodySize, color: UiTheme.TextMuted);
            var input = UiFactory.CodeInput(screen, "0000", 4);
            input.contentType = TMP_InputField.ContentType.IntegerNumber;
            if (coopInline != null) UiFactory.Label(screen, State(coopInline), Lang, UiTheme.SmallSize, color: UiTheme.Warning);
            UiFactory.Spacer(screen);
            UiFactory.Button(screen, T(UiStrings.JoinRoom), Lang, () => Run(JoinRoomAsync(today.Value.BranchId, input.text)));
        }

        private async Task CreateRoomAsync(string branchId)
        {
            if (coopBusy) return;
            coopBusy = true;
            try
            {
                EnterRoom(await services.Coop.CreateAsync(branchId));
            }
            catch (BackendException ex) when (IsRoomState(ex.StateId))
            {
                ShowRoomError(ex.StateId);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            finally
            {
                coopBusy = false;
            }
        }

        private async Task JoinRoomAsync(string branchId, string code)
        {
            code = (code ?? string.Empty).Trim();
            if (code.Length != 4 || !code.All(char.IsDigit))
            {
                coopInline = StateCatalog.RoomNotFound;
                RenderCoopJoin();
                return;
            }
            if (coopBusy) return;
            coopBusy = true;
            try
            {
                coopInline = null;
                EnterRoom(await services.Coop.JoinAsync(branchId, code));
            }
            catch (BackendException ex) when (IsRoomState(ex.StateId))
            {
                ShowRoomError(ex.StateId);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            finally
            {
                coopBusy = false;
            }
        }

        private static bool IsRoomState(string id) => id != null && id.StartsWith("ROOM_", StringComparison.Ordinal);

        /// <summary>inline في شاشة الرمز، وROOM_LOBBY_EXPIRED نافذة، وROOM_NEED_CHECKIN لوحة بزر المسح.</summary>
        private void ShowRoomError(string stateId)
        {
            switch (stateId)
            {
                case StateCatalog.RoomNeedCheckin:
                    ShowState(stateId, null, new SheetButton(T(UiStrings.ScanBranch), StartBranchScan), new SheetButton(T(UiStrings.Close), null, ButtonStyle.Ghost));
                    break;
                case StateCatalog.RoomLobbyExpired:
                    LeaveCoop();
                    ShowState(stateId, null, new SheetButton(T(UiStrings.Ok), RenderCoopEntry));
                    break;
                case StateCatalog.RoomNeedTwo:
                    ShowState(stateId);
                    break;
                default:
                    coopInline = stateId;
                    RenderCoopJoin();
                    break;
            }
        }

        // ── الغرفة: القراءة والنبض ───────────────────────────────

        private void EnterRoom(RoomSummary summary)
        {
            coopClock.Sync(summary.ServerNow, DateTimeOffset.UtcNow);
            coopRoomId = summary.RoomId;
            coopRoom = null;
            coopView = null;
            coopSignature = null;
            coopAnnounced = false;
            coopRewardsHandled = false;
            coopTicks = 0;
            RenderCoopLoading();
            if (!coopPolling)
            {
                coopPolling = true;
                InvokeRepeating(nameof(CoopTick), 0f, CoopRules.PollSeconds);
            }
        }

        private void RenderCoopLoading()
        {
            var screen = CoopScreen("CoopLoading", null);
            UiFactory.Spacer(screen);
            UiFactory.Label(screen, "…", Lang, UiTheme.TitleSize, center: true);
            UiFactory.Spacer(screen);
        }

        private void StopCoopPolling()
        {
            if (!coopPolling) return;
            coopPolling = false;
            CancelInvoke(nameof(CoopTick));
            services.Rooms.Stop();
            ui.Banner(offline ? State(StateCatalog.NetOffline) : null, Lang);
        }

        private void LeaveCoop()
        {
            StopCoopPolling();
            coopRoomId = null;
            coopRoom = null;
            coopView = null;
        }

        private void CoopTick() => Run(CoopTickAsync());

        private async Task CoopTickAsync()
        {
            var roomId = coopRoomId;
            if (roomId == null) return;
            if (coopTicks++ % CoopRules.HeartbeatSeconds == 0) Run(HeartbeatAsync(roomId));
            try
            {
                var room = await services.Rooms.GetRoomAsync(roomId);
                var view = room != null && (room.IsPlaying || room.IsFinished) ? await services.Rooms.GetViewAsync(roomId, MyUid) : null;
                if (roomId != coopRoomId || room == null) return;
                foreach (var notice in CoopRules.Notices(coopRoom, room)) ui.Toast(State(notice.StateId, notice.Values), Lang);
                coopRoom = room;
                coopView = view;
                RenderCoop();
            }
            catch (Exception ex)
            {
                // القراءة تعيد في الثانية الجاية؛ الشريط يوضح إن الوقت ما يتوقف.
                Debug.LogWarning("[Coop] poll failed: " + ex.Message);
                if (coopRoom != null && coopRoom.IsPlaying) ui.Banner(State(StateCatalog.RoundReconnecting), Lang);
            }
        }

        /// <summary>النبض يثبت إني موجود، ويخلي الخادم يطلّع أي لاعب انقطع (AT-06) وينهي الوقت.</summary>
        private async Task HeartbeatAsync(string roomId)
        {
            try
            {
                var summary = await services.Coop.HeartbeatAsync(roomId);
                coopClock.Sync(summary.ServerNow, DateTimeOffset.UtcNow);
                if (coopRoom != null && coopRoom.IsPlaying) ui.Banner(offline ? State(StateCatalog.NetOffline) : null, Lang);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[Coop] heartbeat failed: " + ex.Message);
                if (coopRoom != null && coopRoom.IsPlaying) ui.Banner(State(StateCatalog.RoundReconnecting), Lang);
            }
        }

        // ── اختيار الشاشة ───────────────────────────────────────

        private void RenderCoop()
        {
            var room = coopRoom;
            var me = room.Members.FirstOrDefault(m => m.Uid == MyUid);
            var now = DateTimeOffset.UtcNow;
            if (room.Status == "closed")
            {
                ShowRoomError(StateCatalog.RoomLobbyExpired);
                return;
            }
            if (room.IsFinished || (me != null && !me.Active && room.IsPlaying))
            {
                RenderCoopResultOnce();
                return;
            }
            if (me == null)
            {
                LeaveCoop();
                RenderCoopEntry();
                return;
            }
            if (room.IsPlaying && coopView != null && !coopAnnounced)
            {
                coopAnnounced = true;
                AnnounceRound();
            }

            var countdown = room.IsPlaying ? coopClock.SecondsUntil(room.StartAt, now) : 0;
            var signature = Signature(room, coopView, countdown > 0);
            if (signature != coopSignature)
            {
                coopSignature = signature;
                if (room.Status == "open") RenderLobby(room);
                else if (countdown > 0) RenderCountdown();
                else RenderRound(room, coopView);
            }
            UpdateCoopTimer(room, now);
        }

        /// <summary>يعيد بناء الشاشة فقط إذا تغيّر شي يظهر فيها (العدّاد يتحدث بدون إعادة بناء).</summary>
        private static string Signature(RoomState room, RoomView view, bool countingDown)
        {
            var sb = new StringBuilder();
            sb.Append(room.Status).Append('|').Append(room.HostUid).Append('|').Append(countingDown).Append('|');
            foreach (var m in room.ActiveMembers) sb.Append(m.Uid).Append(',');
            sb.Append('|');
            foreach (var s in room.Slots) sb.Append(s.SlotId).Append(':').Append(s.OwnerUid).Append('=').Append(room.Placements.TryGetValue(s.SlotId, out var p) ? p : "").Append(',');
            if (view != null) sb.Append('|').Append(view.Slots.Count).Append('/').Append(view.InfoCards.Count).Append('/').Append(string.Join(",", view.InfoCards.Select(c => c.PlayerId)));
            return sb.ToString();
        }

        private void UpdateCoopTimer(RoomState room, DateTimeOffset now)
        {
            if (coopTimer == null) return;
            if (room.Status == "open") coopTimer.text = RoundClock.Format(coopClock.SecondsUntil(room.LobbyExpiresAt, now));
            else if (coopClock.SecondsUntil(room.StartAt, now) > 0)
                coopTimer.text = Fill(UiStrings.RoundStartsIn, "seconds", coopClock.SecondsUntil(room.StartAt, now).ToString());
            else coopTimer.text = RoundClock.Format(coopClock.SecondsUntil(room.EndsAt, now));
        }

        /// <summary>قبل العد: وضع القسائم للفريق، وسبب عدم أهليتي إن وجد (AT-07، AT-08، §7.8).</summary>
        private void AnnounceRound()
        {
            var states = CoopRules.CountdownStates(coopRoom.CouponMode, coopView.NotEligible);
            if (states.Count == 0) return;
            ui.Dialog(string.Join("\n\n", states.Select(id => State(id))), Lang, new SheetButton(T(UiStrings.Ok), null));
        }

        // ── الردهة ─────────────────────────────────────────────

        private void RenderLobby(RoomState room)
        {
            var screen = CoopScreen("CoopLobby", null);
            UiFactory.Label(screen, Fill(UiStrings.RoomCode, "code", room.Code), Lang, UiTheme.TitleSize, bold: true, center: true, color: UiTheme.Accent);
            coopTimer = UiFactory.Label(screen, string.Empty, Language.English, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
            var active = room.ActiveMembers.ToList();
            UiFactory.Label(screen, Fill(UiStrings.RoomPlayers, "count", active.Count.ToString()), Lang, UiTheme.BodySize, bold: true);
            foreach (var m in active)
            {
                var name = m.Uid == room.HostUid ? Fill(UiStrings.RoomHost, "name", m.Alias) : m.Alias;
                UiFactory.Label(screen, name, Lang, UiTheme.BodySize);
            }
            UiFactory.Spacer(screen);
            if (room.HostUid == MyUid) UiFactory.Button(screen, T(UiStrings.StartRound), Lang, () => Run(StartRoundAsync()), active.Count >= 2 ? ButtonStyle.Primary : ButtonStyle.Secondary);
            else UiFactory.Label(screen, T(UiStrings.WaitingForHost), Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
            UiFactory.Button(screen, T(UiStrings.LeaveRoom), Lang, () => Run(LeaveRoomAsync()), ButtonStyle.Ghost);
        }

        private async Task StartRoundAsync()
        {
            if (coopBusy || coopRoomId == null) return;
            if (coopRoom != null && coopRoom.ActiveMembers.Count() < 2)
            {
                ShowState(StateCatalog.RoomNeedTwo);
                return;
            }
            coopBusy = true;
            try
            {
                var summary = await services.Coop.StartAsync(coopRoomId);
                coopClock.Sync(summary.ServerNow, DateTimeOffset.UtcNow);
            }
            catch (BackendException ex) when (IsRoomState(ex.StateId))
            {
                ShowRoomError(ex.StateId);
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            finally
            {
                coopBusy = false;
            }
        }

        private async Task LeaveRoomAsync()
        {
            var roomId = coopRoomId;
            LeaveCoop();
            if (roomId != null)
            {
                try
                {
                    await services.Coop.LeaveAsync(roomId);
                }
                catch (Exception ex)
                {
                    // الخادم يطلّعني بعد 30 ث بدون نبض حتى لو فشل الطلب.
                    Debug.LogWarning("[Coop] leave failed: " + ex.Message);
                }
            }
            RenderCoopEntry();
        }

        // ── الجولة ─────────────────────────────────────────────

        private void RenderCountdown()
        {
            var screen = CoopScreen("CoopCountdown", null);
            UiFactory.Spacer(screen);
            coopTimer = UiFactory.Label(screen, string.Empty, Lang, UiTheme.TitleSize, bold: true, center: true, color: UiTheme.Accent);
            UiFactory.Label(screen, T(UiStrings.TalkHint), Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
            UiFactory.Spacer(screen);
        }

        private void RenderRound(RoomState room, RoomView view)
        {
            var screen = ui.NewScreen("CoopRound");
            var header = UiFactory.HStack(screen, "Header", Lang);
            UiFactory.Size(header, UiTheme.ButtonHeight, UiTheme.ButtonHeight);
            coopTimer = UiFactory.Label(header, string.Empty, Language.English, UiTheme.TitleSize, bold: true, color: UiTheme.Accent);
            UiFactory.Button(header, T(UiStrings.LeaveRoom), Lang, () => Run(LeaveRoomAsync()), ButtonStyle.Ghost);
            UiFactory.Label(screen, T(UiStrings.TalkHint), Lang, UiTheme.SmallSize, color: UiTheme.TextMuted);

            var body = UiFactory.Scroll(screen, "Round");
            UiFactory.Label(body, T(UiStrings.YourSlots), Lang, UiTheme.BodySize, bold: true);
            foreach (var slot in view?.Slots ?? new List<ViewSlot>())
            {
                var s = slot;
                var placed = room.Placements.TryGetValue(s.SlotId, out var playerId) ? room.Piece(playerId)?.Name.Get(Lang) : null;
                var label = s.Requirement.Get(Lang) + "\n" + (placed ?? T(UiStrings.EmptySlot));
                UiFactory.Button(body, label, Lang, () => PickPiece(s), placed == null ? ButtonStyle.Secondary : ButtonStyle.Primary);
            }

            UiFactory.Label(body, T(UiStrings.YourInfoCards), Lang, UiTheme.BodySize, bold: true);
            foreach (var card in view?.InfoCards ?? new List<InfoCard>())
            {
                var piece = room.Piece(card.PlayerId);
                var title = (piece?.Name.Get(Lang) ?? card.PlayerId) + " — " + CoopText.Position(piece?.Position, Lang);
                var stats = string.Join(Lang == Language.Arabic ? "، " : ", ", RoomView.StatKeys.Select(k => CoopText.Stat(k, Lang) + " " + card.Stats[k]));
                UiFactory.Label(body, title + "\n" + stats, Lang, UiTheme.SmallSize);
            }

            // التشكيلة المشتركة: كل الخانات وأصحابها والقطع الموضوعة (بدون شروط غيري).
            UiFactory.Label(body, T(UiStrings.Lineup), Lang, UiTheme.BodySize, bold: true);
            foreach (var s in room.Slots)
            {
                var placed = room.Placements.TryGetValue(s.SlotId, out var p) ? room.Piece(p)?.Name.Get(Lang) : T(UiStrings.EmptySlot);
                UiFactory.Label(body, CoopText.Position(s.Position, Lang) + ": " + placed + "  (" + room.AliasOf(s.OwnerUid) + ")", Lang, UiTheme.SmallSize,
                    color: s.OwnerUid == MyUid ? UiTheme.Text : UiTheme.TextMuted);
            }

            UiFactory.Button(screen, T(UiStrings.ConfirmLineup), Lang, () => Run(SubmitLineupAsync()), room.AllPlaced ? ButtonStyle.Primary : ButtonStyle.Secondary);
        }

        /// <summary>اختيار قطعة لخانتي: نفس المركز وغير المستخدمة، أو شيل الموجودة.</summary>
        private void PickPiece(ViewSlot slot)
        {
            if (coopRoom == null) return;
            var buttons = CoopRules.Choices(coopRoom, slot.SlotId)
                .Select(p => new SheetButton(p.Name.Get(Lang), () => Run(PlaceAsync(slot.SlotId, p.PlayerId)),
                    coopRoom.Placements.TryGetValue(slot.SlotId, out var current) && current == p.PlayerId ? ButtonStyle.Primary : ButtonStyle.Secondary))
                .ToList();
            if (coopRoom.Placements.ContainsKey(slot.SlotId)) buttons.Add(new SheetButton(T(UiStrings.LiftPiece), () => Run(PlaceAsync(slot.SlotId, null)), ButtonStyle.Ghost));
            buttons.Add(new SheetButton(T(UiStrings.Close), null, ButtonStyle.Ghost));
            ui.Sheet(T(UiStrings.ChoosePiece), slot.Requirement.Get(Lang), Lang, buttons.ToArray());
        }

        private async Task PlaceAsync(string slotId, string playerId)
        {
            if (coopRoomId == null) return;
            try
            {
                await Retry.RunAsync(_ => services.Coop.PlaceAsync(coopRoomId, slotId, playerId));
                coopSignature = null; // الانعكاس الفوري يجي مع القراءة الجاية.
            }
            catch (BackendException ex) when (ex.StateId == "PIECE_IN_USE" || ex.StateId == "SLOT_NOT_YOURS")
            {
                // زميل أخذ القطعة أو تغيّر توزيع الخانات قبل لحظة: الشاشة تتحدث مع القراءة الجاية.
                coopSignature = null;
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
        }

        private async Task SubmitLineupAsync()
        {
            if (coopBusy || coopRoomId == null || coopRoom == null || !coopRoom.AllPlaced) return;
            coopBusy = true;
            try
            {
                var summary = await services.Coop.SubmitAsync(coopRoomId);
                coopClock.Sync(summary.ServerNow, DateTimeOffset.UtcNow);
                if (summary.Result?.CouponId != null && summary.Codes != null) services.Vault.Save(summary.Result.CouponId, summary.Codes);
                // التأكيد الخاطئ يظهر للكل كـ ROUND_WRONG من lastCheck (CoopRules.Notices).
            }
            catch (Exception ex)
            {
                ShowError(ex);
            }
            finally
            {
                coopBusy = false;
            }
        }

        // ── النتيجة ────────────────────────────────────────────

        private void RenderCoopResultOnce()
        {
            if (coopRewardsHandled && coopView?.Result != null) return;
            var result = coopView?.Result;
            if (result == null && coopRoom.IsFinished) return; // النتيجة الخاصة توصل مع القراءة الجاية.
            coopRewardsHandled = result != null;
            StopCoopPolling();
            RenderCoopResult(coopRoom, result);
            if (result?.CouponId != null) Run(EnsureCouponCodeAsync(result.CouponId));
            Run(RefreshProfileAsync());
        }

        private void RenderCoopResult(RoomState room, RoundResult result)
        {
            var screen = CoopScreen("CoopResult", () => { LeaveCoop(); BackToHub(); });
            UiFactory.Spacer(screen);
            if (result == null || result.Outcome == "left")
            {
                UiFactory.Label(screen, T(UiStrings.LeftRound), Lang, UiTheme.HeadingSize, center: true);
            }
            else
            {
                var won = result.Outcome == "won";
                UiFactory.Label(screen, State(won ? StateCatalog.RoundWon : StateCatalog.RoundLost), Lang, UiTheme.TitleSize, bold: true, center: true,
                    color: won ? UiTheme.Accent : UiTheme.Text);
                if (result.Capped) UiFactory.Label(screen, State(StateCatalog.RoundDailyCap), Lang, UiTheme.BodySize, center: true, color: UiTheme.TextMuted);
                if (result.Xp > 0) UiFactory.Label(screen, Fill(UiStrings.RewardXp, "xp", result.Xp.ToString()), Lang, UiTheme.BodySize, center: true);
                if (result.Packs > 0) UiFactory.Label(screen, T(UiStrings.RewardPack), Lang, UiTheme.BodySize, center: true);
                if (result.EpicPacks > 0) UiFactory.Label(screen, T(UiStrings.RewardEpicPack), Lang, UiTheme.BodySize, center: true);
                if (result.PlayerCardName != null)
                    UiFactory.Label(screen, Fill(UiStrings.RewardPlayerCard, "name", result.PlayerCardName.Get(Lang)), Lang, UiTheme.BodySize, center: true);
                if (result.CouponId != null)
                {
                    UiFactory.Label(screen, T(UiStrings.RewardCoupon), Lang, UiTheme.BodySize, bold: true, center: true, color: UiTheme.Accent);
                    UiFactory.Button(screen, T(UiStrings.Wallet), Lang, () => { LeaveCoop(); Run(RenderWalletAsync()); });
                }
            }
            UiFactory.Spacer(screen);
            UiFactory.Button(screen, T(UiStrings.OpenRoom), Lang, () => { LeaveCoop(); RenderCoopEntry(); }, ButtonStyle.Secondary);
        }

        /// <summary>الأرصدة بعد الجولة من الخادم (bootstrap آمن للتكرار — الدخول اليومي مرة وحدة).</summary>
        private async Task RefreshProfileAsync()
        {
            try
            {
                var result = await Retry.RunAsync(_ => services.Accounts.BootstrapAsync());
                ApplyBalances(result.Profile?.Balances);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[Coop] balance refresh failed: " + ex.Message);
            }
        }

        /// <summary>
        /// الرمز الصريح يوصل لمن ضغط التأكيد فقط. الباقين يطلبون رمزًا جديدًا مرة وحدة (الخادم يحفظ البصمة فقط — Q25).
        /// </summary>
        private async Task EnsureCouponCodeAsync(string couponId)
        {
            if (services.Vault.Load(couponId) != null) return;
            try
            {
                services.Vault.Save(couponId, await services.Coupons.ReissueAsync(couponId));
            }
            catch (Exception ex)
            {
                // المحفظة تعرض زر «اعرض رمز جديد» إذا ما توفر الرمز.
                Debug.LogWarning("[Coop] reissue failed: " + ex.Message);
            }
        }
    }
}

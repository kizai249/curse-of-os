using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Coop
{
    /// <summary>عضو في الغرفة (DATA_CONTRACTS §6).</summary>
    public sealed class RoomMember
    {
        public string Uid;
        public string Alias;
        public DateTimeOffset JoinedAt;
        public bool Active;
    }

    /// <summary>خانة عامة: المركز وصاحبها فقط (الشرط في منظور صاحبها).</summary>
    public sealed class RoomSlot
    {
        public string SlotId;
        public string Position;
        public string OwnerUid;
    }

    /// <summary>قطعة: الاسم والمركز فقط (§7.3).</summary>
    public sealed class RoomPiece
    {
        public string PlayerId;
        public Localized Name;
        public string Position;
    }

    /// <summary>الحالة المشتركة من `rooms/{id}` (مستند Firestore بعد التوحيد).</summary>
    public sealed class RoomState
    {
        public string RoomId;
        public string Code;
        public string BranchId;
        public string Status;
        public string HostUid;
        public List<RoomMember> Members = new List<RoomMember>();
        public DateTimeOffset? LobbyExpiresAt;
        public DateTimeOffset? StartAt;
        public DateTimeOffset? EndsAt;
        public int PenaltySec;
        public int Attempts;
        public Dictionary<string, string> Placements = new Dictionary<string, string>();
        public int? LastCheckCorrect;
        public int? LastCheckTotal;
        public DateTimeOffset? LastCheckAt;
        public string CouponMode;
        public List<RoomSlot> Slots = new List<RoomSlot>();
        public List<RoomPiece> Pieces = new List<RoomPiece>();

        public IEnumerable<RoomMember> ActiveMembers => Members.Where(m => m.Active);
        public bool IsPlaying => Status == "playing";
        public bool IsFinished => Status == "won" || Status == "lost" || Status == "closed";
        public bool AllPlaced => Slots.Count > 0 && Slots.All(s => Placements.ContainsKey(s.SlotId));

        public string AliasOf(string uid) => Members.FirstOrDefault(m => m.Uid == uid)?.Alias ?? string.Empty;
        public RoomPiece Piece(string playerId) => Pieces.FirstOrDefault(p => p.PlayerId == playerId);

        /// <summary>الخانة اللي فيها القطعة (null إذا متاحة).</summary>
        public string SlotOf(string playerId) => Placements.FirstOrDefault(kv => kv.Value == playerId).Key;

        public static RoomState Parse(string roomId, object doc)
        {
            var state = new RoomState
            {
                RoomId = roomId,
                Code = JsonFields.Str(doc, "code"),
                BranchId = JsonFields.Str(doc, "branchId"),
                Status = JsonFields.Str(doc, "status"),
                HostUid = JsonFields.Str(doc, "hostUid"),
                LobbyExpiresAt = CouponInfo.Date(JsonFields.Str(doc, "lobbyExpiresAt")),
                StartAt = CouponInfo.Date(JsonFields.Str(doc, "startAt")),
                EndsAt = CouponInfo.Date(JsonFields.Str(doc, "endsAt")),
                PenaltySec = JsonFields.Int(doc, "penaltySec"),
                Attempts = JsonFields.Int(doc, "attempts"),
                CouponMode = JsonFields.Str(doc, "couponMode"),
            };
            foreach (var m in JsonFields.List(doc, "members"))
            {
                state.Members.Add(new RoomMember
                {
                    Uid = JsonFields.Str(m, "uid"),
                    Alias = JsonFields.Str(m, "alias") ?? string.Empty,
                    JoinedAt = CouponInfo.Date(JsonFields.Str(m, "joinedAt")) ?? DateTimeOffset.MinValue,
                    Active = JsonFields.Bool(m, "active"),
                });
            }
            if (JsonFields.Obj(doc, "placements") is IDictionary<string, object> placements)
            {
                foreach (var kv in placements)
                {
                    if (kv.Value is string playerId) state.Placements[kv.Key] = playerId;
                }
            }
            var check = JsonFields.Obj(doc, "lastCheck");
            if (check != null)
            {
                state.LastCheckCorrect = JsonFields.Int(check, "correct");
                state.LastCheckTotal = JsonFields.Int(check, "total");
                state.LastCheckAt = CouponInfo.Date(JsonFields.Str(check, "at"));
            }
            foreach (var s in JsonFields.List(doc, "slots"))
                state.Slots.Add(new RoomSlot { SlotId = JsonFields.Str(s, "slotId"), Position = JsonFields.Str(s, "position"), OwnerUid = JsonFields.Str(s, "ownerUid") });
            foreach (var p in JsonFields.List(doc, "pieces"))
            {
                state.Pieces.Add(new RoomPiece
                {
                    PlayerId = JsonFields.Str(p, "playerId"),
                    Name = new Localized { Ar = JsonFields.Str(p, "ar") ?? "", En = JsonFields.Str(p, "en") ?? "" },
                    Position = JsonFields.Str(p, "position"),
                });
            }
            return state;
        }
    }

    public sealed class ViewSlot
    {
        public string SlotId;
        public string Position;
        public Localized Requirement;
    }

    public sealed class InfoCard
    {
        public string PlayerId;
        public Dictionary<string, int> Stats = new Dictionary<string, int>();
    }

    /// <summary>نتيجة اللاعب الخاصة (`views/{uid}.result`).</summary>
    public sealed class RoundResult
    {
        public string Outcome;
        public int Xp;
        public int Packs;
        public int EpicPacks;
        public string PlayerCardId;
        public Localized PlayerCardName;
        public string CouponId;
        public bool Capped;

        public static RoundResult Parse(object o) => o == null ? null : new RoundResult
        {
            PlayerCardName = JsonFields.Obj(o, "playerCardName") == null ? null : Localized.Parse(JsonFields.Obj(o, "playerCardName")),
            Outcome = JsonFields.Str(o, "outcome"),
            Xp = JsonFields.Int(o, "xp"),
            Packs = JsonFields.Int(o, "packs"),
            EpicPacks = JsonFields.Int(o, "epicPacks"),
            PlayerCardId = JsonFields.Str(o, "playerCardId"),
            CouponId = JsonFields.Str(o, "couponId"),
            Capped = JsonFields.Bool(o, "capped"),
        };
    }

    /// <summary>منظور اللاعب (`rooms/{id}/views/{uid}`): شروط خاناته وبطاقات معلوماته فقط (§7.4).</summary>
    public sealed class RoomView
    {
        /// <summary>ترتيب الإحصاءات في البطاقة (players.json).</summary>
        public static readonly string[] StatKeys = { "spd", "sho", "pas", "def", "iq" };

        public List<ViewSlot> Slots = new List<ViewSlot>();
        public List<InfoCard> InfoCards = new List<InfoCard>();
        /// <summary>campaign_limit أو daily_cap (ROUND_USER_NOT_ELIGIBLE / ROUND_DAILY_CAP).</summary>
        public string NotEligible;
        public RoundResult Result;

        public static RoomView Parse(object doc)
        {
            var view = new RoomView { NotEligible = JsonFields.Str(doc, "notEligible"), Result = RoundResult.Parse(JsonFields.Obj(doc, "result")) };
            foreach (var s in JsonFields.List(doc, "slots"))
            {
                view.Slots.Add(new ViewSlot
                {
                    SlotId = JsonFields.Str(s, "slotId"),
                    Position = JsonFields.Str(s, "position"),
                    Requirement = Localized.Parse(JsonFields.Obj(s, "requirement")),
                });
            }
            foreach (var c in JsonFields.List(doc, "infoCards"))
            {
                var card = new InfoCard { PlayerId = JsonFields.Str(c, "playerId") };
                var stats = JsonFields.Obj(c, "stats");
                foreach (var key in StatKeys) card.Stats[key] = JsonFields.Int(stats, key);
                view.InfoCards.Add(card);
            }
            return view;
        }
    }

    /// <summary>ردّ الدوال (`summary` في firebase/functions/src/coop/rooms.ts) مع وقت الخادم.</summary>
    public sealed class RoomSummary
    {
        public string RoomId;
        public string Code;
        public string Status;
        public string HostUid;
        public string CouponMode;
        public DateTimeOffset? StartAt;
        public DateTimeOffset? EndsAt;
        public DateTimeOffset? ServerNow;
        /// <summary>submitLineup فقط.</summary>
        public int? Correct;
        public int? Total;
        public RoundResult Result;
        public RedeemCodes Codes;

        public static RoomSummary Parse(object o)
        {
            var result = JsonFields.Obj(o, "result");
            var codes = JsonFields.Obj(result, "codes");
            return new RoomSummary
            {
                RoomId = JsonFields.Str(o, "roomId"),
                Code = JsonFields.Str(o, "code"),
                Status = JsonFields.Str(o, "status"),
                HostUid = JsonFields.Str(o, "hostUid"),
                CouponMode = JsonFields.Str(o, "couponMode"),
                StartAt = CouponInfo.Date(JsonFields.Str(o, "startAt")),
                EndsAt = CouponInfo.Date(JsonFields.Str(o, "endsAt")),
                ServerNow = CouponInfo.Date(JsonFields.Str(o, "serverNow")),
                Correct = HasNumber(o, "correct") ? JsonFields.Int(o, "correct") : (int?)null,
                Total = HasNumber(o, "total") ? JsonFields.Int(o, "total") : (int?)null,
                Result = RoundResult.Parse(result),
                Codes = codes == null ? null : new RedeemCodes { Token = JsonFields.Str(codes, "redeemToken"), Manual = JsonFields.Str(codes, "manualCode") },
            };
        }

        private static bool HasNumber(object o, string key) =>
            o is IDictionary<string, object> d && d.TryGetValue(key, out var v) && v is double;
    }

    public interface ICoopApi
    {
        Task<RoomSummary> CreateAsync(string branchId);
        Task<RoomSummary> JoinAsync(string branchId, string code);
        Task<RoomSummary> LeaveAsync(string roomId);
        Task<RoomSummary> StartAsync(string roomId);
        Task<RoomSummary> PlaceAsync(string roomId, string slotId, string playerId);
        Task<RoomSummary> SubmitAsync(string roomId);
        Task<RoomSummary> HeartbeatAsync(string roomId);
    }

    /// <summary>الدوال بأسماء ARCHITECTURE §5. البدء والتأكيد يعيدان بنفس requestId عند الأعطال المؤقتة.</summary>
    public sealed class CoopApi : ICoopApi
    {
        private readonly IFunctionsClient functions;

        public CoopApi(IFunctionsClient functions)
        {
            this.functions = functions;
        }

        public Task<RoomSummary> CreateAsync(string branchId) => Call("createRoom", new Dictionary<string, object> { { "branchId", branchId } });

        public Task<RoomSummary> JoinAsync(string branchId, string code) =>
            Call("joinRoom", new Dictionary<string, object> { { "branchId", branchId }, { "code", code } });

        public Task<RoomSummary> LeaveAsync(string roomId) => Call("leaveRoom", Room(roomId));

        public Task<RoomSummary> StartAsync(string roomId) =>
            Retry.RunAsync(id => Call("startRound", new Dictionary<string, object> { { "roomId", roomId }, { "requestId", id } }));

        public Task<RoomSummary> PlaceAsync(string roomId, string slotId, string playerId) =>
            Call("placePiece", new Dictionary<string, object> { { "roomId", roomId }, { "slotId", slotId }, { "playerId", playerId } });

        public Task<RoomSummary> SubmitAsync(string roomId) =>
            Retry.RunAsync(id => Call("submitLineup", new Dictionary<string, object> { { "roomId", roomId }, { "requestId", id } }));

        public Task<RoomSummary> HeartbeatAsync(string roomId) => Call("roomHeartbeat", Room(roomId));

        private static Dictionary<string, object> Room(string roomId) => new Dictionary<string, object> { { "roomId", roomId } };

        private async Task<RoomSummary> Call(string name, Dictionary<string, object> data) => RoomSummary.Parse(await functions.CallAsync(name, data));
    }

    /// <summary>
    /// الوقت من الخادم (§7.6): كل ردّ يحمل serverNow، والعد يُحسب بفرق ساعة الجهاز عنه
    /// عشان تغيير ساعة الجهاز ما يأثر على المؤقت.
    /// </summary>
    public sealed class RoundClock
    {
        private TimeSpan offset;

        public void Sync(DateTimeOffset? serverNow, DateTimeOffset localNow)
        {
            if (serverNow.HasValue) offset = serverNow.Value - localNow;
        }

        public DateTimeOffset Now(DateTimeOffset localNow) => localNow + offset;

        /// <summary>الثواني المتبقية (تقريب للأعلى، وما تنزل تحت صفر).</summary>
        public int SecondsUntil(DateTimeOffset? at, DateTimeOffset localNow)
        {
            if (!at.HasValue) return 0;
            var left = (at.Value - Now(localNow)).TotalSeconds;
            return left <= 0 ? 0 : (int)Math.Ceiling(left - 1e-6);
        }

        public static string Format(int seconds) => (seconds / 60).ToString(CultureInfo.InvariantCulture) + ":" + (seconds % 60).ToString("00", CultureInfo.InvariantCulture);
    }

    /// <summary>تنبيه يُعرض من مقارنة حالتين متتاليتين للغرفة (الأجهزة كلها تشوف نفس التنبيه بدون رسائل).</summary>
    public sealed class RoomNotice
    {
        public string StateId;
        public Dictionary<string, string> Values = new Dictionary<string, string>();
    }

    public static class CoopRules
    {
        public const int HeartbeatSeconds = 5;
        public const int PollSeconds = 1;

        /// <summary>ROUND_HOST_CHANGED، وROUND_PLAYER_LEFT، وROUND_WRONG (AT-06، §7.5).</summary>
        public static List<RoomNotice> Notices(RoomState previous, RoomState current)
        {
            var notices = new List<RoomNotice>();
            if (previous == null || current == null || !current.IsPlaying && !(previous.IsPlaying && current.IsFinished)) return notices;
            if (previous.IsPlaying)
            {
                foreach (var m in previous.ActiveMembers)
                {
                    if (current.ActiveMembers.Any(x => x.Uid == m.Uid)) continue;
                    notices.Add(new RoomNotice { StateId = StateCatalog.RoundPlayerLeft, Values = { { "name", m.Alias } } });
                }
                if (previous.HostUid != current.HostUid && current.IsPlaying)
                    notices.Add(new RoomNotice { StateId = StateCatalog.RoundHostChanged, Values = { { "name", current.AliasOf(current.HostUid) } } });
            }
            if (current.IsPlaying && current.LastCheckAt.HasValue && current.LastCheckAt != previous.LastCheckAt && current.LastCheckCorrect < current.LastCheckTotal)
            {
                notices.Add(new RoomNotice
                {
                    StateId = StateCatalog.RoundWrong,
                    Values =
                    {
                        { "correct", current.LastCheckCorrect.Value.ToString(CultureInfo.InvariantCulture) },
                        { "total", current.LastCheckTotal.Value.ToString(CultureInfo.InvariantCulture) },
                    },
                });
            }
            return notices;
        }

        /// <summary>القطع المتاحة لخانة: نفس المركز، وغير موضوعة في خانة ثانية.</summary>
        public static List<RoomPiece> Choices(RoomState room, string slotId)
        {
            var slot = room.Slots.FirstOrDefault(s => s.SlotId == slotId);
            if (slot == null) return new List<RoomPiece>();
            return room.Pieces.Where(p => p.Position == slot.Position && (room.SlotOf(p.PlayerId) == null || room.SlotOf(p.PlayerId) == slotId)).ToList();
        }

        /// <summary>رسالة ما قبل العد للاعب: وضع القسائم للفريق، ثم سبب عدم أهليته إن وجد (AT-07، AT-08، §7.8).</summary>
        public static List<string> CountdownStates(string couponMode, string notEligible)
        {
            var states = new List<string>();
            if (couponMode == "with_coupons") states.Add(StateCatalog.RoundWithCoupons);
            else if (couponMode == "no_coupons") states.Add(StateCatalog.RoundNoCoupons);
            if (notEligible == "daily_cap") states.Add(StateCatalog.RoundDailyCap);
            else if (notEligible == "campaign_limit" && couponMode == "with_coupons") states.Add(StateCatalog.RoundUserNotEligible);
            return states;
        }
    }
}

namespace FootballQuest.Core.Coop
{
    /// <summary>أسماء المراكز والإحصاءات — نفس shared/contracts/content/players.json (CoopTests يتأكد من التطابق).</summary>
    public static class CoopText
    {
        public static string Position(string code, Language language)
        {
            var ar = language == Language.Arabic;
            switch (code)
            {
                case "GK": return ar ? "حارس" : "Goalkeeper";
                case "DEF": return ar ? "مدافع" : "Defender";
                case "MID": return ar ? "وسط" : "Midfielder";
                case "FWD": return ar ? "مهاجم" : "Forward";
                default: return code;
            }
        }

        public static string Stat(string key, Language language)
        {
            var ar = language == Language.Arabic;
            switch (key)
            {
                case "spd": return ar ? "السرعة" : "Speed";
                case "sho": return ar ? "التسديد" : "Shooting";
                case "pas": return ar ? "التمرير" : "Passing";
                case "def": return ar ? "الدفاع" : "Defending";
                case "iq": return ar ? "الذكاء" : "IQ";
                default: return key;
            }
        }
    }
}

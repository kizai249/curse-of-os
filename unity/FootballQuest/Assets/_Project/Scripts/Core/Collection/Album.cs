using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Content;
using FootballQuest.Core.Economy;

namespace FootballQuest.Core.Collection
{
    /// <summary>بطاقة مملوكة كما في users/{uid}/teamCards/{teamCode_variant} (DATA_CONTRACTS §1).</summary>
    public sealed class OwnedCard
    {
        public string TeamCode;
        public string Variant;
        public int Count;
    }

    /// <summary>قراءة بطاقات اللاعب (القواعد: المالك يقرأ فقط).</summary>
    public interface ICollectionSource
    {
        Task<List<OwnedCard>> GetTeamCardsAsync(string uid);

        /// <summary>بطاقات اللاعبين الافتراضيين: playerId ← عدد النسخ (S5b).</summary>
        Task<Dictionary<string, int>> GetPlayerCardsAsync(string uid);
    }

    public sealed class AlbumSlot
    {
        public string TeamCode;
        public string Variant;
        public bool Owned;
        public int Count;
    }

    public sealed class AlbumRow
    {
        public TeamInfo Team;
        public AlbumSlot[] Slots;
        public bool AnyOwned => Slots.Any(s => s.Owned);
    }

    /// <summary>
    /// الألبوم: 24 منتخبًا × 4 نسخ = 96 خانة (GAME_RULES §3.1). المنتخب «مملوك» بأي نسخة لحساب الإنجازات.
    /// يُحدَّث محليًا من نتيجة openPack/exchange بدون قراءة جديدة.
    /// </summary>
    public sealed class Album
    {
        private readonly Dictionary<string, AlbumSlot> slots = new Dictionary<string, AlbumSlot>();

        public Album(IEnumerable<TeamInfo> teams, IEnumerable<OwnedCard> owned)
        {
            Rows = teams.Select(t => new AlbumRow
            {
                Team = t,
                Slots = EconomyRules.Variants.Select(v => new AlbumSlot { TeamCode = t.Code, Variant = v }).ToArray(),
            }).ToList();
            foreach (var row in Rows)
            foreach (var slot in row.Slots)
                slots[Key(slot.TeamCode, slot.Variant)] = slot;
            foreach (var card in owned ?? Enumerable.Empty<OwnedCard>()) Add(card.TeamCode, card.Variant, card.Count);
        }

        public IReadOnlyList<AlbumRow> Rows { get; }

        public int OwnedTeams => Rows.Count(r => r.AnyOwned);
        public int OwnedVariants => slots.Values.Count(s => s.Owned);
        public int TotalVariants => slots.Count;

        public AlbumSlot Slot(string teamCode, string variant) => slots.TryGetValue(Key(teamCode, variant), out var s) ? s : null;

        public void Add(string teamCode, string variant, int count = 1)
        {
            var slot = Slot(teamCode, variant);
            if (slot == null) return;
            slot.Owned = true;
            slot.Count += count;
        }

        /// <summary>يطبّق نتيجة سحب أو استبدال من الخادم.</summary>
        public void Apply(CardGain gain) => Add(gain.TeamCode, gain.Variant);

        private static string Key(string team, string variant) => team + "_" + variant;

        public static List<OwnedCard> ParseCards(IEnumerable<object> docs)
        {
            var list = new List<OwnedCard>();
            foreach (var d in docs)
            {
                var team = JsonFields.Str(d, "teamCode");
                var variant = JsonFields.Str(d, "variant");
                if (team == null || EconomyRules.Rank(variant) < 0) continue;
                list.Add(new OwnedCard { TeamCode = team, Variant = variant, Count = System.Math.Max(1, JsonFields.Int(d, "count")) });
            }
            return list;
        }
    }

    public enum ExchangeBlock
    {
        None,
        NotExchangeable,
        AlreadyOwned,
        NotEnoughFanPoints,
    }

    /// <summary>أهلية الاستبدال بنقاط المشجع — GAME_RULES §3.4 (العرض فقط؛ الخادم يعيد الفحص).</summary>
    public static class Exchange
    {
        public static int? Cost(string variant) => EconomyRules.ExchangeCost.TryGetValue(variant ?? "", out var c) ? c : (int?)null;

        public static ExchangeBlock Check(AlbumSlot slot, int fanPoints)
        {
            var cost = Cost(slot.Variant);
            if (cost == null) return ExchangeBlock.NotExchangeable;
            if (slot.Owned) return ExchangeBlock.AlreadyOwned;
            return fanPoints < cost.Value ? ExchangeBlock.NotEnoughFanPoints : ExchangeBlock.None;
        }
    }
}

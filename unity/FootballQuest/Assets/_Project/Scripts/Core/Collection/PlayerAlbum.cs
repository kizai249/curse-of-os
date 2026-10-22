using System.Collections.Generic;
using System.Linq;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Coupons;
using FootballQuest.Core.Economy;

namespace FootballQuest.Core.Collection
{
    /// <summary>شخصية افتراضية من `content/players` (GAME_RULES §4 — أصلية بالكامل).</summary>
    public sealed class PlayerCharacter
    {
        public string Id;
        public Localized Name;
        public string Position;
        public string Rarity;
        public Dictionary<string, int> Stats = new Dictionary<string, int>();

        public static List<PlayerCharacter> ParseContent(object doc)
        {
            var list = new List<PlayerCharacter>();
            foreach (var p in JsonFields.List(doc, "players"))
            {
                var c = new PlayerCharacter
                {
                    Id = JsonFields.Str(p, "id"),
                    Name = new Localized { Ar = JsonFields.Str(p, "ar") ?? "", En = JsonFields.Str(p, "en") ?? "" },
                    Position = JsonFields.Str(p, "position"),
                    Rarity = JsonFields.Str(p, "rarity"),
                };
                var stats = JsonFields.Obj(p, "stats");
                foreach (var key in Coop.RoomView.StatKeys) c.Stats[key] = JsonFields.Int(stats, key);
                if (c.Id != null && EconomyRules.Rank(c.Rarity) >= 0) list.Add(c);
            }
            return list;
        }
    }

    public sealed class PlayerAlbumEntry
    {
        public PlayerCharacter Character;
        public int Count;
        public bool Owned => Count > 0;
    }

    /// <summary>
    /// ألبوم بطاقات اللاعبين (S5b): 30 شخصية بالمركز (حارس ← مهاجم) ثم الندرة الأعلى. للتجميع والعرض فقط،
    /// وما تعطي أي أفضلية (§4). الإحصاءات تظهر للبطاقة المملوكة فقط.
    /// </summary>
    public sealed class PlayerAlbum
    {
        public static readonly string[] PositionOrder = { "GK", "DEF", "MID", "FWD" };

        public PlayerAlbum(IEnumerable<PlayerCharacter> characters, IReadOnlyDictionary<string, int> owned)
        {
            Entries = characters
                .OrderBy(c => System.Array.IndexOf(PositionOrder, c.Position))
                .ThenByDescending(c => EconomyRules.Rank(c.Rarity))
                .ThenBy(c => c.Id)
                .Select(c => new PlayerAlbumEntry { Character = c, Count = owned != null && owned.TryGetValue(c.Id, out var n) ? n : 0 })
                .ToList();
        }

        public IReadOnlyList<PlayerAlbumEntry> Entries { get; }
        public int OwnedCount => Entries.Count(e => e.Owned);
        public int Total => Entries.Count;

        public void Add(string playerId)
        {
            var entry = Entries.FirstOrDefault(e => e.Character.Id == playerId);
            if (entry != null) entry.Count++;
        }

        /// <summary>`users/{uid}/playerCards/{playerId}` ← عدد النسخ لكل شخصية.</summary>
        public static Dictionary<string, int> ParseOwned(IEnumerable<object> docs)
        {
            var owned = new Dictionary<string, int>();
            foreach (var d in docs)
            {
                var id = JsonFields.Str(d, "playerId");
                if (id != null) owned[id] = System.Math.Max(1, JsonFields.Int(d, "count"));
            }
            return owned;
        }
    }
}

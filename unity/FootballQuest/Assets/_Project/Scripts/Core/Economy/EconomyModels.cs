using System.Collections.Generic;
using FootballQuest.Core.Backend;

namespace FootballQuest.Core.Economy
{
    /// <summary>الأرصدة كما يرجعها الخادم بعد كل عملية (العميل يعرض فقط).</summary>
    public sealed class Balances
    {
        public int Packs;
        public int EpicPacks;
        public int LegendaryPacks;
        public int FanPoints;
        public int Xp;
        public int Level = 1;
        public int PityCount;

        public int TotalPacks => Packs + EpicPacks + LegendaryPacks;

        public static Balances Parse(object o)
        {
            if (o == null) return new Balances();
            return new Balances
            {
                Packs = JsonFields.Int(o, "packs"),
                EpicPacks = JsonFields.Int(o, "epicPacks"),
                LegendaryPacks = JsonFields.Int(o, "legendaryPacks"),
                FanPoints = JsonFields.Int(o, "fanPoints"),
                Xp = JsonFields.Int(o, "xp"),
                Level = System.Math.Max(1, JsonFields.Int(o, "level")),
                PityCount = JsonFields.Int(o, "pityCount"),
            };
        }
    }

    public enum PackKind
    {
        Standard,
        Epic,
        Legendary,
    }

    public sealed class CardGain
    {
        public string TeamCode;
        public string Variant;
        public bool Duplicate;
        public int FanPointsGained;
        public bool NewTeam;
    }

    public sealed class Achievement
    {
        public string Id;
        public int Packs;
        public int EpicPacks;
        public int Xp;
        public string Badge;
    }

    public sealed class CardResult
    {
        public CardGain Card;
        public bool PityTriggered;
        public List<Achievement> Achievements = new List<Achievement>();
        public Balances Balances;
    }

    public sealed class VisitResult
    {
        public bool AlreadyVisited;
        public int XpGained;
        public List<string> VisitedToday = new List<string>();
        public Balances Balances;
    }

    public sealed class DailyLogin
    {
        public bool Granted;
        public int Xp;
        public int Packs;
    }
}

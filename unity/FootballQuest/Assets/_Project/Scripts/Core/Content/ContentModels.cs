using System.Collections.Generic;

namespace FootballQuest.Core.Content
{
    public sealed class TeamInfo
    {
        public string Code;
        public string NameAr;
        public string NameEn;
        public bool Host;

        public string Name(Ui.Language language) => language == Ui.Language.Arabic ? NameAr : NameEn;
    }

    public sealed class StadiumInfo
    {
        public string Id;
        public string City;
        public string NameAr;
        public string NameEn;
        public int RadiusM;

        public string Name(Ui.Language language) => language == Ui.Language.Arabic ? NameAr : NameEn;
    }

    public sealed class MatchInfo
    {
        public string MatchId;
        public int MatchNo;
        public string Stage;
        public string Group;
        public string Day;
        public string StadiumId;
        public string Home;
        public string Away;
        public bool Finished;
        public int? HomeScore;
        public int? AwayScore;
    }

    /// <summary>المحتوى العام كما يعرضه العميل: content/teams وcontent/stadiums وcontent/schedule.</summary>
    public sealed class ContentSnapshot
    {
        public IReadOnlyList<TeamInfo> Teams = new List<TeamInfo>();
        public IReadOnlyList<StadiumInfo> Stadiums = new List<StadiumInfo>();
        public IReadOnlyList<MatchInfo> Matches = new List<MatchInfo>();

        public TeamInfo Team(string code)
        {
            foreach (var t in Teams) if (t.Code == code) return t;
            return null;
        }

        public StadiumInfo Stadium(string id)
        {
            foreach (var s in Stadiums) if (s.Id == id) return s;
            return null;
        }

        /// <summary>اسم المنتخب، أو الرمز الشاغر كما هو (مثل «1A»).</summary>
        public string SideName(string codeOrSlot, Ui.Language language) => Team(codeOrSlot)?.Name(language) ?? codeOrSlot;
    }
}

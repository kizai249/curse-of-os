using System.Collections.Generic;
using System.Linq;
using FootballQuest.Core.Content;

namespace FootballQuest.Core.Map
{
    /// <summary>
    /// ما تعرضه محطة الملعب — GAME_RULES §2.2: مباريات اليوم المسندة لهذا الملعب، والنتائج المنتهية.
    /// المباراة بدون ملعب مؤكد (stadiumId = null) ما تظهر في أي محطة.
    /// </summary>
    public sealed class StationSchedule
    {
        public const int MaxResults = 5;

        public IReadOnlyList<MatchInfo> Today { get; private set; } = new List<MatchInfo>();
        public IReadOnlyList<MatchInfo> Results { get; private set; } = new List<MatchInfo>();

        public static StationSchedule For(string stadiumId, string gameDay, IEnumerable<MatchInfo> matches)
        {
            var here = matches.Where(m => m.StadiumId != null && m.StadiumId == stadiumId).ToList();
            return new StationSchedule
            {
                Today = here.Where(m => m.Day == gameDay).OrderBy(m => m.MatchNo).ToList(),
                Results = here.Where(m => m.Finished && string.CompareOrdinal(m.Day, gameDay) < 0)
                    .OrderByDescending(m => m.Day).ThenByDescending(m => m.MatchNo)
                    .Take(MaxResults).ToList(),
            };
        }

        /// <summary>نص سطر المباراة: «السعودية 2 – 1 فلسطين» أو «السعودية × فلسطين».</summary>
        public static string Line(MatchInfo m, ContentSnapshot content, Ui.Language language)
        {
            var home = content.SideName(m.Home, language);
            var away = content.SideName(m.Away, language);
            return m.Finished && m.HomeScore.HasValue && m.AwayScore.HasValue
                ? home + " " + m.HomeScore + " – " + m.AwayScore + " " + away
                : home + " × " + away;
        }
    }
}

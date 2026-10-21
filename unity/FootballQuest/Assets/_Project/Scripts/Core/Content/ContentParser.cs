using System.Collections.Generic;
using FootballQuest.Core.Backend;

namespace FootballQuest.Core.Content
{
    /// <summary>
    /// يحوّل مستندات المحتوى (بشكل MiniJson: من Firestore SDK بعد التوحيد، أو من Firestore REST بعد FirestoreRest.Decode)
    /// إلى نماذج العرض. أي عنصر ناقص يُتجاهل بدل ما يكسر الخارطة.
    /// </summary>
    public static class ContentParser
    {
        public static List<TeamInfo> Teams(object doc)
        {
            var result = new List<TeamInfo>();
            foreach (var item in List(doc, "teams"))
            {
                var code = JsonFields.Str(item, "code");
                if (string.IsNullOrEmpty(code)) continue;
                result.Add(new TeamInfo
                {
                    Code = code,
                    NameAr = JsonFields.Str(item, "ar") ?? code,
                    NameEn = JsonFields.Str(item, "en") ?? code,
                    Host = item is IDictionary<string, object> d && d.TryGetValue("host", out var h) && h is bool b && b,
                });
            }
            return result;
        }

        public static List<StadiumInfo> Stadiums(object doc)
        {
            var result = new List<StadiumInfo>();
            foreach (var item in List(doc, "stadiums"))
            {
                var id = JsonFields.Str(item, "id");
                if (string.IsNullOrEmpty(id)) continue;
                result.Add(new StadiumInfo
                {
                    Id = id,
                    City = JsonFields.Str(item, "city"),
                    NameAr = JsonFields.Str(item, "ar") ?? id,
                    NameEn = JsonFields.Str(item, "en") ?? id,
                    RadiusM = JsonFields.Int(item, "radiusM"),
                });
            }
            return result;
        }

        public static List<MatchInfo> Matches(object doc)
        {
            var result = new List<MatchInfo>();
            foreach (var item in List(doc, "matches"))
            {
                var id = JsonFields.Str(item, "matchId");
                if (string.IsNullOrEmpty(id)) continue;
                var score = JsonFields.Obj(item, "score");
                result.Add(new MatchInfo
                {
                    MatchId = id,
                    MatchNo = JsonFields.Int(item, "matchNo"),
                    Stage = JsonFields.Str(item, "stage"),
                    Group = JsonFields.Str(item, "group"),
                    Day = JsonFields.Str(item, "day"),
                    StadiumId = JsonFields.Str(item, "stadiumId"),
                    Home = JsonFields.Str(item, "home"),
                    Away = JsonFields.Str(item, "away"),
                    Finished = JsonFields.Str(item, "status") == "finished",
                    HomeScore = score == null ? (int?)null : JsonFields.Int(score, "home"),
                    AwayScore = score == null ? (int?)null : JsonFields.Int(score, "away"),
                });
            }
            return result;
        }

        private static IEnumerable<object> List(object doc, string key)
        {
            if (doc is IDictionary<string, object> d && d.TryGetValue(key, out var v) && v is IList<object> list) return list;
            return new object[0];
        }
    }
}

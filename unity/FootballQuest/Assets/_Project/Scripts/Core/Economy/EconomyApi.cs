using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;

namespace FootballQuest.Core.Economy
{
    public interface IEconomyApi
    {
        Task<CardResult> OpenPackAsync(PackKind kind, string requestId);
        Task<CardResult> ExchangeAsync(string teamCode, string variant, string requestId);
        Task<VisitResult> StadiumVisitAsync(string stadiumId);
    }

    /// <summary>
    /// openPack وexchangeFanPoints وstadiumVisit — ARCHITECTURE §5. الطلبات اللي تغير رصيدًا تمر بـ Retry
    /// بنفس requestId، فالخادم يرجع النتيجة المحفوظة بدل ما يكرر المنح.
    /// </summary>
    public sealed class EconomyApi : IEconomyApi
    {
        private readonly IFunctionsClient functions;

        public EconomyApi(IFunctionsClient functions)
        {
            this.functions = functions;
        }

        public async Task<CardResult> OpenPackAsync(PackKind kind, string requestId)
        {
            var result = await functions.CallAsync("openPack", new Dictionary<string, object>
            {
                { "requestId", requestId },
                { "kind", kind == PackKind.Standard ? "standard" : kind == PackKind.Epic ? "epic" : "legendary" },
            });
            return ParseCard(result);
        }

        public async Task<CardResult> ExchangeAsync(string teamCode, string variant, string requestId)
        {
            var result = await functions.CallAsync("exchangeFanPoints", new Dictionary<string, object>
            {
                { "requestId", requestId },
                { "teamCode", teamCode },
                { "variant", variant },
            });
            return ParseCard(result);
        }

        public async Task<VisitResult> StadiumVisitAsync(string stadiumId)
        {
            var result = await functions.CallAsync("stadiumVisit", new Dictionary<string, object> { { "stadiumId", stadiumId } });
            return ParseVisit(result);
        }

        public static CardResult ParseCard(object result)
        {
            var card = JsonFields.Obj(result, "card");
            var parsed = new CardResult
            {
                Card = new CardGain
                {
                    TeamCode = JsonFields.Str(card, "teamCode"),
                    Variant = JsonFields.Str(card, "variant"),
                    Duplicate = JsonFields.Bool(card, "duplicate"),
                    FanPointsGained = JsonFields.Int(card, "fanPointsGained"),
                    NewTeam = JsonFields.Bool(card, "newTeam"),
                },
                PityTriggered = JsonFields.Bool(result, "pityTriggered"),
                Balances = Balances.Parse(JsonFields.Obj(result, "balances")),
            };
            foreach (var a in JsonFields.List(result, "achievements"))
            {
                parsed.Achievements.Add(new Achievement
                {
                    Id = JsonFields.Str(a, "id"),
                    Packs = JsonFields.Int(a, "packs"),
                    EpicPacks = JsonFields.Int(a, "epicPacks"),
                    Xp = JsonFields.Int(a, "xp"),
                    Badge = JsonFields.Str(a, "badge"),
                });
            }
            return parsed;
        }

        public static VisitResult ParseVisit(object result)
        {
            var parsed = new VisitResult
            {
                AlreadyVisited = JsonFields.Str(result, "status") == "already_visited",
                XpGained = JsonFields.Int(result, "xpGained"),
                Balances = Balances.Parse(JsonFields.Obj(result, "balances")),
            };
            foreach (var s in JsonFields.List(result, "visitedToday")) if (s is string id) parsed.VisitedToday.Add(id);
            return parsed;
        }
    }
}

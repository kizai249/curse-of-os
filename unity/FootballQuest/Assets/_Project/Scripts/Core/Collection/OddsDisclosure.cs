using System.Collections.Generic;
using System.Text;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Economy;
using FootballQuest.Core.Ui;

namespace FootballQuest.Core.Collection
{
    /// <summary>
    /// الاحتمالات المعلنة داخل اللعبة (GAME_RULES §3.3، وAT-11). المصدر: Remote Config `pack_odds` للعرض إذا كان
    /// صالحًا (4 ندرات مجموعها 100)، وإلا أرقام EconomyRules — نفس اللي يطبقها الخادم.
    /// </summary>
    public static class OddsDisclosure
    {
        public static IReadOnlyDictionary<string, int> Resolve(string remoteJson)
        {
            if (string.IsNullOrEmpty(remoteJson)) return EconomyRules.PackOdds;
            try
            {
                var parsed = MiniJson.Parse(remoteJson);
                var odds = new Dictionary<string, int>();
                var sum = 0;
                foreach (var v in EconomyRules.Variants)
                {
                    var value = JsonFields.Int(parsed, v);
                    if (value <= 0) return EconomyRules.PackOdds;
                    odds[v] = value;
                    sum += value;
                }
                return sum == 100 ? odds : EconomyRules.PackOdds;
            }
            catch (System.FormatException)
            {
                return EconomyRules.PackOdds;
            }
        }

        public static string Text(IReadOnlyDictionary<string, int> odds, Language language)
        {
            var ar = language == Language.Arabic;
            var sb = new StringBuilder();
            sb.Append(ar ? "كل حزمة فيها بطاقة منتخب وحدة. احتمالات الندرة:" : "Each pack holds one team card. Rarity odds:").Append('\n');
            foreach (var v in EconomyRules.Variants)
            {
                sb.Append("• ").Append(Variants.RarityName(v, language)).Append(" (").Append(Variants.EditionName(v, language)).Append("): ")
                  .Append(odds[v]).Append("%\n");
            }
            sb.Append(ar
                ? $"• حماية سوء الحظ: إذا مرت {EconomyRules.PityThreshold} حزمة بدون ملحمية أو أعلى، الحزمة التالية مضمونة ملحمية أو أعلى.\n"
                : $"• Bad-luck protection: after {EconomyRules.PityThreshold} packs without Epic or better, the next pack is guaranteed Epic or better.\n");
            sb.Append(ar
                ? "• المنتخب بالتساوي بين الـ24، والمنتخبات اللي تلعب اليوم فرصتها ×3.\n"
                : "• Teams are equally likely, and teams playing today are 3× as likely.\n");
            sb.Append(ar ? "• الحزم ما تُشترى أبدًا." : "• Packs are never sold.");
            return sb.ToString();
        }
    }
}

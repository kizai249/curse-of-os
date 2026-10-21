using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace FootballQuest.Core.Ui
{
    /// <summary>
    /// حالة واجهة بمعرّف ثابت يستخدمه الكود والتحليلات والاختبارات (PERMISSION_AND_ERROR_STATES.md).
    /// النص العربي هو الأساس. العناصر النائبة بصيغة {name} وتتطابق بين اللغتين.
    /// </summary>
    public sealed class UiState
    {
        private static readonly Regex Placeholder = new Regex("\\{([a-zA-Z]+)\\}");

        public UiState(string id, Presentation presentation, string titleAr, string bodyAr, string titleEn, string bodyEn, bool englishIsDraft = false)
        {
            Id = id;
            Presentation = presentation;
            TitleAr = titleAr;
            BodyAr = bodyAr;
            TitleEn = titleEn;
            BodyEn = bodyEn;
            EnglishIsDraft = englishIsDraft;
        }

        public string Id { get; }
        public Presentation Presentation { get; }
        public string TitleAr { get; }
        public string BodyAr { get; }
        public string TitleEn { get; }
        public string BodyEn { get; }

        /// <summary>
        /// الوثيقة ما فيها نص إنجليزي لهذي الحالة، فالترجمة مسودة من المطوّر.
        /// TODO(owner): مراجعة الترجمات المعلّمة قبل R1 (AT-11).
        /// </summary>
        public bool EnglishIsDraft { get; }

        public string Title(Language language) => language == Language.Arabic ? TitleAr : TitleEn;

        public string Body(Language language) => language == Language.Arabic ? BodyAr : BodyEn;

        public string Format(Language language, IDictionary<string, string> values = null) => Fill(Body(language), values);

        public static string Fill(string template, IDictionary<string, string> values)
        {
            if (string.IsNullOrEmpty(template) || values == null) return template;
            return Placeholder.Replace(template, m => values.TryGetValue(m.Groups[1].Value, out var v) ? v : m.Value);
        }

        public static ISet<string> PlaceholdersOf(string template)
        {
            var set = new HashSet<string>();
            if (string.IsNullOrEmpty(template)) return set;
            foreach (Match m in Placeholder.Matches(template)) set.Add(m.Groups[1].Value);
            return set;
        }
    }
}

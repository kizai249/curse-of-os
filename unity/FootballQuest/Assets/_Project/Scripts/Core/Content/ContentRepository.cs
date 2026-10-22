using System;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;

namespace FootballQuest.Core.Content
{
    /// <summary>مصدر مستندات المحتوى العام (Firestore SDK أو REST للمحاكي). يرجع null إذا المستند غير موجود.</summary>
    public interface IContentSource
    {
        Task<object> GetDocumentAsync(string path);
    }

    /// <summary>تخزين مؤقت محلي للمحتوى (ملفات في persistentDataPath).</summary>
    public interface IContentCache
    {
        bool TryRead(string key, out string json, out DateTimeOffset savedAt);
        void Write(string key, string json, DateTimeOffset savedAt);
    }

    /// <summary>
    /// المحتوى العام مع تخزين مؤقت — ARCHITECTURE §11: المحتوى العام 24 ساعة. والجدول 15 دقيقة لأن النتائج
    /// تُدخل خلال اليوم. بدون اتصال: آخر نسخة محفوظة، ثم الكتالوج المدمج (الخارطة تتصفح دائمًا — NET_OFFLINE).
    /// </summary>
    public sealed class ContentRepository
    {
        public const string TeamsPath = "content/teams";
        public const string StadiumsPath = "content/stadiums";
        public const string SchedulePath = "content/schedule";
        public const string PlayersPath = "content/players";

        public static readonly TimeSpan StaticTtl = TimeSpan.FromHours(24);
        public static readonly TimeSpan ScheduleTtl = TimeSpan.FromMinutes(15);

        private readonly IContentSource source;
        private readonly IContentCache cache;
        private readonly Func<DateTimeOffset> clock;

        public ContentRepository(IContentSource source, IContentCache cache, Func<DateTimeOffset> clock = null)
        {
            this.source = source;
            this.cache = cache;
            this.clock = clock ?? (() => DateTimeOffset.UtcNow);
        }

        public async Task<ContentSnapshot> LoadAsync(bool forceRefresh = false)
        {
            var teams = ContentParser.Teams(await GetAsync(TeamsPath, StaticTtl, forceRefresh));
            var stadiums = ContentParser.Stadiums(await GetAsync(StadiumsPath, StaticTtl, forceRefresh));
            var matches = ContentParser.Matches(await GetAsync(SchedulePath, ScheduleTtl, forceRefresh));
            return new ContentSnapshot
            {
                Teams = teams.Count > 0 ? teams : EmbeddedContent.Teams(),
                Stadiums = stadiums.Count > 0 ? stadiums : EmbeddedContent.Stadiums(),
                Matches = matches,
            };
        }

        /// <summary>الشخصيات الثلاثين (S5b) — محتوى ثابت بنفس تخزين 24 ساعة. null بدون اتصال ولا نسخة محفوظة.</summary>
        public Task<object> LoadPlayersAsync(bool forceRefresh = false) => GetAsync(PlayersPath, StaticTtl, forceRefresh);

        private async Task<object> GetAsync(string path, TimeSpan ttl, bool forceRefresh)
        {
            var now = clock();
            var hasCache = cache.TryRead(path, out var cachedJson, out var savedAt);
            if (hasCache && !forceRefresh && now - savedAt < ttl) return Parse(cachedJson);

            try
            {
                var fresh = await source.GetDocumentAsync(path);
                if (fresh != null)
                {
                    cache.Write(path, MiniJson.Serialize(fresh), now);
                    return fresh;
                }
            }
            catch (Exception)
            {
                // بدون اتصال أو خطأ مؤقت: نكمل بالنسخة المحفوظة.
            }
            return hasCache ? Parse(cachedJson) : null;
        }

        private static object Parse(string json)
        {
            try
            {
                return MiniJson.Parse(json);
            }
            catch (FormatException)
            {
                return null;
            }
        }
    }
}

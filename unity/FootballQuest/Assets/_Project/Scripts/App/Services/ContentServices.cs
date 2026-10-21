using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Collection;
using FootballQuest.Core.Content;
using FootballQuest.Core.Coupons;
using UnityEngine;

namespace FootballQuest.App.Services
{
    /// <summary>قراءة مستندات المحتوى من محاكي Firestore عبر REST (القواعد تشترط تسجيل الدخول، فنرسل رمز المحاكي).</summary>
    public sealed class EmulatorContentSource : IContentSource
    {
        private readonly EmulatorAuthGateway auth;

        public EmulatorContentSource(EmulatorAuthGateway auth)
        {
            this.auth = auth;
        }

        public async Task<object> GetDocumentAsync(string path)
        {
            var token = await auth.GetIdTokenAsync();
            var res = await UnityHttp.GetAsync(BackendSettings.FirestoreDocumentUrl(path), token);
            if (res.Status == 404) return null;
            if (res.Status != 200) throw new BackendException(res.Status == 403 ? "PERMISSION_DENIED" : "UNAVAILABLE", "firestore " + res.Status);
            return FirestoreRest.DecodeDocument(MiniJson.Parse(res.Body));
        }
    }

    /// <summary>بطاقات اللاعب من محاكي Firestore (القواعد: المالك يقرأ فقط).</summary>
    public sealed class EmulatorCollectionSource : ICollectionSource
    {
        private readonly EmulatorAuthGateway auth;

        public EmulatorCollectionSource(EmulatorAuthGateway auth)
        {
            this.auth = auth;
        }

        public async Task<List<OwnedCard>> GetTeamCardsAsync(string uid)
        {
            var token = await auth.GetIdTokenAsync();
            var res = await UnityHttp.GetAsync(BackendSettings.FirestoreDocumentUrl($"users/{uid}/teamCards?pageSize=200"), token);
            if (res.Status != 200) throw new BackendException("UNAVAILABLE", "firestore " + res.Status);
            var docs = new List<object>();
            foreach (var d in JsonFields.List(MiniJson.Parse(res.Body), "documents")) docs.Add(FirestoreRest.DecodeDocument(d));
            return Album.ParseCards(docs);
        }
    }

    /// <summary>قسائم اللاعب من محاكي Firestore (runQuery بفلتر uid — شرط قاعدة الأمان).</summary>
    public sealed class EmulatorCouponSource : ICouponSource
    {
        private readonly EmulatorAuthGateway auth;

        public EmulatorCouponSource(EmulatorAuthGateway auth)
        {
            this.auth = auth;
        }

        public async Task<List<CouponInfo>> GetMyCouponsAsync(string uid)
        {
            var token = await auth.GetIdTokenAsync();
            var query = MiniJson.Serialize(new Dictionary<string, object>
            {
                {
                    "structuredQuery", new Dictionary<string, object>
                    {
                        { "from", new List<object> { new Dictionary<string, object> { { "collectionId", "coupons" } } } },
                        {
                            "where", new Dictionary<string, object>
                            {
                                {
                                    "fieldFilter", new Dictionary<string, object>
                                    {
                                        { "field", new Dictionary<string, object> { { "fieldPath", "uid" } } },
                                        { "op", "EQUAL" },
                                        { "value", new Dictionary<string, object> { { "stringValue", uid } } },
                                    }
                                },
                            }
                        },
                    }
                },
            });
            var res = await UnityHttp.PostJsonAsync(BackendSettings.FirestoreRunQueryUrl, query, token);
            if (res.Status != 200) throw new BackendException("UNAVAILABLE", "firestore " + res.Status);
            var list = new List<CouponInfo>();
            if (MiniJson.Parse(res.Body) is IList<object> rows)
            {
                foreach (var row in rows)
                {
                    var doc = JsonFields.Obj(row, "document");
                    if (doc == null) continue;
                    var name = JsonFields.Str(doc, "name") ?? "";
                    list.Add(CouponInfo.Parse(name.Substring(name.LastIndexOf('/') + 1), FirestoreRest.DecodeDocument(doc)));
                }
            }
            return list;
        }
    }

    /// <summary>تخزين مؤقت للمحتوى كملفات JSON في persistentDataPath (بدون بيانات شخصية).</summary>
    public sealed class FileContentCache : IContentCache
    {
        private readonly string folder = Path.Combine(Application.persistentDataPath, "content-cache");

        public bool TryRead(string key, out string json, out DateTimeOffset savedAt)
        {
            json = null;
            savedAt = default;
            var path = PathFor(key);
            try
            {
                if (!File.Exists(path)) return false;
                json = File.ReadAllText(path);
                savedAt = new DateTimeOffset(File.GetLastWriteTimeUtc(path), TimeSpan.Zero);
                return true;
            }
            catch (IOException)
            {
                return false;
            }
        }

        public void Write(string key, string json, DateTimeOffset savedAt)
        {
            try
            {
                Directory.CreateDirectory(folder);
                var path = PathFor(key);
                File.WriteAllText(path, json);
                File.SetLastWriteTimeUtc(path, savedAt.UtcDateTime);
            }
            catch (IOException ex)
            {
                Debug.LogWarning("[ContentCache] " + ex.Message);
            }
        }

        private string PathFor(string key) => Path.Combine(folder, key.Replace('/', '_') + ".json");
    }
}

using System.Collections.Generic;
using System.Threading.Tasks;

namespace FootballQuest.Core.Backend
{
    /// <summary>
    /// استدعاء Callable Function في `me-central2`. يرجع `result` بشكل MiniJson
    /// (Dictionary/List/double/bool/string/null)، ويرمي BackendException عند الخطأ.
    /// التنفيذ: Firebase Functions SDK في الإنتاج، أو HTTP مباشر للمحاكي في التطوير.
    /// </summary>
    public interface IFunctionsClient
    {
        Task<object> CallAsync(string name, IDictionary<string, object> data);
    }

    /// <summary>قراءة آمنة من نتائج MiniJson.</summary>
    public static class JsonFields
    {
        public static IDictionary<string, object> Obj(object value, string key) =>
            value is IDictionary<string, object> d && d.TryGetValue(key, out var v) ? v as IDictionary<string, object> : null;

        public static string Str(object value, string key) =>
            value is IDictionary<string, object> d && d.TryGetValue(key, out var v) ? v as string : null;

        public static int Int(object value, string key)
        {
            if (!(value is IDictionary<string, object> d) || !d.TryGetValue(key, out var v) || v == null) return 0;
            switch (v)
            {
                case double x: return (int)x;
                case long l: return (int)l;
                case int n: return n;
                default: return int.TryParse(v.ToString(), out var p) ? p : 0;
            }
        }
    }
}

using System.Collections.Generic;
using System.Globalization;

namespace FootballQuest.Core.Content
{
    /// <summary>
    /// يفك القيم المكتوبة في Firestore REST (stringValue، وintegerValue، وmapValue...) إلى شكل MiniJson.
    /// يُستخدم مع محاكي Firestore في وضع التطوير بدون SDK.
    /// </summary>
    public static class FirestoreRest
    {
        /// <summary>مستند REST كامل ({name, fields}) ← قاموس الحقول.</summary>
        public static IDictionary<string, object> DecodeDocument(object restDocument)
        {
            if (!(restDocument is IDictionary<string, object> doc) || !doc.TryGetValue("fields", out var fields)) return null;
            return DecodeFields(fields);
        }

        public static IDictionary<string, object> DecodeFields(object fields)
        {
            var result = new Dictionary<string, object>();
            if (fields is IDictionary<string, object> map)
            {
                foreach (var kv in map) result[kv.Key] = DecodeValue(kv.Value);
            }
            return result;
        }

        public static object DecodeValue(object value)
        {
            if (!(value is IDictionary<string, object> typed)) return null;
            foreach (var kv in typed)
            {
                switch (kv.Key)
                {
                    case "stringValue":
                    case "timestampValue":
                    case "referenceValue":
                        return kv.Value as string;
                    case "integerValue":
                        return double.Parse(kv.Value.ToString(), CultureInfo.InvariantCulture);
                    case "doubleValue":
                        return System.Convert.ToDouble(kv.Value, CultureInfo.InvariantCulture);
                    case "booleanValue":
                        return kv.Value is bool b && b;
                    case "nullValue":
                        return null;
                    case "mapValue":
                        return DecodeFields(kv.Value is IDictionary<string, object> m && m.TryGetValue("fields", out var f) ? f : null);
                    case "arrayValue":
                        var list = new List<object>();
                        if (kv.Value is IDictionary<string, object> a && a.TryGetValue("values", out var values) && values is IList<object> items)
                        {
                            foreach (var item in items) list.Add(DecodeValue(item));
                        }
                        return list;
                }
            }
            return null;
        }
    }
}

using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace FootballQuest.Core.Backend
{
    /// <summary>
    /// JSON بسيط بدون اعتماد على UnityEngine: يحوّل إلى Dictionary&lt;string, object&gt; وList&lt;object&gt;
    /// وdouble وbool وstring وnull — نفس الشكل اللي يرجعه Firebase Functions SDK لنتيجة Callable،
    /// فطبقة AccountApi تتعامل مع الاثنين بنفس الكود.
    /// </summary>
    public static class MiniJson
    {
        public static object Parse(string json)
        {
            if (json == null) throw new ArgumentNullException(nameof(json));
            var p = new Parser(json);
            var value = p.ParseValue();
            p.SkipWhitespace();
            if (!p.AtEnd) throw new FormatException("trailing characters at " + p.Position);
            return value;
        }

        public static string Serialize(object value)
        {
            var sb = new StringBuilder();
            Write(sb, value);
            return sb.ToString();
        }

        private static void Write(StringBuilder sb, object value)
        {
            switch (value)
            {
                case null:
                    sb.Append("null");
                    break;
                case string s:
                    WriteString(sb, s);
                    break;
                case bool b:
                    sb.Append(b ? "true" : "false");
                    break;
                case IDictionary dict:
                    sb.Append('{');
                    var first = true;
                    foreach (DictionaryEntry e in dict)
                    {
                        if (!first) sb.Append(',');
                        first = false;
                        WriteString(sb, Convert.ToString(e.Key, CultureInfo.InvariantCulture));
                        sb.Append(':');
                        Write(sb, e.Value);
                    }
                    sb.Append('}');
                    break;
                case IEnumerable list:
                    sb.Append('[');
                    var firstItem = true;
                    foreach (var item in list)
                    {
                        if (!firstItem) sb.Append(',');
                        firstItem = false;
                        Write(sb, item);
                    }
                    sb.Append(']');
                    break;
                case double d:
                    sb.Append(d.ToString("R", CultureInfo.InvariantCulture));
                    break;
                case float f:
                    sb.Append(((double)f).ToString("R", CultureInfo.InvariantCulture));
                    break;
                case IFormattable num:
                    sb.Append(num.ToString(null, CultureInfo.InvariantCulture));
                    break;
                default:
                    WriteString(sb, value.ToString());
                    break;
            }
        }

        private static void WriteString(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (var c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }

        private sealed class Parser
        {
            private readonly string s;
            private int i;

            public Parser(string s) { this.s = s; }

            public int Position => i;
            public bool AtEnd => i >= s.Length;

            public void SkipWhitespace()
            {
                while (i < s.Length && char.IsWhiteSpace(s[i])) i++;
            }

            public object ParseValue()
            {
                SkipWhitespace();
                if (AtEnd) throw new FormatException("unexpected end");
                var c = s[i];
                if (c == '{') return ParseObject();
                if (c == '[') return ParseArray();
                if (c == '"') return ParseString();
                if (c == 't') return Literal("true", true);
                if (c == 'f') return Literal("false", false);
                if (c == 'n') return Literal("null", null);
                return ParseNumber();
            }

            private object Literal(string word, object value)
            {
                if (string.CompareOrdinal(s, i, word, 0, word.Length) != 0) throw new FormatException("bad literal at " + i);
                i += word.Length;
                return value;
            }

            private Dictionary<string, object> ParseObject()
            {
                var result = new Dictionary<string, object>();
                i++;
                SkipWhitespace();
                if (Peek('}')) { i++; return result; }
                while (true)
                {
                    SkipWhitespace();
                    var key = ParseString();
                    SkipWhitespace();
                    Expect(':');
                    result[key] = ParseValue();
                    SkipWhitespace();
                    if (Peek(',')) { i++; continue; }
                    Expect('}');
                    return result;
                }
            }

            private List<object> ParseArray()
            {
                var result = new List<object>();
                i++;
                SkipWhitespace();
                if (Peek(']')) { i++; return result; }
                while (true)
                {
                    result.Add(ParseValue());
                    SkipWhitespace();
                    if (Peek(',')) { i++; continue; }
                    Expect(']');
                    return result;
                }
            }

            private string ParseString()
            {
                Expect('"');
                var sb = new StringBuilder();
                while (true)
                {
                    if (AtEnd) throw new FormatException("unterminated string");
                    var c = s[i++];
                    if (c == '"') return sb.ToString();
                    if (c != '\\') { sb.Append(c); continue; }
                    if (AtEnd) throw new FormatException("bad escape");
                    var e = s[i++];
                    switch (e)
                    {
                        case '"': sb.Append('"'); break;
                        case '\\': sb.Append('\\'); break;
                        case '/': sb.Append('/'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'n': sb.Append('\n'); break;
                        case 'r': sb.Append('\r'); break;
                        case 't': sb.Append('\t'); break;
                        case 'u':
                            if (i + 4 > s.Length) throw new FormatException("bad unicode escape");
                            sb.Append((char)int.Parse(s.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            i += 4;
                            break;
                        default: throw new FormatException("bad escape \\" + e);
                    }
                }
            }

            private double ParseNumber()
            {
                var start = i;
                while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
                if (start == i) throw new FormatException("unexpected character '" + s[start] + "' at " + start);
                return double.Parse(s.Substring(start, i - start), NumberStyles.Float, CultureInfo.InvariantCulture);
            }

            private bool Peek(char c) => i < s.Length && s[i] == c;

            private void Expect(char c)
            {
                if (!Peek(c)) throw new FormatException("expected '" + c + "' at " + i);
                i++;
            }
        }
    }
}

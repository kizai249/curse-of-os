using System;
using System.Collections.Generic;
using System.IO;

namespace FootballQuest.Tools.FontCoverage
{
    /// <summary>قارئ بسيط لجدول cmap في ملفات TrueType (الصيغ 4 و12) — لاختبار تغطية الخط فقط.</summary>
    public static class FontCmap
    {
        public static HashSet<int> Read(string path)
        {
            var data = File.ReadAllBytes(path);
            var numTables = U16(data, 4);
            for (var t = 0; t < numTables; t++)
            {
                var rec = 12 + t * 16;
                var tag = System.Text.Encoding.ASCII.GetString(data, rec, 4);
                if (tag != "cmap") continue;
                var cmap = (int)U32(data, rec + 8);
                return ReadCmap(data, cmap);
            }
            throw new InvalidDataException("no cmap table in " + path);
        }

        private static HashSet<int> ReadCmap(byte[] d, int cmap)
        {
            var result = new HashSet<int>();
            var count = U16(d, cmap + 2);
            for (var i = 0; i < count; i++)
            {
                var sub = cmap + (int)U32(d, cmap + 4 + i * 8 + 4);
                var format = U16(d, sub);
                if (format == 4) ReadFormat4(d, sub, result);
                else if (format == 12) ReadFormat12(d, sub, result);
            }
            return result;
        }

        private static void ReadFormat4(byte[] d, int sub, HashSet<int> result)
        {
            var segX2 = U16(d, sub + 6);
            var ends = sub + 14;
            var starts = ends + segX2 + 2;
            var deltas = starts + segX2;
            var offsets = deltas + segX2;
            for (var s = 0; s < segX2 / 2; s++)
            {
                int end = U16(d, ends + s * 2), start = U16(d, starts + s * 2);
                int delta = (short)U16(d, deltas + s * 2), rangeOffset = U16(d, offsets + s * 2);
                for (var c = start; c <= end && c != 0xFFFF; c++)
                {
                    int glyph;
                    if (rangeOffset == 0) glyph = (c + delta) & 0xFFFF;
                    else
                    {
                        var addr = offsets + s * 2 + rangeOffset + (c - start) * 2;
                        glyph = U16(d, addr);
                        if (glyph != 0) glyph = (glyph + delta) & 0xFFFF;
                    }
                    if (glyph != 0) result.Add(c);
                }
            }
        }

        private static void ReadFormat12(byte[] d, int sub, HashSet<int> result)
        {
            var groups = (int)U32(d, sub + 12);
            for (var g = 0; g < groups; g++)
            {
                var rec = sub + 16 + g * 12;
                long start = U32(d, rec), end = U32(d, rec + 4);
                for (var c = start; c <= end; c++) result.Add((int)c);
            }
        }

        private static int U16(byte[] d, int o) => (d[o] << 8) | d[o + 1];

        private static uint U32(byte[] d, int o) => (uint)((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]);
    }
}

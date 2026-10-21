using System;

namespace FootballQuest.Core.Backend
{
    /// <summary>مقارنة الإصدارات لـ `min_app_version` (FORCE_UPDATE). تقبل «1.2» و«1.2.3» وتتجاهل لاحقة «-beta».</summary>
    public readonly struct AppVersion : IComparable<AppVersion>
    {
        public AppVersion(int major, int minor, int patch)
        {
            Major = major;
            Minor = minor;
            Patch = patch;
        }

        public int Major { get; }
        public int Minor { get; }
        public int Patch { get; }

        public static bool TryParse(string text, out AppVersion version)
        {
            version = default;
            if (string.IsNullOrWhiteSpace(text)) return false;
            var core = text.Trim();
            var dash = core.IndexOfAny(new[] { '-', '+' });
            if (dash >= 0) core = core.Substring(0, dash);
            var parts = core.Split('.');
            if (parts.Length < 1 || parts.Length > 3) return false;
            var nums = new int[3];
            for (var i = 0; i < parts.Length; i++)
            {
                if (!int.TryParse(parts[i], out nums[i]) || nums[i] < 0) return false;
            }
            version = new AppVersion(nums[0], nums[1], nums[2]);
            return true;
        }

        /// <summary>true إذا الإصدار الحالي أقل من الحد الأدنى. أي قيمة غير صالحة ما تفرض تحديث.</summary>
        public static bool RequiresUpdate(string current, string minimum) =>
            TryParse(current, out var c) && TryParse(minimum, out var m) && c.CompareTo(m) < 0;

        public int CompareTo(AppVersion other)
        {
            if (Major != other.Major) return Major.CompareTo(other.Major);
            if (Minor != other.Minor) return Minor.CompareTo(other.Minor);
            return Patch.CompareTo(other.Patch);
        }

        public override string ToString() => Major + "." + Minor + "." + Patch;
    }
}

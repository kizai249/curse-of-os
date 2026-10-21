using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;

namespace FootballQuest.App.Services
{
    /// <summary>Remote Config بالقيم الافتراضية فقط (وضع المحاكي، أو قبل أول جلب ناجح).</summary>
    public sealed class LocalRemoteConfig : IRemoteConfig
    {
        private readonly Dictionary<string, string> values = new Dictionary<string, string>(RemoteConfigKeys.Defaults);

        public Task FetchAsync() => Task.CompletedTask;

        public string GetString(string key) => values.TryGetValue(key, out var v) ? v : string.Empty;

        public bool GetBool(string key) => GetString(key) == "true";

        /// <summary>للتجربة المحلية فقط (مثل فرض التحديث).</summary>
        public void Override(string key, string value) => values[key] = value;
    }
}

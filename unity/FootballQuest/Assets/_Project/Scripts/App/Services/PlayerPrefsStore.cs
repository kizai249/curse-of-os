using FootballQuest.Core.Accounts;
using UnityEngine;

namespace FootballQuest.App.Services
{
    /// <summary>تخزين محلي غير حساس فوق PlayerPrefs.</summary>
    public sealed class PlayerPrefsStore : ILocalStore
    {
        public bool GetBool(string key, bool fallback = false) => PlayerPrefs.GetInt(key, fallback ? 1 : 0) == 1;

        public void SetBool(string key, bool value)
        {
            PlayerPrefs.SetInt(key, value ? 1 : 0);
            PlayerPrefs.Save();
        }

        public string GetString(string key, string fallback = null) => PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : fallback;

        public void SetString(string key, string value)
        {
            if (value == null) PlayerPrefs.DeleteKey(key);
            else PlayerPrefs.SetString(key, value);
            PlayerPrefs.Save();
        }
    }
}

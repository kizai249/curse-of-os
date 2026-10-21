using FootballQuest.Core.Coupons;
using UnityEngine;
#if UNITY_IOS && !UNITY_EDITOR
using System.Runtime.InteropServices;
#endif

namespace FootballQuest.App.Platform
{
    /// <summary>تخزين آمن: Keychain (iOS)، وEncryptedSharedPreferences (Android)، وPlayerPrefs في Editor للتطوير فقط.</summary>
    public static class SecureStore
    {
        public static ISecureStore Create()
        {
#if UNITY_EDITOR
            return new EditorSecureStore();
#elif UNITY_ANDROID
            return new AndroidSecureStore();
#elif UNITY_IOS
            return new IosSecureStore();
#else
            return new EditorSecureStore();
#endif
        }
    }

    /// <summary>Editor فقط — مو آمن، للتطوير.</summary>
    public sealed class EditorSecureStore : ISecureStore
    {
        public string Get(string key) => PlayerPrefs.HasKey("dev." + key) ? PlayerPrefs.GetString("dev." + key) : null;
        public void Set(string key, string value) { PlayerPrefs.SetString("dev." + key, value); PlayerPrefs.Save(); }
        public void Delete(string key) => PlayerPrefs.DeleteKey("dev." + key);
    }

#if UNITY_ANDROID && !UNITY_EDITOR
    public sealed class AndroidSecureStore : ISecureStore
    {
        private const string Class = "com.usersx.footballquest.platform.FQSecureStore";

        private static T Call<T>(string method, params object[] args)
        {
            using (var unity = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var activity = unity.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var store = new AndroidJavaClass(Class))
            {
                var all = new object[args.Length + 1];
                all[0] = activity;
                args.CopyTo(all, 1);
                return store.CallStatic<T>(method, all);
            }
        }

        public string Get(string key) => Call<string>("get", key);
        public void Set(string key, string value) => Call<bool>("set", key, value);

        public void Delete(string key)
        {
            using (var unity = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var activity = unity.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var store = new AndroidJavaClass(Class))
            {
                store.CallStatic("delete", activity, key);
            }
        }
    }
#endif

#if UNITY_IOS && !UNITY_EDITOR
    public sealed class IosSecureStore : ISecureStore
    {
        [DllImport("__Internal")] private static extern string FQ_SecureGet(string key);
        [DllImport("__Internal")] private static extern bool FQ_SecureSet(string key, string value);
        [DllImport("__Internal")] private static extern void FQ_SecureDelete(string key);

        public string Get(string key) => FQ_SecureGet(key);
        public void Set(string key, string value) => FQ_SecureSet(key, value);
        public void Delete(string key) => FQ_SecureDelete(key);
    }
#endif
}

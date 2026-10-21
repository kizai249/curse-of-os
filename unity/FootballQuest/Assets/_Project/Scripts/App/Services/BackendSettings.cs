using UnityEngine;

namespace FootballQuest.App.Services
{
    /// <summary>
    /// إعدادات وضع المحاكي (Emulator Suite) لما ما يكون Firebase SDK مضاف (بدون FQ_FIREBASE).
    /// المضيف الافتراضي: 10.0.2.2 في محاكي Android، و127.0.0.1 في Editor وiOS Simulator.
    /// يتغيّر بـ PlayerPrefs «fq.emulator_host» (جهاز حقيقي على نفس الشبكة: IP جهاز التطوير).
    /// </summary>
    public static class BackendSettings
    {
        public const string ProjectId = "demo-fq";
        public const string Region = "me-central2";
        public const int AuthPort = 9099;
        public const int FunctionsPort = 5001;
        public const int FirestorePort = 8080;
        public const string HostPrefKey = "fq.emulator_host";

        public static string EmulatorHost
        {
            get
            {
                var custom = PlayerPrefs.GetString(HostPrefKey, string.Empty);
                if (!string.IsNullOrEmpty(custom)) return custom;
                return Application.platform == RuntimePlatform.Android ? "10.0.2.2" : "127.0.0.1";
            }
        }

        public static string AuthBaseUrl => $"http://{EmulatorHost}:{AuthPort}";

        public static string FirestoreDocumentUrl(string path) =>
            $"http://{EmulatorHost}:{FirestorePort}/v1/projects/{ProjectId}/databases/(default)/documents/{path}";

        public static string FirestoreRunQueryUrl =>
            $"http://{EmulatorHost}:{FirestorePort}/v1/projects/{ProjectId}/databases/(default)/documents:runQuery";

        public static string FunctionUrl(string name) => $"http://{EmulatorHost}:{FunctionsPort}/{ProjectId}/{Region}/{name}";
    }
}

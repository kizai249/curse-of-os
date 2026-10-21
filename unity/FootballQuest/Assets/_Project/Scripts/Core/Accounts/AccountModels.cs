namespace FootballQuest.Core.Accounts
{
    /// <summary>ملف اللاعب كما يرجعه `bootstrap` — للعرض فقط؛ الخادم هو المرجع.</summary>
    public sealed class PlayerProfile
    {
        public string AgeBand;
        public string City;
        public string DisplayName;
        public string CityChangedAt;
        public string AuthProvider;
        public int Level;
        public int Xp;
        public int FanPoints;
        public int Packs;

        public bool IsMinor => AgeBand == "15_17";
        public bool IsGuest => AuthProvider == "anonymous";
    }

    public enum BootstrapStatus
    {
        NeedsOnboarding,
        DeletionPending,
        Ok,
    }

    public sealed class BootstrapResult
    {
        public BootstrapStatus Status;
        public PlayerProfile Profile;
        public string ServerTime;
        public string GameDay;
    }

    public sealed class SetAgeAndCityResult
    {
        public bool Under15;
        public PlayerProfile Profile;
    }

    public enum LinkProvider
    {
        Apple,
        Google,
    }
}

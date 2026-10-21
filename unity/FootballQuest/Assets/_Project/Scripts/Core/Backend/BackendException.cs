using System;
using System.Collections.Generic;

namespace FootballQuest.Core.Backend
{
    /// <summary>
    /// خطأ من Cloud Function أو من الشبكة. `Status` بصيغة رموز Callable (مثل FAILED_PRECONDITION)
    /// أو `NETWORK` لما ما يوصل الطلب. `StateId` من `details.stateId` اللي يرسلها الخادم.
    /// </summary>
    public sealed class BackendException : Exception
    {
        public const string NetworkStatus = "NETWORK";

        public BackendException(string status, string message, IDictionary<string, string> details = null)
            : base(status + ": " + message)
        {
            Status = status ?? "UNKNOWN";
            ServerMessage = message ?? string.Empty;
            Details = details ?? new Dictionary<string, string>();
        }

        public string Status { get; }
        public string ServerMessage { get; }
        public IDictionary<string, string> Details { get; }

        public string StateId => Details.TryGetValue("stateId", out var id) ? id : ServerMessage;

        public static BackendException Network(string message) => new BackendException(NetworkStatus, message);
    }
}

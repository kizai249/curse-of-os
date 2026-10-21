using System.Text;
using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using UnityEngine.Networking;

namespace FootballQuest.App.Services
{
    /// <summary>طلبات HTTP بـ async/await فوق UnityWebRequest (للمحاكي فقط).</summary>
    public static class UnityHttp
    {
        public const int TimeoutSeconds = 15;

        public sealed class Response
        {
            public long Status;
            public string Body;
        }

        public static Task<Response> PostJsonAsync(string url, string json, string bearer = null)
        {
            var request = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json ?? "{}")),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = TimeoutSeconds,
            };
            request.SetRequestHeader("Content-Type", "application/json");
            return SendAsync(request, bearer);
        }

        public static Task<Response> GetAsync(string url, string bearer = null)
        {
            var request = new UnityWebRequest(url, UnityWebRequest.kHttpVerbGET)
            {
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = TimeoutSeconds,
            };
            return SendAsync(request, bearer);
        }

        private static Task<Response> SendAsync(UnityWebRequest request, string bearer)
        {
            if (!string.IsNullOrEmpty(bearer)) request.SetRequestHeader("Authorization", "Bearer " + bearer);

            var tcs = new TaskCompletionSource<Response>();
            request.SendWebRequest().completed += _ =>
            {
                if (request.result == UnityWebRequest.Result.ConnectionError)
                {
                    tcs.SetException(BackendException.Network(request.error));
                }
                else
                {
                    tcs.SetResult(new Response { Status = request.responseCode, Body = request.downloadHandler.text });
                }
                request.Dispose();
            };
            return tcs.Task;
        }
    }
}

using System.Threading.Tasks;
using FootballQuest.Core.Backend;
using FootballQuest.Core.Content;
using FootballQuest.Core.Coop;

namespace FootballQuest.App.Services
{
    /// <summary>غرفة «منتخبنا يجمعنا» من محاكي Firestore (REST). الشاشة تطلبها كل ثانية (CoopRules.PollSeconds).</summary>
    public sealed class EmulatorRoomFeed : IRoomFeed
    {
        private readonly EmulatorAuthGateway auth;

        public EmulatorRoomFeed(EmulatorAuthGateway auth)
        {
            this.auth = auth;
        }

        public async Task<RoomState> GetRoomAsync(string roomId)
        {
            var doc = await Get($"rooms/{roomId}");
            return doc == null ? null : RoomState.Parse(roomId, doc);
        }

        public async Task<RoomView> GetViewAsync(string roomId, string uid)
        {
            var doc = await Get($"rooms/{roomId}/views/{uid}");
            return doc == null ? null : RoomView.Parse(doc);
        }

        public void Stop()
        {
        }

        private async Task<object> Get(string path)
        {
            var token = await auth.GetIdTokenAsync();
            var res = await UnityHttp.GetAsync(BackendSettings.FirestoreDocumentUrl(path), token);
            if (res.Status == 404) return null;
            if (res.Status != 200) throw new BackendException(res.Status == 403 ? "PERMISSION_DENIED" : "UNAVAILABLE", "firestore " + res.Status);
            return FirestoreRest.DecodeDocument(MiniJson.Parse(res.Body));
        }
    }
}

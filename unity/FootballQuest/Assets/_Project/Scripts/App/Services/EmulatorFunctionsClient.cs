using System.Collections.Generic;
using System.Threading.Tasks;
using FootballQuest.Core.Accounts;
using FootballQuest.Core.Backend;

namespace FootballQuest.App.Services
{
    /// <summary>استدعاء Callable عبر HTTP لمحاكي Functions — نفس بروتوكول Firebase SDK ({data} → {result}|{error}).</summary>
    public sealed class EmulatorFunctionsClient : IFunctionsClient
    {
        private readonly EmulatorAuthGateway auth;

        public EmulatorFunctionsClient(EmulatorAuthGateway auth)
        {
            this.auth = auth;
        }

        public async Task<object> CallAsync(string name, IDictionary<string, object> data)
        {
            var token = await auth.GetIdTokenAsync();
            var payload = MiniJson.Serialize(new Dictionary<string, object> { { "data", data } });
            var res = await UnityHttp.PostJsonAsync(BackendSettings.FunctionUrl(name), payload, token);

            object body;
            try
            {
                body = MiniJson.Parse(res.Body ?? string.Empty);
            }
            catch (System.FormatException)
            {
                throw new BackendException(res.Status >= 500 ? "UNAVAILABLE" : "UNKNOWN", "bad response " + res.Status);
            }

            var error = JsonFields.Obj(body, "error");
            if (error != null) throw AccountApi.ParseError(error);
            if (res.Status != 200) throw new BackendException(res.Status >= 500 ? "UNAVAILABLE" : "UNKNOWN", "HTTP " + res.Status);
            return body is IDictionary<string, object> d && d.TryGetValue("result", out var result) ? result : null;
        }
    }
}

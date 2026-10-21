using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FootballQuest.Core.Analytics;
using FootballQuest.Core.Backend;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class EventQueueTests
    {
        [Test]
        public async Task BatchesKeepIdsAcrossFailuresAndCarryNoCoordinates()
        {
            var functions = new FakeFunctions { Fail = true };
            var queue = new EventQueue(functions, "ios", "1.0.0");
            queue.BranchNearbyShown("br_a", "brand_a", 250, "26-50", 2);
            Assert.That(await queue.FlushAsync(), Is.False);
            Assert.That(queue.Count, Is.EqualTo(1));
            var firstId = functions.LastEventIds.Single();

            functions.Fail = false;
            Assert.That(await queue.FlushAsync(), Is.True);
            Assert.That(queue.Count, Is.EqualTo(0));
            Assert.That(functions.LastEventIds.Single(), Is.EqualTo(firstId), "retry reuses the event id");
            var json = MiniJson.Serialize(functions.LastPayload);
            Assert.That(json, Does.Contain("\"name\":\"branch_nearby_shown\"").And.Contain("\"accuracyBand\":\"26-50\"").And.Contain("\"platform\":\"ios\""));
            Assert.That(json, Does.Not.Contain("\"lat\"").And.Not.Contain("\"lng\"").And.Not.Contain("latitude"));
            Assert.That(functions.LastFunction, Is.EqualTo("logEvents"));
        }

        [Test]
        public async Task SendsAtMost50PerCall()
        {
            var functions = new FakeFunctions();
            var queue = new EventQueue(functions, "android", "1.0.0");
            for (var i = 0; i < 120; i++) queue.BranchNearbyShown("br", "b", 250, "<=25", 0);
            await queue.FlushAsync();
            Assert.That(functions.LastEventIds.Count, Is.EqualTo(EventQueue.MaxBatch));
            Assert.That(queue.Count, Is.EqualTo(70));
            for (var i = 0; i < 500; i++) queue.BranchNearbyShown("br", "b", 250, "<=25", 0);
            Assert.That(queue.Count, Is.EqualTo(EventQueue.MaxQueued), "bounded memory");
        }

        private sealed class FakeFunctions : IFunctionsClient
        {
            public bool Fail;
            public string LastFunction;
            public IDictionary<string, object> LastPayload;
            public List<string> LastEventIds = new List<string>();

            public Task<object> CallAsync(string name, IDictionary<string, object> data)
            {
                LastFunction = name;
                LastPayload = data;
                LastEventIds = ((List<object>)data["events"]).Cast<Dictionary<string, object>>().Select(e => (string)e["eventId"]).ToList();
                if (Fail) throw new BackendException("UNAVAILABLE", "down");
                return Task.FromResult<object>(new Dictionary<string, object> { { "accepted", 1.0 } });
            }
        }
    }
}

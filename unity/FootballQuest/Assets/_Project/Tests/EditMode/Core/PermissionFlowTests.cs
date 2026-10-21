using FootballQuest.Core.Permissions;
using FootballQuest.Core.Ui;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class PermissionFlowTests
    {
        [Test]
        public void FirstFieldFeatureShowsThePrePromptNotTheSystemDialog()
        {
            var flow = new PermissionFlow(PermissionKind.Location);
            var d = flow.OnFeatureRequested(PermissionStatus.NotDetermined);
            Assert.That(d.Action, Is.EqualTo(PermissionAction.ShowPrePrompt));
            Assert.That(d.StateId, Is.EqualTo(StateCatalog.PermLocPre));
        }

        [Test]
        public void AllowLeadsToTheSystemRequest()
        {
            var flow = new PermissionFlow(PermissionKind.Location);
            flow.OnFeatureRequested(PermissionStatus.NotDetermined);
            Assert.That(flow.OnPrePromptAnswered(true).Action, Is.EqualTo(PermissionAction.RequestSystem));
            Assert.That(flow.OnSystemResult(PermissionStatus.Granted).Action, Is.EqualTo(PermissionAction.Proceed));
        }

        [Test]
        public void NotNowNeverAsksTheSystemAgainThisSession()
        {
            var flow = new PermissionFlow(PermissionKind.Location);
            flow.OnFeatureRequested(PermissionStatus.NotDetermined);
            Assert.That(flow.OnPrePromptAnswered(false).Action, Is.EqualTo(PermissionAction.SkipSilently));
            for (var i = 0; i < 3; i++)
            {
                Assert.That(flow.OnFeatureRequested(PermissionStatus.NotDetermined).Action, Is.EqualTo(PermissionAction.SkipSilently));
            }
            Assert.That(new PermissionFlow(PermissionKind.Location).OnFeatureRequested(PermissionStatus.NotDetermined).Action,
                Is.EqualTo(PermissionAction.ShowPrePrompt), "a new session asks again");
        }

        [Test]
        public void DeniedShowsTheInlineStateWithoutReRequesting()
        {
            var flow = new PermissionFlow(PermissionKind.Location);
            var d = flow.OnFeatureRequested(PermissionStatus.Denied);
            Assert.That(d.Action, Is.EqualTo(PermissionAction.ShowState));
            Assert.That(d.StateId, Is.EqualTo(StateCatalog.LocDenied));
            Assert.That(PermissionFlow.PassiveStateFor(PermissionKind.Location, PermissionStatus.Denied), Is.EqualTo(StateCatalog.LocDenied));
        }

        [Test]
        public void SystemDenialAfterAllowShowsLocDenied()
        {
            var flow = new PermissionFlow(PermissionKind.Location);
            flow.OnPrePromptAnswered(true);
            Assert.That(flow.OnSystemResult(PermissionStatus.Denied).StateId, Is.EqualTo(StateCatalog.LocDenied));
        }

        [Test]
        public void ApproximateAndRestrictedLocation()
        {
            var flow = new PermissionFlow(PermissionKind.Location);
            Assert.That(flow.OnFeatureRequested(PermissionStatus.GrantedApproximate).StateId, Is.EqualTo(StateCatalog.LocApproxOnly));
            Assert.That(flow.OnFeatureRequested(PermissionStatus.Restricted).StateId, Is.EqualTo(StateCatalog.LocRestricted));
            Assert.That(PermissionFlow.PassiveStateFor(PermissionKind.Location, PermissionStatus.Restricted), Is.EqualTo(StateCatalog.LocRestricted));
            Assert.That(PermissionFlow.PassiveStateFor(PermissionKind.Location, PermissionStatus.Granted), Is.Null);
        }

        [Test]
        public void CameraUsesItsOwnStates()
        {
            var flow = new PermissionFlow(PermissionKind.Camera);
            Assert.That(flow.OnFeatureRequested(PermissionStatus.NotDetermined).StateId, Is.EqualTo(StateCatalog.PermCamPre));
            Assert.That(flow.OnFeatureRequested(PermissionStatus.Denied).StateId, Is.EqualTo(StateCatalog.CamDenied));
            Assert.That(PermissionFlow.PassiveStateFor(PermissionKind.Camera, PermissionStatus.Denied), Is.Null);
        }

        [Test]
        public void DismissedSystemDialogCountsAsNotNow()
        {
            var flow = new PermissionFlow(PermissionKind.Camera);
            flow.OnPrePromptAnswered(true);
            Assert.That(flow.OnSystemResult(PermissionStatus.NotDetermined).Action, Is.EqualTo(PermissionAction.SkipSilently));
            Assert.That(flow.DeclinedThisSession, Is.True);
        }
    }
}

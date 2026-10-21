using System.Linq;
using FootballQuest.Core;
using NUnit.Framework;

namespace FootballQuest.Tests.Core
{
    public class ContractsTests
    {
        [Test]
        public void HasTwentyFourUniqueTeams()
        {
            Assert.That(TeamCodes.All.Count, Is.EqualTo(24));
            Assert.That(TeamCodes.All.Distinct().Count(), Is.EqualTo(24));
            Assert.That(TeamCodes.All.All(c => c.Length == 3 && c.ToUpperInvariant() == c), Is.True);
        }

        [Test]
        public void ValidatesTeamCodes()
        {
            Assert.That(TeamCodes.IsValid("KSA"), Is.True);
            Assert.That(TeamCodes.IsValid("ksa"), Is.False);
            Assert.That(TeamCodes.IsValid("BRA"), Is.False);
            Assert.That(TeamCodes.IsValid(null), Is.False);
        }

        [Test]
        public void HasThreeHostCities()
        {
            Assert.That(CityCodes.All, Is.EqualTo(new[] { "RUH", "JED", "KHB" }));
        }
    }
}

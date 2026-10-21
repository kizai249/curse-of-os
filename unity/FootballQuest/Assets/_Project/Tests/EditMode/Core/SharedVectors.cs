using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;

namespace FootballQuest.Tests.Core
{
    /// <summary>
    /// يقرأ متجهات shared/contracts المشتركة مع اختبارات الخادم. بدون مكتبة JSON عشان يشتغل
    /// داخل Unity وفي tools/core-tests (dotnet) بنفس الكود.
    /// </summary>
    internal static class SharedVectors
    {
        public static string ContractsDir()
        {
            var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (dir != null)
            {
                var candidate = Path.Combine(dir.FullName, "shared", "contracts");
                if (Directory.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }
            throw new DirectoryNotFoundException("shared/contracts not found above " + Directory.GetCurrentDirectory());
        }

        public static IEnumerable<GameDayVector> GameDay()
        {
            var json = File.ReadAllText(Path.Combine(ContractsDir(), "game-day.vectors.json"));
            var pattern = new Regex("\"instant\":\\s*\"([^\"]+)\",\\s*\"day\":\\s*\"([^\"]+)\",\\s*\"nextRollover\":\\s*\"([^\"]+)\"");
            foreach (Match m in pattern.Matches(json))
            {
                yield return new GameDayVector(m.Groups[1].Value, m.Groups[2].Value, m.Groups[3].Value);
            }
        }

        public static IEnumerable<AgeVector> AgeBand()
        {
            var json = File.ReadAllText(Path.Combine(ContractsDir(), "age-band.vectors.json"));
            var pattern = new Regex("\"instant\":\\s*\"([^\"]+)\",\\s*\"birthYear\":\\s*(\\d+),\\s*\"band\":\\s*\"([^\"]+)\"");
            foreach (Match m in pattern.Matches(json))
            {
                yield return new AgeVector(m.Groups[1].Value, int.Parse(m.Groups[2].Value), m.Groups[3].Value);
            }
        }

        public static string Sample(string name) => File.ReadAllText(Path.Combine(ContractsDir(), "samples", name + ".json"));
    }

    public sealed class AgeVector
    {
        public AgeVector(string instant, int birthYear, string band)
        {
            Instant = instant;
            BirthYear = birthYear;
            Band = band;
        }

        public string Instant { get; }
        public int BirthYear { get; }
        public string Band { get; }

        public override string ToString() => BirthYear + "@" + Instant;
    }

    public sealed class GameDayVector
    {
        public GameDayVector(string instant, string day, string nextRollover)
        {
            Instant = instant;
            Day = day;
            NextRollover = nextRollover;
        }

        public string Instant { get; }
        public string Day { get; }
        public string NextRollover { get; }

        public override string ToString() => Instant;
    }
}

import { ACHIEVEMENTS, GROUP_ACHIEVEMENT_PREFIX } from "./rules.js";

export interface AchievementReward {
  id: string;
  packs: number;
  epicPacks: number;
  xp: number;
  badge?: string;
}

/**
 * إنجازات المجموعة — GAME_RULES §3.5. تُحسب على المنتخبات المملوكة (أي نسخة)، وكل إنجاز مرة وحدة.
 * المجموعات (A–F) مستنتجة من مباريات دور المجموعات في الجدول، فما تُمنح إلا بعد إدخال الجدول من اللوحة.
 */
export function newAchievements(
  ownedTeams: ReadonlySet<string>,
  achieved: ReadonlySet<string>,
  groups: ReadonlyMap<string, ReadonlySet<string>>,
): AchievementReward[] {
  const rewards: AchievementReward[] = [];
  for (const a of [ACHIEVEMENTS.teams6, ACHIEVEMENTS.teams12, ACHIEVEMENTS.teams24]) {
    if (!achieved.has(a.id) && ownedTeams.size >= a.teams) {
      rewards.push({ id: a.id, packs: a.packs, epicPacks: 0, xp: a.xp, ...("badge" in a ? { badge: a.badge } : {}) });
    }
  }
  for (const [group, members] of [...groups.entries()].sort()) {
    const id = GROUP_ACHIEVEMENT_PREFIX + group;
    if (achieved.has(id) || members.size !== 4) continue;
    if ([...members].every((t) => ownedTeams.has(t))) rewards.push({ id, packs: 0, epicPacks: 1, xp: 0 });
  }
  return rewards;
}

/** يستنتج أعضاء كل مجموعة من مباريات دور المجموعات (home/away برموز منتخبات). */
export function groupsFromSchedule(
  matches: ReadonlyArray<{ stage: string; group: string | null; home: string; away: string }>,
  teamCodes: ReadonlySet<string>,
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const m of matches) {
    if (m.stage !== "group" || !m.group) continue;
    const set = groups.get(m.group) ?? new Set<string>();
    for (const side of [m.home, m.away]) if (teamCodes.has(side)) set.add(side);
    groups.set(m.group, set);
  }
  return groups;
}

import { getFirestore } from "firebase-admin/firestore";
import { loadTeams } from "../content/catalog.js";
import { groupsFromSchedule } from "./achievements.js";

export interface EconomyContent {
  teams: string[];
  todayTeams: Set<string>;
  groups: Map<string, Set<string>>;
}

/**
 * المحتوى العام اللي يحتاجه السحب: المنتخبات، ومنتخبات اليوم (وزن ×3)، والمجموعات (لإنجاز المجموعة).
 * يُقرأ خارج المعاملة لأنه عام وما يتغير بسبب اللاعب.
 */
export async function loadEconomyContent(day: string): Promise<EconomyContent> {
  const teams = loadTeams().map((t) => t.code);
  const teamSet = new Set(teams);
  const schedule = await getFirestore().doc("content/schedule").get();
  const matches = (schedule.get("matches") as Array<{ stage: string; group: string | null; day: string; home: string; away: string }>) ?? [];
  const todayTeams = new Set<string>();
  for (const m of matches) {
    if (m.day !== day) continue;
    for (const side of [m.home, m.away]) if (teamSet.has(side)) todayTeams.add(side);
  }
  return { teams, todayTeams, groups: groupsFromSchedule(matches, teamSet) };
}

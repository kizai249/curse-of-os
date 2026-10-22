import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CityCode, isCityCode } from "../shared/contracts.js";

export interface TeamContent {
  code: string;
  ar: string;
  en: string;
  host?: boolean;
}

export interface StadiumContent {
  id: string;
  city: CityCode;
  ar: string;
  en: string;
  radiusM: number;
}

/**
 * المحتوى العام من shared/contracts/content (المصدر الوحيد). يُنسخ مع الدوال عند البناء
 * (scripts/copy-content.mjs) عشان يوصل للنشر.
 */
function contentDir(): string {
  const bundled = resolve(__dirname, "../content-data");
  try {
    readFileSync(resolve(bundled, "teams.json"));
    return bundled;
  } catch {
    return resolve(__dirname, "../../../../shared/contracts/content");
  }
}

export function loadTeams(): TeamContent[] {
  const data = JSON.parse(readFileSync(resolve(contentDir(), "teams.json"), "utf8")) as { teams: TeamContent[] };
  return data.teams;
}

export function loadStadiums(): StadiumContent[] {
  const data = JSON.parse(readFileSync(resolve(contentDir(), "stadiums.json"), "utf8")) as { stadiums: StadiumContent[] };
  for (const s of data.stadiums) {
    if (!isCityCode(s.city)) throw new Error(`invalid city for ${s.id}`);
  }
  return data.stadiums;
}

export type Position = "GK" | "DEF" | "MID" | "FWD";
export type StatKey = "spd" | "sho" | "pas" | "def" | "iq";
export const STAT_KEYS: readonly StatKey[] = ["spd", "sho", "pas", "def", "iq"];

export interface PlayerContent {
  id: string;
  ar: string;
  en: string;
  position: Position;
  rarity: "common" | "rare" | "epic" | "legendary";
  stats: Record<StatKey, number>;
}

export interface PlayersContent {
  stats: Record<StatKey, { ar: string; en: string }>;
  positions: Record<Position, { ar: string; en: string }>;
  players: PlayerContent[];
}

/** الشخصيات الافتراضية الثلاثين (GAME_RULES §4) — قطع لغز «منتخبنا يجمعنا» وبطاقات اللاعبين. */
export function loadPlayers(): PlayersContent {
  return JSON.parse(readFileSync(resolve(contentDir(), "players.json"), "utf8")) as PlayersContent;
}

/** «1A» (الأول في المجموعة A)، و«3C»، و«W37» (الفائز من مباراة 37) — أماكن شاغرة قبل تحديد المنتخب. */
export const SLOT_PATTERN = /^([1-3][A-F]|W\d{1,2}|L\d{1,2})$/;

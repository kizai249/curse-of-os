import { METRIC_LABELS } from "./text.js";

export type Cell = number | "<10";
export interface ReportRow {
  day: string;
  brandId: string;
  branchId: string;
  [metric: string]: Cell | string;
}

export const METRICS = Object.keys(METRIC_LABELS);

/** عرض الخانة: الخادم يرسل «<10» للخانات الصغيرة (ARCHITECTURE §8)، ونعرضها «أقل من 10». */
export const cellText = (cell: Cell | string | undefined): string => (cell === "<10" ? "أقل من 10" : String(cell ?? 0));

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV للتصدير (AT-10): نفس الخانات المقنّعة من الخادم، وبدون أي معرّف لاعب أو إحداثيات.
 * BOM لعرض العربي صحيح في Excel.
 */
export function toCsv(rows: ReportRow[], branchName: (id: string) => string): string {
  const header = ["اليوم", "الفرع", ...METRICS.map((m) => METRIC_LABELS[m]!)];
  const lines = [header.map(csvField).join(",")];
  for (const r of rows) {
    lines.push([r.day, branchName(r.branchId), ...METRICS.map((m) => cellText(r[m] as Cell))].map(csvField).join(","));
  }
  return "﻿" + lines.join("\n") + "\n";
}

/** مجموع عمود — الخانات المقنّعة ما تدخل المجموع (ويُعلّم إن المجموع جزئي). */
export function total(rows: ReportRow[], metric: string): { value: number; partial: boolean } {
  let value = 0;
  let partial = false;
  for (const r of rows) {
    const c = r[metric];
    if (c === "<10") partial = true;
    else value += Number(c ?? 0);
  }
  return { value, partial };
}

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { loadStadiums, loadTeams } from "./catalog.js";

/**
 * يكتب المحتوى العام (`content/teams` و`content/stadiums`) من shared/contracts/content.
 * Idempotent. `devSampleMatch` يضيف مثال DATA_CONTRACTS §7 فقط (للمحاكي و fq-dev)، ومعلّم devSample.
 * جدول البطولة الحقيقي يُدخله usersx_admin من لوحة الشركاء (S9) من مصادر منشورة.
 */
export async function seedContent(options: { devSampleMatch?: boolean; now?: Date } = {}): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.fromDate(options.now ?? new Date());
  await db.doc("content/teams").set({ teams: loadTeams(), updatedAt: now });
  await db.doc("content/stadiums").set({ stadiums: loadStadiums(), updatedAt: now });
  if (options.devSampleMatch) {
    await db.doc("matchResults/m01").set({
      matchNo: 1,
      stage: "group",
      group: "A",
      day: "2027-01-07",
      stadiumId: "STD_RUH_KFS",
      home: "KSA",
      away: "PLE",
      status: "scheduled",
      score: null,
      updatedBy: "seed",
      updatedAt: now,
      devSample: true,
    });
  }
}

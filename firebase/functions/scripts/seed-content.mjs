// يكتب المحتوى العام لمشروع Firebase (أو للمحاكي إذا FIRESTORE_EMULATOR_HOST مضبوط).
// الاستخدام: npm run seed:content -- --project fq-dev [--dev-sample-match]
import { initializeApp } from "firebase-admin/app";

const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const projectId = projectIndex >= 0 ? args[projectIndex + 1] : process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error("usage: npm run seed:content -- --project <projectId> [--dev-sample-match]");
  process.exit(2);
}
initializeApp({ projectId });
const { seedContent } = await import("../lib/content/seed.js");
const { rebuildSchedule } = await import("../lib/content/schedule.js");
await seedContent({ devSampleMatch: args.includes("--dev-sample-match") });
const result = await rebuildSchedule();
console.log(`seeded content for ${projectId}; schedule matches=${result.matches} skipped=${result.skipped.length}`);

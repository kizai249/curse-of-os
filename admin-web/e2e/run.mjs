// e2e للوحة الشركاء: يبني الدوال واللوحة (وضع المحاكي)، ثم يشغّل Emulator Suite وينفذ smoke.mjs داخله.
// الاستخدام: npm run e2e   (يحتاج Java 21 وChromium لـ Playwright)
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const firebaseDir = process.env.FQ_FIREBASE_DIR ?? resolve(web, "../firebase");
const functions = resolve(firebaseDir, "functions");
const run = (cmd, cwd, env = {}) => execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...env } });

run("npm run build && node scripts/ensure-dev-secret.mjs", functions);
run("npx vite build", web, { VITE_USE_EMULATOR: "true", VITE_FIREBASE_PROJECT_ID: "demo-fq" });
run(`npx firebase --config ../firebase.json emulators:exec --project demo-fq --only auth,firestore,functions "node ${resolve(here, "smoke.mjs")}"`, functions, {
  FQ_FUNCTIONS_DIR: functions,
});

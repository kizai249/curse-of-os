// يُشغّل داخل emulators:exec. يبذر بيانات عبر Admin SDK والدوال، ثم يقود اللوحة في Chromium.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../dist");
const shots = resolve(here, "screenshots");
mkdirSync(shots, { recursive: true });
const functionsDir = process.env.FQ_FUNCTIONS_DIR;
// نفس نسخة firebase-admin اللي تستخدمها الدوال المبنية (lib/) عشان يكون فيه تطبيق واحد مهيأ.
const requireFromFunctions = createRequire(join(functionsDir, "package.json"));
const { initializeApp } = requireFromFunctions("firebase-admin/app");
const { getAuth } = requireFromFunctions("firebase-admin/auth");
const { getFirestore, Timestamp } = requireFromFunctions("firebase-admin/firestore");
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const FN = "http://127.0.0.1:5001/demo-fq/me-central2";

initializeApp({ projectId: "demo-fq" });
const db = getFirestore();
const auth = getAuth();
const { signBranchCode } = await import(join(functionsDir, "lib/branch/codes.js"));
const { gameDayId } = await import(join(functionsDir, "lib/shared/gameDay.js"));
const { zoneDocument } = await import(join(functionsDir, "lib/location/zones.js"));
const { aggregateDay } = await import(join(functionsDir, "lib/analytics/aggregate.js"));
const secret = readFileSync(join(functionsDir, ".secret.local"), "utf8").match(/BRANCH_CODE_SECRET=(.+)/)[1].trim();

async function call(name, data, token) {
  const res = await fetch(`${FN}/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) });
  const body = await res.json();
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  return body.result;
}
async function anonymous() {
  const res = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=k`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) });
  return (await res.json()).idToken;
}
async function staff(email, claims) {
  const user = await auth.createUser({ email, password: "panel-pass-123" });
  await auth.setCustomUserClaims(user.uid, claims);
}

// ── بذر البيانات ──
await db.doc("brands/brand_demo").set({ name: { ar: "علامة تجريبية", en: "Demo brand" } });
await db.doc("zones/zone_br_br_demo").set(zoneDocument({ type: "branch", refId: "br_demo", lat: 21.55, lng: 39.17, radiusM: 250 }));
await db.doc("branches/br_demo").set({ brandId: "brand_demo", brandName: { ar: "علامة تجريبية", en: "Demo brand" }, name: { ar: "فرع التجربة", en: "Demo branch" }, city: "JED", zoneId: "zone_br_br_demo", active: true });
const now = Date.now();
await db.doc("campaigns/cmp_demo").set({ brandId: "brand_demo", title: { ar: "قهوة اليوم", en: "Coffee" }, terms: { ar: "مشروب واحد", en: "One drink" }, trigger: "verified_visit", perUserLimit: 1,
  startAt: Timestamp.fromMillis(now - 3600_000), endAt: Timestamp.fromMillis(now + 86400_000), couponValidityDays: 7, branchIds: ["br_demo"], status: "active", totals: { issued: 0, redeemed: 0 } });
await db.doc("campaigns/cmp_demo/stock/br_demo").set({ total: 50, reserved: 0, issued: 0, remaining: 50 });
await staff("cashier@demo.test", { role: "branch_staff", brandId: "brand_demo", branchId: "br_demo" });
await staff("partner@demo.test", { role: "partner_admin", brandId: "brand_demo" });

const player = await anonymous();
await call("setAgeAndCity", { birthYear: new Date().getUTCFullYear() - 25, city: "JED" }, player);
const scan = await call("scanBranchCode", { code: signBranchCode(secret, "br_demo", gameDayId(new Date())), lat: 21.5503, lng: 39.17, accuracyM: 12 }, player);
const manualCode = scan.coupons[0].manualCode;
await aggregateDay(gameDayId(new Date()));

// ── خادم ملفات اللوحة ──
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer((req, res) => {
  const path = join(dist, req.url === "/" || !extname(req.url) ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path));
}).listen(4173, "127.0.0.1");

const executablePath = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const failures = [];
const expectText = async (page, text, label) => {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
    console.log("✓", label);
  } catch {
    failures.push(label);
    console.log("✗", label);
  }
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ar-SA" });
  await page.goto("http://127.0.0.1:4173/");
  await page.fill("input[name=email]", "cashier@demo.test");
  await page.fill("input[name=password]", "panel-pass-123");
  await page.click("button[type=submit]");
  await expectText(page, "فرع التجربة", "branch staff sees the branch screen");
  await page.locator("canvas").first().waitFor();
  const day = await page.getByTestId("branch-day").textContent();
  if (day?.trim() !== gameDayId(new Date())) failures.push("branch screen shows today's game day");
  await page.screenshot({ path: join(shots, "branch-screen.png") });

  await page.click("a[href='#staff']");
  await page.fill("input[name=manual]", manualCode.toLowerCase());
  await page.click("form.grid button[type=submit]");
  await expectText(page, "✓ تم الاسترداد: قهوة اليوم", "manual redeem → STAFF_REDEEM_OK");
  await page.screenshot({ path: join(shots, "staff-redeem-ok.png") });
  await page.waitForTimeout(1600);
  await page.fill("input[name=manual]", manualCode);
  await page.click("form.grid button[type=submit]");
  await expectText(page, "✗ القسيمة مستخدمة — استُردت في فرع التجربة", "second redeem → STAFF_REDEEM_USED with branch");
  await page.click("text=خروج");

  await page.fill("input[name=email]", "partner@demo.test");
  await page.fill("input[name=password]", "panel-pass-123");
  await page.click("button[type=submit]");
  await page.waitForSelector("a[href='#reports']");
  await page.click("a[href='#reports']");
  await page.click("form.grid button[type=submit]");
  try {
    const row = page.getByTestId("report-row").first();
    await row.waitFor({ timeout: 10_000 });
    const cells = await row.locator("td").allTextContents();
    // الصف: اليوم، والفرع، ثم المؤشرات — 1 حضور محقق و1 قسيمة… كلها < 10 فتظهر مقنّعة.
    if (!cells.includes("فرع التجربة") || !cells.includes("أقل من 10")) throw new Error(cells.join(" | "));
    console.log("✓ partner report masks small cells");
  } catch (err) {
    failures.push("partner report masks small cells: " + err.message);
    console.log("✗ partner report masks small cells");
  }
  await page.screenshot({ path: join(shots, "partner-report.png") });
  const html = await page.content();
  if (/"uid"|21\.55|39\.17/.test(html)) failures.push("report page leaks player ids or coordinates");

  await page.click("a[href='#campaigns']");
  await expectText(page, "قهوة اليوم", "partner sees their campaign with totals");
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error("e2e failures:", failures);
  process.exit(1);
}
console.log("partner panel e2e ✓");

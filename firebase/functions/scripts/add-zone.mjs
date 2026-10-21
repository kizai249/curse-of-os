// أداة تطوير: يضيف أو يحدّث منطقة (ملعب أو فرع) — للمحاكي أو fq-dev. الإحداثيات الحقيقية تُدخل من لوحة الشركاء (S9).
// npm run zone:add -- --project demo-fq --type stadium --ref STD_RUH_KFS --lat 24.79 --lng 46.84 [--radius 2000]
// npm run zone:add -- --project demo-fq --type branch --ref br_demo --lat 21.55 --lng 39.17 --brand brand_demo --name "فرع تجريبي"
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const projectId = arg("project");
if (!projectId || !arg("type") || !arg("ref") || !arg("lat") || !arg("lng")) {
  console.error("usage: npm run zone:add -- --project <id> --type stadium|branch --ref <id> --lat <n> --lng <n> [--radius m] [--brand id --name text --city RUH|JED|KHB]");
  process.exit(2);
}
initializeApp({ projectId });
const { zoneDocument } = await import("../lib/location/zones.js");
const type = arg("type");
const ref = arg("ref");
const zone = zoneDocument({ type, refId: ref, lat: Number(arg("lat")), lng: Number(arg("lng")), radiusM: arg("radius") ? Number(arg("radius")) : undefined });
const zoneId = `zone_${type === "stadium" ? "std" : "br"}_${ref}`;
const db = getFirestore();
await db.doc(`zones/${zoneId}`).set(zone);
if (type === "branch") {
  const name = arg("name") ?? ref;
  await db.doc(`branches/${ref}`).set({
    brandId: arg("brand") ?? "brand_demo",
    brandName: { ar: arg("brand") ?? "علامة تجريبية", en: arg("brand") ?? "Demo brand" },
    name: { ar: name, en: name },
    city: arg("city") ?? "RUH",
    zoneId,
    active: true,
    createdAt: Timestamp.now(),
  }, { merge: true });
}
console.log(`zone ${zoneId} → geohash5 ${zone.geohash5}, radius ${zone.radiusM} m`);

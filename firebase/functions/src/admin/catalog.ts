import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { fail } from "../shared/errors.js";
import { canActForBranch, StaffClaims } from "../shared/roles.js";
import { staffCallable } from "../shared/staffCallable.js";
import { zoneDocument } from "../location/zones.js";
import { RADIUS_LIMITS } from "../location/zones.js";
import { city, id, localized, newId } from "./validate.js";

/**
 * العلامات والفروع ومناطقها — لوحة الشركاء (ARCHITECTURE §8).
 * `brands/{brandId}` (Q26) يحمل اسم العلامة، ويُنسخ في كل فرع (`brandName` — DATA_CONTRACTS §2).
 */
export async function handleUpsertBrand(staff: StaffClaims, input: { brandId?: string; name?: unknown }, now = new Date()) {
  if (staff.role !== "usersx_admin") fail("permission-denied", "ADMIN_ONLY");
  const db = getFirestore();
  const brandId = input?.brandId ? id(input.brandId, "brandId") : newId("brand");
  const name = localized(input?.name, "name", 80);
  await db.doc(`brands/${brandId}`).set({ name, updatedAt: Timestamp.fromDate(now) }, { merge: true });
  // تحديث الاسم المنسوخ في فروع العلامة.
  const branches = await db.collection("branches").where("brandId", "==", brandId).get();
  const writer = db.bulkWriter();
  for (const b of branches.docs) writer.update(b.ref, { brandName: name });
  await writer.close();
  return { brandId, name };
}

export interface BranchInput {
  branchId?: string;
  brandId?: string;
  name?: unknown;
  city?: unknown;
  lat?: number;
  lng?: number;
  radiusM?: number;
  active?: boolean;
}

/** upsertBranch: الفرع ومنطقته (المركز، ونصف القطر 150–500 م، والافتراضي 250). */
export async function handleUpsertBranch(staff: StaffClaims, input: BranchInput, now = new Date()) {
  if (staff.role === "branch_staff") fail("permission-denied", "PARTNER_ONLY");
  const db = getFirestore();
  const branchId = input?.branchId ? id(input.branchId, "branchId") : newId("br");
  const existing = await db.doc(`branches/${branchId}`).get();
  const brandId = staff.role === "partner_admin" ? staff.brandId! : id(input?.brandId ?? existing.get("brandId"), "brandId");
  if (existing.exists && existing.get("brandId") !== brandId) fail("permission-denied", "STAFF_ONLY");
  const brand = await db.doc(`brands/${brandId}`).get();
  if (!brand.exists) fail("failed-precondition", "BRAND_NOT_FOUND");

  const zoneId = `zone_br_${branchId}`;
  let zone;
  try {
    zone = zoneDocument({
      type: "branch",
      refId: branchId,
      lat: input?.lat as number,
      lng: input?.lng as number,
      radiusM: input?.radiusM ?? RADIUS_LIMITS.branch.default,
      active: input?.active !== false,
    });
  } catch (err) {
    fail("invalid-argument", "INVALID_ZONE", { message: (err as Error).message });
  }
  const branch = {
    brandId,
    brandName: brand.get("name"),
    name: localized(input?.name, "name", 80),
    city: city(input?.city),
    zoneId,
    active: input?.active !== false,
    ...(existing.exists ? {} : { createdAt: Timestamp.fromDate(now) }),
  };
  const batch = db.batch();
  batch.set(db.doc(`branches/${branchId}`), branch, { merge: true });
  batch.set(db.doc(`zones/${zoneId}`), zone!);
  await batch.commit();
  return { branchId, zoneId, geohash5: zone!.geohash5 };
}

/** نطاق الحساب: العلامات والفروع والحملات (مع المخزون) اللي يقدر يشوفها. */
export async function handleMyScope(staff: StaffClaims) {
  const db = getFirestore();
  const brandDocs = staff.role === "usersx_admin"
    ? (await db.collection("brands").get()).docs
    : [await db.doc(`brands/${staff.brandId ?? "_"}`).get()].filter((d) => d.exists);
  const brands = brandDocs.map((d) => ({ brandId: d.id, name: d.get("name") }));

  let branchesQuery: FirebaseFirestore.Query = db.collection("branches");
  if (staff.role !== "usersx_admin") branchesQuery = branchesQuery.where("brandId", "==", staff.brandId ?? "_");
  const branchDocs = (await branchesQuery.get()).docs.filter((d) => canActForBranch(staff, d.data() as { brandId: string }, d.id));
  const zoneIds = branchDocs.map((d) => d.get("zoneId") as string).filter(Boolean);
  const zones = new Map<string, FirebaseFirestore.DocumentData>();
  for (const zid of zoneIds) {
    const z = await db.doc(`zones/${zid}`).get();
    if (z.exists) zones.set(zid, z.data()!);
  }
  const branches = branchDocs.map((d) => {
    const z = zones.get(d.get("zoneId"));
    return {
      branchId: d.id,
      brandId: d.get("brandId"),
      name: d.get("name"),
      city: d.get("city"),
      active: d.get("active"),
      // مركز المنشأة (مو لاعب) — يظهر للإدارة فقط.
      zone: z ? { lat: z.center.lat, lng: z.center.lng, radiusM: z.radiusM } : null,
    };
  });

  if (staff.role === "branch_staff") {
    // الموظف يحتاج فقط حملات رمز الفاتورة الحية في فرعه (لتوليد الرمز) — بدون المخزون أو الإجماليات.
    const live = await db.collection("campaigns").where("branchIds", "array-contains", staff.branchId ?? "_").get();
    const now = Date.now();
    const campaigns = live.docs
      .filter((c) => {
        const d = c.data();
        return d.status === "active" && d.trigger === "invoice_code" && d.startAt.toMillis() <= now && d.endAt.toMillis() > now;
      })
      .map((c) => ({ campaignId: c.id, title: c.get("title"), trigger: "invoice_code" }));
    return { brands, branches, campaigns };
  }
  let campaignsQuery: FirebaseFirestore.Query = db.collection("campaigns");
  if (staff.role !== "usersx_admin") campaignsQuery = campaignsQuery.where("brandId", "==", staff.brandId ?? "_");
  const campaigns = [];
  for (const c of (await campaignsQuery.get()).docs) {
    const stock = await c.ref.collection("stock").get();
    const data = c.data();
    campaigns.push({
      campaignId: c.id,
      brandId: data.brandId,
      title: data.title,
      terms: data.terms,
      trigger: data.trigger,
      perUserLimit: data.perUserLimit,
      startAt: data.startAt?.toDate().toISOString() ?? null,
      endAt: data.endAt?.toDate().toISOString() ?? null,
      couponValidityDays: data.couponValidityDays,
      branchIds: data.branchIds,
      status: data.status,
      totals: data.totals ?? { issued: 0, redeemed: 0 },
      stock: stock.docs.map((s) => ({ branchId: s.id, ...s.data() })),
    });
  }
  return { brands, branches, campaigns };
}

export const upsertBrand = staffCallable(["usersx_admin"], (staff, data: { brandId?: string; name?: unknown }) => handleUpsertBrand(staff, data));
export const upsertBranch = staffCallable(["usersx_admin", "partner_admin"], (staff, data: BranchInput) => handleUpsertBranch(staff, data));
export const getMyScope = staffCallable(["usersx_admin", "partner_admin", "branch_staff"], (staff) => handleMyScope(staff));

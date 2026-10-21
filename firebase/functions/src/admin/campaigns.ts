import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { fail } from "../shared/errors.js";
import { StaffClaims } from "../shared/roles.js";
import { staffCallable } from "../shared/staffCallable.js";
import { date, id, int, localized, newId } from "./validate.js";

const TRIGGERS = ["co_op_win", "verified_visit", "visit_streak", "invoice_code"] as const;
const STATUSES = ["draft", "active", "paused", "ended"] as const;

export interface CampaignInput {
  campaignId?: string;
  brandId?: string;
  title?: unknown;
  terms?: unknown;
  trigger?: string;
  perUserLimit?: number;
  startAt?: string;
  endAt?: string;
  couponValidityDays?: number;
  branchIds?: string[];
  status?: string;
}

/**
 * upsertCampaign — حملات علامة الشريك (GAME_RULES §8.2، DATA_CONTRACTS §4). المحفز ما يتغير بعد التفعيل،
 * والحملة المنتهية ما تُعدّل. الإجماليات والمخزون ما تُكتب من هنا.
 */
export async function handleUpsertCampaign(staff: StaffClaims, input: CampaignInput, now = new Date()) {
  if (staff.role === "branch_staff") fail("permission-denied", "PARTNER_ONLY");
  const db = getFirestore();
  const campaignId = input?.campaignId ? id(input.campaignId, "campaignId") : newId("cmp");
  const ref = db.doc(`campaigns/${campaignId}`);
  const existing = await ref.get();
  const brandId = staff.role === "partner_admin" ? staff.brandId! : id(input?.brandId ?? existing.get("brandId"), "brandId");
  if (existing.exists && existing.get("brandId") !== brandId) fail("permission-denied", "STAFF_ONLY");
  if (existing.exists && existing.get("status") === "ended") fail("failed-precondition", "CAMPAIGN_ENDED");

  const trigger = input?.trigger as (typeof TRIGGERS)[number];
  if (!TRIGGERS.includes(trigger)) fail("invalid-argument", "INVALID_FIELD", { field: "trigger" });
  if (existing.exists && existing.get("status") !== "draft" && existing.get("trigger") !== trigger) {
    fail("failed-precondition", "TRIGGER_LOCKED");
  }
  const status = (input?.status ?? "draft") as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) fail("invalid-argument", "INVALID_FIELD", { field: "status" });
  const startAt = date(input?.startAt, "startAt");
  const endAt = date(input?.endAt, "endAt");
  if (endAt <= startAt) fail("invalid-argument", "INVALID_FIELD", { field: "endAt" });

  const branchIds = Array.isArray(input?.branchIds) ? [...new Set(input.branchIds)] : [];
  if (branchIds.length === 0 || branchIds.length > 500) fail("invalid-argument", "INVALID_FIELD", { field: "branchIds" });
  for (const b of branchIds) {
    const branch = await db.doc(`branches/${id(b, "branchIds")}`).get();
    if (!branch.exists || branch.get("brandId") !== brandId) fail("invalid-argument", "BRANCH_NOT_IN_BRAND", { branchId: b });
  }

  const doc = {
    brandId,
    title: localized(input?.title, "title", 80),
    terms: localized(input?.terms, "terms", 500),
    trigger,
    perUserLimit: int(input?.perUserLimit ?? 1, "perUserLimit", 1, 20),
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    couponValidityDays: int(input?.couponValidityDays ?? 7, "couponValidityDays", 1, 60),
    branchIds,
    status,
    updatedAt: Timestamp.fromDate(now),
    updatedBy: staff.uid,
    ...(existing.exists ? {} : { totals: { issued: 0, redeemed: 0 }, createdAt: Timestamp.fromDate(now) }),
  };
  await ref.set(doc, { merge: true });
  return { campaignId };
}

/**
 * setStock — مخزون الحملة لكل فرع. الإجمالي الجديد ما يقل عن (المحجوز + الممنوح)،
 * والمتبقي يُحسب: remaining = total − reserved − issued (الثابت الإلزامي في DATA_CONTRACTS §4).
 */
export async function handleSetStock(staff: StaffClaims, input: { campaignId?: string; branchId?: string; total?: number }) {
  if (staff.role === "branch_staff") fail("permission-denied", "PARTNER_ONLY");
  const db = getFirestore();
  const campaignRef = db.doc(`campaigns/${id(input?.campaignId, "campaignId")}`);
  const branchId = id(input?.branchId, "branchId");
  const total = int(input?.total, "total", 0, 1_000_000);
  return db.runTransaction(async (tx) => {
    const campaign = await tx.get(campaignRef);
    if (!campaign.exists) fail("not-found", "CAMPAIGN_NOT_FOUND");
    if (staff.role === "partner_admin" && campaign.get("brandId") !== staff.brandId) fail("permission-denied", "STAFF_ONLY");
    if (!(campaign.get("branchIds") as string[]).includes(branchId)) fail("invalid-argument", "BRANCH_NOT_IN_CAMPAIGN");
    const stockRef = campaignRef.collection("stock").doc(branchId);
    const stock = await tx.get(stockRef);
    const reserved = stock.exists ? (stock.get("reserved") as number) : 0;
    const issued = stock.exists ? (stock.get("issued") as number) : 0;
    if (total < reserved + issued) fail("failed-precondition", "STOCK_BELOW_USED", { minimum: reserved + issued });
    const next = { total, reserved, issued, remaining: total - reserved - issued };
    tx.set(stockRef, next);
    return { branchId, ...next };
  });
}

export const upsertCampaign = staffCallable(["usersx_admin", "partner_admin"], (staff, data: CampaignInput) => handleUpsertCampaign(staff, data));
export const setStock = staffCallable(["usersx_admin", "partner_admin"], (staff, data: { campaignId?: string; branchId?: string; total?: number }) =>
  handleSetStock(staff, data),
);

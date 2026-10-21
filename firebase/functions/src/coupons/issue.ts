import { DocumentData, FieldValue, getFirestore, Timestamp, Transaction } from "firebase-admin/firestore";
import { normalizeManual, randomCode, randomToken128, sha256 } from "../shared/codes.js";

export type Trigger = "co_op_win" | "verified_visit" | "visit_streak" | "invoice_code";

export interface CampaignRef {
  id: string;
  data: DocumentData;
}

/** حملة نشطة الحين، وتشمل الفرع، وبنفس المحفّز — GAME_RULES §8.2–8.3. */
export function isCampaignLive(c: DocumentData, branchId: string, trigger: Trigger, now: Date): boolean {
  return (
    c.status === "active" &&
    c.trigger === trigger &&
    Array.isArray(c.branchIds) &&
    c.branchIds.includes(branchId) &&
    (!c.startAt || c.startAt.toMillis() <= now.getTime()) &&
    (!c.endAt || c.endAt.toMillis() > now.getTime())
  );
}

/** الحملات الحية للفرع (قراءة خارج المعاملة — إعدادات الحملة؛ المخزون والحدود تُقرأ داخلها). */
export async function liveCampaigns(branchId: string, trigger: Trigger, now: Date): Promise<CampaignRef[]> {
  const snap = await getFirestore().collection("campaigns").where("branchIds", "array-contains", branchId).get();
  return snap.docs.filter((d) => isCampaignLive(d.data(), branchId, trigger, now)).map((d) => ({ id: d.id, data: d.data() }));
}

export type IssueBlock = "sold_out" | "user_limit" | "no_stock_record";

export interface IssueCheck {
  campaign: CampaignRef;
  stockRef: FirebaseFirestore.DocumentReference;
  claimsRef: FirebaseFirestore.DocumentReference;
  stock: { total: number; reserved: number; issued: number; remaining: number } | null;
  claims: number;
  block: IssueBlock | null;
}

/**
 * قراءة المخزون وحد الحساب داخل المعاملة (كل القراءات قبل أي كتابة).
 * المخزون لكل فرع: campaigns/{id}/stock/{branchId}، وحد الحساب: campaigns/{id}/claims/{uid} (DATA_CONTRACTS §4).
 */
export async function checkIssue(tx: Transaction, campaign: CampaignRef, branchId: string, uid: string): Promise<IssueCheck> {
  const db = getFirestore();
  const stockRef = db.doc(`campaigns/${campaign.id}/stock/${branchId}`);
  const claimsRef = db.doc(`campaigns/${campaign.id}/claims/${uid}`);
  const [stockSnap, claimsSnap] = await Promise.all([tx.get(stockRef), tx.get(claimsRef)]);
  const stock = stockSnap.exists ? (stockSnap.data() as IssueCheck["stock"]) : null;
  const claims = claimsSnap.exists ? (claimsSnap.get("count") as number) : 0;
  const limit = campaign.data.perUserLimit ?? 1;
  let block: IssueBlock | null = null;
  if (!stock) block = "no_stock_record";
  else if (claims >= limit) block = "user_limit";
  else if (stock.remaining <= 0) block = "sold_out";
  return { campaign, stockRef, claimsRef, stock, claims, block };
}

export interface IssuedCoupon {
  couponId: string;
  campaignId: string;
  brandId: string;
  title: { ar: string; en: string };
  terms: { ar: string; en: string };
  issuedBranchId: string;
  expiresAt: string;
  /** يُرسل للعميل مرة وحدة فقط؛ المخزّن بصمته. */
  redeemToken: string;
  manualCode: string;
}

export const MANUAL_CODE_LENGTH = 8;
export const DEFAULT_VALIDITY_DAYS = 7;

/**
 * يكتب منح القسيمة: المخزون (issued+1، remaining−1 — الثابت remaining = total − reserved − issued ≥ 0)،
 * وحد الحساب، ومستند القسيمة ببصمات الرموز فقط، وملخص الحملة. يُستدعى فقط إذا `check.block === null`.
 */
export function writeIssue(
  tx: Transaction,
  check: IssueCheck,
  uid: string,
  branchId: string,
  source: Record<string, unknown>,
  now: Date,
): IssuedCoupon {
  if (check.block || !check.stock) throw new Error("writeIssue called on a blocked check");
  const db = getFirestore();
  const { campaign, stock } = check;
  const next = { ...stock, issued: stock.issued + 1, remaining: stock.remaining - 1 };
  if (next.remaining < 0 || next.remaining !== next.total - next.reserved - next.issued) {
    throw new Error(`stock invariant violated for ${campaign.id}/${branchId}`);
  }
  tx.set(check.stockRef, next);
  tx.set(check.claimsRef, { count: check.claims + 1, lastAt: Timestamp.fromDate(now) });
  tx.update(db.doc(`campaigns/${campaign.id}`), { "totals.issued": FieldValue.increment(1) });

  const couponRef = db.collection("coupons").doc();
  const redeemToken = randomToken128();
  const manualCode = randomCode(MANUAL_CODE_LENGTH);
  const validityDays = campaign.data.couponValidityDays ?? DEFAULT_VALIDITY_DAYS;
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 3600_000);
  tx.create(couponRef, {
    campaignId: campaign.id,
    brandId: campaign.data.brandId,
    // نسخة العرض في المحفظة (Q22) — اللاعب ما يقرأ مستند الحملة.
    title: campaign.data.title,
    terms: campaign.data.terms,
    uid,
    issuedBranchId: branchId,
    status: "issued",
    source,
    issuedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    redeemTokenHash: sha256(redeemToken),
    manualCodeHash: sha256(normalizeManual(manualCode)),
    redeemedAt: null,
    redeemedBranchId: null,
    redeemedBy: null,
  });
  return {
    couponId: couponRef.id,
    campaignId: campaign.id,
    brandId: campaign.data.brandId,
    title: campaign.data.title,
    terms: campaign.data.terms,
    issuedBranchId: branchId,
    expiresAt: expiresAt.toISOString(),
    redeemToken,
    manualCode,
  };
}

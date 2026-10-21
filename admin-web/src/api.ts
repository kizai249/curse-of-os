import { call } from "./firebase.js";
import type { ReportRow } from "./lib/report.js";

export type Role = "usersx_admin" | "partner_admin" | "branch_staff";
export interface Localized {
  ar: string;
  en: string;
}
export interface Branch {
  branchId: string;
  brandId: string;
  name: Localized;
  city: string;
  active: boolean;
  zone: { lat: number; lng: number; radiusM: number } | null;
}
export interface Stock {
  branchId: string;
  total: number;
  reserved: number;
  issued: number;
  remaining: number;
}
export interface Campaign {
  campaignId: string;
  brandId: string;
  title: Localized;
  terms: Localized;
  trigger: string;
  perUserLimit: number;
  startAt: string;
  endAt: string;
  couponValidityDays: number;
  branchIds: string[];
  status: string;
  totals: { issued: number; redeemed: number };
  stock: Stock[];
}
export interface Scope {
  brands: Array<{ brandId: string; name: Localized }>;
  branches: Branch[];
  campaigns: Campaign[];
}
export interface RedeemResult {
  status: string;
  stateId: string;
  title?: Localized;
  redeemedAt?: string;
  redeemedBranchId?: string;
}

/** الدوال اللي تستخدمها اللوحة — كلها في firebase/functions/src/{admin,analytics,branch,coupons}. */
export const api = {
  scope: () => call<object, Scope>("getMyScope", {}),
  branchScreen: (branchId?: string) => call<object, { branchId: string; name: Localized; day: string; token: string; validUntil: string }>("getBranchScreen", { branchId }),
  redeem: (input: { token?: string; manualCode?: string }) => call<object, RedeemResult>("redeemCoupon", input),
  issueInvoiceCode: (campaignId: string) => call<object, { code: string; expiresAt: string }>("issueInvoiceCode", { campaignId }),
  upsertBrand: (brandId: string, name: Localized) => call<object, { brandId: string }>("upsertBrand", { brandId, name }),
  upsertBranch: (input: object) => call<object, { branchId: string }>("upsertBranch", input),
  upsertCampaign: (input: object) => call<object, { campaignId: string }>("upsertCampaign", input),
  setStock: (campaignId: string, branchId: string, total: number) => call<object, Stock>("setStock", { campaignId, branchId, total }),
  upsertMatch: (input: object) => call<object, { matchId: string }>("upsertMatchResult", input),
  createStaff: (input: object) => call<object, { resetLink: string; claims: Record<string, string> }>("createStaffAccount", input),
  report: (from: string, to: string, branchId?: string) => call<object, { rows: ReportRow[] }>("getReport", { from, to, branchId }),
};

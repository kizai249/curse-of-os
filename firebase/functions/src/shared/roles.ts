import { CallableRequest } from "firebase-functions/v2/https";
import { fail } from "./errors.js";

/** أدوار لوحة الشركاء — ARCHITECTURE §8 (Custom Claims في Firebase Auth). */
export type Role = "usersx_admin" | "partner_admin" | "branch_staff";

export interface StaffClaims {
  role: Role;
  uid: string;
  brandId?: string;
  branchId?: string;
}

export function requireRole(request: CallableRequest<unknown>, roles: Role[]): StaffClaims {
  const token = request.auth?.token as Record<string, unknown> | undefined;
  const role = token?.role as Role | undefined;
  if (!request.auth || !role || !roles.includes(role)) fail("permission-denied", "STAFF_ONLY");
  return {
    role: role!,
    uid: request.auth!.uid,
    brandId: typeof token!.brandId === "string" ? (token!.brandId as string) : undefined,
    branchId: typeof token!.branchId === "string" ? (token!.branchId as string) : undefined,
  };
}

/** هل يقدر هذا الحساب يتصرف باسم هذا الفرع؟ */
export function canActForBranch(claims: StaffClaims, branch: { brandId: string }, branchId: string): boolean {
  if (claims.role === "usersx_admin") return true;
  if (claims.role === "partner_admin") return claims.brandId === branch.brandId;
  return claims.branchId === branchId;
}

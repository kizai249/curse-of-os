import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { fail } from "../shared/errors.js";
import { Role, StaffClaims } from "../shared/roles.js";
import { staffCallable } from "../shared/staffCallable.js";
import { id } from "./validate.js";

/**
 * حسابات اللوحة (بريد + كلمة مرور) بأدوار Custom Claims — ARCHITECTURE §8.
 * usersx_admin ينشئ أي دور؛ partner_admin ينشئ موظفي فروع علامته فقط. يرجع رابط تعيين كلمة المرور للمشاركة.
 */
export async function handleCreateStaff(staff: StaffClaims, input: { email?: string; role?: Role; brandId?: string; branchId?: string }) {
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("invalid-argument", "INVALID_FIELD", { field: "email" });
  const role = input?.role;
  if (role !== "usersx_admin" && role !== "partner_admin" && role !== "branch_staff") fail("invalid-argument", "INVALID_FIELD", { field: "role" });
  if (staff.role === "partner_admin" && role !== "branch_staff") fail("permission-denied", "ADMIN_ONLY");

  const claims: Record<string, string> = { role: role! };
  if (role === "partner_admin" || role === "branch_staff") {
    claims.brandId = staff.role === "partner_admin" ? staff.brandId! : id(input.brandId, "brandId");
  }
  if (role === "branch_staff") {
    const branchId = id(input.branchId, "branchId");
    const branch = await getFirestore().doc(`branches/${branchId}`).get();
    if (!branch.exists || branch.get("brandId") !== claims.brandId) fail("invalid-argument", "BRANCH_NOT_IN_BRAND");
    claims.branchId = branchId;
  }

  const auth = getAuth();
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, emailVerified: false }));
  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid); // الأدوار الجديدة تُطبق من أول دخول
  const resetLink = await auth.generatePasswordResetLink(email);
  return { uid: user.uid, claims, resetLink };
}

export const createStaffAccount = staffCallable(["usersx_admin", "partner_admin"], (staff, data: { email?: string; role?: Role; brandId?: string; branchId?: string }) =>
  handleCreateStaff(staff, data),
);

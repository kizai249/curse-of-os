import { CallableRequest, onCall } from "firebase-functions/v2/https";
import { defineBoolean } from "firebase-functions/params";
import { REGION, isEmulator } from "./config.js";
import { fail } from "./errors.js";
import { requireRole, Role, StaffClaims } from "./roles.js";

/**
 * التحقق الثنائي للمسؤولين (ARCHITECTURE §8). يُفعَّل في fq-prod بعد تفعيل TOTP في Identity Platform:
 * `ADMIN_MFA_REQUIRED=true` في functions/.env.fq-prod.
 */
export const ADMIN_MFA_REQUIRED = defineBoolean("ADMIN_MFA_REQUIRED", { default: false });

export function staffCallable<Req, Res>(roles: Role[], handler: (staff: StaffClaims, data: Req, request: CallableRequest<Req>) => Promise<Res>) {
  return onCall<Req, Promise<Res>>({ region: REGION, enforceAppCheck: !isEmulator() }, async (request) => {
    const staff = requireRole(request as CallableRequest<unknown>, roles);
    const secondFactor = (request.auth?.token.firebase as { sign_in_second_factor?: string } | undefined)?.sign_in_second_factor;
    if (staff.role !== "branch_staff" && ADMIN_MFA_REQUIRED.value() && !secondFactor) fail("permission-denied", "MFA_REQUIRED");
    return handler(staff, request.data, request);
  });
}

import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { REGION, isEmulator } from "./config.js";

export type AuthedRequest<T> = CallableRequest<T> & { auth: NonNullable<CallableRequest<T>["auth"]> };

/**
 * غلاف موحد لكل Callable: المنطقة، وفرض App Check، واشتراط Auth — ARCHITECTURE.md §5.
 * الأخطاء ترجع برموز الحالات في docs/design/PERMISSION_AND_ERROR_STATES.md.
 */
export function authedCallable<Req, Res>(handler: (request: AuthedRequest<Req>) => Promise<Res>) {
  return onCall<Req, Promise<Res>>(
    { region: REGION, enforceAppCheck: !isEmulator() },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
      }
      return handler(request as AuthedRequest<Req>);
    },
  );
}

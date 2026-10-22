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
      try {
        return await handler(request as AuthedRequest<Req>);
      } catch (err) {
        throw asBusy(err);
      }
    },
  );
}

/**
 * تعارض المعاملات (ABORTED بعد استنفاد المحاولات، مثل ضغطات متزامنة على نفس الغرفة) ← SRV_BUSY،
 * والعميل يعيد بنفس requestId (Retry في FootballQuest.Core). أي خطأ ثاني يمر كما هو.
 */
export function asBusy(err: unknown): unknown {
  const code = (err as { code?: unknown })?.code;
  if (!(err instanceof HttpsError) && (code === 10 || code === "aborted")) {
    return new HttpsError("unavailable", "SRV_BUSY", { stateId: "SRV_BUSY" });
  }
  return err;
}

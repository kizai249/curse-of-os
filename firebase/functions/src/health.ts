import { gameDayId, nextRollover } from "./shared/gameDay.js";
import { authedCallable } from "./shared/callable.js";

export interface HealthResponse {
  ok: true;
  uid: string;
  serverTime: string;
  gameDay: string;
  nextRollover: string;
}

/** منطق `health` مفصول عن الغلاف عشان يُختبر مباشرة. */
export function buildHealth(uid: string, now: Date): HealthResponse {
  return {
    ok: true,
    uid,
    serverTime: now.toISOString(),
    gameDay: gameDayId(now),
    nextRollover: nextRollover(now).toISOString(),
  };
}

/**
 * دالة بنية تحتية (ليست ضمن قائمة ARCHITECTURE.md §5): تتحقق من سلسلة Auth + App Check + المنطقة
 * وترجع وقت الخادم ويوم اللعبة. يستخدمها العميل لمزامنة الساعة، وCI للتحقق من النشر.
 */
export const health = authedCallable<void, HealthResponse>(async (request) =>
  buildHealth(request.auth.uid, new Date()),
);

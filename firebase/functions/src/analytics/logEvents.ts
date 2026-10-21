import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { authedCallable } from "../shared/callable.js";
import { fail } from "../shared/errors.js";

/**
 * logEvents — أحداث العميل على دفعات (ARCHITECTURE §10). الأحداث الحساسة يكتبها الخادم نفسه
 * (branch_visit_verified، وcoupon_redeemed، وco_op_win)، فما تُقبل من العميل.
 * كل حدث له قائمة خصائص مسموحة؛ أي شيء غيرها يُحذف — ومنها الإحداثيات والاسم والبريد والجوال ومعرّف الإعلان (§9.1).
 */
export const CLIENT_EVENTS: Record<string, Record<string, "string" | "number" | "boolean">> = {
  branch_nearby_shown: { branchId: "string", brandId: "string", zoneRadiusM: "number", accuracyBand: "string", activeCampaigns: "number" },
};
const ACCURACY_BANDS = new Set(["<=25", "26-50", "51-100"]);
export const MAX_BATCH = 50;
const RETENTION_MS = 395 * 24 * 3600_000;

export interface ClientEvent {
  eventId?: string;
  name?: string;
  props?: Record<string, unknown>;
}

export function sanitize(event: ClientEvent): { eventId: string; name: string; props: Record<string, unknown> } | null {
  const schema = event?.name ? CLIENT_EVENTS[event.name] : undefined;
  if (!schema) return null;
  const props: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(schema)) {
    const value = event.props?.[key];
    if (typeof value !== type) return null;
    if (typeof value === "string" && value.length > 64) return null;
    props[key] = value;
  }
  if (event.name === "branch_nearby_shown" && !ACCURACY_BANDS.has(props.accuracyBand as string)) return null;
  const eventId = typeof event.eventId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(event.eventId) ? event.eventId : randomUUID();
  return { eventId: `ev_${eventId}`, name: event.name!, props };
}

export async function handleLogEvents(
  uid: string,
  input: { events?: ClientEvent[]; platform?: string; appVersion?: string },
  now = new Date(),
): Promise<{ accepted: number; rejected: number }> {
  const events = Array.isArray(input?.events) ? input.events : [];
  if (events.length > MAX_BATCH) fail("invalid-argument", "BATCH_TOO_LARGE");
  const db = getFirestore();
  const user = await db.doc(`users/${uid}`).get();
  const city = user.exists ? (user.get("city") as string) : null;
  const platform = input?.platform === "ios" || input?.platform === "android" ? input.platform : null;
  const appVersion = typeof input?.appVersion === "string" ? input.appVersion.slice(0, 20) : null;

  const writer = db.bulkWriter();
  // إعادة إرسال نفس الحدث (نفس eventId) ما تكرره ولا تغيّره: create ونتجاهل ALREADY_EXISTS.
  writer.onWriteError((err) => err.code !== 6 && err.failedAttempts < 3);
  let accepted = 0;
  for (const raw of events) {
    const e = sanitize(raw);
    if (!e) continue;
    accepted++;
    writer.create(db.doc(`events/${e.eventId}`), {
      eventId: e.eventId,
      name: e.name,
      ts: Timestamp.fromDate(now),
      uid,
      platform,
      appVersion,
      city,
      source: "client",
      ...e.props,
      expireAt: Timestamp.fromMillis(now.getTime() + RETENTION_MS),
    }).catch(() => undefined);
  }
  await writer.close();
  return { accepted, rejected: events.length - accepted };
}

export const logEvents = authedCallable<{ events?: ClientEvent[]; platform?: string; appVersion?: string }, { accepted: number; rejected: number }>(
  async (request) => handleLogEvents(request.auth.uid, request.data),
);

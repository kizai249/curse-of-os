import { randomUUID } from "node:crypto";
import { Timestamp, Transaction } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";

/** حذف تلقائي بعد 13 شهرًا (ARCHITECTURE §10 — سياسة TTL على expireAt). */
const RETENTION_MS = 395 * 24 * 3600_000;

export interface ClientMeta {
  platform?: "ios" | "android";
  appVersion?: string;
}

/**
 * حدث تحليلي يكتبه الخادم — DATA_CONTRACTS §9. ممنوع فيه الإحداثيات أو الاسم أو أي معرّف شخصي غير uid.
 */
export function writeEvent(
  tx: Transaction,
  name: string,
  uid: string,
  city: string | null,
  meta: ClientMeta | undefined,
  props: Record<string, unknown>,
  now: Date,
): string {
  const eventId = "ev_" + randomUUID().replace(/-/g, "");
  tx.create(getFirestore().doc(`events/${eventId}`), {
    eventId,
    name,
    ts: Timestamp.fromDate(now),
    uid,
    platform: meta?.platform === "ios" || meta?.platform === "android" ? meta.platform : null,
    appVersion: typeof meta?.appVersion === "string" ? meta.appVersion.slice(0, 20) : null,
    city,
    source: "server",
    ...props,
    expireAt: Timestamp.fromMillis(now.getTime() + RETENTION_MS),
  });
  return eventId;
}

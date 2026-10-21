import { FunctionsErrorCode, HttpsError } from "firebase-functions/v2/https";

/**
 * خطأ متوقع يحمل معرّف حالة من docs/design/PERMISSION_AND_ERROR_STATES.md.
 * العميل يعرض النص حسب `details.stateId`، وما يعتمد على نص الرسالة.
 */
export function fail(code: FunctionsErrorCode, stateId: string, details: Record<string, unknown> = {}): never {
  throw new HttpsError(code, stateId, { stateId, ...details });
}

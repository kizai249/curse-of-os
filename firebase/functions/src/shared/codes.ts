import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** أبجدية بدون أحرف ملتبسة (0/O، 1/I/L) — ARCHITECTURE §6.3. */
export const UNAMBIGUOUS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomCode(length: number, alphabet = UNAMBIGUOUS): string {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(0, alphabet.length)];
  return out;
}

/** رمز عشوائي 128 بت (رمز الاسترداد داخل QR — ARCHITECTURE §6.2). */
export const randomToken128 = (): string => randomBytes(16).toString("base64url");

/** نخزّن البصمة فقط، مو الرمز نفسه. */
export const sha256 = (value: string): string => "sha256:" + createHash("sha256").update(value).digest("hex");

/** توحيد الإدخال اليدوي: بدون مسافات أو شرطات، وبأحرف كبيرة. */
export const normalizeManual = (value: string): string => value.replace(/[\s-]/g, "").toUpperCase();

export function hmacBase64Url(secret: string, message: string, bytes = 16): string {
  return createHmac("sha256", secret).update(message).digest().subarray(0, bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

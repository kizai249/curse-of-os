/** أدوات مشتركة لاختبارات المحاكي. المنافذ من firebase.json، والمشروع demo-fq (بدون مشروع حقيقي). */
export const PROJECT_ID = "demo-fq";
export const REGION = "me-central2";
export const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
export const FUNCTIONS_HOST = "127.0.0.1:5001";

/** ينشئ مستخدمًا مجهولًا في محاكي Auth ويرجع رمز الدخول. */
export async function signUpAnonymous(): Promise<{ uid: string; idToken: string }> {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`signUp failed: ${res.status}`);
  const body = (await res.json()) as { localId: string; idToken: string };
  return { uid: body.localId, idToken: body.idToken };
}

/** يستدعي Callable عبر بروتوكول HTTP نفسه اللي يستخدمه Firebase SDK. */
export async function callFunction(
  name: string,
  data: unknown,
  idToken?: string,
): Promise<{ status: number; body: { result?: unknown; error?: { status: string; message: string } } }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const res = await fetch(`http://${FUNCTIONS_HOST}/${PROJECT_ID}/${REGION}/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });
  const body = (await res.json()) as { result?: unknown; error?: { status: string; message: string } };
  return { status: res.status, body };
}

/** Admin SDK داخل عملية الاختبار، موجّه للمحاكي عبر متغيرات emulators:exec. */
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function admin() {
  if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
  return { db: getFirestore(), auth: getAuth() };
}

/** يرمي إذا رجع الاستدعاء خطأ، ويرجع `result`. */
export async function callOk<T>(name: string, data: unknown, idToken: string): Promise<T> {
  const res = await callFunction(name, data, idToken);
  if (res.status !== 200) throw new Error(`${name} failed ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.result as T;
}

export async function clearFirestore(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
}

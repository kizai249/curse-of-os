import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

/**
 * Firebase للوحة: Auth (بريد + كلمة مرور) وFunctions في me-central2 فقط — ما فيه Firestore في اللوحة
 * (ARCHITECTURE §8: كل القراءة والكتابة عبر Callable Functions).
 */
const env = import.meta.env;
export const useEmulator = env.VITE_USE_EMULATOR === "true";

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-fq",
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
const functions = getFunctions(app, "me-central2");

if (useEmulator) {
  const host = env.VITE_EMULATOR_HOST || "127.0.0.1";
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFunctionsEmulator(functions, host, 5001);
} else if (env.VITE_RECAPTCHA_ENTERPRISE_KEY) {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_KEY), isTokenAutoRefreshEnabled: true });
}

export async function call<Req, Res>(name: string, data: Req): Promise<Res> {
  const result = await httpsCallable<Req, Res>(functions, name)(data);
  return result.data;
}

import {
  getMultiFactorResolver,
  multiFactor,
  MultiFactorError,
  TotpMultiFactorGenerator,
  TotpSecret,
  User,
} from "firebase/auth";
import QRCode from "qrcode";
import { auth } from "../firebase.js";
import { formValues, h, mount } from "../lib/dom.js";
import { isTotpCode, MFA_TEXT } from "../lib/mfa.js";

function codeForm(title: string, button: string, onCode: (code: string) => Promise<void>, ...extra: Node[]) {
  const out = h("p", { className: "bad" });
  const form = h("form", { className: "card", style: "max-width:420px;margin:10vh auto" },
    h("h1", {}, title), ...extra,
    h("label", {}, MFA_TEXT.codeLabel,
      h("input", { name: "code", inputMode: "numeric", autocomplete: "one-time-code", maxLength: 6, required: true, className: "ltr", "data-testid": "mfa-code" })),
    h("p", {}, h("button", { type: "submit" }, button)), out);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = formValues(form).code!.trim();
    if (!isTotpCode(code)) {
      out.textContent = MFA_TEXT.badCode;
      return;
    }
    try {
      await onCode(code);
    } catch {
      out.textContent = MFA_TEXT.badCode;
    }
  });
  return form;
}

/** تسجيل TOTP لحساب إدارة بعد رفض MFA_REQUIRED. بعد التسجيل `done` يطلع ويطلب دخول جديد (التوكن الجديد فيه العامل الثاني). */
export async function enrollTotp(root: HTMLElement, user: User, done: (message: string) => Promise<void>): Promise<void> {
  let secret: TotpSecret;
  try {
    secret = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
  } catch {
    await done(MFA_TEXT.notEnabled);
    return;
  }
  const canvas = h("canvas", {});
  await QRCode.toCanvas(canvas, secret.generateQrCodeUrl(user.email ?? "admin", "Football Quest"), { margin: 2, width: 220 });
  mount(root, codeForm(MFA_TEXT.enrollTitle, MFA_TEXT.confirm, async (code) => {
    await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), "TOTP");
    await done(MFA_TEXT.enrolled);
  },
  h("p", { className: "muted" }, MFA_TEXT.enrollHelp), canvas,
  h("p", { className: "muted" }, MFA_TEXT.secretLabel, " ", h("code", { className: "ltr" }, secret.secretKey))));
}

/** إكمال الدخول لما يرجع Firebase auth/multi-factor-auth-required. */
export function resolveSignIn(root: HTMLElement, error: MultiFactorError, fail: (message: string) => void): void {
  const resolver = getMultiFactorResolver(auth, error);
  const hint = resolver.hints.find((x) => x.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!hint) {
    fail(MFA_TEXT.unsupported);
    return;
  }
  mount(root, codeForm(MFA_TEXT.signInCodeTitle, MFA_TEXT.verify, async (code) => {
    await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
  }));
}

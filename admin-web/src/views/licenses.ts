import { h, mount } from "../lib/dom.js";
import { DISCLAIMER } from "../lib/text.js";

/** مكتبات اللوحة المضمّنة في الحزمة (RIGHTS_REGISTER §6). تتحدث مع أي مكتبة runtime جديدة في package.json. */
export const LICENSES = [
  { name: "Firebase JS SDK", license: "Apache-2.0", url: "https://github.com/firebase/firebase-js-sdk/blob/main/LICENSE" },
  { name: "qrcode", license: "MIT", url: "https://github.com/soldair/node-qrcode/blob/master/license" },
  { name: "jsQR", license: "Apache-2.0", url: "https://github.com/cozmo/jsQR/blob/master/LICENSE" },
] as const;

export function licenses(root: HTMLElement): void {
  mount(root,
    h("section", { className: "card" },
      h("h2", {}, "تراخيص مفتوحة المصدر"),
      h("ul", {}, ...LICENSES.map((l) => h("li", { className: "ltr" }, `${l.name} — ${l.license} `, h("a", { href: l.url, target: "_blank", rel: "noopener" }, "license")))),
      h("p", { className: "disclaimer" }, DISCLAIMER)));
}

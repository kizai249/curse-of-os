import QRCode from "qrcode";
import { api } from "../api.js";
import { h, mount } from "../lib/dom.js";
import { DISCLAIMER, errorText } from "../lib/text.js";

/**
 * «شاشة الفرع»: رمز QR اليومي يُعرض على جهاز الفرع، ويتغير تلقائيًا بعد 04:00 (AT-03).
 * الرمز متعدد الاستخدامات: نفس الشاشة لكل الزبائن في نفس اليوم.
 */
export function branchScreen(root: HTMLElement, branchId?: string): () => void {
  let timer = 0;
  async function refresh() {
    try {
      const s = await api.branchScreen(branchId);
      const canvas = h("canvas", {});
      await QRCode.toCanvas(canvas, s.token, { errorCorrectionLevel: "M", margin: 2, width: 520 });
      mount(root,
        h("div", { className: "screen" },
          h("h2", {}, s.name.ar),
          h("p", { className: "muted" }, "امسح الرمز من تطبيق Football Quest لتسجيل حضورك"),
          canvas,
          h("p", { className: "muted code ltr", "data-testid": "branch-day" }, s.day),
          h("p", { className: "disclaimer" }, DISCLAIMER)),
      );
      // التحديث بعد بداية اليوم الجديد بقليل، وكل 10 دقائق احتياطًا.
      const wait = Math.min(Math.max(Date.parse(s.validUntil) - Date.now() + 5_000, 5_000), 10 * 60_000);
      timer = window.setTimeout(refresh, wait);
    } catch (err) {
      mount(root, h("p", { className: "bad" }, errorText(err)));
      timer = window.setTimeout(refresh, 60_000);
    }
  }
  void refresh();
  return () => clearTimeout(timer);
}

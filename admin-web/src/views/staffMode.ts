import jsQR from "jsqr";
import { api, Scope } from "../api.js";
import { h, mount } from "../lib/dom.js";
import { errorText, fill, STAFF_STATES } from "../lib/text.js";

const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "";

/**
 * «وضع الموظف» (ARCHITECTURE §8): مسح رمز الاسترداد بكاميرا المتصفح أو الإدخال اليدوي، وتوليد رمز فاتورة.
 * النتائج بنصوص STAFF_* من PERMISSION_AND_ERROR_STATES §4.1.
 */
export function staffMode(root: HTMLElement, scope: Scope): () => void {
  const branchName = (id?: string) => scope.branches.find((b) => b.branchId === id)?.name.ar ?? id ?? "";
  const result = h("div", { className: "card", "aria-live": "polite" });
  const video = h("video", { playsInline: true, muted: true });
  let stream: MediaStream | null = null;
  let busy = false;
  let timer = 0;

  async function redeem(input: { token?: string; manualCode?: string }) {
    if (busy) return;
    busy = true;
    try {
      const r = await api.redeem(input);
      const ok = r.status === "ok";
      result.replaceChildren(
        h("p", { className: ok ? "ok" : "bad" }, fill(STAFF_STATES[r.stateId] ?? r.stateId, {
          title: r.title?.ar,
          time: time(r.redeemedAt),
          branch: branchName(r.redeemedBranchId),
        })),
      );
    } catch (err) {
      result.replaceChildren(h("p", { className: "bad" }, errorText(err)));
    } finally {
      setTimeout(() => (busy = false), 1500);
    }
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      timer = window.setInterval(() => {
        if (busy || video.videoWidth === 0) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(frame.data, frame.width, frame.height);
        if (code?.data) void redeem({ token: code.data });
      }, 300);
    } catch {
      result.replaceChildren(h("p", { className: "warn" }, "ما قدرنا نفتح الكاميرا. استخدم الإدخال اليدوي."));
    }
  }

  const manual = h("input", { name: "manual", className: "ltr", maxLength: 9, placeholder: "K7M2QX9P", autocomplete: "off" });
  const manualForm = h("form", { className: "grid", onSubmit: (e: Event) => {
    e.preventDefault();
    void redeem({ manualCode: manual.value });
    manual.value = "";
  } }, h("label", {}, "الرمز اليدوي (8 أحرف)", manual), h("button", { type: "submit" }, "استرداد"));

  const invoiceOut = h("p", { className: "ok ltr" });
  const invoiceCampaigns = scope.campaigns.filter((c) => c.trigger === "invoice_code");
  const select = h("select", { name: "campaign" }, ...invoiceCampaigns.map((c) => h("option", { value: c.campaignId }, c.title.ar)));
  const invoice = invoiceCampaigns.length === 0
    ? h("p", { className: "muted" }, "ما فيه حملة رمز فاتورة نشطة في هذا الفرع.")
    : h("form", { className: "grid", onSubmit: async (e: Event) => {
        e.preventDefault();
        try {
          const r = await api.issueInvoiceCode(select.value);
          invoiceOut.textContent = r.code;
        } catch (err) {
          invoiceOut.textContent = errorText(err);
        }
      } }, h("label", {}, "الحملة", select), h("button", { type: "submit" }, "ولّد رمز فاتورة"));

  mount(root,
    h("h2", {}, "وضع الموظف — " + branchName(scope.branches[0]?.branchId)),
    h("div", { className: "card" }, h("h3", {}, "استرداد قسيمة"), video, manualForm),
    result,
    h("div", { className: "card" }, h("h3", {}, "رمز الفاتورة (صالح 24 ساعة، مرة وحدة)"), invoice, invoiceOut),
  );
  void startCamera();
  return () => {
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
  };
}

import { api, Campaign, Role, Scope } from "../api.js";
import { formValues, h, mount } from "../lib/dom.js";
import { cellText, METRICS, ReportRow, toCsv, total } from "../lib/report.js";
import { errorText, METRIC_LABELS, STATUSES, TRIGGERS } from "../lib/text.js";

type Reload = () => Promise<void>;

function status(el: HTMLElement, text: string, ok = true) {
  el.textContent = text;
  el.className = ok ? "ok" : "bad";
}

const toLocalInput = (iso: string) => (iso ? iso.slice(0, 16) : "");
const fromLocalInput = (value: string) => new Date(value + (value.length === 16 ? ":00" : "") + "+03:00").toISOString();

// ── الحملات ─────────────────────────────────────────────

export function campaigns(root: HTMLElement, scope: Scope, role: Role, reload: Reload): void {
  const out = h("p", {});
  const branchName = (id: string) => scope.branches.find((b) => b.branchId === id)?.name.ar ?? id;

  function editor(c?: Campaign) {
    const form = h("form", { className: "grid" },
      role === "usersx_admin" ? h("label", {}, "العلامة", h("select", { name: "brandId" },
        ...scope.brands.map((b) => h("option", { value: b.brandId, selected: c?.brandId === b.brandId }, b.name.ar)))) : null,
      h("label", {}, "العنوان (عربي)", h("input", { name: "titleAr", value: c?.title.ar ?? "", required: true, maxLength: 80 })),
      h("label", {}, "Title (English)", h("input", { name: "titleEn", value: c?.title.en ?? "", required: true, maxLength: 80, className: "ltr" })),
      h("label", {}, "الشروط (عربي)", h("textarea", { name: "termsAr", required: true, maxLength: 500 }, c?.terms.ar ?? "")),
      h("label", {}, "Terms (English)", h("textarea", { name: "termsEn", required: true, maxLength: 500, className: "ltr" }, c?.terms.en ?? "")),
      h("label", {}, "المحفّز", h("select", { name: "trigger", disabled: !!c && c.status !== "draft" },
        ...Object.entries(TRIGGERS).map(([v, t]) => h("option", { value: v, selected: c?.trigger === v }, t)))),
      h("label", {}, "حد الحساب", h("input", { name: "perUserLimit", type: "number", min: 1, max: 20, value: c?.perUserLimit ?? 1 })),
      h("label", {}, "صلاحية القسيمة (أيام)", h("input", { name: "couponValidityDays", type: "number", min: 1, max: 60, value: c?.couponValidityDays ?? 7 })),
      h("label", {}, "البداية (الرياض)", h("input", { name: "startAt", type: "datetime-local", required: true, value: toLocalInput(c?.startAt ?? "") })),
      h("label", {}, "النهاية (الرياض)", h("input", { name: "endAt", type: "datetime-local", required: true, value: toLocalInput(c?.endAt ?? "") })),
      h("label", {}, "الحالة", h("select", { name: "status" },
        ...Object.entries(STATUSES).map(([v, t]) => h("option", { value: v, selected: (c?.status ?? "draft") === v }, t)))),
      h("fieldset", {}, h("legend", {}, "الفروع المشمولة"),
        ...scope.branches.map((b) => h("label", {}, h("input", { type: "checkbox", name: "branch:" + b.branchId, checked: c?.branchIds.includes(b.branchId) ?? false }), b.name.ar))),
      h("button", { type: "submit" }, c ? "حفظ" : "إنشاء حملة"),
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = formValues(form);
      try {
        await api.upsertCampaign({
          campaignId: c?.campaignId,
          brandId: v.brandId,
          title: { ar: v.titleAr, en: v.titleEn },
          terms: { ar: v.termsAr, en: v.termsEn },
          trigger: v.trigger ?? c?.trigger,
          perUserLimit: Number(v.perUserLimit),
          couponValidityDays: Number(v.couponValidityDays),
          startAt: fromLocalInput(v.startAt!),
          endAt: fromLocalInput(v.endAt!),
          status: v.status,
          branchIds: Object.keys(v).filter((k) => k.startsWith("branch:")).map((k) => k.slice(7)),
        });
        status(out, "تم الحفظ");
        await reload();
      } catch (err) {
        status(out, errorText(err), false);
      }
    });
    return form;
  }

  function stockTable(c: Campaign) {
    return h("table", {},
      h("tr", {}, h("th", {}, "الفرع"), h("th", {}, "الإجمالي"), h("th", {}, "محجوز"), h("th", {}, "ممنوح"), h("th", {}, "متبقي"), h("th", {})),
      ...c.branchIds.map((branchId) => {
        const s = c.stock.find((x) => x.branchId === branchId) ?? { total: 0, reserved: 0, issued: 0, remaining: 0 };
        const input = h("input", { type: "number", min: s.reserved + s.issued, value: s.total, style: "width:110px" });
        return h("tr", {},
          h("td", {}, branchName(branchId)), h("td", {}, input), h("td", {}, s.reserved), h("td", {}, s.issued), h("td", {}, s.remaining),
          h("td", {}, h("button", { className: "secondary", onClick: async () => {
            try {
              await api.setStock(c.campaignId, branchId, Number(input.value));
              status(out, "تم تحديث المخزون");
              await reload();
            } catch (err) {
              status(out, errorText(err), false);
            }
          } }, "حفظ المخزون")));
      }));
  }

  mount(root,
    h("h2", {}, "الحملات"),
    out,
    ...scope.campaigns.map((c) => h("details", { className: "card" },
      h("summary", {}, `${c.title.ar} — ${TRIGGERS[c.trigger] ?? c.trigger} — ${STATUSES[c.status] ?? c.status} — ممنوح ${c.totals.issued} / مسترد ${c.totals.redeemed}`),
      editor(c), h("h4", {}, "المخزون لكل فرع"), stockTable(c))),
    h("details", { className: "card", open: scope.campaigns.length === 0 }, h("summary", {}, "حملة جديدة"), editor()),
  );
}

// ── الفروع والعلامات ─────────────────────────────────────

export function branches(root: HTMLElement, scope: Scope, role: Role, reload: Reload): void {
  const out = h("p", {});
  function editor(b?: Scope["branches"][number]) {
    const form = h("form", { className: "grid" },
      !b ? h("label", {}, "معرّف الفرع (حروف إنجليزية صغيرة وأرقام و _)", h("input", { name: "branchId", className: "ltr", pattern: "[a-z0-9_]{3,64}", required: true })) : null,
      role === "usersx_admin" && !b ? h("label", {}, "العلامة", h("select", { name: "brandId" }, ...scope.brands.map((x) => h("option", { value: x.brandId }, x.name.ar)))) : null,
      h("label", {}, "اسم الفرع (عربي)", h("input", { name: "nameAr", required: true, value: b?.name.ar ?? "" })),
      h("label", {}, "Branch name (English)", h("input", { name: "nameEn", required: true, value: b?.name.en ?? "", className: "ltr" })),
      h("label", {}, "المدينة", h("select", { name: "city" }, ...[["RUH", "الرياض"], ["JED", "جدة"], ["KHB", "الخبر"]].map(([v, t]) => h("option", { value: v, selected: b?.city === v }, t)))),
      h("label", {}, "خط العرض (مركز الفرع)", h("input", { name: "lat", type: "number", step: "any", required: true, value: b?.zone?.lat ?? "", className: "ltr" })),
      h("label", {}, "خط الطول", h("input", { name: "lng", type: "number", step: "any", required: true, value: b?.zone?.lng ?? "", className: "ltr" })),
      h("label", {}, "نصف قطر المنطقة (150–500 م)", h("input", { name: "radiusM", type: "number", min: 150, max: 500, value: b?.zone?.radiusM ?? 250 })),
      h("label", {}, h("input", { type: "checkbox", name: "active", checked: b?.active ?? true }), "نشط"),
      h("button", { type: "submit" }, b ? "حفظ" : "إضافة فرع"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = formValues(form);
      try {
        await api.upsertBranch({
          branchId: b?.branchId ?? v.branchId, brandId: v.brandId, name: { ar: v.nameAr, en: v.nameEn }, city: v.city,
          lat: Number(v.lat), lng: Number(v.lng), radiusM: Number(v.radiusM), active: v.active === "on",
        });
        status(out, "تم الحفظ");
        await reload();
      } catch (err) {
        status(out, errorText(err), false);
      }
    });
    return form;
  }

  const brandForm = role === "usersx_admin" ? (() => {
    const form = h("form", { className: "grid" },
      h("label", {}, "معرّف العلامة", h("input", { name: "brandId", className: "ltr", pattern: "[a-z0-9_]{3,64}", required: true })),
      h("label", {}, "الاسم (عربي)", h("input", { name: "ar", required: true })),
      h("label", {}, "Name (English)", h("input", { name: "en", required: true, className: "ltr" })),
      h("button", { type: "submit" }, "حفظ العلامة"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = formValues(form);
      try {
        await api.upsertBrand(v.brandId!, { ar: v.ar!, en: v.en! });
        status(out, "تم حفظ العلامة");
        await reload();
      } catch (err) {
        status(out, errorText(err), false);
      }
    });
    return h("details", { className: "card" }, h("summary", {}, "العلامات (" + scope.brands.length + ")"), form);
  })() : null;

  mount(root,
    h("h2", {}, "الفروع ومناطقها"),
    h("p", { className: "muted" }, "مركز الفرع إحداثيات منشأة (مو لاعب). الزيارة المحققة = رمز اليوم + موقع اللاعب داخل المنطقة وقت المسح."),
    out,
    brandForm,
    ...scope.branches.map((b) => h("details", { className: "card" }, h("summary", {}, `${b.name.ar} (${b.city}) ${b.active ? "" : "— موقوف"}`), editor(b))),
    h("details", { className: "card" }, h("summary", {}, "فرع جديد"), editor()),
  );
}

// ── حسابات الموظفين ─────────────────────────────────────

export function staffAccounts(root: HTMLElement, scope: Scope, role: Role): void {
  const out = h("p", { className: "ltr" });
  const form = h("form", { className: "grid" },
    h("label", {}, "البريد", h("input", { name: "email", type: "email", required: true, className: "ltr" })),
    h("label", {}, "الدور", h("select", { name: "role" },
      h("option", { value: "branch_staff" }, "موظف فرع"),
      role === "usersx_admin" ? h("option", { value: "partner_admin" }, "مسؤول شريك") : null,
      role === "usersx_admin" ? h("option", { value: "usersx_admin" }, "مسؤول USERS-X") : null)),
    role === "usersx_admin" ? h("label", {}, "العلامة", h("select", { name: "brandId" }, ...scope.brands.map((b) => h("option", { value: b.brandId }, b.name.ar)))) : null,
    h("label", {}, "الفرع (لموظف الفرع)", h("select", { name: "branchId" }, h("option", { value: "" }, "—"), ...scope.branches.map((b) => h("option", { value: b.branchId }, b.name.ar)))),
    h("button", { type: "submit" }, "إنشاء الحساب"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = formValues(form);
    try {
      const r = await api.createStaff({ email: v.email, role: v.role, brandId: v.brandId, branchId: v.branchId || undefined });
      out.replaceChildren("رابط تعيين كلمة المرور (أرسله لصاحب الحساب بشكل آمن): ", h("a", { href: r.resetLink, target: "_blank", rel: "noopener" }, "الرابط"));
    } catch (err) {
      status(out, errorText(err), false);
    }
  });
  mount(root, h("h2", {}, "حسابات الموظفين"), h("div", { className: "card" }, form, out));
}

// ── التقارير ────────────────────────────────────────────

export function reports(root: HTMLElement, scope: Scope): void {
  const branchName = (id: string) => scope.branches.find((b) => b.branchId === id)?.name.ar ?? id;
  // يوم اللعبة (يبدأ 04:00 الرياض = UTC+3−4) — نفس مفتاح metricsDaily.
  const today = new Date(Date.now() + (3 - 4) * 3600_000).toISOString().slice(0, 10);
  const table = h("div", {});
  let rows: ReportRow[] = [];
  const form = h("form", { className: "grid" },
    h("label", {}, "من", h("input", { name: "from", type: "date", value: today, required: true })),
    h("label", {}, "إلى", h("input", { name: "to", type: "date", value: today, required: true })),
    h("label", {}, "الفرع", h("select", { name: "branchId" }, h("option", { value: "" }, "كل الفروع"), ...scope.branches.map((b) => h("option", { value: b.branchId }, b.name.ar)))),
    h("button", { type: "submit" }, "عرض"),
    h("button", { type: "button", className: "secondary", onClick: () => {
      const blob = new Blob([toCsv(rows, branchName)], { type: "text/csv;charset=utf-8" });
      const a = h("a", { href: URL.createObjectURL(blob), download: "football-quest-report.csv" });
      a.click();
    } }, "تصدير CSV"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = formValues(form);
    try {
      rows = (await api.report(v.from!, v.to!, v.branchId || undefined)).rows;
      table.replaceChildren(h("table", {},
        h("tr", {}, h("th", {}, "اليوم"), h("th", {}, "الفرع"), ...METRICS.map((m) => h("th", {}, METRIC_LABELS[m]!))),
        ...rows.map((r) => h("tr", { "data-testid": "report-row" }, h("td", { className: "ltr" }, r.day), h("td", {}, branchName(r.branchId)), ...METRICS.map((m) => h("td", {}, cellText(r[m]))))),
        h("tr", {}, h("th", {}, "المجموع"), h("th", {}), ...METRICS.map((m) => {
          const t = total(rows, m);
          // الخانات المقنّعة ما تدخل المجموع؛ «+» تعني إن المجموع الفعلي أكبر.
          return h("th", {}, t.partial && t.value === 0 ? "—" : t.value + (t.partial ? "+" : ""));
        }))));
    } catch (err) {
      table.replaceChildren(h("p", { className: "bad" }, errorText(err)));
    }
  });
  mount(root,
    h("h2", {}, "التقارير المجمعة"),
    h("p", { className: "muted" }, "مؤشرات لكل فرع ويوم فقط. أي خانة أقل من 10 تظهر «أقل من 10»، وما فيه أي معرّف لاعب. التجميع يومي الساعة 04:30 (الرياض)."),
    h("div", { className: "card" }, form), table);
}

// ── المباريات (usersx_admin) ─────────────────────────────

export function matches(root: HTMLElement): void {
  const out = h("p", {});
  const form = h("form", { className: "grid" },
    h("label", {}, "رقم المباراة (1–51)", h("input", { name: "matchNo", type: "number", min: 1, max: 51, required: true })),
    h("label", {}, "الدور", h("select", { name: "stage" }, ...["group", "r16", "qf", "sf", "final"].map((s) => h("option", { value: s }, s)))),
    h("label", {}, "المجموعة (A–F)", h("input", { name: "group", maxLength: 1, className: "ltr" })),
    h("label", {}, "اليوم", h("input", { name: "day", type: "date", required: true })),
    h("label", {}, "الملعب (فارغ لين يتأكد الإسناد)", h("input", { name: "stadiumId", className: "ltr", placeholder: "STD_RUH_KFS" })),
    h("label", {}, "المستضيف (رمز أو مكان شاغر)", h("input", { name: "home", className: "ltr", required: true, placeholder: "KSA / 1A" })),
    h("label", {}, "الضيف", h("input", { name: "away", className: "ltr", required: true })),
    h("label", {}, "النتيجة (بعد النهاية فقط)", h("input", { name: "score", className: "ltr", placeholder: "2-1" })),
    h("button", { type: "submit" }, "حفظ"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = formValues(form);
    const score = /^(\d+)-(\d+)$/.exec(v.score ?? "");
    try {
      await api.upsertMatch({
        matchNo: Number(v.matchNo), stage: v.stage, group: v.group?.toUpperCase() || null, day: v.day,
        stadiumId: v.stadiumId || null, home: v.home?.toUpperCase(), away: v.away?.toUpperCase(),
        status: score ? "finished" : "scheduled", score: score ? { home: Number(score[1]), away: Number(score[2]) } : null,
      });
      status(out, "تم الحفظ — الجدول يتحدث في التطبيق خلال 15 دقيقة.");
    } catch (err) {
      status(out, errorText(err), false);
    }
  });
  mount(root, h("h2", {}, "جدول المباريات ونتائجها"),
    h("p", { className: "muted" }, "تُدخل يدويًا من مصادر منشورة. النتائج للعرض فقط وما تأثر على أي مكافأة."),
    h("div", { className: "card" }, form), out);
}

import { onIdTokenChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { api, Role, Scope } from "./api.js";
import { auth } from "./firebase.js";
import { formValues, h, mount } from "./lib/dom.js";
import { DISCLAIMER, errorText } from "./lib/text.js";
import { branchScreen } from "./views/branchScreen.js";
import { branches, campaigns, matches, reports, staffAccounts } from "./views/manage.js";
import { staffMode } from "./views/staffMode.js";

interface Page {
  id: string;
  title: string;
  roles: Role[];
}

/** الصفحات حسب الدور — ARCHITECTURE §8. */
export const PAGES: Page[] = [
  { id: "screen", title: "شاشة الفرع", roles: ["branch_staff", "partner_admin", "usersx_admin"] },
  { id: "staff", title: "وضع الموظف", roles: ["branch_staff"] },
  { id: "campaigns", title: "الحملات", roles: ["partner_admin", "usersx_admin"] },
  { id: "branches", title: "الفروع", roles: ["partner_admin", "usersx_admin"] },
  { id: "reports", title: "التقارير", roles: ["partner_admin", "usersx_admin"] },
  { id: "accounts", title: "الحسابات", roles: ["partner_admin", "usersx_admin"] },
  { id: "matches", title: "المباريات", roles: ["usersx_admin"] },
];

const app = document.getElementById("app")!;
let cleanup: (() => void) | null = null;

function login(message = "") {
  const out = h("p", { className: "bad" }, message);
  const form = h("form", { className: "card", style: "max-width:420px;margin:10vh auto" },
    h("h1", {}, "لوحة الشركاء"),
    h("label", {}, "البريد", h("input", { name: "email", type: "email", required: true, className: "ltr", autocomplete: "username" })),
    h("label", {}, "كلمة المرور", h("input", { name: "password", type: "password", required: true, className: "ltr", autocomplete: "current-password" })),
    h("p", {}, h("button", { type: "submit" }, "دخول")), out,
    h("p", { className: "disclaimer" }, DISCLAIMER));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = formValues(form);
    try {
      await signInWithEmailAndPassword(auth, v.email!, v.password!);
    } catch {
      out.textContent = "بيانات الدخول غير صحيحة.";
    }
  });
  mount(app, form);
}

async function render(user: User) {
  const token = await user.getIdTokenResult();
  const role = token.claims.role as Role | undefined;
  if (!role) {
    await signOut(auth);
    login("هذا الحساب ما له صلاحية على اللوحة.");
    return;
  }
  const pages = PAGES.filter((p) => p.roles.includes(role));
  let scope: Scope;
  try {
    scope = await api.scope();
  } catch (err) {
    mount(app, h("p", { className: "bad" }, errorText(err)));
    return;
  }
  const main = h("main", {});
  const current = () => pages.find((p) => "#" + p.id === location.hash) ?? pages[0]!;
  const reload = async () => {
    scope = await api.scope();
    show();
  };
  function show() {
    cleanup?.();
    cleanup = null;
    const page = current();
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + page.id));
    switch (page.id) {
      case "screen": cleanup = branchScreen(main, role === "branch_staff" ? undefined : scope.branches[0]?.branchId); break;
      case "staff": cleanup = staffMode(main, scope); break;
      case "campaigns": campaigns(main, scope, role!, reload); break;
      case "branches": branches(main, scope, role!, reload); break;
      case "reports": reports(main, scope); break;
      case "accounts": staffAccounts(main, scope, role!); break;
      case "matches": matches(main); break;
    }
  }
  const nav = h("nav", {}, ...pages.map((p) => h("a", { href: "#" + p.id }, p.title)));
  mount(app,
    h("header", { className: "top" }, h("strong", {}, "Football Quest — لوحة الشركاء"), nav, h("span", { className: "spacer" }),
      h("span", { className: "muted ltr" }, user.email ?? ""), h("button", { className: "secondary", onClick: () => signOut(auth) }, "خروج")),
    main);
  window.onhashchange = show;
  show();
}

onIdTokenChanged(auth, (user) => {
  cleanup?.();
  cleanup = null;
  if (user) void render(user);
  else login();
});

/** أداة DOM صغيرة بدون إطار عمل. */
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    else if (key === "className") el.className = String(value);
    else if (key in el && typeof value !== "string") (el as unknown as Record<string, unknown>)[key] = value;
    else el.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function mount(root: HTMLElement, ...children: Child[]): void {
  root.replaceChildren(...children.filter((c): c is Node | string | number => c !== null && c !== undefined && c !== false).map((c) => (c instanceof Node ? c : String(c))));
}

export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
}

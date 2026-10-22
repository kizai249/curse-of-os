import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LICENSES } from "../src/views/licenses.js";

describe("licenses page (RIGHTS_REGISTER §6)", () => {
  it("lists every runtime dependency", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies: Record<string, string> };
    const listed = LICENSES.map((l) => l.name.toLowerCase());
    for (const dep of Object.keys(pkg.dependencies)) expect(listed.some((n) => n.startsWith(dep.toLowerCase()))).toBe(true);
  });
});

// يجهّز .secret.local للمحاكي (مفتاح تطوير فقط — الإنتاج من Secret Manager: BRANCH_CODE_SECRET).
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const file = resolve(dirname(fileURLToPath(import.meta.url)), "../.secret.local");
if (!existsSync(file)) {
  writeFileSync(file, `BRANCH_CODE_SECRET=dev-only-${randomBytes(24).toString("hex")}\n`);
  console.log("created .secret.local (dev-only branch code secret)");
}

// ينسخ shared/contracts/content إلى lib/content-data عشان يُنشر مع الدوال (المصدر الوحيد يبقى shared/).
import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../lib/content-data");
mkdirSync(target, { recursive: true });
cpSync(resolve(here, "../../../shared/contracts/content"), target, { recursive: true });

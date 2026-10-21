import { defineConfig } from "vitest/config";

// اختبارات الوحدات: منطق نقي بدون محاكي.
export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
  },
});

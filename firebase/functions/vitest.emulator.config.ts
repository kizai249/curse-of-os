import { defineConfig } from "vitest/config";

// اختبارات المحاكي (Emulator Suite): القواعد والدوال. تُشغّل عبر `npm run test:emulator` فقط.
export default defineConfig({
  test: {
    include: ["test/emulator/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

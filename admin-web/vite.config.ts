import { defineConfig } from "vite";

export default defineConfig({
  build: { outDir: "dist", sourcemap: false, target: "es2022" },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
} as never);

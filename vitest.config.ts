import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: [
      "packages/**/test/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the real test suite. docs/**/round1 holds evidence snapshots, not tests.
    include: ["tests/**/*.test.ts"],
    coverage: { lines: 80 },
  },
});

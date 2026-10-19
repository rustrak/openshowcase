import { defineConfig } from "vitest/config";

// Node, not browser mode: the CLI drives Chromium itself through Playwright. Unit tests that
// need a page launch a plain headless Chromium; e2e records for real with the built extension
// (apps/extension/.output/chrome-mv3, built first by Turbo).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/__test__/unit/**/*.test.ts"],
          environment: "node",
          testTimeout: 20_000,
        },
      },
      {
        test: {
          name: "e2e",
          include: ["src/__test__/e2e/**/*.test.ts"],
          environment: "node",
          testTimeout: 120_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});

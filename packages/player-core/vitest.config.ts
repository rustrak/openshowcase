import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss()],
  // Pre-bundle the runtime deps up front — an on-demand optimize mid-run forces Vite to
  // reload the page, breaking whatever test was in flight (the integration test is the first
  // to pull in @rustrak/openshowcase-schema's valibot inside the browser project).
  optimizeDeps: {
    include: ["alien-signals", "@rustrak/openshowcase-schema > valibot"],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/__test__/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          include: [
            "src/__test__/component/**/*.test.ts",
            "src/__test__/integration/**/*.test.ts",
          ],
          setupFiles: ["./src/__test__/setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

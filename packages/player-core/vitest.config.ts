import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  // Pre-bundle zod up front — the integration test is the first to pull in @rustrak/openshowcase-schema's
  // runtime code inside the browser project, and an on-demand optimize mid-run forces Vite
  // to reload the page, breaking whatever test was in flight.
  optimizeDeps: { include: ["@rustrak/openshowcase-schema > zod"] },
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
          setupFiles: ["vitest-browser-svelte", "./src/__test__/setup.ts"],
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

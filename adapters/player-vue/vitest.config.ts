import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Real Chromium: the player needs layout, media and blob: URLs.
export default defineConfig({
  plugins: [vue()],
  // Pre-bundle up front: an on-demand optimize mid-run reloads the page and breaks the
  // in-flight test (same as player-core and the exporter).
  optimizeDeps: { include: ["vue", "jszip"] },
  test: {
    include: ["src/__test__/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});

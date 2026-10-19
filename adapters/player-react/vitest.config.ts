import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Real Chromium: the player needs layout, media and blob: URLs.
export default defineConfig({
  // Pre-bundle up front: an on-demand optimize mid-run reloads the page and breaks the
  // in-flight test (same as player-core and the exporter).
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-dev-runtime",
      "@rustrak/openshowcase-exporter > jszip",
    ],
  },
  test: {
    include: ["src/__test__/**/*.test.tsx"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});

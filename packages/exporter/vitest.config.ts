import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Real Chromium, not jsdom: image.ts uses OffscreenCanvas + createImageBitmap
// (browser-only APIs), and buildDemoBundle calls into it for any non-webp photo step.
export default defineConfig({
  // Pre-bundle up front — an on-demand optimize mid-run forces Vite to reload the page,
  // breaking whatever test was in flight (same issue player-core hit with zod).
  optimizeDeps: { include: ["jszip"] },
  test: {
    include: ["src/__test__/unit/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});

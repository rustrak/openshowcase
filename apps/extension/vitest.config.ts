import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// WxtVitest polyfills browser.*/chrome.* with @webext-core/fake-browser and resolves
// the @/ alias + WXT globals (import.meta.env.BROWSER, etc.) — same as a real build.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/__test__/unit/**/*.test.ts"],
          environment: "node",
          // WxtVitest() registers this setup file (it stubs `chrome`/`browser` with
          // fakeBrowser) on the root config; since Vitest 5, inline projects don't inherit
          // plugin-injected setupFiles, so the project has to name it explicitly.
          setupFiles: ["virtual:wxt-setup"],
        },
      },
    ],
  },
});

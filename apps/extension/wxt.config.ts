import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "OpenShowcase",
    description: "Interactive demo recorder — open source",
    permissions: ["storage", "tabs", "tabCapture", "offscreen"],
    host_permissions: ["<all_urls>"],
  },
  // Attached to every GitHub release (see .github/workflows/release.yml).
  zip: {
    artifactTemplate: "openshowcase-extension-{{version}}-{{browser}}.zip",
  },
});

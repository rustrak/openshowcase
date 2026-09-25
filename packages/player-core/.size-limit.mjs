// What a host app actually ships from this package: bundled, minified and brotlied by
// esbuild, with the schema left out (the host already has it through the adapters).
const shared = {
  path: "dist/index.js",
  ignore: ["@rustrak/openshowcase-schema"],
};

export default [
  {
    ...shared,
    name: "Player (JS + CSS)",
    import: "{ Player }",
    limit: "35 KB",
  },
  {
    ...shared,
    name: "Tooltip geometry only (the player must tree-shake away)",
    import: "{ bubblePath, computeTooltipPlacement }",
    limit: "2 KB",
    // esbuild keeps the CSS of JS modules it tree-shook away (Rollup, webpack and Rspack
    // drop it, per `sideEffects`), so only the JS is measured here.
    modifyEsbuildConfig: (config) => ({
      ...config,
      external: [...(config.external ?? []), "*.css"],
    }),
  },
];

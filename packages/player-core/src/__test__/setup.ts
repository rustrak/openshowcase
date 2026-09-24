// Only Player.svelte imports the compiled Tailwind stylesheet — components tested in
// isolation (Hotspot, Tooltip, etc.) never pull it in on their own, so their rendered DOM
// looks unstyled under vitest-browser-svelte. Import it here once for every browser test.
import "../app.css";

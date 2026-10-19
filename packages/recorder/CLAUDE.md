# @rustrak/openshowcase-recorder

Node CLI that lets an AI agent record a demo: it drives a headless Chromium through a JSON flow (`src/flow.ts`) while the **real extension** records it, and writes the result as an `.osrec` file the extension's editor imports. Ships the agent skill (`skill/SKILL.md`, installed with `install-skill`).

## Commands

- `pnpm build`: rslib bundles `src/bin.ts` to `dist/cli.js` and copies `skill/` and the built extension (`apps/extension/.output/chrome-mv3`) into `dist/`. Turbo builds the extension first (`turbo.json`).
- `pnpm test`: two Vitest projects in Node. `unit` (some tests launch a plain headless Chromium for `run-flow`), `e2e` (records with the built extension, then imports the file in its editor). e2e needs the extension built; Turbo's `test` task does it.
- Try it: `node dist/cli.js inspect <url>`, `node dist/cli.js record flow.json --profile /tmp/p`.

## How recording works

- `browser.ts` `launch()`: `chromium` channel (Chrome-branded builds drop `--load-extension`), `--allowlisted-extension-id=<id>` + `--auto-accept-this-tab-capture` (without them tabCapture fails with "Extension has not been invoked"). The id is computed from the extension's real path (`extensionIdForPath`, tested against a real id).
- No Playwright viewport emulation (`viewport: null`): tabCapture records the real tab, and an emulated viewport made click `yFrac` disagree with the video. `fitViewport` resizes the window over CDP so the page is exactly the flow's size: even headless keeps ~87px for invisible browser UI. `--force-device-scale-factor=2` gives the extension's 2x capture real pixels.
- The CLI calls the extension's automation API (`apps/extension/lib/automation.ts`, `globalThis.openshowcase` in its service worker) through `worker.evaluate`. The `Automation` interface in `browser.ts` mirrors it: keep them in sync (e2e catches a mismatch). The file comes out in 8 MB base64 chunks: one CDP message can't carry a long recording.
- `runFlow` returns a **direction** (wall-clock ms): `clicks` (tooltip/zoom/`hotspot: false`, matched to the extension's click markers by `lib/direction.ts`), `cuts` (every `wait`, `goto`, and app waits ≥200ms: cut from the clips as jump cuts) and `zooms` (fill/select/hover zoom: the clip splits wide → zoomed → wide in the extension's `lib/segments.ts`). The `.osrec` format lives only in the extension (`lib/recording-file.ts`); the e2e test reads its header inline.
- Camera feel: `cursor.ts` injects a cursor (headless draws none; human recordings have Chrome's burned in) built with DOM APIs only (CSP/Trusted Types safe), following the real CDP mouse. `human.ts` gives minimum-jerk Bézier paths; `approach()` in run-flow waits for the target (off camera), smooth-scrolls it to the middle if it's outside 12–85% of the height, then moves there. `fill` clicks into an unfocused field first, as a `hotspot: false` click.
- `open.ts`: the review browser ("studio", `~/.openshowcase/studio`) is a plain detached Chromium, not automated, so downloads and the playground work and it outlives the CLI. The file is copied into the studio's own extension copy (`imports/`) and the editor imports it via `editor.html?import=` (extension's `core/import-source.ts`). Chromium forwards the URL to an already-open studio as a new tab.
- `inspect` is the agent's eyes: text first. No screenshot unless `--screenshot`, link URLs stripped from the tree (`compactSnapshot`), `--within <css>` narrows it.
- Only `login` writes to the profile (`keepChanges`). `inspect` and `record` run on a temp copy (`scratchCopy`, caches skipped), so re-recording starts from the same browser state. Server-side effects of a flow are real.

## Gotchas

- Don't use `new URL("./x", import.meta.url)`: Rspack treats it as an asset import and fails the build. Use `join(dirname(fileURLToPath(import.meta.url)), "x")`.
- `RECORDING_PACE` drives how the demo feels (pauses before clicks show the hover state in the photo step; `fill` types key by key so it becomes a clip). `inspect` uses `INSTANT_PACE`.
- Flow targets map to Playwright locators in `locate()`; prefer role+name in docs and the skill.

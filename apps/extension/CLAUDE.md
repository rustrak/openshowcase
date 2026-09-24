# @rustrak/openshowcase-extension

WXT + React Chrome extension (MV3) with two jobs: **capture** (continuous tab video + click/activity markers) and **edit** (a full-page editor that turns a capture into a `Demo`, previews it and exports it).

## Commands

- `pnpm dev` / `pnpm build` (`:firefox` variants exist). Test manually by loading `.output/chrome-mv3` unpacked. There is no E2E test for recording.
- `pnpm test`: Vitest in Node with WXT's `fakeBrowser` (in-memory `browser.*`/`chrome.*`). No real DOM, canvas or IndexedDB.
- `postinstall` runs `wxt prepare` to generate `.wxt/` types.

## Recording pipeline and timing gotchas

- `content.ts` → markers via `sendMessage("marker")`. `background.ts` owns session state and the offscreen document. `offscreen/` is the only context that can hold a `MediaStream`/`MediaRecorder`.
- **Timestamp every marker with `Date.now()` minus the event's age** (`performance.now() - event.timeStamp`, see `lib/press-timing.ts`). Never compare `performance.timeOrigin + performance.now()` across contexts: the monotonic clock pauses during sleep, so an old tab lags a fresh offscreen document by minutes.
- A click is timed by its **press** (`pointerdown`), confirmed by `click`. Many widgets react on pointerdown, so the photo step must be the frame before the press.
- Recording t=0 is the **capture time of the first frame** after `start()` (`MediaStreamTrackProcessor` on a cloned track, see `offscreen/lib/recording-clock.ts`). Anchoring on the `start` event is 1–2+ frames late.
- Always pass the tab's real `width`/`height` to the offscreen document. Otherwise `tabCapture` letterboxes (black bars baked in). Never use `min*` constraints (they throw `OverconstrainedError`).
- On stop, the webm is remuxed without re-encoding (`offscreen/lib/remux.ts`, Mediabunny) to add Duration + Cues. Raw MediaRecorder webm seeks slowly and imprecisely.
- Chrome burns the real cursor into tab captures. `lib/segments.ts` only keeps a video clip between clicks when there is activity (scroll/type/drag) or the gap is ≥3s. Otherwise the steps go photo → photo and the hotspot glides. Fast-forwarding idle stretches was tried and rejected.
- The content script checks `ctx.isInvalid` (not `isInvalidated`) and detaches listeners in `ctx.onInvalidated`. An orphaned script after an extension reload would otherwise throw "Extension context invalidated" forever.

## Testing patterns

- Code touching APIs `fakeBrowser` lacks (`tabCapture`, `offscreen`, `action`, IndexedDB) takes injectable deps. `startRecording(deps?: StartRecordingDeps)` in `background.ts` is the reference.
- `vitest.config.ts` must list `setupFiles: ["virtual:wxt-setup"]` explicitly: Vitest 5 inline projects don't inherit it.
- `@webext-core/messaging` allows one listener per message type per context. Tests calling `onMessage` must `unlisten()` / `removeAllListeners()` in `afterEach`.
- Upgrade `wxt` and `@webext-core/messaging` together: each major pairs with a specific fake-browser version.

## Messaging and storage

- New messages go in the typed `ProtocolMap` in `lib/messaging.ts`, never ad hoc `browser.runtime.sendMessage`.
- Session state is `recordingSession` in `lib/recording-storage.ts` (`storage.defineItem`). Use it or `patchRecordingSessionState()`, not raw `browser.storage.session`.

## Editor

- `Editor.tsx` is wiring only. The document lives in `hooks/use-editor-document.ts` over the pure `core/history.ts`: `commit(update, coalesceKey?)` makes one undo step per key run, and `patchAll` applies async results without an undo entry.
- Every step-array mutation is a pure function in `core/step-editor.ts`. Geometry (`sequence-layout`, `camera-frame`, `stage-fit`) is pure and tested under `core/`.
- Pointer gestures keep a local draft and commit once on release (`lib/pointer-drag.ts`): one undo step per gesture, and no React re-render per pointer move.
- The playhead and timecode write to the DOM directly from `hooks/use-clip-playback.ts`. The stage stays mounted in Preview because it owns the `<video>`.
- `components/stage/player-visuals.css` + `HotspotLayer.tsx` mirror player-core's hotspot/tooltip look. Keep them in sync.
- Manual testing without recording: serve `.output/chrome-mv3` over http, seed the `openshowcase` IndexedDB with a canvas-generated webm + markers, and open `editor.html?recordingId=…`. Chrome defers media in hidden tabs, so background screenshots show empty video.

## UI

- Colors, surfaces, type scale and motion come from tokens in `assets/theme.css`. Never hardcode colors in editor/popup chrome. Exceptions (demo content, not UI): `lib/player-appearance.ts` and the hotspot presets in `ColorField`.
- `components/ui/` is vendored shadcn on Base UI. After `npx shadcn add`: move the files out of `apps/components/`, fix `cn` imports to `@/lib/utils`, keep our `button.tsx`, strip `"use client"`, and check the `data-*` orientation variants match the installed Base UI (`data-[orientation=horizontal]:`). A mismatch fails silently.
- The wordmark in `components/brand/` is outlined glyph paths generated from Outfit 700. Regenerate it, never hand-edit it or render the word as text.
- Icons: `lucide-react` only.
- Permissions are `storage`, `tabs`, `tabCapture`, `offscreen`, `<all_urls>`. Adding one needs a real justification for store review.

# OpenShowcase

Open source, self-hosted tool for turning a recorded web-app flow into an embeddable interactive demo. A Chrome extension records the tab, an editor inside the extension turns the recording into steps, and the exporter produces a pure-data bundle that a player component renders in the host app.

## Commands

Run from the repo root (Turborepo fans out to every workspace):

- `pnpm build` / `pnpm check-types` / `pnpm test` / `pnpm size`
- `pnpm lint` / `pnpm format`: Biome check / check with `--write`
- One package: `pnpm --filter @rustrak/openshowcase-<name> <script>`
- Extension dev: `pnpm --filter @rustrak/openshowcase-extension dev`, then load `apps/extension/.output/chrome-mv3` unpacked in `chrome://extensions`

Each workspace has its own `CLAUDE.md` with its build, test and gotcha notes. Read it before changing that workspace.

## Architecture decisions

- **Capture is video + screenshots, never DOM cloning.** Replaying a cloned DOM breaks cross-origin assets, fonts and CSS once the demo is embedded on another domain.
- **The editor lives inside the extension.** There is no backend. Recordings live in IndexedDB, and export runs in the browser (JSZip + download).
- **The exported bundle is pure data:** `steps.json` + `assets/*.webp` (photo frames) + `assets/recording.webm` (only if there are video steps). It never ships a player runtime. The player is an npm component in the host app (`player-react` / `player-vue`).
- **`packages/schema` is the single source of truth** for the demo format. Read `packages/schema/src/index.ts` for the current shape rather than trusting any copy of it.
- Pipeline: `content.ts` markers + continuous tab video → `apps/extension/lib/segments.ts` derives steps (click → photo step with hotspot, activity between clicks → video clip) → editor → exporter → player.

## Conventions

- TypeScript strict everywhere. All code, comments and docs in English.
- Put non-trivial orchestration and state-machine logic in plain, unit-tested TS under `core/`-style directories. Keep components to markup + wiring (see `packages/player-core/CLAUDE.md`).
- No analytics, telemetry or calls to external services. The project is self-hosted by design.
- Commits: Conventional Commits in English (`feat(extension): …`). The Lefthook pre-commit hook runs `biome check --write` on staged files. Never bypass it with `--no-verify`.

## Dependencies

- Pin every dependency to an exact version (`.npmrc` sets `save-exact=true`). The only ranges allowed are the adapters' `peerDependencies` (`react`, `vue`).
- pnpm 12 settings (`overrides`, `allowBuilds`) go in `pnpm-workspace.yaml`, never in `package.json`. Installs reject versions published less than 24h ago (`minimumReleaseAge`), so pick an older exact version instead of adding exclusions. New packages with install scripts must be added to `allowBuilds`.
- `packages/*` and `adapters/*` are published to npm as public packages and ship only `dist/` (`files`). `apps/*` and the root stay `private`. Workspace deps use `workspace:*`, which pnpm rewrites to exact versions on publish.
- Stay on TypeScript 6.x. TS 7.0 has no programmatic API, which breaks `dts-bundle-generator` (player-core) and `vue-tsc` (player-vue).

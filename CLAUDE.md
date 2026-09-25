# OpenShowcase

Open source, self-hosted tool for turning a recorded web-app flow into an embeddable interactive demo. A Chrome extension records the tab, an editor inside the extension turns the recording into steps, and the exporter produces a pure-data bundle that a player component renders in the host app.

## Commands

Run from the repo root (Turborepo fans out to every workspace):

- `pnpm build` / `pnpm check-types` / `pnpm test` / `pnpm size`
- `pnpm lint` / `pnpm format`: Biome check / check with `--write`
- `pnpm ci`: what CI runs on every PR (`biome ci` + build, types, tests, size)
- `pnpm changeset`: add a changeset. Only changes with a changeset get released
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

## Releases

- Changesets. Every `@rustrak/openshowcase-*` package and the extension are one `fixed` group: they always share a version.
- `.github/workflows/release.yml` on push to `main`: pending changesets → opens the "chore: version packages" PR. Merging it → publishes to npm with the `NPM_TOKEN` secret (`pnpm release`), then creates the `vX.Y.Z` GitHub release with the extension zip (`openshowcase-extension-<version>-chrome.zip`) attached. The release body comes from `scripts/release-notes.mjs`.

## Dependencies

- Pin every dependency to an exact version (`.npmrc` sets `save-exact=true`). The only ranges allowed are the adapters' `peerDependencies` (`react`, `vue`).
- Dependencies shared by more than one workspace live in the named `catalogs` of `pnpm-workspace.yaml` (`core`, `react`, `tailwind`, `tooling`) and are referenced as `catalog:<name>`. Bump them there, never in a `package.json`. A dependency used by a single workspace stays pinned in its own `package.json` until a second workspace needs it.
- pnpm 12 settings (`overrides`, `allowBuilds`) go in `pnpm-workspace.yaml`, never in `package.json`. Installs reject versions published less than 24h ago (`minimumReleaseAge`), so pick an older exact version instead of adding exclusions. New packages with install scripts must be added to `allowBuilds`.
- `packages/*` and `adapters/*` are published to npm as public packages and ship only `dist/` (`files`). `apps/*` and the root stay `private`. Workspace deps use `workspace:*`, which pnpm rewrites to exact versions on publish.
- Stay on TypeScript 6.x. TS 7.0 has no programmatic API, which breaks `vue-tsc` (player-vue).

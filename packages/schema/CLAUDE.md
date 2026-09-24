# @rustrak/openshowcase-schema

Zod schema + TS types for the demo format (`steps.json`). This is the source of truth for every other workspace. Its only runtime dependency is `zod` (3 KB brotli budget, `pnpm size`).

- Bump `SCHEMA_VERSION` in `src/index.ts` on any breaking change to the `Demo`/`Step` shape.
- `parseDemo()` is the single validation point for untrusted JSON. Consumers rely on it, so don't add ad hoc validation elsewhere.
- Changes ripple everywhere. Grep `packages/`, `adapters/` and `apps/` for a field before renaming or removing it.

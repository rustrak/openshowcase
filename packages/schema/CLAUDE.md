# @rustrak/openshowcase-schema

Valibot schema + TS types for the demo format (`steps.json`). This is the source of truth for every other workspace. Its only runtime dependency is `valibot` (3 KB brotli budget, `pnpm size`). Valibot was picked over Zod for the host app's bundle: see issue #4.

- Bump `SCHEMA_VERSION` in `src/index.ts` on any breaking change to the `Demo`/`Step` shape.
- `parseDemo()` is the single validation point for untrusted JSON. Consumers rely on it, so don't add ad hoc validation elsewhere. It throws `DemoParseError`, never the library's own error: that keeps the validator swappable without breaking the public API.
- `pnpm test`: Vitest in Node. `parse-demo.test.ts` pins the validation rules, so any change to a rule shows up there.
- Changes ripple everywhere. Grep `packages/`, `adapters/` and `apps/` for a field before renaming or removing it.

# OpenShowcase extension

The Chrome extension that records and edits [OpenShowcase](https://github.com/rustrak/openshowcase) demos. It is built with [WXT](https://wxt.dev) and React.

- **Recorder:** captures the current tab as continuous video plus click, scroll, typing and drag markers.
- **Editor:** opens when you stop recording. It splits the recording into photo steps (with hotspots) and video clips, and lets you edit tooltips, trim clips, add pan & zoom, reorder steps, preview and export.

Everything stays local: recordings are stored in the extension's IndexedDB, and export runs in the browser.

## Development

From the repo root:

```sh
pnpm install
pnpm --filter @rustrak/openshowcase-extension dev
```

`dev` launches a browser with the extension loaded and hot reload. To load a production build yourself:

```sh
pnpm --filter @rustrak/openshowcase-extension build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select `apps/extension/.output/chrome-mv3`.

## Scripts

| Script | Description |
| --- | --- |
| `dev` / `dev:firefox` | Dev mode with hot reload |
| `build` / `build:firefox` | Production build into `.output/` |
| `zip` / `zip:firefox` | Package the build for store submission |
| `test` / `test:watch` | Unit tests (Vitest) |
| `check-types` | TypeScript check |

## Permissions

`tabCapture` and `offscreen` to record the tab, `tabs` to find the tab to record and open the editor, `storage` for the recording session state, and access to all sites so the recorder can observe clicks on the page you record.

## License

MIT

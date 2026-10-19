# @rustrak/openshowcase-recorder

Lets an AI agent (or a script) record an [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demo. You describe the flow as a JSON file. The recorder plays it in a headless Chromium, paced for the camera, while the OpenShowcase extension records it exactly as it records you. You get an `.osrec` file to review and polish in the editor.

## Install

```sh
npm install -D @rustrak/openshowcase-recorder
npx playwright install chromium   # once, if you don't have Playwright's Chromium
```

## Use it with Claude Code

```sh
npx openshowcase-recorder install-skill
```

This adds the `openshowcase-demo` skill to `.claude/skills/` in your project. Then ask Claude something like *"record a demo of creating an invoice"*. It explores the app, writes the flow, checks it, records it and hands you the `.osrec` file.

## Use it yourself

```sh
npx openshowcase-recorder login https://app.example.com        # sign in once, close the window
npx openshowcase-recorder inspect https://app.example.com      # accessibility tree (--screenshot for an image)
npx openshowcase-recorder inspect demos/invoice.flow.json      # run the flow fast, see where it ends
npx openshowcase-recorder record demos/invoice.flow.json --open  # → invoice.osrec, opened for review
```

`--open` (or `open <file.osrec>`) opens the recording in the OpenShowcase editor, in a separate review browser that stays open and keeps your recordings. You can also import the file in your own Chrome: OpenShowcase toolbar button → **Import a recording**.

Recordings look like a person did them: a visible cursor that moves like a hand, targets scrolled into comfortable view, waits cut out of the video. The flow directs the camera: `"zoom": 1.8` on a click, fill, select or hover, and `"hotspot": false` on clicks that should just play instead of stopping the demo.

A flow:

```json
{
  "title": "Create an invoice",
  "url": "https://app.example.com/invoices",
  "viewport": { "width": 1280, "height": 800 },
  "steps": [
    { "action": "click", "target": { "role": "button", "name": "New invoice" }, "tooltip": "Create your first invoice" },
    { "action": "fill", "target": { "label": "Customer" }, "value": "Acme Corp", "zoom": 1.8 },
    { "action": "click", "target": { "role": "button", "name": "Save" }, "tooltip": "Save it" }
  ]
}
```

Actions: `click`, `fill`, `press`, `select`, `hover`, `scroll`, `goto`, `wait` (always cut from the video). Targets: `role` (+ `name`), `label`, `placeholder`, `text`, `testId` or `css`, with optional `exact` and `nth`. The [skill](./skill/SKILL.md) documents them all.

Steps really run against your app. Browser state (localStorage, cookies) is thrown away after every run, so each run starts from what `login` saved, but server-side changes stay.

Options: `--profile <dir>` (default `~/.openshowcase/profile`), `--extension <dir>` (record with your own extension build), `--headed` (show the window).

## License

[MIT](./LICENSE)

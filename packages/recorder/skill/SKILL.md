---
name: openshowcase-demo
description: Record an interactive product demo of a web app flow with OpenShowcase. Use when the user asks to record, film, capture or make a demo, walkthrough, product tour, user guide or tutorial of a flow in their app (e.g. "make a demo of creating an invoice").
---

# Record an OpenShowcase demo

You direct a short interactive user guide: you script the flow as a JSON file, check it against the real app, and record it in a headless Chromium with a human-looking cursor. The user reviews the result in the OpenShowcase editor and polishes what doesn't convince them. Recording runs in the background and never touches the user's own browser.

The tool is a CLI. If `command -v openshowcase-recorder` finds it, run it as `openshowcase-recorder <command>`; otherwise `npx @rustrak/openshowcase-recorder <command>`. Below, `osr` stands for whichever works. If it says Chromium is missing, run `npx playwright install chromium` once.

## What makes a good demo

A user guide nobody finishes is worthless. Think like a video editor, not a test script.

- **Short.** 20–40 seconds of video, 4–8 hotspot steps. If the flow is longer, show the essential path and leave the rest out (or split it into several demos and say so).
- **One idea per hotspot.** A hotspot stops the demo until the viewer clicks it, so it must teach something: a decision, a key field, the button that matters. Its `tooltip` says what the viewer achieves, in their language ("Choose who you're invoicing"), never the mechanics ("Click the combobox").
- **Routine clicks don't stop the demo.** Opening a dropdown before picking from it, focusing a field, confirming a dialog, moving through a menu, the second and third repetition of something already shown: give those `"hotspot": false`. They play in the video, cursor and all, without interrupting.
- **Repetition is shown once.** Adding three invoice lines? Show the first one properly (hotspots, maybe a zoom), let the others run quickly with `"hotspot": false`, or leave them out entirely.
- **Zoom like a camera operator.** Start wide so the viewer knows where they are. Zoom (`"zoom": 1.5`–`2.2`) into a small area when the detail matters: a field being typed, a cell, a small button, a total that updates. Don't zoom on page changes or large layouts, and don't zoom every step: alternate wide shots and close-ups, and end on the result.
- **No dead time.** Every `wait` is cut out of the video automatically, and so is time spent waiting for a target to appear or a page to load. So wait for the app freely (`{ "action": "wait", "for": <target> }` is best), but never use a wait to "show" something: the step's own pause and the final shot do that.
- **Framing is automatic.** Before using a target near the top or bottom edge, the recorder scrolls it to the middle of the screen with a smooth scroll. Add a `scroll` step only to show something on purpose (e.g. the totals at the end).
- **Realistic, made-up data**, short values (typing takes screen time).
- **Name it.** Give the flow a `title`: what the viewer learns to do, as a short task in their language and the app's own words ("Create an invoice", "Invite a teammate"). 2–5 words, no app name, no "Demo of…" or "How to…". It's the demo's name in the editor, shown in the player's browser bar and used as the export's file name.

## Workflow

1. **Agree on the demo.** Ask what the viewer should learn, the start URL and the account to use, unless the user already said. Prefer a demo or seeded account, and never script destructive actions (delete, pay, send, invite) unless the user confirms it's safe.

2. **Sign in, if the app needs it.** Run `osr login <url>` and ask the user to sign in in the window that opens and close it when done. The session is saved in the recording profile and reused by every later command: a one-time step.

3. **Look at the start page.** `osr inspect <url> --screenshot /tmp/osr-start.png`, and look at that screenshot once, to understand the layout and plan the shots: what's small enough to deserve a zoom, what's far down the page. Everything else you read from the accessibility tree.

4. **Write the flow step by step.** Create `demos/<name>.flow.json` (format below). After adding a few steps, run `osr inspect demos/<name>.flow.json`. It runs the flow fast, without recording, and prints the page where it ends (or which step failed, with the page at that moment) as an accessibility tree: roles and names, exactly what targets use.
   - **Save tokens:** read the tree, not screenshots. Take another screenshot (`--screenshot <png>`) only when the tree can't answer (a canvas, an icon-only UI, a layout question for a zoom). On big apps, narrow the tree to the part you're working in with `--within <css>` (e.g. `--within main`, `--within "[role=dialog]"`) instead of reading the whole page each time.
   - Inspect **really performs** the steps. Browser state is thrown away after every run (each run starts from what `login` saved), but anything the app saves on its server stays. Make the flow work when run again (e.g. unique names), or ask the user to reset the data before recording.

5. **Edit the flow like a cut.** Before recording, reread it against "What makes a good demo": which clicks deserve a hotspot, where a zoom helps, what's repetitive, whether it's too long.

6. **Check it end to end.** `osr inspect demos/<name>.flow.json` must report `Steps: all N ran`.

7. **Record and open it.** `osr record demos/<name>.flow.json --out demos/<name>.osrec --open`. It prints the demo's size: `Demo: N hotspot steps, about Xs of video after cutting Ys of waiting`. If it's over ~40s or has more than ~8 hotspots, tighten the flow (step 5) and record again. `--open` opens the recording in the OpenShowcase editor, in a separate review browser that stays open: tell the user it's there to review, tweak (text, zoom, trims) and export. `osr open <file.osrec>` reopens any recording.

When the app's UI changes, re-run steps 6 and 7 with the same flow: the flow is the source of truth for the demo.

## Flow format

```json
{
  "title": "Create an invoice",
  "url": "https://app.example.com/invoices",
  "viewport": { "width": 1440, "height": 900 },
  "steps": [
    { "action": "click", "target": { "role": "button", "name": "New invoice" }, "tooltip": "Create an invoice" },
    { "action": "wait", "for": { "role": "combobox", "name": "Customer" } },
    { "action": "click", "target": { "role": "combobox", "name": "Customer" }, "hotspot": false },
    { "action": "fill", "target": { "role": "combobox", "name": "Customer" }, "value": "Acme", "zoom": 1.8 },
    { "action": "click", "target": { "role": "option", "name": "Acme Corp" }, "tooltip": "Pick who you're invoicing" },
    { "action": "click", "target": { "role": "button", "name": "Save" }, "tooltip": "Save it" },
    { "action": "wait", "for": { "text": "Invoice saved" } }
  ]
}
```

`title` is the demo's name (see "Name it" above). `viewport` is optional (default 1280x800): the size of the demo.

| action | fields | does |
|---|---|---|
| `click` | `target`, `tooltip`?, `hotspot`?, `zoom`? | Moves the cursor there like a hand and clicks. A photo step with a hotspot showing `tooltip`, unless `"hotspot": false` (then it just plays in the video). `zoom` frames the photo step on it |
| `fill` | `target`, `value`, `zoom`? | Clicks into the field if it isn't focused, clears it and types `value` key by key. `zoom` frames the typing |
| `press` | `key`, `target`? | Presses a key (`Enter`, `Tab`, `Meta+A`…), on the target or the page |
| `select` | `target`, `value`, `zoom`? | Picks a `<select>` option by value or label |
| `hover` | `target`, `zoom`? | Hovers (menus, tooltips) |
| `scroll` | `target`? or `by`? | Smooth-scrolls to the target, or by `by` pixels (default 600) |
| `goto` | `url` | Navigates (the loading is cut) |
| `wait` | `for`? and/or `ms`? | Waits for the target to be visible and/or a delay. Always cut from the video |

`zoom` is 1.2–3; 1.5–2.2 reads best.

A target has exactly one of these, matched like Playwright's locators:

- `{ "role": "button", "name": "Save" }`: role and accessible name, straight from the accessibility tree. **Prefer this.**
- `{ "label": "Email" }`, `{ "placeholder": "Search" }`, `{ "text": "Pricing" }`, `{ "testId": "save" }`
- `{ "css": "#id" }`: last resort, it breaks when the markup changes.

Add `"exact": true` for a case-sensitive whole-string match, and `"nth": 0` (0-based) when a target matches several elements (inspect then fails with "strict mode violation").

## Troubleshooting

- **A step fails in inspect**: read the tree printed with the error, it's the page at the moment of the failure. The usual fix is a different role or name, `nth`, or a `wait` before the step.
- **The page shows a login screen**: run `osr login <url>` (step 2).
- **`record` fails while `inspect` works** (errors mentioning the worker, the extension or the capture): that's the recorder, not your flow. Don't change the viewport or the steps to work around it; stop and report the exact error to the user.
- **Pages need a specific state** (empty list, a draft): add steps that create it before the part you want to show, or ask the user to prepare the account.
- `--headed` on `inspect` or `record` shows the browser window, to watch what happens.

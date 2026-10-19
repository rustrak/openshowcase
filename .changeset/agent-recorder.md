---
"@rustrak/openshowcase-recorder": minor
"@rustrak/openshowcase-extension": minor
---

AI agents can record demos:

- New `@rustrak/openshowcase-recorder` CLI: plays a JSON flow in headless Chromium while the extension records it, with a cursor that moves like a hand, targets scrolled into view and waits cut out, and writes an `.osrec` file. The flow directs the camera (`zoom`, `hotspot: false`). `inspect` shows where a flow ends up as an accessibility tree, `login` saves a session once, `open` reviews a recording in a separate browser with the editor, `install-skill` adds the Claude Code skill to a project.
- The extension imports `.osrec` recordings (popup file icon, or the editor's empty screen) and applies their direction: tooltips, zooms, quiet clicks and cuts.

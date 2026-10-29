# Plan: Image Editor Workspace

Files:
- `src/view/imageEditor.ts`: `build()` makes a workspace (no `card()`), the zoom becomes `'fit' | number` with a slider, the pixel row goes, `Escape` closes, `Ctrl + wheel` zooms; `open()` no longer scrolls the page to it.
- `src/styles.css`: `.ie-workspace`, `.ie-bar-top`, `.ie-body` as a grid of two columns filling the height, `.ie-left`, `.ie-right`, `.ie-stage` fills, `.ie-zoom`; the sticky rules of 004 go.
- `src/view/editor.ts`, `src/app.ts`: unchanged (they only call `open` and receive `onOpenChange`).
- Tests: `test/ui.image.test.ts` (rewritten where it named `ie-pick-x`, `ie-read`, `ie-zoom-200`, the sticky rules), `test/ui.look.test.ts` (the editor opens as a workspace), new `test/ui.workspace.test.ts`.
- Specs: 004 amended, 009 (this one).

Constitution check: I (a bigger picture is a shorter loop), II (nothing leaves the machine), III (the strip says as before what it does not reproduce), VII (tokens only, both themes, no emoji, full container), VIII (one increment). GitHub description: no change.

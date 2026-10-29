# Quickstart: Effect Info Guides in the Image Editor

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.

Manual in PPTB:

1. Open the image editor on either icon. Every tool button in every group (Quick, Background, Geometry, Colour,
   Outline) shows a small "i" control next to it.
2. Press the "i" next to Remove background: a guide opens with its name, explanation, example and a Before/After
   picture pair; the background is solid in Before and checkered (see-through) in After.
3. Press the "i" next to Fit: a guide opens whose After picture shows the sample logo smaller, centred, with
   margin around it compared to Before.
4. Close the guide with its own close control; reopen it and close with `Escape`; reopen and close by clicking
   outside the panel. Each time, the editor's picture and history are exactly as before (no new step listed).
5. Open the guide for Remove background, then without closing it press the "i" for Fit: only the Fit guide is on
   screen afterwards.
6. Resize the PPTB pane narrow: the guide's Before/After pictures stack vertically instead of side by side; no
   sideways page scroll appears. Switch theme light/dark: the guide stays readable in both.
7. Press the "i" next to Flip left-right and next to Flip top-bottom: both open the same guide about mirroring.
8. Press the "i" next to Teams-ready colour icon and next to Outline from this icon (Quick group): each opens its
   own guide whose After picture is the full preset result on the sample logo.
9. With a guide open, confirm the real toolbox underneath is unaffected: no operation was added, Undo/Redo are
   unchanged.
10. Press the "i" next to Remove background: below the Before/After pictures, a Parameters section lists Where,
    Colour to remove, Tolerance (%), Softness (%) and Matte (pixels) — the same labels and ranges the real step's
    own fields show once the effect is added — each with its own plain explanation underneath.
11. Press the "i" next to Rotate (one setting) and next to Tone (seven settings): each Parameters section has
    exactly that many rows, the select's choices and the sliders' ranges match the real tool.
12. Press the "i" next to Teams-ready colour icon or Outline from this icon (Quick group): no Parameters section
    is shown — a preset takes no settings of its own.

Results: `npx tsc --noEmit` and the scoped suites (`test/ui.guide.test.ts`, `test/image.demo.test.ts`,
`test/ui.image.test.ts`, `test/ui.workspace.test.ts`, `test/ui.theme.test.ts`,
`test/image.paramHelp.sync.test.ts`) pass as of 2026-10-29.
`npm run build`, the full `npm test`, `npm run test:full` and `npm run test:mutation` are **deferred until every
feature in flight is implemented** (explicit instruction), then run once for all of them together. Manual checks:
**pending**.

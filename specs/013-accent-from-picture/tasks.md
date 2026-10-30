# Tasks: Accent colour from the picture

- [x] T001 `src/services/image/pixel.ts` (`toPixel` moved, `colourAt`) and `test/pixel.colourAt.test.ts`.
- [x] T002 `src/view/accentPicker.ts` and the `.ap-*` rules in `src/styles.css`.
- [x] T003 Wire in `src/app.ts`, `src/view/editor.ts`, `src/view/imageEditor.ts`.
- [x] T004 `test/ui.accentPicker.test.ts` (real page in jsdom); `test/ui.look.test.ts` and `test/ui.workspace.test.ts`
      updated for the new buttons.
- [x] T005 15 mutations in `scripts/mutation-check.mjs`, all killed.
- [x] T006 CHANGELOG and README.
- [x] T007 Manual check in PPTB (quickstart), 2026-10-30: works.

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001 | `app.ts`, `editor.ts`, `imageEditor.ts` | `ui.accentPicker` "opening from the Look step", "from the image editor" |
| FR-002 | `accentPicker.ts` (click, pointermove), `pixel.ts` `toPixel` | `ui.accentPicker` "Use this colour sets…", `ui.image` toPixel |
| FR-003 | `accentPicker.ts` keydown | `ui.accentPicker` "the arrow keys move the choice and Enter uses it" |
| FR-004 | `pixel.ts` `colourAt` | `pixel.colourAt` (all), `ui.accentPicker` "a see-through pixel is refused…" |
| FR-005 | `accentPicker.ts` `open` | `ui.accentPicker` "a second opening starts clean", "a refused pixel alone…" |
| FR-006 | `app.ts` `onUse` | `ui.accentPicker` "Use this colour sets the accent colour…", "Revert…" |
| FR-007 | `accentPicker.ts` close paths | `ui.accentPicker` "leaving without a change", "Escape closes the popup only" |
| FR-008 | `accentPicker.ts` readout | `ui.accentPicker` "opens the popup…" (now hex) |
| FR-009 | `editor.ts`, `imageEditor.ts` | `ui.accentPicker` "the buttons are off…", "the Look buttons are off while…" |
| FR-010 | `app.ts` `onUse` writes only the field | `ui.accentPicker` "has the button for the colour icon…" |

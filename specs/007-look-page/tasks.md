# Tasks: Look Page

- [X] T001 Tests first: `test/palette.test.ts` (oracle from the spec: families, styles, contrast >= 3, palette of four, score order, determinism, grey logo, no mutation of input)
- [X] T002 Tests first: `test/ui.look.test.ts` (compare band, order of cards, aligned action rows, removed ids, gallery cards, apply is one edit, refused preset)
- [X] T003 `services/image/palette.ts`
- [X] T004 `view/compare.ts` and `#look-compare` in `index.html`
- [X] T005 `view/editor.ts`: card order, action rows, gallery; remove `Logo without background`
- [X] T006 `app.ts`: `buildPresets`, apply any preset, remove `onIconBorderless`
- [X] T007 `styles.css`: band, gallery, action rows
- [X] T008 Update the tests of feature 005 that name the removed button or the three fixed suggestions
- [x] T009 Mutation entries (added, targeted runs kill every mutant); the complete `npm run test:mutation` is still to run Complete `npm run test:mutation` run 2026-10-30: 456 of 456 mutations killed.
- [X] T010 CHANGELOG; gates (`tsc`, `build`, `test`, `test:full`)
- [ ] T011 Manual checks recorded in quickstart

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001 to FR-004 | view/compare.ts, index.html | ui.look (compare) |
| FR-005, FR-007, FR-008 | view/editor.ts, app.ts | ui.look (gallery) |
| FR-006, FR-012 | services/image/palette.ts | palette.test |
| FR-009, FR-010 | view/editor.ts | ui.look (actions) |
| FR-011 | styles.css | ui.theme, noNetwork |

## Removed on 2026-10-28

- The gallery of presets and everything that served it (`services/image/palette.ts`, `recommend.ts`, `darkenUntil`, `contrastOf`, the card, the styles and their tests and mutation entries). The tests of the band, the order of the cards and the aligned actions stay in `test/ui.look.test.ts`.

## Amendment 2026-10-29

- [X] T014 Tests first: `test/ui.look.test.ts` (button disabled / highlighted, no second picture, band tile alone) and the caption in `test/ui.editor.test.ts`
- [X] T015 `transparent.ts` `transparentState`; `editor.ts` button state, caption, second picture removed; `compare.ts` tile drawn as it is; `styles.css` `.is-suggested`
- [X] T016 CHANGELOG; mutation entries; gates

| Requirement | Code | Test |
|---|---|---|
| FR-013 | services/image/transparent.ts `transparentState`, view/editor.ts | ui.look (button follows the icon) |
| FR-014 | view/editor.ts | ui.look, ui.editor (caption) |
| FR-015 | view/compare.ts | ui.look (band tile alone) |

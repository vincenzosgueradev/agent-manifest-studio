# Tasks: Image Editor Workspace

- [X] T001 Tests first: `test/ui.workspace.test.ts` (layout, title per slot, zoom slider, Ctrl + wheel, Escape, removed ids) and the rewritten tests of `ui.image.test.ts` and `ui.look.test.ts`
- [X] T002 `imageEditor.ts`: workspace, zoom, no pixel reader, Escape, wheel
- [X] T003 `styles.css`: workspace layout
- [X] T004 Spec 004 amended; CHANGELOG; mutation entries; gates
- [ ] T005 Manual checks recorded in quickstart

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001, FR-002, FR-008 | imageEditor.ts `build`, styles.css | ui.workspace (layout) |
| FR-003 | imageEditor.ts `open`, `render` | ui.workspace (title per slot), ui.image |
| FR-004 | imageEditor.ts (Escape) | ui.workspace (Escape) |
| FR-005 | imageEditor.ts | ui.workspace (removed ids), ui.image (eyedropper by click) |
| FR-006, FR-007 | imageEditor.ts | ui.workspace (zoom) |
| FR-009, FR-010 | styles.css | ui.image (names, no emoji), existing pipeline tests |

## Amendment 2026-10-29 (second)

- [X] T006 Tests first: Fit, no 100 %, no eyedropper, Show original (`ui.workspace`, `ui.image`)
- [X] T007 `imageEditor.ts` (eyedropper out, Fit measure, Show original and its label), `app.ts` (`originalIcon`), `styles.css`
- [X] T008 Spec 004 note, CHANGELOG, mutation entries, gates

| Requirement | Code | Test |
|---|---|---|
| FR-005 (amended), FR-006 (amended) | imageEditor.ts, styles.css | ui.workspace |
| FR-011 | imageEditor.ts `originalPicture`, app.ts `originalIcon` | ui.image (Show original) |

## Amendment 2026-10-29 (third)

- [X] T009 Tests first: "no redundant control" (`ui.workspace`), the tests that named a removed control
- [X] T010 `imageEditor.ts`, `types.ts`, `pipeline.ts`, `ops.ts`, `styles.css`
- [X] T011 CHANGELOG, spec 004 note, mutation entries, gates

| Requirement | Code | Test |
|---|---|---|
| FR-012 | imageEditor.ts (`build`, `render`), types.ts, pipeline.ts, ops.ts | ui.workspace (no redundant control), ui.image |

## Amendment 2026-10-29 (fourth)

- [X] T012 Tests first: the cards have one action (`ui.look`), the flows that went through the card now go through the editor (`ui.editor`, `ui.image`, `ui.workspace`)
- [X] T013 `editor.ts`, `app.ts`, `imageEditor.ts` (`open(slot)`), `files.ts`, `transparent.ts` deleted, `styles.css`
- [X] T014 CHANGELOG, specs 005 and 007 notes, mutation entries, gates

| Requirement | Code | Test |
|---|---|---|
| FR-013, FR-014 | view/editor.ts `iconCard`, app.ts | ui.look (one action), ui.editor (Remove background in the editor) |

## Amendment 2026-10-29 (fifth)

- [X] T015 Tests first: `test/ruler.test.ts` and the layout, grid, status bar and zoom limit tests of `ui.workspace`
- [X] T016 `view/ruler.ts`, `imageEditor.ts` (layout, grid, rulers, status bar, zoom 10 to 200), `styles.css`
- [X] T017 CHANGELOG, quickstart, mutation entries, gates

| Requirement | Code | Test |
|---|---|---|
| FR-015 | imageEditor.ts | ui.workspace (zoom) |
| FR-016, FR-017, FR-018, FR-019 | imageEditor.ts `build`, styles.css | ui.workspace (layout) |
| FR-020 | view/ruler.ts, imageEditor.ts | ruler.test, ui.workspace (rulers exist) |
| FR-021 | imageEditor.ts | ui.workspace (grid) |
| FR-022 | imageEditor.ts | ui.workspace (status bar) |

## Amendment 2026-10-29 (sixth)

- [X] T018 Tests first: `test/image.rules.test.ts`, the new groups of `ui.workspace`, `reset` in `image.pipeline.test.ts`
- [X] T019 `services/image/rules.ts`, `pipeline.ts` (`reset`), `imageEditor.ts` (toolbox by category, history, Revert all, switching of the tools, strip in the centre, colour section out), `gen-icons.mjs` and `icons.ts` (eight icons), `styles.css` (group colours, tools, history, danger), `colour.ts` (`dominantColour` out)
- [X] T020 CHANGELOG, spec 004 note, mutation entries
- [ ] T021 Gates `test:full` and `build` after the last change, the complete `npm run test:mutation`, manual checks 10 to 12

| Requirement | Code | Test |
|---|---|---|
| FR-023, FR-024 | imageEditor.ts (`build`), pipeline.ts `reset`, styles.css | ui.workspace (options bar, Revert all), image.pipeline (reset) |
| FR-025 | imageEditor.ts (`CATEGORIES`, `build`), icons, styles.css | ui.workspace (toolbox by category) |
| FR-026, FR-027 | services/image/rules.ts, imageEditor.ts (`syncTools`, `addOp`, `applyPreset`) | image.rules, ui.workspace (each effect once) |
| FR-028, FR-029, FR-031 | imageEditor.ts, styles.css | ui.workspace (history, centre) |
| FR-030 | imageEditor.ts, app.ts, colour.ts | ui.workspace (colour section gone) |

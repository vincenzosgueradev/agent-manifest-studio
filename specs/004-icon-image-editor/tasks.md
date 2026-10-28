# Tasks: Icon Image Editor

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)
**Tests**: required by the constitution (matrix, independent oracle, negative tests, mutation). Each
implementation task is preceded by its test task. Nothing in `src/` is edited while a mutation run is
in progress.

## Phase 1: Setup

- [X] T001 Limits (`IMAGE_WORKING_MAX`, `HISTORY_MAX`) in `src/services/limits.ts`; icon names `crop`, `pipette`, `eraser`, `wand`, `rotate`, `flip`, `sliders`, `expand` in `scripts/gen-icons.mjs` and `src/icons.ts`; regenerate `src/styles.css`
- [X] T002 Test helpers `test/helpers/image-oracle.ts`: independent reference implementations of research.md section 1 and an independent PNG reader

## Phase 2: Foundational (no screen)

- [X] T003 [P] Tests `test/image.colour.test.ts` for distance, hex, luma, dominant colour, corner colour
- [X] T004 Implement `src/services/image/types.ts`, `colour.ts` (FR-009, FR-021, FR-022)
- [X] T005 [P] Tests `test/image.ops.test.ts`: every operation against the oracle, boundaries, negative cases, properties (inputs not mutated, rotate x4, flip x2, invert x2)
- [X] T006 Implement `src/services/image/ops.ts` and `resample.ts` (FR-010 to FR-020)
- [X] T007 [P] Tests `test/image.pipeline.test.ts`: evaluate equals fold, undo, redo, remove, update, reset, limit of 50, presets
- [X] T008 Implement `src/services/image/pipeline.ts` (FR-006, FR-007, FR-023)
- [X] T009 [P] Tests `test/image.png.test.ts`: round trip with the tool's reader and the independent reader, CRC of every chunk, sizes 1x1 to 1024, all-opaque and all-transparent
- [X] T010 Implement `src/services/image/pngWrite.ts` (FR-026)
- [X] T011 [P] Tests `test/image.import.test.ts`: PNG, host decoder fake, refusals, reduction to 1024
- [X] T012 Implement `src/services/image/import.ts`, `accept.ts` (FR-002, FR-003, FR-027)

## Phase 3: User Story 5 - history, comparison, preview (P1) and the editor shell

- [X] T013 [US5] UI tests `test/ui.image.test.ts` part 1: open and close, undo and redo, reset, show original, preview tiles, background and zoom switches
- [X] T014 [US5] `src/view/imageEditor.ts` shell, canvas, list of operations, preview; wiring in `src/app.ts`, `src/index.html`, `src/styles.css`, "Edit image" buttons in `src/view/editor.ts` (FR-001, FR-004 to FR-008, FR-024, FR-025, FR-029, FR-030)

## Phase 4: User Story 1 - background to a Teams icon (P1)

- [X] T015 [US1] UI tests part 2: remove background controls, presets, Apply and Cancel, refusals
- [X] T016 [US1] Background and preset controls in the view; Apply through `Edits.icons` (FR-009 to FR-012, FR-023, FR-027)

## Phase 5: User Story 2 - outline icon (P1)

- [X] T017 [US2] UI tests part 3: "Outline from this icon", outline checks pass
- [X] T018 [US2] Outline maker control and preset in the view (FR-020, FR-023)

## Phase 6: User Story 3 - colour and eyedropper (P2)

- [X] T019 [US3] UI tests part 4: eyedropper, send to, solid, tone, suggest accent
- [X] T020 [US3] Colour tools in the view (FR-018, FR-019, FR-021, FR-022)

## Phase 7: User Story 4 - framing (P2)

- [X] T021 [US4] UI tests part 5: crop by numbers and by drag, trim, square, fit, rotate, flip, `toPixel`
- [X] T022 [US4] Framing tools and the crop overlay in the view (FR-013 to FR-017)

## Phase 8: Output and polish

- [X] T023 Save image as PNG, busy state, import of other formats in the view (FR-002, FR-028, FR-031); update `README`, `CHANGELOG`, constitution 1.3.0 and the README claim test (FR-032)
- [X] T024 Mutation entries for the new files in `scripts/mutation-check.mjs`; run the mutations; close survivors
- [X] T025 Gates: `tsc`, `npm run build`, `npm test`, `npm run test:full`, `npm run validate`
- [X] T026 Record results and the manual checks in `quickstart.md`

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001, FR-004, FR-005 | view/imageEditor.ts, app.ts | ui.image |
| FR-002, FR-003 | image/import.ts | image.import, ui.image |
| FR-006, FR-007, FR-008 | image/pipeline.ts, view | image.pipeline, ui.image |
| FR-009 to FR-012 | image/ops.ts | image.ops, ui.image |
| FR-013 to FR-017 | image/ops.ts, resample.ts | image.ops, ui.image |
| FR-018 to FR-020 | image/ops.ts | image.ops |
| FR-021, FR-022 | image/colour.ts, view | image.colour, ui.image |
| FR-023 | image/pipeline.ts | image.pipeline, ui.image |
| FR-024, FR-025 | view/imageEditor.ts | ui.image |
| FR-026 | image/pngWrite.ts | image.png |
| FR-027 | image/accept.ts | image.import, ui.image |
| FR-028 | app.ts | ui.image |
| FR-029, FR-032 | app.ts, README | noNetwork |
| FR-030 | view/imageEditor.ts | ui.image |
| FR-031 | view/imageEditor.ts | ui.image |
| SC-001 to SC-007 | all | image.*, ui.image |

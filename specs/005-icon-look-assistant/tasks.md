# Tasks: Icon Look Assistant

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)
**Note**: written after the code. Tasks marked `[X]` are verified by the test named in the traceability
table. Open items are marked `[ ]`.

## Phase 1: Foundations

- [X] T001 `services/image/transparent.ts`: `makeTransparent`, `whiteShape`, `borderlessIcon`, the two "not a fault" messages (FR-001, FR-002, FR-004, FR-006)
- [X] T002 `services/image/recommend.ts`: `recommend`, brand colour, colour count, three designs (FR-010 to FR-014, FR-016)
- [X] T003 [P] Tests `test/recommend.test.ts` with the oracle of `test/helpers/image-oracle.ts`: darkenUntil, designs, brand colour, several colours, unreadable picture, input not mutated

## Phase 2: US1 and US2 - colour icon shortcuts

- [X] T004 [US1] Tests in `test/ui.editor.test.ts` "make the background transparent in one click" (FR-001 to FR-003, FR-009)
- [X] T005 [US1] Button, caption, information style and handler `onIconTransparent` (`view/editor.ts`, `app.ts`)
- [X] T006 [US2] Tests "the logo alone, in a colour, on nothing" (FR-004, FR-008)
- [X] T007 [US2] Colour input, button and handler `onIconBorderless` (accent colour `#FFFFFF`)

## Phase 3: US3 - outline icon

- [X] T008 [US3] Tests "the outline icon as the left bar of Teams draws it" (FR-005, FR-006)
- [X] T009 [US3] Caption, "Make the shape white", handler `onIconWhite`
- [X] T010 [US3] Tests "the colour to try on the outline icon" in `test/ui.suggest.test.ts` (FR-007, FR-008)
- [X] T011 [US3] Preview colour input and `paintBar`

## Phase 4: US4 - suggestions

- [X] T012 [US4] Tests `test/ui.suggest.test.ts` "the suggestions" (FR-010 to FR-016)
- [X] T013 [US4] Suggestions card, `adviceFor` cache, `onApplySuggestion` in one edit

## Phase 5: US5 - version notice

- [X] T014 [US5] Tests "the notice about the version" in `test/ui.editor.test.ts` (FR-017, FR-018)
- [X] T015 [US5] `versionHint`, notice and button in `view/exportPanel.ts`, `onVersionBump`

## Phase 5b: US6 - how to fix each check

- [X] T022 [US6] Tests `test/fixes.test.ts` (every id has a way out, none for a missing check, each names a control, steps) and `test/ui.package.test.ts` ("How to fix it", "Go to Details", "Go to Look") (FR-022 to FR-024)
- [X] T023 [US6] `services/fixes.ts` (`FIXES`, `fixFor`, `STEP_NAME`) and `fixOf` in `view/checks.ts`

## Phase 6: Polish and gates

- [X] T016 Mutation entries for `transparent.ts` and `recommend.ts` in `scripts/mutation-check.mjs` (SC-006)
- [X] T017 CHANGELOG entries under Unreleased (FR-001 to FR-018)
- [X] T018 This specification set (spec, plan, research, data-model, quickstart, tasks, checklist, contracts)
- [ ] T019 Full gates for the release: `npm run test:full` and `npm run test:mutation` complete; record the results in `quickstart.md`
- [ ] T020 Manual checks 1 to 10 of `quickstart.md` run and recorded (7 and 8 are not covered by any automatic test)
- [X] T021 FR-019: `test/noNetwork.test.ts` walks every file under `src/` (`readdirSync`), so `transparent.ts` and `recommend.ts` are covered with no list to update

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001, FR-002 | image/transparent.ts, app.ts `onIconTransparent` | ui.editor (transparent in one click) |
| FR-003 | view/editor.ts caption | ui.editor |
| FR-004 | transparent.ts `borderlessIcon`, app.ts `onIconBorderless` | ui.editor (logo alone) |
| FR-005, FR-006 | transparent.ts `whiteShape`, view/editor.ts, app.ts `onIconWhite` | ui.editor (outline as Teams draws it) |
| FR-007 | view/editor.ts `paintBar` | ui.suggest (colour to try) |
| FR-008 | view/editor.ts | ui.editor, ui.suggest |
| FR-009 | view/editor.ts, app.ts `onIconRevert` | ui.editor |
| FR-010 | view/editor.ts `suggestionBlock` | ui.suggest |
| FR-011, FR-012, FR-013 | image/recommend.ts | recommend, ui.suggest |
| FR-014 | recommend.ts note, view/editor.ts | recommend, ui.suggest |
| FR-015 | app.ts `onApplySuggestion` | ui.suggest |
| FR-016 | app.ts `adviceFor`, recommend.ts | recommend, ui.suggest |
| FR-017, FR-018 | app.ts `versionHint`, view/exportPanel.ts | ui.editor (notice about the version) |
| FR-022, FR-023, FR-024 | services/fixes.ts, view/checks.ts | fixes, ui.package |
| FR-019 | all | noNetwork (T021 to confirm) |
| FR-020 | styles.css, views | ui.cards, ui.theme |
| FR-021 | quickstart.md | manual |
| SC-001 to SC-005 | all | recommend, ui.suggest, ui.editor |
| SC-006 | scripts/mutation-check.mjs | test:mutation (T019) |

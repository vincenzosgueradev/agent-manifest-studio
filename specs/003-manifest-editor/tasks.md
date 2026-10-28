# Tasks: Manifest Editor

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)
**Tests**: required by the constitution (matrix, independent oracle, negative tests, mutation). Each
implementation task is preceded by its test task.

## Phase 1: Setup

- [X] T001 Amend `.specify/memory/constitution.md` to 1.2.0 (Principle VIII scope, Verified Facts of this feature), update `README.md` section "What this tool changes", `CHANGELOG.md`, and add the limits of research.md section 1 to `src/services/limits.ts`
- [X] T002 Add icon names `undo`, `plus`, `upload`, `lock` to `scripts/gen-icons.mjs` and `src/icons.ts`, regenerate `src/styles.css`

## Phase 2: Foundational (core, no screen)

- [X] T003 [P] Tests for `fields.ts`: every field's limits at -1, 0, +1, `https` rule, colour forms, version bump matrix, domain rules, permission lists (`test/fields.test.ts`)
- [X] T004 Implement `src/services/edit/fields.ts` (FR-002, FR-004, FR-007, FR-008, FR-009, FR-014, FR-015, FR-016)
- [X] T005 [P] Tests for `jsonPatch.ts`: replace, insert, remove, nested object missing, formatting styles (tabs, CRLF, BOM, compact, indent 2/4), escapes, duplicate keys, property test against an independent oracle (`test/jsonPatch.test.ts`)
- [X] T006 Implement `src/services/edit/jsonPatch.ts` (FR-017, FR-020, FR-023)
- [X] T007 [P] Tests for `edits.ts` and `diffManifest` (`test/edits.test.ts`)
- [X] T008 Implement `src/services/edit/edits.ts` (FR-003, FR-019, FR-021)
- [X] T009 [P] Tests for `iconEdit.ts` and `writePackage` appending (`test/iconEdit.test.ts`, `test/zip.append.test.ts`)
- [X] T010 Implement `src/services/edit/iconEdit.ts` and the `writePackage` change (FR-011, FR-012)
- [X] T011 Tests for `planEdits` / `exportPackage` with edits: combination matrix of groups, invalid blocks, safety net, identical copy, suffix plus edits (`test/export.edits.test.ts`)
- [X] T012 Implement `planEdits` and `exportPackage` edits in `src/services/export.ts`, `devicePermissions` in `ManifestView` (FR-005, FR-020 to FR-024)

## Phase 3: User Story 1 - text fields and accent colour (P1)

- [X] T013 [US1] UI tests (`test/ui.editor.test.ts`): groups, markers, revert, revert all, validation messages, bump, blocking, preview follows
- [X] T014 [US1] `src/view/editor.ts` (Identity, Descriptions, Developer, Look accent, Version), wiring in `src/app.ts`, `src/index.html`, step label "Edit", styles

## Phase 4: User Story 2 - icons (P2)

- [X] T015 [US2] UI tests (`test/ui.icons.test.ts`): choose, refuse, warning accepted, revert, missing path added
- [X] T016 [US2] Icon cards in `src/view/editor.ts`, `pickPng` in `src/services/files.ts`, drop on card

## Phase 5: User Story 3 - lists (P3)

- [X] T017 [US3] UI tests (`test/ui.lists.test.ts`)
- [X] T018 [US3] List editors (valid domains, permissions, device permissions) in `src/view/editor.ts`

## Phase 6: User Story 4 - Changes and safety net (P1)

- [X] T019 [US4] UI tests (`test/ui.changes.test.ts`) and update `contents.ts` tests
- [X] T020 [US4] `src/view/changes.ts`, `contents.ts` driven by the diff, report lists edited fields (FR-024)

## Phase 7: User Story 5 - read-only (P3)

- [X] T021 [US5] UI tests (`test/ui.readonly.test.ts`) and the read-only group in `src/view/editor.ts`

## Phase 8: Polish and gates

- [X] T022 Update `test/noNetwork.test.ts` and `README` claims test (FR-025, FR-028), `CLAUDE.md`
- [X] T023 Mutation entries in `scripts/mutation-check.mjs` for the new files; run `npm run test:mutation`; close survivors
- [X] T024 Gates: `tsc`, `npm run build`, `npm test`, `npm run test:full`, `npm run validate`
- [X] T025 Record results and the manual checks in `quickstart.md`

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001, FR-002 | view/editor.ts | ui.editor |
| FR-003 | edits.ts, view/editor.ts | edits, ui.editor |
| FR-004 | fields.ts | fields, ui.editor |
| FR-005 | export.ts planEdits | export.edits, ui.editor |
| FR-006 | app.ts, view/editor.ts, rename.ts | ui.editor, existing ui.edit |
| FR-007, FR-008, FR-009 | fields.ts | fields, export.edits |
| FR-010, FR-011, FR-012, FR-013 | iconEdit.ts, zip.ts, view/editor.ts | iconEdit, zip.append, ui.icons |
| FR-014 | fields.ts bumpVersion | fields, ui.editor |
| FR-015, FR-016, FR-017 | fields.ts, jsonPatch.ts, view/editor.ts | fields, jsonPatch, ui.lists |
| FR-018 | view/editor.ts | ui.readonly |
| FR-019 | edits.ts diffManifest, view/changes.ts | edits, ui.changes |
| FR-020, FR-021 | jsonPatch.ts, export.ts | jsonPatch, export.edits |
| FR-022, FR-023 | export.ts | export.edits, hardening |
| FR-024 | report.ts | report |
| FR-025, FR-026 | app.ts | noNetwork, ui.package |
| FR-027 | styles, view/editor.ts | ui.theme, ui.editor |
| FR-028 | README | noNetwork |
| FR-029 | research.md | review |
| SC-001 to SC-007 | all | export.edits, ui.*, noNetwork |

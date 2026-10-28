# Tasks: Package Drop Zone

- [X] T001 Tests `test/ui.dropzone.test.ts` first (they fail): zone, highlight, flicker, text drag, matrix of names, several files, outside drop, click once
- [X] T002 `index.html`: zone with title, hint, overlay
- [X] T003 `styles.css`: zone, overlay, hover and `is-over`
- [X] T004 `loader.ts`: counter, `checkDropped`, window guard, click on zone
- [ ] T005 Mutation entries (added, targeted run kills every mutant); the complete `npm run test:mutation` is still to run
- [X] T006 CHANGELOG, gates (`tsc`, `build`, `test`, `test:full`)
- [ ] T007 Manual checks recorded in quickstart

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001, FR-009 | index.html | ui.dropzone (the zone) |
| FR-002, FR-003, FR-004 | loader.ts | ui.dropzone (highlight) |
| FR-005, FR-006 | loader.ts `checkDropped` | ui.dropzone (matrix) |
| FR-007 | loader.ts window guard | ui.dropzone (outside) |
| FR-008 | loader.ts | ui.dropzone (click) |
| FR-010 | styles.css | ui.theme, noNetwork |

# Tasks: Manifest Schema Validation

- [X] T001 `package.json`: `ajv` and `ajv-formats` as development dependencies
- [X] T002 `scripts/gen-schemas.mjs` and the generated `src/schemas/` (FR-001)
- [X] T003 Tests first: `test/schema.validate.test.ts` (every keyword, messages, suggestion, unsupported)
- [X] T004 Tests first: `test/schema.oracle.test.ts` (ajv matrix over every bundled schema; unsupported keyword guard)
- [X] T005 `services/schema/validate.ts` (FR-002, FR-004)
- [X] T006 `services/schema/index.ts` (FR-003)
- [X] T007 Tests first: `test/ui.schema.test.ts` (the card, the check, the report, the edit)
- [X] T008 `checks.ts`, `export.ts`, `fixes.ts`, `report.ts` (FR-005, FR-007, FR-008)
- [X] T009 `view/schemaCard.ts`, `index.html`, `styles.css`, `app.ts` (FR-006)
- [X] T010 Fix `fixes.ts` `color.contrast`, which names the button removed by feature 007
- [ ] T011 Mutation entries (added; the targeted run for `schema` kills all 44, after two tests were added for the survivors); the complete `npm run test:mutation` is still to run
- [X] T012 Constitution 1.6.0 (Verified Facts, Tool Standard), README line, CHANGELOG
- [ ] T013 Gates (`tsc`, `build`, `test`, `test:full`) and manual checks recorded

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001 | scripts/gen-schemas.mjs, src/schemas | schema.oracle (bundle) |
| FR-002, FR-004, FR-010 | services/schema/validate.ts | schema.validate, schema.oracle |
| FR-003 | services/schema/index.ts | schema.validate (versions), ui.schema |
| FR-005, FR-007, FR-008 | checks.ts, export.ts, fixes.ts, report.ts | ui.schema, fixes.test, report.test |
| FR-006 | view/schemaCard.ts, index.html | ui.schema |
| FR-009, FR-011 | styles.css, package.json | noNetwork, ui.theme |

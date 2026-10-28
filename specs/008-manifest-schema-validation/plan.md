# Plan: Manifest Schema Validation

Files:
- `scripts/gen-schemas.mjs` (new): input a folder of downloaded `vX.Y.json`, output `src/schemas/teams-vX.Y.json` and `src/schemas/index.ts`.
- `src/schemas/*` (generated, committed).
- `src/services/schema/validate.ts` (new, pure): the validator and the messages.
- `src/services/schema/index.ts` (new): version selection, notes, `validateManifestText`.
- `src/services/checks.ts`: optional `manifestText` argument, row `schema.valid`; `src/services/export.ts` passes the text at its three call sites.
- `src/services/fixes.ts`: answer for `schema.valid`; fix the answer of `color.contrast` that still names the removed button.
- `src/services/report.ts`: `schema` section.
- `src/view/schemaCard.ts` (new), `src/index.html`, `src/styles.css`, `src/app.ts`.
- Tests: `test/schema.validate.test.ts` (keyword by keyword, messages, unsupported), `test/schema.oracle.test.ts` (ajv matrix over every bundled schema), `test/ui.schema.test.ts` (the real page).
- `package.json`: `ajv`, `ajv-formats` as development dependencies.
- Constitution: Verified Facts entry (versions, 404s, draft-04) and a Tool Standard "bundled schemas are generated, never fetched by the tool"; version 1.5.0 to 1.6.0.

Constitution check: I (a gap: no other place tells which entry of the manifest is wrong before upload), II (data bundled, no network, no dynamic import, no runtime dependency), III (the card says what it does not prove), V (README `What this tool changes` unchanged; a README line says the schema is checked locally), VII (tokens only), VIII (one increment). GitHub description: add "validates the manifest against its JSON schema"; proposed, not applied.

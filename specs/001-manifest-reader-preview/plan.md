# Implementation Plan: Manifest Reader, Preview and Name Suffix Editor

**Branch**: `001-manifest-reader-preview` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-manifest-reader-preview/spec.md`

## Summary

Load a Teams app package (zip) in the browser of the tool, read its manifest, show an honest
preview of colour icon, outline icon and names, run a fixed list of checks, let the user change the
environment suffix of the two names and save a new zip in which only those two values changed.
Everything is local: no network, no write to any environment. The technical approach is a set of
pure modules (zip, manifest tokenizer, PNG decoder, flattening, checks, export) behind a single
screen, with the stack and the quality gates of Agent Nameplate. The key decision is to edit the
manifest at text level (two string literals) with a parse-and-compare safety net, so nothing else
in the package can change.

## Technical Context

**Language/Version**: TypeScript 5 (strict), ES2022, runs in the PPTB renderer (browser)

**Primary Dependencies**: `fflate` 0.8.2 (exact; zip and zlib), `@pptb/types`; dev: Vite 8, Vitest 5,
jsdom, tsx, cross-env, @types/node. No UI framework (plain DOM, like Agent Nameplate).

**Storage**: none. Nothing is kept between loads (FR-027)

**Testing**: Vitest; generated fixtures; matrices with an independent oracle; jsdom for the real page;
a mutation script (`scripts/mutation-check.mjs`)

**Target Platform**: Power Platform ToolBox (Electron) tool window, light and dark theme

**Project Type**: single-page PPTB tool (web application, no backend)

**Performance Goals**: package loaded, checked and previewed in under 2 seconds for a 5 MB package;
preview and checks update within one frame while typing the suffix

**Constraints**: offline; zip at most 5 MB, entry at most 1 MB, at most 200 entries; PNG at most
4096 x 4096 pixels before allocation; deterministic bytes for the same input; no `max-width` wrapper

**Scale/Scope**: one package at a time; about 20 checks; one screen

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Gap-First | Shows the final result before upload and removes the manual unzip-edit-zip of the suffix | Pass |
| II. Local and Read-Only | No network, no environment access; the only output is a zip the user saves. A test fails on any network call. No `connections` feature declared | Pass |
| III. Honest Preview | Notice beside the preview; every check carries `notProven`; facts dated in research.md | Pass |
| IV. Copilot Studio and Teams First | Subject is the Teams package of a Copilot Studio agent | Pass |
| V. Marketplace Policy | Name "Agent Manifest Studio" has no Microsoft brand as its own brand; real author; version from `package.json`; theme; README section `What this tool changes`; claims match behaviour | Pass (README to write in this feature) |
| VI. Community Visibility | README states the gap and the difference from Agent Nameplate | Pass |
| VII. Enterprise UI | Single screen, fills width, no emoji, no default checkboxes, empty and error states with cause | Pass |
| VIII. Simplicity | Matches the amended first release (1.0.1) | Pass |
| Testing Standard | Matrix, independent oracle, negative tests, mutation, no tenant data, gates | Pass (see Test strategy) |
| Image Standards | Own decoder with header checks; deterministic integer maths; failures are visible | Pass |

**Re-check after design (Phase 1)**: unchanged. No violation, no Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/001-manifest-reader-preview/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   └── ui-contract.md
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (tool folder `agent-manifest-studio/`)

```text
package.json  tsconfig.json  tsconfig.node.json  vite.config.ts  vitest.config.ts
README.md  CHANGELOG.md  CLAUDE.md
src/
├── index.html
├── styles.css
├── app.ts                  # wiring only: load, state, render, export
├── types.ts
├── globals.d.ts
├── icons.ts                # CSS-shape icon helpers
├── public/logo.svg
├── view/
│   ├── summary.ts  preview.ts  checks.ts  nameEditor.ts  loader.ts
└── services/
    ├── limits.ts  zip.ts  manifest.ts  suffix.ts  rename.ts
    ├── png.ts  preview.ts  checks.ts  export.ts  files.ts  theme.ts
test/
├── helpers/ (png-encoder.ts, zip-builder.ts, manifest-builder.ts, oracle.ts, combinatorics.ts, ui-harness.ts)
├── zip.test.ts  manifest.test.ts  suffix.test.ts  rename.test.ts  png.test.ts
├── preview.test.ts  checks.test.ts  export.test.ts  noNetwork.test.ts
├── ui.flow.test.ts  ui.checks.test.ts  ui.theme.test.ts
└── setup.ts
scripts/
└── mutation-check.mjs
```

**Structure Decision**: single project, same layout as Agent Nameplate (services are pure and
tested directly; `view/` renders; `app.ts` only connects). `files.ts` is the only module that
touches the PPTB API, so every other module runs unchanged in Node tests.

## Test strategy (Testing Standard)

| Area | Dimensions of the matrix | Oracle |
|------|--------------------------|--------|
| `splitName`/`composeName` | base shape (empty, plain, with spaces, accents, right-to-left, long) x suffix shape (none, one group, two groups, empty brackets, 20/21 characters, nested brackets, separator none/one space/two) | hand table written from FR-019 |
| `applySuffix` | manifest layout (compact, indented, CRLF, BOM, escaped quotes in names, unicode escapes, nested `name` key elsewhere, unknown keys, keys before/after) x suffix | bytes outside the two literals equal; parse equal except the two values |
| `readPackage` | defect (none, not a zip, truncated, no manifest, manifest in sub-folder, `..`, absolute, backslash, duplicate, 201 entries, entry 1 MB + 1, file 5 MB + 1) | the code expected by FR-002/FR-003 |
| `decodePng` | colour type x bit depth x interlace x filter type 0-4 x size | pixels from a table computed by hand; the encoder lives in `test/helpers` and uses `node:zlib`, not `src/` |
| `flattenOnAccent` | alpha 0, 1, 127, 128, 254, 255 x channel values x accent values | table by hand with the formula of research §5 |
| `runChecks` | each rule broken alone, then pairs of rules | exactly the expected ids and verdicts |
| `blockingChecks` | original pass/fail x new pass/fail for each name check | table |
| `buildExport` | every package fixture x suffix | decompressed entries equal except the manifest; same input gives the same bytes |
| No network | stub `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` and run load, edit and export | any call fails the test |
| UI | load page in jsdom, drive the real DOM: load, refuse, edit, block, export; both themes | texts and ids of the UI contract |

Mutation script covers at least: every limit constant, the suffix regex, the `>`/`>=` boundaries,
alpha formula, filter types, path checks, blocking rule, serialization of the two literals,
fixed entry date, and the disabled state of the export button.

## Complexity Tracking

No violations to justify.

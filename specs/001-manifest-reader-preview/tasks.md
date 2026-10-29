---

description: "Task list for feature 001: Manifest Reader, Preview and Name Suffix Editor"
---

# Tasks: Manifest Reader, Preview and Name Suffix Editor

**Input**: Design documents from `specs/001-manifest-reader-preview/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/core-api.md, contracts/ui-contract.md, quickstart.md

**Tests**: REQUIRED by the constitution (Testing Standard): matrix, independent oracle written from the spec with no code shared with `src/`, negative tests, mutation check. Every implementation task is preceded by its test task, and the test MUST be seen failing before the implementation is written.

**Organization**: grouped by user story. All paths are relative to the tool folder `agent-manifest-studio/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 load and read, US2 preview, US3 checks, US4 suffix and export
- No commits are made while these tasks run unless the user asks.

---

## Phase 1: Setup

- [X] T001 Create `package.json`: name `@vincenzosgueradev/pptb-agent-manifest-studio`, `displayName` "Agent Manifest Studio", `description` stating it previews and renames the Teams package of a Copilot Studio agent locally, `author` "Vincenzo Sguera", `license` MIT, `type` module, `main` index.html, `icon` dist/logo.svg, `engines.node` >=18, scripts (build `tsc && vite build`, dev, test `vitest run`, test:full `cross-env TEST_FULL=1 vitest run`, test:mutation `node scripts/mutation-check.mjs`, validate `pptb-validate`), dependency `fflate` exactly `0.8.2`, devDependencies (`@pptb/types`, `@types/node`, `cross-env`, `jsdom`, `tsx`, `typescript`, `vite`, `vitest`), `files` ["dist"], keywords, `configurations.category` "Copilot Studio", and NO `features.connections` entry (Principle II)
- [X] T002 [P] Create `tsconfig.json` and `tsconfig.node.json` (strict, noUnusedLocals, noUnusedParameters, types `@pptb/types` and `node`, include `src`, `test`, `vitest.config.ts`)
- [X] T003 [P] Create `vite.config.ts` (root `./src`, `base: "./"`, outDir `../dist`, emptyOutDir, fixed file names `assets/index.js`, IIFE, `define.__APP_VERSION__` read from `package.json`) and `vitest.config.ts` (include `test/**/*.test.ts`, node environment, `setupFiles: ['test/setup.ts']`, testTimeout 300000, same define)
- [X] T004 [P] Create `.gitignore` (node_modules, dist, logs, OS and IDE files, `.env*`, `*.tmp`, and `*.zip` under `test/` and `scratch/` so no real package is ever committed) and `.gitattributes` check: keep the existing file
- [X] T005 [P] Create `README.md` replacing the placeholder: what the tool is, the gap it fills, that it works on the Teams package, never on an environment, how to use it in four steps, and a section titled exactly `What this tool changes` stating: reads one package file you choose; writes only a new zip file you save; changes only `name.short` and `name.full` in the manifest; "nothing is written to any environment"; nothing is sent over the network; and a "What it does not cover" list
- [X] T006 [P] Create `CHANGELOG.md` in Keep a Changelog format with an `## [Unreleased]` section listing feature 001 under **Added** (no version entry yet: the constitution requires the version entry before publishing)
- [X] T007 [P] Create `CLAUDE.md` for this tool: the skills table limited to the skills that exist here (`custom-commit`, `custom-ampush`, `custom-types`, `custom-dedup`, `custom-cleanup`, `custom-changelog`, `custom-publish`), the test rules of the Testing Standard, the specs rule, and "never push or commit without being asked"
- [X] T008 Create `src/public/logo.svg` (simple 24x24 mark drawn with `currentColor`), `src/index.html` skeleton with the regions and ids of `contracts/ui-contract.md` (header, `loader`, `load-message`, `summary`, `preview`, `name-editor`, `checks`, `export`), `src/styles.css` with CSS custom properties for light and dark theme and the layout rules of the constitution (100% width and height, inner panel scrolls, no `max-width` wrapper, narrow-pane stacking)
- [X] T009 Run `npm install` and `npx tsc --noEmit`; confirm `fflate` resolves to exactly 0.8.2 and the toolchain builds an empty entry

---

## Phase 2: Foundational (blocks all stories)

- [X] T010 [P] Create `src/globals.d.ts` (`globalThis.toolboxAPI`, `__APP_VERSION__`; no `dataverseAPI`)
- [X] T011 [P] Create `src/services/limits.ts` with the constants of `contracts/core-api.md` exactly: PACKAGE_MAX_BYTES = 5*1024*1024, ENTRY_MAX_BYTES = 1024*1024, ENTRY_MAX_COUNT = 200, NAME_SHORT_MAX = 30, NAME_FULL_MAX = 100, DESC_SHORT_MAX = 80, DESC_FULL_MAX = 4000, ICON_WARN_BYTES = 72*1024, ICON_FAIL_BYTES = 100*1024, SUFFIX_MAX = 20, PNG_MAX_SIDE = 4096; each with a comment citing the source and date from research.md §1 and §4
- [X] T012 [P] Create `src/types.ts` with the types of `data-model.md` (`PackageFile`, `Entry`, `ManifestView`, `NameValue`, `IconInfo`, `Check`, `Verdict`, `ExportResult`) and the result unions of `contracts/core-api.md`
- [X] T013 [P] Create `test/helpers/png-encoder.ts`: an INDEPENDENT PNG encoder for tests (colour types 0, 2, 3, 4, 6, bit depth 8, optional Adam7 flag, any of the five filter types per row) using `node:zlib` and `node:buffer` only, importing nothing from `src/`
- [X] T014 [P] Create `test/helpers/zip-builder.ts`: builds zips for tests using `fflate` `zipSync` plus a raw writer for hostile cases (duplicate names, `..` paths, absolute paths, backslashes, 201 entries, an entry declaring 1 MB + 1 uncompressed, truncated archive); imports nothing from `src/`
- [X] T015 [P] Create `test/helpers/manifest-builder.ts`: builds manifest text in layouts (compact, 2-space, 4-space, CRLF, BOM) with options for names, descriptions, accent colour, icon paths, bots, unknown keys, localisation keys `[[DA_Name]]`, escaped quotes and unicode escapes in names
- [X] T016 [P] Create `test/helpers/combinatorics.ts` (cartesian product, all-pairs, seeded random sample; `TEST_FULL=1` selects the exhaustive run) and `test/helpers/oracle.ts` (hand-written tables: expected split of names, expected flattened pixels, expected verdicts); neither imports from `src/`
- [X] T017 Create `test/setup.ts` (Uint8Array realm fix for jsdom; stub `globalThis.toolboxAPI`)
- [X] T018 [P] Create `src/services/theme.ts` (reads and follows the PPTB theme, sets `data-theme` on the root, exports `onThemeChange`) and `src/icons.ts` (CSS-shape indicator helpers: round pass, triangle-less warning and fail drawn with CSS classes, no emoji)

**Checkpoint**: helpers exist, `npx tsc --noEmit` passes.

---

## Phase 3: User Story 1 - Load a package and see what is inside (Priority: P1) MVP

**Goal**: choose a zip, have it validated and see every item of FR-004/FR-005, with missing and unrecognised entries named.

**Independent Test**: load generated valid, partial and hostile packages and check what is shown or the refusal cause.

### Tests for User Story 1 (write first, see them fail)

- [X] T019 [P] [US1] `test/zip.test.ts`: matrix of defect x layout for `readPackage` per `contracts/core-api.md`: none, not a zip, truncated, empty file, no manifest, manifest only in a sub-folder (`manifest-in-subfolder`), path with `..`, absolute path, backslash, drive letter, duplicate path, 201 entries, entry 1 MB + 1 byte (`entry-too-large`), file 5 MB + 1 byte (`too-large`); assert the exact `code`; assert for a zip bomb (small file, huge declared size) that the size is rejected without inflating (spy on inflate or measure time); assert valid packages keep entry order and directory entries (FR-001, FR-002, FR-003)
- [X] T020 [P] [US1] `test/manifest.test.ts`: `parseManifest` over layouts x content: valid, BOM, CRLF, not JSON, JSON array, JSON string; every item of FR-004/FR-005 extracted with the value written in the fixture; `missingKeys` names each absent expected key by dotted path; `unknownKeys` lists only keys outside the known list of `data-model.md`; permissions and validDomains present and absent ("none declared"); `[[DA_Name]]` classified as `localisationKey` (FR-030); never throws on any input (FR-004, FR-005, FR-006, FR-030)
- [X] T021 [P] [US1] `test/ui.flow.test.ts` (load part): load the real `index.html` in jsdom with the harness in `test/helpers/ui-harness.ts` (create it: mounts the page, stubs `toolboxAPI.fileSystem` and the file input); loading a valid package fills `summary` with every item; loading a refused file shows the cause in `load-message` and keeps the previous package; the empty state explains what a package is (FR-002, FR-029)

### Implementation for User Story 1

- [X] T022 [US1] Implement `src/services/zip.ts` `readPackage`: check byte length against PACKAGE_MAX_BYTES first; read sizes from the zip directory with the `filter` callback of `unzipSync` BEFORE inflating (reject `entry-too-large`, `too-many-entries`, `duplicate-path`, `unsafe-path`); then inflate; require `manifest.json` in the root (`no-manifest`, or `manifest-in-subfolder` when one exists in a sub-folder); return entries in directory order; never throw (FR-001, FR-002, FR-003)
- [X] T023 [US1] Implement `src/services/manifest.ts` `parseManifest` (strip a BOM for parsing only; build the `ManifestView` of `data-model.md` with `missingKeys` and `unknownKeys` from the known-key list kept as data; classify names with `kind` `literal` | `localisationKey` | `missing`) (FR-004, FR-005, FR-006, FR-030)
- [X] T024 [P] [US1] Implement `src/services/files.ts` `pickPackage()` (`toolboxAPI.fileSystem.selectPath` with a zip filter then `readBinary`; fallback to a file input and drag-and-drop when the API is absent; returns `{ name, bytes } | null`) and export a stub-friendly shape; this is the only module that touches the PPTB API
- [X] T025 [P] [US1] Implement `src/view/loader.ts` (button "Open package…", drop area, loaded file name, "Load another", empty state, `load-message` with role `alert`) and `src/view/summary.ts` (definition list of FR-004/FR-005; the words "not declared", "missing" and "not recognised" instead of blanks; long values truncate with `title`)
- [X] T026 [US1] Implement `src/app.ts` (state: loaded package or none; load flow: pick, `readPackage`, `parseManifest`, render; a refused file keeps the previous state; version badge from `__APP_VERSION__`) and complete `src/index.html` and `src/styles.css` for these regions
- [X] T027 [US1] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T019-T021 pass

**Checkpoint**: a package can be loaded and read. Stop and demonstrate.

---

## Phase 4: User Story 2 - Honest preview of icon and name (Priority: P1)

**Goal**: show the colour icon on the accent colour, the outline icon on a light and a dark bar, the names, and the two notices.

**Independent Test**: pixel table for the flattening; both themes present; notices present.

### Tests for User Story 2

- [X] T028 [P] [US2] `test/png.test.ts`: `decodePng` matrix: colour type {0, 2, 3, 4, 6} x filter type {0, 1, 2, 3, 4} x size {1x1, 3x2, 32x32, 192x192} against pixels from the independent encoder; negatives: not a PNG, truncated, bad CRC tolerated or reported as `corrupt`, bad zlib stream, bit depth 16 (`unsupported`), interlaced (`unsupported`), IHDR 4097 x 1 (rejected before allocating), zero width; header fields (width, height, bit depth, colour type) reported for `unsupported` as well (Image Standards)
- [X] T029 [P] [US2] `test/preview.test.ts`: `flattenOnAccent` over alpha {0, 1, 127, 128, 254, 255} x channel {0, 1, 127, 128, 255} x accent {#000000, #FFFFFF, #07687D, #FF8040} against the hand table in `test/helpers/oracle.ts` using the formula `floor((src*a + bg*(255-a) + 127) / 255)`; output alpha always 255; `parseAccent` accepts `#RRGGBB` (any case) and rejects `#RGB`, `#RRGGBBAA`, missing `#`, non-hex, empty; same input gives same bytes (FR-007)
- [X] T030 [P] [US2] `test/ui.flow.test.ts` (preview part): after a load, `preview` shows the 192 px and 48 px colour icon canvases whose pixels equal the oracle, the outline on a `light` and a `dark` bar, short and full name; `preview-notice` contains verbatim the two statements of `contracts/ui-contract.md`; with an absent or invalid accent colour the preview says so and does not invent a colour (FR-007, FR-008, FR-009, FR-010)

### Implementation for User Story 2

- [X] T031 [US2] Implement `src/services/png.ts` `decodePng`: signature, chunk walk (IHDR, PLTE, tRNS, IDAT, IEND), pixel-count bound before allocating (PNG_MAX_SIDE), `unzlibSync` for the IDAT stream, own unfilter for filter types 0-4, expand to 8-bit RGBA for colour types 0, 2, 3, 4, 6 at bit depth 8 without interlace; anything else returns `unsupported` with the header (Image Standards)
- [X] T032 [US2] Implement `src/services/preview.ts` (`parseAccent`, `flattenOnAccent` with the integer formula above, alpha forced to 255)
- [X] T033 [P] [US2] Implement `src/view/preview.ts`: draw the flattened colour icon at 192 and 48 px on canvases (nearest-neighbour), the outline icon as a mask filled with the bar's foreground colour on a light and a dark bar, the names, and `preview-notice`; when the icon is unsupported or absent show the reason instead of a blank; state that the outline recolouring is an approximation
- [X] T034 [US2] Wire the preview into `src/app.ts` and `src/styles.css`; theme-aware colours from custom properties (user accent colour is data, not theme)
- [X] T035 [US2] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T028-T030 pass

**Checkpoint**: loading shows the honest preview.

---

## Phase 5: User Story 3 - Automatic checks with a clear verdict (Priority: P2)

**Goal**: every check of `data-model.md` with verdict, found value, rule and what it does not prove.

**Independent Test**: each rule broken alone is reported and nothing else.

### Tests for User Story 3

- [X] T036 [P] [US3] `test/checks.test.ts`: `runChecks` over a base valid package with each rule broken ALONE (one run per check id: `zip.valid`, `manifest.parsed`, `color.present`, `color.png`, `color.size-px`, `color.square`, `color.format`, `color.weight`, `outline.present`, `outline.png`, `outline.size-px`, `outline.white`, `color32.size-px`, `name.short.length`, `name.full.length`, `name.distinct`, `description.short.length`, `description.full.length`, `accent.hex`, `icons.declared`) asserting exactly that id changes verdict; then every PAIR of broken rules; boundaries: weight 72 KB (pass), 72 KB + 1 byte (warning), 100 KB (warning), 100 KB + 1 byte (fail) with KB = 1024; name.short 30 (pass) and 31 (fail); name.full 100 and 101; description.short 80 and 81; description.full 4000 and 4001; 191x192, 192x191, 193x193 (fail), 192x192 (pass); outline pixel (255,255,254,255) fails, fully transparent pixel with any colour passes, white with alpha 1 passes; every check carries a non-empty `notProven` and `found` (FR-012 to FR-017)
- [X] T037 [P] [US3] `test/ui.checks.test.ts`: the `checks` region shows one row per check with a verdict indicator that differs by shape and by word, the found value and the rule; `notProven` reachable from the row; a declared icon missing from the package shows a failure naming the file (FR-016, FR-017, FR-011)

### Implementation for User Story 3

- [X] T038 [US3] Implement `src/services/checks.ts` `runChecks(pkg, manifest, icons)` returning one `Check` per id in stable order, with the thresholds from `limits.ts` (never literals), `outline.white` as "every pixel with alpha above 0 has RGB 255,255,255", `accent.hex` as `#` plus exactly six hexadecimal digits, `name.distinct` a warning (not a failure: Teams accepts identical names) when short equals full, unsupported or undecodable icons reported as a warning that says the tool could not draw them and that Teams may still accept them
- [X] T039 [P] [US3] Implement `src/view/checks.ts` (rows with CSS-shape indicators from `src/icons.ts`, no emoji, details expander for `notProven`) and wire it into `src/app.ts`
- [X] T040 [US3] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T036-T037 pass

**Checkpoint**: loading shows preview and verdicts.

---

## Phase 6: User Story 4 - Change the name suffix and export (Priority: P1)

**Goal**: type a suffix, see names, preview and checks update, save a package where only the two name values differ.

**Independent Test**: export and compare entry by entry with the original.

### Tests for User Story 4

- [X] T041 [P] [US4] `test/suffix.test.ts`: `splitName`/`composeName`/`validateSuffix` matrix of base {empty, plain, with spaces, accents, right-to-left, 120 characters} x ending {none, ` [DEV]`, `[DEV]`, ` [A][B]`, ` []`, ` [x...x 20]`, ` [x...x 21]`, ` [a[b]]`, `[DEV] `, two spaces before bracket} against the hand table (only one final group of 1-20 characters without square brackets, optionally preceded by one space is a suffix); round trip `composeName(splitName(x), suffix of x) === x`; `validateSuffix` rejects 21 characters, `[`, `]`, control characters, accepts empty (FR-018, FR-019)
- [X] T042 [P] [US4] `test/rename.test.ts`: `applySuffix` over manifest layout {compact, 2-space, 4-space, CRLF, BOM, escaped quotes, `\u` escapes, a nested `name` key under another object, unknown keys before and after, name keys in reverse order} x suffix {empty, `UAT`, `PROD`, `Test 2`, with quote and backslash and unicode}: bytes outside the two literals identical; parse of new text equals parse of old except the two values; empty suffix removes the group; no recognised suffix appends ` [suffix]`; a `[[KEY]]` value is left untouched (FR-030); duplicate key in `name` gives `duplicate-name-key`; a tampered tokenizer (stub returning a wrong span) makes `RenameIntegrityError` be thrown (FR-023)
- [X] T043 [P] [US4] `test/export.test.ts`: `buildExport` over every package fixture x suffix: decompressed entries other than `manifest.json` equal to the original, same names and same order (FR-023); no-change export has the same decompressed content (FR-024); two exports of the same input are byte-identical (fixed 1980-01-01 entry date); `suggestFileName` table: `Agent.zip`+`UAT` gives `Agent-UAT.zip`, empty suffix gives `Agent-no-suffix.zip`, forbidden characters `<>:"/\|?*` removed, original name untouched (FR-025); `blockingChecks` table original {pass, fail} x new {pass, fail} for each `name.*` check (blocks only pass-to-fail); export refused with `blocking` when a name exceeds 30 or 100 after the suffix; an original icon failure (110 KB colour icon) does NOT block and appears in `remainingFailures` (FR-021, FR-022)
- [X] T044 [P] [US4] `test/ui.flow.test.ts` (edit part): typing in `suffix-input` updates the names, preview and name checks on each input event; base and suffix are shown separately; a localisation key is read-only with the reason; typing 25 `x` disables `export-btn` and the reason is visible; clearing the suffix shows names without it; loading another package drops the edit (FR-018 to FR-021, FR-027, FR-030)

### Implementation for User Story 4

- [X] T045 [US4] Implement `src/services/suffix.ts` (`splitName`, `composeName`, `validateSuffix`; constraint quoted: suffix "1 to 20 characters without square brackets", one final group, optionally preceded by one space; the separator found is kept on compose)
- [X] T046 [US4] Implement `locateNames` in `src/services/manifest.ts`: a small JSON tokenizer (strings with escapes, numbers, literals, nesting) that returns the character spans of the string literals of `name.short` and `name.full` in the top-level `name` object only
- [X] T047 [US4] Implement `src/services/rename.ts` `applySuffix`: JSON-escape the new value, splice it into the manifest text, then the safety net: parse old and new text and compare deeply with the two values ignored; throw `RenameIntegrityError` on any other difference
- [X] T048 [US4] Implement `writePackage` in `src/services/zip.ts` (entries recreated, never cloned from source headers; same names and order; fixed entry date `new Date(1980, 0, 1)`) and `src/services/export.ts` (`buildExport`, `suggestFileName`, `blockingChecks` in `checks.ts`)
- [X] T049 [P] [US4] Implement `savePackage(name, bytes)` in `src/services/files.ts` (`fileSystem.saveFile(defaultName, bytes, [{ name: 'Teams app package', extensions: ['zip'] }])`, returns the path or `null` on cancel)
- [X] T050 [P] [US4] Implement `src/view/nameEditor.ts` (single `suffix-input` labelled "Environment suffix", base and suffix shown separately for each name, read-only display for localisation keys with the reason) and the export region (button `export-btn`, suggested file name, `export-remaining` list, reason beside a disabled button, the sentence "Nothing is sent anywhere. The new package is saved on your computer.")
- [X] T051 [US4] Wire editing and export into `src/app.ts`: recompute names, preview and checks on every input; confirm what remains failing before saving; show the saved path or "cancelled"; keep the original file untouched
- [X] T052 [US4] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T041-T044 pass

**Checkpoint**: all four stories work together.

---

## Phase 7: Polish, quality gates and manual checks

- [X] T053 [P] `test/noNetwork.test.ts`: stub `fetch`, `XMLHttpRequest`, `WebSocket` and `navigator.sendBeacon` to fail the test when called, then run load, edit and export through the real page; also assert `package.json` declares no `features.connections` (FR-026, SC-008)
- [X] T054 [P] `test/ui.theme.test.ts`: both themes define every custom property used; the text/background pairs used by messages, verdicts and notices meet 4.5:1 (computed from the CSS values); no hard-coded hex in markup; no emoji code points in `src/` (Principle VII, FR-028)
- [X] T055 Write `scripts/mutation-check.mjs` (restores files from memory, also on Ctrl+C) with at least these mutations, each paired with the test expected to catch it: each constant in `limits.ts`; `>` to `>=` at the 72 KB and 100 KB boundaries; suffix regex length 20 to 21; `floor` formula `+127` removed; each PNG filter type branch; `..` and absolute path checks; duplicate path check; entry-size check moved after inflate; `blockingChecks` returning all failures; serialization of the literal without escaping; safety net removed; fixed entry date replaced by `Date.now()`; `export-btn` never disabled; `localisationKey` classification removed; outline rule `alpha > 0` to `alpha > 1`; accent regex accepting three digits
- [X] T056 Run `npm run test:mutation`; for every surviving mutation add the missing test and re-run until none survives (nobody edits `src/` while it runs)
- [X] T057 Run the gates and record the output: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`, `npm run validate`; report failures as they are
- [X] T058 [P] Run `/custom-types` and `/custom-dedup` equivalents by hand (no `any`, no `@ts-ignore`, no duplicated helper, no leftover `console.log`) and fix findings
- [X] T059 Fill the manual checks of `quickstart.md` steps 8-20 that can be done without a tenant package (a generated package is enough for 8, 9, 11-14, 16-19); mark the ones that need a real Teams tenant (10, 15, 20) as "pending manual test" in `quickstart.md` with a note; never invent a result
- [X] T060 Update `CHANGELOG.md` `[Unreleased]` entry, re-check the README claims line by line against the behaviour, and tick the requirement checklist `checklists/requirements.md`

---

## Dependencies & Execution Order

- Phase 1 then Phase 2, then the stories. US1 first (MVP). US2 needs US1 (a loaded package). US3 needs US2's `png.ts`. US4 needs US1 (`manifest.ts`, `zip.ts`) and US3 (`checks.ts`, for blocking), not US2 beyond the shared view. Polish last.
- Within each story: test tasks first and seen failing, then models/services, then views, then wiring, then the run task.
- `[P]` tasks inside a phase touch different files and can be done together.

### Parallel examples

- Phase 2: T010-T016 and T018 together.
- US1 tests: T019, T020, T021 together; T024 and T025 together after T022-T023.
- US4 tests: T041-T044 together; T049 and T050 together.

## Implementation Strategy

1. MVP = Phases 1-3 (US1): load and read.
2. Add US2 (preview), then US3 (checks), then US4 (suffix and export) - each independently demonstrable.
3. Phase 7 closes the gates. Stop after any phase to show the result.

## Traceability (requirement to code and test)

| Requirement | Code | Test |
|-------------|------|------|
| FR-001 load a package | T022, T024, T026 | T019, T021 |
| FR-002 refuse invalid, with cause | T022, T023, T025 | T019, T020, T021 |
| FR-003 size limits before processing | T011, T022 | T019 |
| FR-004 show names, descriptions, versions, developer, accent, ids | T023, T025 | T020, T021 |
| FR-005 icons, permissions, valid domains | T023, T025 | T020, T021 |
| FR-006 missing and unrecognised entries | T023, T025 | T020 |
| FR-007 colour icon on accent | T032, T033 | T029, T030 |
| FR-008 outline on light and dark bar | T033 | T030 |
| FR-009 short and full name shown | T033 | T030 |
| FR-010 notices beside the preview | T033 | T030 |
| FR-011 what each check does not prove | T038, T039 | T036, T037 |
| FR-012 colour icon checks | T038 | T036 |
| FR-013 outline icon checks | T038 | T036 |
| FR-014 name length limits | T011, T038 | T036 |
| FR-015 accent colour | T032, T038 | T029, T036 |
| FR-016 verdict and found value | T038, T039 | T036, T037 |
| FR-017 declared file missing | T038 | T036, T037 |
| FR-018 one input, both names | T045, T050, T051 | T041, T044 |
| FR-019 suffix recognition | T045 | T041 |
| FR-020 live update | T051 | T044 |
| FR-021 blocking rule | T048, T050 | T043, T044 |
| FR-022 save a new package | T048, T049, T051 | T043 |
| FR-023 only the names differ | T046, T047, T048 | T042, T043 |
| FR-024 no-change export | T048 | T043 |
| FR-025 suggested file name | T048 | T043 |
| FR-026 no network, no environment | T001, T024, T049 | T053 |
| FR-027 nothing kept between loads | T026, T051 | T044 |
| FR-028 themes, narrow pane | T008, T018 | T054 |
| FR-029 empty and error states | T025, T026 | T021 |
| FR-030 localisation keys | T023, T046, T050 | T020, T042, T044 |
| SC-001 under 30 s, one action | T026 | quickstart 8 |
| SC-002 under 1 minute, no manual edit | T051 | quickstart 11-13 |
| SC-003 identical entries | T047, T048 | T042, T043 |
| SC-004 one broken rule, one report | T038 | T036 |
| SC-005 refusals name the cause | T022 | T019, T021 |
| SC-006 pixel table | T032 | T029, T030 |
| SC-007 notice always visible | T033 | T030 |
| SC-008 no network | T053 | T053 |
| SC-009 both themes by hand | T059 | quickstart 16 |

## Notes

- Never commit real packages; fixtures are generated (Testing Standard 7).
- A defect found later is reproduced by a failing test before it is fixed, and the test stays.
- What the tests cannot see (Teams pixels, Teams validation, the native save dialog, the real PPTB theme) is in `quickstart.md` as manual checks.

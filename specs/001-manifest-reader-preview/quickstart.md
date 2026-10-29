# Quickstart: validating Manifest Reader, Preview and Name Suffix Editor

Run from the tool folder (`agent-manifest-studio/`).

## Automatic checks

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npm install` | no errors; `fflate` is exactly 0.8.2 |
| 2 | `npx tsc --noEmit` | no errors |
| 3 | `npm run build` | `dist/index.html`, `dist/assets/index.js`, `dist/assets/style.css`, `dist/logo.svg` |
| 4 | `npm test` | all green (sampled matrices, seeded) |
| 5 | `npm run test:full` | all green (exhaustive matrices) |
| 6 | `npm run test:mutation` | no surviving mutation; a survivor is a missing test |
| 7 | `npm run validate` | PPTB validation with no unexplained warning |

Tests use generated packages only. No real package from a tenant is ever committed (constitution,
Testing Standard 7).

## Status of the automatic checks (2026-10-26)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | no errors |
| `npm run build` | built: `dist/index.html`, `dist/assets/index.js`, `dist/assets/style.css`, `dist/logo.svg` |
| `npm test` and `npm run test:full` | 16 files, 1292 tests, all passing (the matrices stay under the sampling limit, so both runs are exhaustive) |
| `npm run test:mutation` | first run: 132 of 149 killed; the 17 survivors were closed (15 new tests, 2 redundant path checks removed, 2 mutations dropped with them); the survivors re-run: all killed. A final complete run is still advisable before a release |
| `npm run validate` | one error and one warning, see below |

`npm run validate` reports `configurations.readmeUrl is not accessible`: the URL points to the
README on the main branch of the repository and the file is not there until the work is pushed.
Re-run it after the push. The `website` warning is answered by the new `configurations.website`.

## Manual checks (what the tests cannot see) - record the result next to each

**None of these has been run yet.** The tests cover their logic with generated packages and a
simulated host (file dialogs, canvas); they cannot show real pixels, the native save dialog or the
real PPTB theme. Every row below stays "pending" until someone does it.

Prepare a package: in Copilot Studio open a development agent, download its Teams app package
(zip). Keep it outside the repository.

| # | Check | Expected | Result / date |
|---|-------|----------|---------------|
| 8 | Open the tool in PPTB, choose the package | summary shows names, descriptions, versions, ids, accent colour and icons; "not recognised" lists only real unknown keys | |
| 9 | Look at the preview | colour icon as it is, see-through parts on a checkerboard (amended 2026-10-29); outline on a light and a dark bar; both notices visible | |
| 10 | Compare the preview with the icon in Teams for the same agent | similar; any visible difference is noted in `research.md` §6 | |
| 11 | Type `UAT` as suffix | both names end in `[UAT]` (or the typed suffix is appended); name checks update | |
| 12 | Type 30 `x` characters | `name.short.length` fails, the export button is disabled and says why | |
| 13 | Export, choose a folder | a native save dialog appears once; the file is called `<original>-UAT.zip`; the original is untouched | |
| 14 | Unzip the exported package and the original, compare | only `manifest.json` differs, and only in the two name values; icons identical | |
| 15 | Upload the exported package to Teams as a custom app | accepted; the app is listed with the new name | |
| 16 | Switch PPTB between light and dark theme | every message, verdict and preview is readable | |
| 17 | Make the pane narrow | no horizontal page scroll | |
| 18 | Load a file that is not a zip, then a zip without `manifest.json` | each refused with its own message; the previous package stays | |
| 19 | Disconnect the network and repeat 8-14 | identical result (nothing needs the network) | |
| 21 | Open the tool next to Agent Nameplate: same look (stepper, panels, chips)? Is the logo acceptable for the marketplace policy (it is the Agent Nameplate logo, a Microsoft Copilot-style mark)? | | |
| 22 | Press Remove on a loaded package, then load another | the first one leaves no trace; the new one starts with its own suffix | | |
| 23 | Press the copy button on App ID, then paste it somewhere | the id is pasted; the button shows a tick for a moment | | |
| 24 | Turn on Show safe area on the Preview step with an icon whose logo reaches the edge | a dashed square marks the central 120 x 120; the check on the Checks step is a warning | | |
| 25 | Save report on the Checks step | one dialog, a JSON file named after the package | | |
| 20 | Settle the 72 KB / 100 KB conflict: upload a package whose colour icon is between 72 and 100 KB | record whether Teams accepts it; adjust `limits.ts` if the result contradicts the warning | |

## Traceability

Requirement-to-test mapping is kept in `tasks.md` (traceability table) once tasks are generated.

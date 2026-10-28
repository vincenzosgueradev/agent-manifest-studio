# Implementation Plan: Get the Teams Package from an Environment

**Branch**: `002-download-from-environment` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-download-from-environment/spec.md`

## Summary

Step 1 gets a source switch. The environment source reads the solutions and agents of the connection the
user selected in the host (Agent Nameplate's rules, adapted, read-only), lets the user narrow them with a
search box, pick a solution and then an agent, and downloads the agent's Teams package through the host's
Power Platform API client. The bytes go through the same loading code as an opened file. Every host call
lives in one module; everything else is tested with fakes. The constitution was amended to 1.1.0
(Principle II) and a test proves that the tool only reads.

## Technical Context

**Language/Version**: TypeScript 5 (strict), as feature 001

**Primary Dependencies**: none new (`fflate` as before); host APIs `dataverseAPI`, `powerplatformAPI`,
`toolboxAPI.connections` through `@pptb/types`

**Storage**: none; the catalog is kept in memory for the session and one connection

**Testing**: Vitest; a fake host in the UI harness (connection, `fetchXmlQuery`, `queryData`,
`CopilotStudio.Get`, connection events); pure modules tested with fake sources

**Target Platform**: PPTB tool window; also loads outside the host (the environment option then says there is
no connection)

**Project Type**: single-page PPTB tool

**Performance Goals**: tables of 5000 agents filter within a frame; the list is on screen at once from the cache

**Constraints**: read-only (queries and one GET), no network primitive of its own, no new runtime dependency,
no writes through any host API, both themes, narrow pane

**Scale/Scope**: environments of up to thousands of agents and hundreds of solutions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Gap-First | Removes the manual download of the package, and puts the agent next to its preview | Pass |
| II. Local, read-only toward environments (v1.1.0) | Only `queryData`, `fetchXmlQuery`, `CopilotStudio.Get`, `getActiveConnection`; one module; a test fails on anything else | Pass |
| III. Honest Preview | Two facts marked unverified with a manual test; the tool says when the answer is not readable | Pass |
| IV. Copilot Studio and Teams First | The download is Copilot Studio's own Teams package | Pass |
| V. Marketplace Policy | README section updated; `features` declared; no Microsoft brand as own | Pass (logo point open from feature 001) |
| VI. Community Visibility | Fills the gap "list, pick, preview" | Pass |
| VII. Enterprise UI | Tables, keyboard, empty and error states with cause, breadcrumb, both themes | Pass |
| VIII. Simplicity | One switch, no new step, no new dependency | Pass |
| Testing Standard | Matrix, independent oracle, negative tests, mutation, fake host, no tenant data | Pass |

**Re-check after design**: unchanged.

## Project Structure

### Documentation

```text
specs/002-download-from-environment/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/ (core-api.md, ui-contract.md)
├── checklists/requirements.md
└── tasks.md
```

### Source code

```text
src/services/environment/
├── host.ts        # the only module that touches the host's APIs
├── catalog.ts     # solutions, agents, groups, filters (pure, takes a source)
└── download.ts    # environment id, path, coerceZip, errors, package name (pure, takes deps)
src/view/
├── environment.ts # switch, badge, tables, search, refresh, download, prompt, message
└── steps.ts       # gains a trail for the breadcrumb of step 1
src/app.ts         # source state, connection events, download wiring
src/index.html, src/styles.css, src/types.ts, src/globals.d.ts
test/
├── catalog.test.ts  download.test.ts  ui.env.test.ts
├── helpers/ui-harness.ts (fake host)  helpers/fake-env.ts (rows and responses)
└── noNetwork.test.ts (updated: reads allowed, writes and primitives not)
```

**Structure Decision**: as feature 001; the host boundary is one module so that the read-only rule is
checked in one place.

## Test strategy

| Area | Dimensions | Oracle |
|------|-----------|--------|
| `fetchCatalog` | agents {0, 1, many} x solutions {none, one, several} x membership {all in solutions, some in none, solution lookup fails} x system containers present | hand-listed expected groups and counts |
| `groupsOf` / filters | text {empty, case differences, matches in each column, no match} | hand tables |
| `coerceZip` | wrapping {bytes, ArrayBuffer, Buffer object, number array, base64, base64 with data prefix, binary string} x nesting key {none, data, body, content, value, bytes, file, blob} x content {a real zip, empty zip, not a zip, truncated, text, null} | the same zip bytes, or `null` |
| `resolveEnvironmentId` | result shape {object, in `value[0]`, missing, not a GUID, throws} | table |
| `classifyDownloadError` | status {401, 403, 404, 500, none} x message x connection flag | table |
| `downloadManifest` | connection {absent, not enabled, enabled} x env id {given, missing} x response {zip forms, invalid, error} | the results of the contract |
| UI | whole flows in the harness: switch, no connection, tables, search, selection, breadcrumb, refresh, stale-while-revalidate, download, errors, prompt, race on download, connection change | texts and ids of the UI contract |
| Safety | sources scanned for forbidden calls; a spy host records every call and the test fails on any not allowed | the allowed list |

## Complexity Tracking

No violations.

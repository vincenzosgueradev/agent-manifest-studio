---

description: "Task list for feature 002: Get the Teams Package from an Environment"
---

# Tasks: Get the Teams Package from an Environment

**WITHDRAWN 2026-10-28**: see the "Withdrawn" section of `spec.md`. The tasks below were done and then removed with the code.

**Input**: `specs/002-download-from-environment/` (spec, plan, research, data-model, contracts, quickstart)

**Tests**: REQUIRED (constitution, Testing Standard): matrix, independent oracle, negative tests, mutation. Each implementation task is preceded by its test task.

Paths are relative to `agent-manifest-studio/`. No commits are made unless the user asks.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Update `package.json`: add `"features": { "connections": { "min": 0, "max": 1 }, "enabledForPowerPlatformAPI": true }` (the tool starts without a connection and may use one that is enabled for the Power Platform API)
- [X] T002 [P] Update `src/globals.d.ts` to declare `globalThis.dataverseAPI` and `globalThis.powerplatformAPI` from `@pptb/types`
- [X] T003 [P] Add the types of the data model to `src/types.ts`: `ConnectionInfo`, `Solution`, `Agent`, `Catalog`, `DownloadCause`, `DownloadResult`

## Phase 2: Foundational

- [X] T004 Extend `test/helpers/ui-harness.ts` with a fake host: `toolboxAPI.connections.getActiveConnection`, `dataverseAPI.fetchXmlQuery` and `queryData`, `powerplatformAPI.CopilotStudio.Get`, and `toolboxAPI.events.on` that keeps its handlers so a test can fire `connection:updated`; every host call is recorded in `fakes.calls`; the fake environment (`fakes.env`) holds the connection, the `bot`, `solution` and `solutioncomponent` rows, the environment id, and one response or error per agent
- [X] T005 [P] Create `test/helpers/fake-env.ts`: builders for bot rows, solution rows and solution components, a real zip for an agent (from `test/helpers/fixture.ts`), and the wrappings of a zip used by the `coerceZip` matrix
- [X] T006 Implement `src/services/environment/host.ts`: the only module that touches `dataverseAPI`, `powerplatformAPI` and `toolboxAPI.connections`; `getConnection`, `hostSource` (`fetchXml`, `queryAll` following `@odata.nextLink`), `queryOne`, `copilotStudioGet`, `onConnectionChange`; every access lazy (read at call time)

## Phase 3: User Story 1 - Pick an agent and get its package (P1) MVP

- [X] T007 [P] [US1] `test/catalog.test.ts`: `fetchCatalog`, `groupsOf`, `agentsOf`, `isSystemSolution` over the matrix of the plan: agents {0, 1, many} x solutions {none, one, several} x membership {all in solutions, some in none, solution lookup fails} x system containers; expected groups and counts hand-listed; an agent never disappears when the solution lookup fails; managed solutions listed; the real solution wins over a container (FR-005, FR-006, FR-009)
- [X] T008 [P] [US1] `test/download.test.ts`: `downloadPath`, `packageFileName`, `coerceZip` (matrix wrapping x nesting key x content), `downloadManifest` (connection x environment id x response) (FR-012 to FR-014)
- [X] T009 [P] [US1] `test/ui.env.test.ts` (flow): switch at start with file active; switching shows the badge and the solutions; opening a solution shows its agents and the breadcrumb Package > Solutions > name; selecting an agent enables Download naming it; Download loads the package named after the agent with "downloaded from"; the next steps work; switching back keeps the package (FR-001 to FR-003, FR-005 to FR-007, FR-012 to FR-014)
- [X] T010 [US1] Implement `src/services/environment/catalog.ts` (rules of research section 4; `NO_SOLUTION`; sorted groups; filters) and `src/services/environment/download.ts` (`isGuid`, `normalizeGuid`, `resolveEnvironmentId`, `downloadPath`, `coerceZip`, `classifyDownloadError`, `packageFileName`, `downloadManifest`)
- [X] T011 [P] [US1] Update `src/index.html` and `src/styles.css`: the source switch (segmented, as Agent Nameplate), the environment block with the connection badge, the two tables (flush in their panels, scrolling inside them), row selection styling, chips; add `src/view/environment.ts` rendering them from a state object
- [X] T012 [US1] Update `src/view/steps.ts` (a trail for the breadcrumb of step 1 with clickable levels) and `src/app.ts` (source state, entering the environment, the download, loading the bytes through the same function as an opened file, the origin text in the file bar)
- [X] T013 [US1] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T007 to T009 pass

## Phase 4: User Story 2 - Find the agent quickly and trust what is listed (P2)

- [X] T014 [P] [US2] `test/ui.env.test.ts` (lists): search narrowing by any shown text and letter case with the count, the empty result naming the text, Refresh replacing rows and keeping selection, returning to a list shows the cache at once and reads again, "Updated at hh:mm", no agents, "Agents in no solution", a failed read keeping the rows and naming the failure and the last good read, a connection change clearing and re-reading (FR-004, FR-008, FR-010, FR-011)
- [X] T015 [US2] Implement search, counts, refresh, the cache with stale-while-revalidate and its status line, the failure line, the empty states and the connection-change handling in `src/view/environment.ts` and `src/app.ts`
- [X] T016 [US2] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T014 passes

## Phase 5: User Story 3 - When something is missing, say what and offer the way out (P3)

- [X] T017 [P] [US3] `test/ui.env.test.ts` (failures): no connection; connection not enabled for the Power Platform API (no call made); permission; not found; the environment id asked for, checked as a GUID and used; an answer that is not a zip; the previous package kept; the message dismissible with "Open a file instead"; a second press ignored; a download finishing after the package was removed or another chosen is dropped (FR-003, FR-015 to FR-017)
- [X] T018 [US3] Implement the messages, the prompt for the environment id, the token that drops a stale download, and the busy state in `src/view/environment.ts` and `src/app.ts`
- [X] T019 [US3] Run `npx tsc --noEmit`, `npm run build`, `npm test`; fix until T017 passes

## Phase 6: Polish, safety and quality gates

- [X] T020 [P] Update `test/noNetwork.test.ts`: every network primitive still fails the test; `dataverseAPI`, `powerplatformAPI` and `toolboxAPI.connections` appear only in `src/services/environment/host.ts`; that module uses only `queryData`, `fetchXmlQuery`, `CopilotStudio.Get` and `getActiveConnection`; no source contains `.Post(`, `.Put(`, `.Patch(`, `.Delete(`, `execute(`, `.create(`, `.update(`, `.delete(`; a spy host records every call of a full run (browse, download) and every one is on the allowed list and a GET (FR-018, SC-004)
- [X] T021 [P] Update `README.md` (section "What this tool changes": what is read from the environment, that nothing is written there, that nothing is sent elsewhere; how to enable the connection for the Power Platform API; the file route), `CHANGELOG.md`, `package.json` keywords
- [X] T022 Add the mutations of this feature to `scripts/mutation-check.mjs` (catalog rules, the system-container filter, the filters, `coerceZip` signature and wrappings, GUID check, error classification order, path, file name, the token, the busy guard, the connection-enabled guard) and run it until none survives
- [X] T023 Run the gates and record them: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation` (affected files), `npm run validate`
- [X] T024 Update `specs/002-download-from-environment/quickstart.md` with the automatic results and mark the manual checks as pending; update the traceability below if a task changed

---

## Dependencies & Execution Order

Setup, then foundational, then US1 (MVP), US2 and US3 each after US1, then polish. Inside a story: tests first, seen failing, then code.

## Traceability

| Requirement | Code | Test |
|-------------|------|------|
| FR-001 source switch, file first | T011, T012 | T009 |
| FR-002 switching keeps the package | T012 | T009 |
| FR-003 connection badge, no-connection message | T011, T015, T018 | T009, T017 |
| FR-004 connection change | T006, T015 | T014 |
| FR-005 solutions listed, containers out | T010, T011 | T007, T009 |
| FR-006 agents in no solution | T010, T011 | T007, T014 |
| FR-007 agents table, breadcrumb | T011, T012 | T009 |
| FR-008 search and counts | T010, T015 | T007, T014 |
| FR-009 agents from the agents table | T010 | T007 |
| FR-010 stale-while-revalidate | T015 | T014 |
| FR-011 failed read keeps rows | T015 | T014 |
| FR-012 one agent, Download names it | T011, T012 | T009 |
| FR-013 M365 package, same loading code | T010, T012 | T008, T009 |
| FR-014 name and origin | T010, T012 | T008, T009 |
| FR-015 environment id and the prompt | T010, T018 | T008, T017 |
| FR-016 busy guard, dropped stale result | T018 | T017 |
| FR-017 causes and the file route | T010, T018 | T008, T017 |
| FR-018 read-only | T006 | T020 |
| FR-019 features declaration | T001 | T020 |
| FR-020 README and the test | T020, T021 | T020 |
| FR-021 keyboard, themes, narrow pane | T011 | T009, theme tests |
| SC-001 four choices | T011, T012 | T009 |
| SC-002 every agent reachable | T010 | T007 |
| SC-003 every cause named | T010, T018 | T008, T017 |
| SC-004 safety test | T020 | T020 |
| SC-005 cache shown at once | T015 | T014 |
| SC-006 same loading code | T012 | T009 |
| SC-007 both themes by hand | T024 | quickstart 15 |

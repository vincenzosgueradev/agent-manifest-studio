# Tasks: Automatic Check Fixes

**Input**: Design documents from `specs/011-automatic-check-fixes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included and mandatory — the project's Testing Standard (`CLAUDE.md`) requires an
oracle-based test matrix for every new behaviour and a screen-path test loaded in jsdom; this is
not optional for this repository.

**Organization**: Tasks are grouped by user story (spec.md) so each can be implemented and tested
independently once the Foundational phase is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to US1–US4 in spec.md
- Every task names its exact file path

## Path Conventions

Single project, matching the repository's existing layout: `src/`, `test/` at the repository root
(see plan.md "Project Structure").

---

## Phase 1: Setup

**Purpose**: Create the empty shells the rest of the work fills in; nothing here changes behaviour.

- [x] T001 [P] Create `src/services/autofix.ts` with its module doc comment and the `FixPlan` type (data-model.md); export an initially-empty `canAutoFix`/`planFix`/`planFixAll` (every call returns `false`/`null`).
- [x] T002 [P] Create `test/autofix.test.ts` with its imports and the fixture helpers it will need (a decodable colour-icon PNG, an outline PNG, a too-long name/description, a missing/invalid accent colour), reusing `test/helpers/` builders.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The plumbing every user story needs — the button, the apply path and Undo — wired to
a `canAutoFix` that is not yet true for anything. **No user story task can be demoed until this
phase is done**, because every story only adds a branch to the dispatcher this phase creates.

- [X] T003 Implement the `canAutoFix(id)` / `planFix(id, input)` / `planFixAll(checks, input)` dispatcher shape in `src/services/autofix.ts` (research.md §1): a lookup table keyed by check id, empty for now, with the exact function signatures every later story's branch will plug into.
- [X] T004 Add `lastFix: { edits: Edits; summary: string } | null` to `State` in `src/app.ts`; clear it inside every existing mutation path (`edit()`, `acceptIcon()`, `loadBytes()`, `removePackage()`) and when `initSteps` moves away from step 5 (data-model.md "UndoSnapshot", research.md §6).
- [X] T005 Render the Undo banner in `render()` in `src/app.ts` (reads `state.lastFix`, shows its `summary` and an "Undo" button that restores `state.edits` to the snapshot and clears `state.lastFix`), with its markup/CSS added to `src/styles.css` following the existing `chk-*`/`btn` conventions (CSS custom properties, no emoji, both themes).
- [X] T006 Add delegated click handlers in `src/app.ts`, next to the existing `data-copy` one, for `[data-fix]` (reads the check id, calls `planFix`, snapshots `state.edits` into `lastFix` first, then applies the plan's `fields`/`icon` through `edit()`/`acceptIcon()`) and for `#checks-fix-all-btn` (same, via `planFixAll`).
- [X] T007 Update `fixOf()` in `src/view/checks.ts` to add a `data-fix="<id>"` button whenever `canAutoFix(c.id)` is true (next to the existing "Go to Step" button, FR-001/FR-013), and add a `#checks-fix-all-btn` control to the strip in `renderChecks()`, hidden when no visible check is both failing/warning and fixable (FR-010).

**Checkpoint**: the button, the apply wiring and Undo work end-to-end; every click is currently a
no-op because `canAutoFix` is still empty. This is the gate for every story below.

---

## Phase 3: User Story 1 - Fix an icon problem with one click (Priority: P1) 🎯 MVP

**Goal**: "Fix it" on any colour-icon or outline-icon row resolves the whole group in one action.

**Independent Test**: open a package whose colour icon fails/warns on size, square, safe area,
format or weight (or whose outline icon fails on size/white); press "Fix it" on one of those rows;
every row in that group turns green without visiting another step.

### Tests for User Story 1

- [X] T008 [P] [US1] In `test/autofix.test.ts`: `canAutoFix` is `true` for `color.size-px`, `color.square`, `color.safe-area`, `color.format`, `color.weight`, `outline.size-px`, `outline.white`, and `false` for `color.present`, `color.png`, `outline.present`, `outline.png`, `color32.present`, `color32.size-px` (research.md §2 table).
- [X] T009 [P] [US1] In `test/autofix.test.ts`: `planFix` on any colour-icon id, given a logo outside the safe area, returns icon bytes that, run back through `runChecks` (`src/services/checks.ts`), make `color.size-px`/`color.square`/`color.safe-area`/`color.format`/`color.weight` all pass — the test computes its own expected pixels independently of `presetTeamsColour`, per the Testing Standard.
- [X] T010 [P] [US1] In `test/autofix.test.ts`: the same kind of test for `outline.size-px`/`outline.white` via the outline branch.
- [X] T011 [P] [US1] In `test/ui.checks.test.ts`: load a package with a safe-area warning in jsdom, press "Fix it", assert the row and its group turn green and the Undo banner appears.

### Implementation for User Story 1

- [X] T012 [US1] Implement the colour-icon branch of `planFix` in `src/services/autofix.ts`: `importImage` the current bytes, build ops with `presetTeamsColour`, `evaluate`, bring to size with `toTarget`/`acceptResult`, return `{ icon: { slot: 'color', bytes }, ids: [...], summary }` or `null` when the picture cannot be read (research.md §5).
- [X] T013 [US1] Implement the outline-icon branch the same way with `presetOutline` and slot `'outline'`.
- [X] T014 [US1] In the `[data-fix]` handler from T006, apply an icon `FixPlan` through the existing `acceptIcon(slot, bytes)` in `src/app.ts` (no new validation path).

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Fix a too-long name or description with one click (Priority: P2)

**Goal**: "Fix it" on a too-long name/description row cuts it to exactly its limit.

**Independent Test**: open a package whose short name or full description exceeds its limit; press
"Fix it"; the row turns green and the stored text is exactly at the limit, unchanged otherwise.

### Tests for User Story 2

- [X] T015 [P] [US2] In `test/autofix.test.ts`: `canAutoFix` is `true` for `name.short.length`/`name.full.length`/`description.short.length`/`description.full.length` only when the value is present but too long, and `false` when the value is missing (FR-002, FR-006).
- [X] T016 [P] [US2] In `test/autofix.test.ts`: `planFix` truncates with `[...text].slice(0, max).join('')` — exactly `max` code points, every remaining character identical to the input — including a case where the cut falls next to a multi-code-point character (an emoji), proving no character is corrupted (research.md §3).
- [X] T017 [P] [US2] In `test/ui.checks.test.ts`: a 40-character short name shows "Fix it" on "Short name length"; pressing it shows the 30-character result in Details and the row turns green.

### Implementation for User Story 2

- [X] T018 [US2] Implement the name/description branches of `planFix` in `src/services/autofix.ts` using the truncation rule, returning `{ fields: { [path]: cut }, ids: [id], summary }`.
- [X] T019 [US2] In the `[data-fix]` handler from T006, apply a `fields` patch through the existing `edit()` function in `src/app.ts`.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Fix the accent colour with one click (Priority: P3)

**Goal**: "Fix it" on the accent colour or contrast row sets a valid, readable colour.

**Independent Test**: open a package with a missing/invalid/low-contrast accent colour; press "Fix
it"; the accent colour becomes a valid `#RRGGBB` value that passes the contrast rule (or the
documented fallback when the logo cannot be read).

### Tests for User Story 3

- [X] T020 [P] [US3] In `test/autofix.test.ts`: `canAutoFix('accent.hex')` and `canAutoFix('color.contrast')` are `true`; `planFix` picks `#000000`/`#ffffff` correctly against independently-computed logo luminances (research.md §4), and returns `#000000` when the colour icon has no readable picture at all.
- [X] T021 [P] [US3] In `test/ui.checks.test.ts`: a missing accent colour shows "Fix it" on "Accent colour is #RRGGBB"; pressing it sets a valid colour and the row turns green.

### Implementation for User Story 3

- [X] T022 [US3] Export a small `averageLogoColour(png)` helper from `src/services/checks.ts` (factored out of the existing `contrastCheck`, no behaviour change there) and use it, with `luminance`/`contrastRatio` from `src/services/image/colour.ts`, to implement the accent-colour branch of `planFix` in `src/services/autofix.ts` (research.md §4).
- [X] T023 [US3] In the `[data-fix]` handler from T006, apply the `fields.accentColor` patch through the same `edit()` path as T019.

**Checkpoint**: All three single-check stories work independently.

---

## Phase 6: User Story 4 - Fix everything on the page with one click (Priority: P4)

**Goal**: one control applies every currently available fix in one action.

**Independent Test**: a package with one fixable problem in each group plus one unfixable check
(for example a missing icon file); "Fix everything" turns every fixable row green in one action,
leaves the unfixable row untouched, and shows one combined message.

### Tests for User Story 4

- [X] T024 [P] [US4] In `test/autofix.test.ts`: `planFixAll` applies every currently fixable plan in the fixed order of research.md §6 (colour icon, outline icon, short name, full name, short description, full description, accent colour/contrast), skips ids with no plan, and is a no-op when every fixable check already passes.
- [X] T025 [P] [US4] In `test/ui.checks.test.ts`: a package with one problem per group plus an unfixable row — "Fix everything" turns every fixable row green, leaves the unfixable row's text unchanged, shows one combined banner with one Undo, and the button is hidden once nothing is left to fix.

### Implementation for User Story 4

- [X] T026 [US4] Implement `planFixAll` in `src/services/autofix.ts`: run every id's `planFix` in the fixed order, merge the `fields`/`icon` results and summaries into one combined plan.
- [X] T027 [US4] Wire the bulk apply path for `#checks-fix-all-btn` in `src/app.ts` (reuses T006's snapshot/apply machinery) and the show/hide rule for the button in `src/view/checks.ts` (T007).

**Checkpoint**: all four user stories work together; the Checks page can go from however many
problems to "all pass" (except what is out of the tool's reach) in at most two clicks.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [~] T028 Run `npx tsc --noEmit`, `npm run build` and `npm test`; fix any fallout before proceeding (CLAUDE.md Testing Standard). Done so far: `tsc --noEmit`, `npm run build`, and the two new/changed test files (`test/autofix.test.ts`, `test/ui.checks.test.ts`) run clean; the full `npm test` is deferred to when every feature in flight is done, per the user's own instruction.
- [x] T029 Run `npm run test:mutation`; for every surviving mutation, add the missing test rather than editing `src/` while it runs (CLAUDE.md Testing Standard). Deferred alongside T028's full suite. Complete `npm run test:mutation` run 2026-10-30: 456 of 456 mutations killed.
- [ ] T030 [P] Walk through all 6 scenarios in `specs/011-automatic-check-fixes/quickstart.md` by hand; record the Teams-rendering manual check and its result in that file (Principle III, Honest Preview).
- [x] T031 Re-check the GitHub description/topics against Principle VI now that the feature exists; propose updated text only if it no longer matches, and apply it only when the user says so. Checked 2026-10-29: the live description already says "preview, check and edit" and the topics are unchanged; one-click fixing is the tool performing that same "edit", not a new target or kind of input/output (research.md §7). No change proposed.
- [X] T032 [P] Add the feature's entry to `CHANGELOG.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; **blocks every user story**.
- **User Stories (Phases 3–6)**: each depends only on Foundational; US1–US3 do not depend on each
  other and can be built in any order or in parallel; US4 (Phase 6) depends on at least one of
  US1–US3 existing to have anything to batch, but its own tasks touch different code (the
  dispatcher's merge function) so it can be scaffolded in parallel and finished last.
- **Polish (Phase 7)**: depends on every user story that will ship being complete.

### Within Each User Story

- Tests are written first and must fail before the implementation tasks that follow them.
- The `planFix` branch (service) comes before the `app.ts` wiring task that calls it, since the
  wiring task for US2/US3 (T019/T023) reuses the single handler T006 already built.

### Parallel Opportunities

- T001 and T002 (Phase 1) run in parallel.
- Within Phase 2, T003 has no dependents ready until it lands; T004 and T005 touch different
  concerns of `app.ts`/`styles.css` but both depend on T003's types, so land T003 first, then T004
  and T005 in parallel, then T006 (needs both) and T007 (independent, can run alongside T004/T005).
- All test tasks marked [P] inside one story run in parallel (different `it(...)` blocks or files).
- Once Phase 2 is done, US1, US2 and US3 (Phases 3–5) can be staffed and built in parallel; US4
  (Phase 6) should land last since it depends on the others existing to batch.

---

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "canAutoFix true/false table in test/autofix.test.ts (T008)"
Task: "planFix colour-icon oracle in test/autofix.test.ts (T009)"
Task: "planFix outline oracle in test/autofix.test.ts (T010)"
Task: "Checks page screen-path test in test/ui.checks.test.ts (T011)"

# Then implementation, in order (T012/T013 are independent of each other, T014 needs both):
Task: "Colour-icon branch of planFix (T012)"
Task: "Outline-icon branch of planFix (T013)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational, the whole button/apply/Undo plumbing).
2. Phase 3 (User Story 1 — icon fixes): the most common problem (see the warning in the
   screenshot that started this feature) and the clearest demo of the one-click idea.
3. **STOP and VALIDATE**: run quickstart.md scenarios 1, 4 and 6 by hand.
4. Demo: a package with only an icon problem goes from "1 warning" to "all pass" in one click.

### Incremental Delivery

1. Setup + Foundational → the page shows "Fix it" buttons that do nothing yet (safe to merge
   behind nothing in particular, since `canAutoFix` is still empty — no user-visible change).
2. Add User Story 1 → icon problems become one-click fixable → demo.
3. Add User Story 2 → text-length problems become one-click fixable → demo.
4. Add User Story 3 → the accent colour becomes one-click fixable → demo.
5. Add User Story 4 → "Fix everything" ties the first three together → demo.
6. Phase 7 closes with the full test suite, mutation testing and the manual Teams check recorded.

---

## Notes

- [P] tasks touch different files, or different, independent parts of the same file (different
  `it(...)` blocks in the same test file still count, since they do not depend on each other's
  code existing first).
- Every implementation task reuses an existing, already-tested function (`presetTeamsColour`,
  `presetOutline`, `acceptResult`, `importImage`, `luminance`, `contrastRatio`, `edit()`,
  `acceptIcon()`); no task introduces a second definition of something the tool already has one of.
- Commit after each task or logical group, per the user's own workflow preference (the project's
  `/custom-commit` skill proposes the message; nothing is pushed without being asked).

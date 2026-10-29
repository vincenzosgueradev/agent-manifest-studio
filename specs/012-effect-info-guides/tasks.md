# Tasks: Effect Info Guides in the Image Editor

**Input**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [research.md](./research.md)

**Tests**: included — the project's Testing Standard requires them for every behaviour change.

## Phase 1: Foundational (blocks every user story)

- [x] T001 Add `src/services/image/demo.ts`: pure builders for the fixed sample pictures (an asymmetric "L" mark)
      — `demoOpaque()`, `demoTransparent()`, `demoPadded()` (Trim), `demoWide()` (Make square), `demoNearFill()`
      (Fit), `demoTwoTone()` (Solid colour) — each returning a `Picture` (`services/image/types.ts`), no DOM, no
      canvas, deterministic.
- [x] T002 [P] Add `test/image.demo.test.ts`: each builder returns the declared size, the expected flat/transparent
      background, and a non-empty glyph; an independent oracle (hand-picked pixel coordinates), not a re-run of the
      same loop.
- [x] T003 Add `src/view/effectGuide.ts`: `GuideKey` type and the 13-entry `EffectGuide` content map (data-model.md)
      — title, lead, example, tip, `before`, `after` (built from T001's pictures plus `applyOp` /
      `presetTeamsColour` / `presetOutline` from `services/image/pipeline.ts`).
- [x] T004 In `src/view/effectGuide.ts`, add `initEffectGuide(): EffectGuideView` with `attach(host)`, `open(key)`,
      `close()`, `isOpen()`: `attach` builds the overlay once inside the editor's own card; `open` renders the
      active guide's text and its Before/After canvases via `paintTile` (`src/view/draw.ts`) and the existing
      `icon-canvas--checker` class; closes on its own control, `Escape`, and a click on the backdrop; opening a
      new guide while one is open replaces it (FR-006) without ever touching a `Pipeline`.
- [x] T005 [P] Add `.ie-tool-row`, `.guide-overlay`, `.guide-panel`, `.guide-before-after`, `.guide-pic` to
      `src/styles.css`: themed tokens only, no emoji; `.guide-before-after` stacks side by side above a width
      breakpoint and vertically below it (FR-008); `z-index` above the editor workspace's `40`.

**Checkpoint**: the guide content and overlay exist and are unit-testable in isolation, but nothing in the
toolbox opens one yet.

---

## Phase 2: User Story 1 - Learn what a tool does before using it (P1) 🎯 MVP

**Goal**: every toolbox entry has a working info control that opens its own guide and closes cleanly.

**Independent Test**: open the editor, press the info control next to any tool, see its guide open with the right
name/text/example, close it any of the three ways, and confirm nothing in the editor's picture or history changed.

### Tests for User Story 1

- [x] T006 [P] [US1] `test/ui.guide.test.ts`: every one of the 13 toolbox entries (11 operations, counting the two
      Flip buttons as one shared guide, + 2 Quick presets) has an info control distinct from its action button.
- [x] T007 [P] [US1] `test/ui.guide.test.ts`: pressing an info control opens the guide with that entry's title and
      text; pressing a different one replaces it (only one open at a time, FR-006).
- [x] T008 [P] [US1] `test/ui.guide.test.ts`: closing via the close control, `Escape`, and a backdrop click all
      close the guide and leave the pipeline's `ops.length` and `undoStack`/`redoStack` unchanged (FR-005).
- [x] T009 [P] [US1] `test/ui.guide.test.ts`: `Escape` with a guide open closes only the guide, not the image
      editor workspace itself (checked before the editor's own `Escape` handler).

### Implementation for User Story 1

- [x] T010 [US1] In `src/view/imageEditor.ts`, wrap each `tool()` and preset `button()` call site in `.ie-tool-row`
      with a sibling info button (`icon('info', 'icon--xs')`, `aria-label` = `${title} — what this does`), wired to
      `effectGuide.open(key)`; map the two Flip buttons to the shared `'flip'` `GuideKey`.
- [x] T011 [US1] Call `guide.attach(c)` once per `build()` call in `src/view/imageEditor.ts`, appended inside
      `#ie-card`; route the workspace's existing `Escape` listener to check `guide.isOpen()` first and close
      only the guide in that case.

**Checkpoint**: User Story 1 is fully functional — every entry has a guide, openable and closable, with zero
effect on the editor's own state.

---

## Phase 3: User Story 2 - See the effect, not just read about it (P2)

**Goal**: every guide's Before/After pair is visibly correct and transparency reads as see-through, not white/black.

**Independent Test**: open a guide whose effect touches transparency (Remove background, Fill background, Solid
colour, Outline maker) and confirm the After picture's see-through pixels sit on a checkerboard.

### Tests for User Story 2

- [x] T012 [P] [US2] `test/ui.guide.test.ts`: for each of the 13 guides, the rendered Before and After canvases
      have different pixel data (an independent check: compare raw canvas `ImageData`, not re-invoking `after()`).
- [x] T013 [P] [US2] `test/ui.guide.test.ts`: for the 4 transparency-sensitive guides, the After canvas (or its
      container) carries the `icon-canvas--checker` class whenever the picture has alpha < 255 pixels.

### Implementation for User Story 2

- [x] T014 [US2] In `src/view/effectGuide.ts`, render Before/After each as a labelled `<figure>` with a canvas
      painted via `paintTile`, the canvas (or its wrapper) carrying `icon-canvas--checker` so existing CSS supplies
      the checkerboard — no new transparency-drawing code.

**Checkpoint**: guides are not just descriptive text — their pictures demonstrably show the claimed effect.

---

## Phase 4: User Story 3 - A consistent, professional reading experience (P3)

**Goal**: every guide reads like one manual: same structure, same tone, themed, responsive.

**Independent Test**: open several guides in a row; each follows title → lead → example → tip → Before/After, in
the same visual shell, in both themes and at a narrow width.

### Tests for User Story 3

- [x] T015 [P] [US3] `test/ui.guide.test.ts`: every guide's DOM exposes the same section order (title, lead,
      example, tip, before/after) via stable selectors/classes, for all 13 keys.
- [x] T016 [P] [US3] `test/ui.theme.test.ts`: the guide overlay's colours resolve from CSS custom properties in
      both themes (no hard-coded hex in the new markup/classes).

### Implementation for User Story 3

- [x] T017 [US3] Finish the guide content map in `src/view/effectGuide.ts` for every key per data-model.md (title,
      lead, example, tip), proof-read for one consistent, plain, professional tone and no unexplained jargon.
- [x] T018 [US3] Add the narrow-width stacking rule to `.guide-before-after` in `src/styles.css` and verify by hand
      against the manual checks in quickstart.md.

**Checkpoint**: all three user stories are independently functional and the feature is complete end to end.

---

## Phase 4b: User Story 4 - A technical manual of every modifiable parameter (P2)

**Goal**: every editing operation's guide shows a Parameters section (label, range/choices, plain explanation)
for every setting it exposes, read from the same definition the editor's real step controls use — never
duplicated — so it cannot drift as operations change.

**Independent Test**: open the guide for Remove background (5 settings) and confirm its Parameters section lists
all 5 by their real labels, each with a range/choices and a non-empty, distinct explanation; open a Quick preset
guide and confirm no Parameters section is shown.

### Implementation

- [x] T022 [P] Extract `Field`, `num()` and `FIELDS` from `src/view/imageEditor.ts`, unchanged, into new
      `src/view/opFields.ts`; `imageEditor.ts` imports them back (avoids a circular import with `effectGuide.ts`,
      which also needs them).
- [x] T023 In `src/view/effectGuide.ts`, add `GUIDE_OP` (`GuideKey` -> `OpKind`, absent for the 2 presets) and
      `PARAM_HELP` (`OpKind` -> field name -> explanation, data-model.md); add `paramDetail(field)` deriving a
      range/options/on-off descriptor purely from the field's own metadata (never hand-written).
- [x] T024 Render a `#guide-params` section between the before/after pair and the tip: one row per
      `FIELDS[opKind]` entry (real label, `paramDetail`, `PARAM_HELP` prose), rebuilt per guide; `hidden` entirely
      when `GUIDE_OP[key]` is absent (the 2 Quick presets).
- [x] T025 [P] Add `.guide-params`/`.guide-param*` to `src/styles.css`: themed tokens only.

### Tests

- [x] T026 [P] `test/image.paramHelp.sync.test.ts` **(new)**: `GUIDE_OP` reaches every `OpKind` in `FIELDS`
      exactly once; for every `OpKind`, `PARAM_HELP` names exactly the same parameters `FIELDS` does, in both
      directions — this is the automated check FR-010 requires, and it fails the day a parameter is added,
      renamed or removed without a matching update.
- [x] T027 [P] `test/ui.guide.test.ts`: the Parameters section lists Remove background's 5 settings by their real
      labels with distinct, non-empty explanations; shows a select's options and a number's range; has exactly
      the right row count for every operation; is absent for both Quick presets.

**Checkpoint**: User Story 4 is complete; the parameter manual and its sync rule hold for every current operation
and are structurally enforced for any added later.

---

## Phase 5: Polish

- [x] T019 [P] Regression-covered: `test/ui.image.test.ts`'s existing per-button assertions (every `ie-add-*` id,
      clicked individually and in combination) already prove each still adds exactly one operation with the new
      `.ie-tool-row` wrapper and info button present; `test/ui.workspace.test.ts` asserts `guide-overlay` is the
      last child of `#ie-card`. Re-run scoped (`test/ui.guide.test.ts`, `test/image.demo.test.ts`,
      `test/ui.image.test.ts`, `test/ui.workspace.test.ts`, `test/ui.theme.test.ts`,
      `test/image.paramHelp.sync.test.ts`) and `npx tsc --noEmit`: all pass.
- [ ] T020 **Deferred until every feature in flight is implemented** (explicit user instruction, 2026-10-29): run
      `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation` for the whole repo and fix any
      surviving mutant in the new files.
- [ ] T021 **Deferred alongside T020**: walk quickstart.md by hand in PPTB (both themes, narrow pane, keyboard
      only); record the result in quickstart.md and in this feature's plan.

## Dependencies & order

- Phase 1 (T001-T005) blocks every user story: the content map and overlay must exist before anything can open one.
- User Story 1 (Phase 2) must land before User Story 2 and 3 add detail to it, but all three stories touch the
  same two new files, so within each phase the [P] tasks are parallel only across *test* files, not across edits to
  `effectGuide.ts`/`imageEditor.ts` themselves.
- Phase 4b depends on Phase 2 (the overlay and `render()` must exist) and adds its own new module (`opFields.ts`);
  it does not depend on Phase 3/4.
- Phase 5 runs last.

## Traceability

| Requirement | Tasks |
|---|---|
| FR-001 | T010 |
| FR-002 | T003, T017 |
| FR-003 | T001, T003 |
| FR-004 | T005, T013, T014 |
| FR-005 | T008, T011 |
| FR-006 | T004, T007 |
| FR-007 | T005, T016, T017 |
| FR-008 | T005, T018 |
| FR-009 | T023, T024, T027 |
| FR-010 | T022, T023, T026 |

# Plan: Effect Info Guides in the Image Editor

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Data model**: [data-model.md](./data-model.md)

## Summary

Add an always-visible "i" info control next to every one of the 13 toolbox entries in the image editor. Pressing
it opens a single-guide overlay on top of the editor workspace: the effect's name, a plain explanation, a
practical example, a before/after picture pair computed by running the real, already-tested operation code
against one fixed, built-in sample logo, and — for every editing operation — a Parameters section: a technical
manual of every setting the operation exposes, its range or choices (read from the one definition the editor's
real step controls already use, never duplicated) and a plain explanation of what it does. No new pixel
algorithm, no network, no persistence — purely additive content and UI on top of feature 009's existing toolbox.

## Files

- `src/services/image/demo.ts` **(new)**: pure, deterministic builders for the fixed sample pictures used only by
  guides — an asymmetric "L" mark on a flat background, a transparent-background variant, a padded variant (for
  Trim), a wide non-square variant (for Make square) and a two-tone variant (for Solid colour). No canvas, no DOM:
  same style as `services/image/ops.ts`.
- `src/view/effectGuide.ts` **(new)**: the `GuideKey` type, the `EffectGuide` content map (data-model.md), and the
  `initEffectGuide()` view that exposes `attach(host)` (builds the overlay once, inside the editor's own card),
  renders a guide's text and its before/after canvases
  (via the existing `paintTile` and `icon-canvas--checker`), and exposes `open(key)` / `close()` / `isOpen()`.
  Also exports `GUIDE_OP` (which `OpKind` each guide's Parameters section reads) and `PARAM_HELP` (one hand-written
  explanation per parameter, FR-009/FR-010).
- `src/view/opFields.ts` **(new)**: the `Field` type, the `num()` helper and the `FIELDS: Record<OpKind, Field[]>`
  map, extracted unchanged from `imageEditor.ts` so both it and `effectGuide.ts` read the one definition of every
  parameter's name, label, range and choices without one module importing the other.
- `src/view/imageEditor.ts`: the `tool()` and preset `button()` call sites gain a sibling info control per entry
  (a small icon-only button, `aria-label` naming the effect); wires each to `effectGuide.open(key)`. The guide
  overlay is mounted once per editor build, inside `#ie-card`, so it sits above the workspace's own
  `z-index: 40` and closes on Escape without closing the editor itself (checked first, before the editor's own
  Escape handler acts). `FIELDS`/`Field` are now imported from `opFields.ts` instead of defined locally.
- `src/styles.css`: `.ie-tool-row` (button + its info control, replacing the bare `tool()` button as the direct
  child of `.ie-tools`), `.guide-overlay` (backdrop + panel, themed tokens only, stacks before/after side by side
  above a minimum width and stacks vertically below it per FR-008), `.guide-before-after`, `.guide-pic` (reusing
  `icon-canvas--checker` sizing), `.guide-params`/`.guide-param*` (the Parameters section, hidden entirely for a
  Quick preset).
- Tests: `test/ui.guide.test.ts` **(new)** — every one of the 13 entries has an info control; opening shows the
  right title/text; before/after canvases render and differ in the way each guide claims (independent pixel
  assertions, not re-deriving via the same code path being tested); closing (button, Escape, backdrop click)
  changes nothing in the editor's pipeline/history; only one guide open at a time; the Parameters section lists
  every field by its real label with a non-empty, non-duplicated explanation, shows the real range/options, has
  no section for a Quick preset. `test/image.paramHelp.sync.test.ts` **(new)** — `GUIDE_OP` reaches every `OpKind`
  exactly once, and `PARAM_HELP[kind]` names exactly the same parameters as `FIELDS[kind]`, in both directions,
  for every operation (the standing auto-sync rule, FR-010). `test/ui.image.test.ts`'s existing per-button
  assertions already prove the toolbox still adds exactly one operation per click with the info controls present
  (no accidental double wiring).
- Specs: 012 (this one).

## Constitution check

- **II (local, never toward an environment)**: the sample logo is generated in code; the before/after pair is
  computed in the browser from it; nothing is fetched, nothing leaves the machine.
- **III (honest preview)**: the "after" picture is the real operation's real output on a fixed input, never a
  hand-drawn illustration that could drift from what the tool actually does.
- **VII (enterprise UI)**: no emoji; themed tokens only; fits the container at any width the editor already
  supports (stacks before/after vertically below a width threshold); one guide open at a time, closable the same
  three ways other dismissible UI in this tool already is (its own control, Escape, outside click).
- **VIII (simplicity)**: no new pixel algorithm, no new dependency, no persistence; purely additive content and a
  self-contained overlay.
- GitHub description: no change — this does not add a capability a description sentence would need to mention,
  only makes an existing capability easier to understand while using it.

## Structure decision

Single project (existing `src/` + `test/` layout); no new top-level directory. The new guide view and demo-image
module sit next to their closest existing siblings (`src/view/`, `src/services/image/`).

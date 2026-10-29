# Implementation Plan: Automatic Check Fixes

**Branch**: `011-automatic-check-fixes` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-automatic-check-fixes/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The Checks page (step 5) already tells the user what is wrong and, for most problems, what to do
about it and where — but always by leaving the page. This feature adds, for every check the tool
can resolve without more information from the user, a "Fix it" button that applies the fix in
place, plus a single "Fix everything" button next to the pass/warning/fail counts. Every fix is a
pure function over the data the tool already holds (manifest fields, icon bytes), applied through
the exact same `edit()`/`acceptIcon()` path a manual change already goes through, so nothing new
is introduced to "what the saved package differs by" (Principle VIII) — only a faster way to reach
it. Icon fixes reuse the already-defined, already-tested "Teams-ready colour icon" and outline
presets (features 004/009/010); text fixes truncate to the exact limit; the accent colour fix
picks whichever of black or white contrasts more with the logo, with a documented fallback when no
logo can be read. A single, page-scoped "Undo" follows every fix (research.md §6).

## Technical Context

**Language/Version**: TypeScript (strict), compiled with Vite, same as the rest of the repository.

**Primary Dependencies**: none added. Reuses `services/image/{pipeline,ops,accept,import,pngWrite,colour}.ts`, `services/edit/{fields,edits,iconEdit}.ts`, `services/{checks,fixes,preview,limits}.ts`, `view/{checks,dom,card}.ts`, `icons.ts`.

**Storage**: N/A — in-memory only, per Principle II (Local, and Never Toward Environments); no new file leaves or enters the tool.

**Testing**: Vitest + jsdom, the project's existing setup (`vitest.config.ts`, `test/setup.ts`); new oracle-based unit tests for `services/autofix.ts` and a screen-path test added to `test/ui.checks.test.ts`; mutation check via `npm run test:mutation` after the logic lands (Testing Standard, CLAUDE.md).

**Target Platform**: Browser, inside the PPTB tool host (same as every other step of this tool).

**Project Type**: Single front-end tool (existing repository layout; Option 1 below, no frontend/backend split).

**Performance Goals**: A single fix (icon re-encode at 192x192 or 32x32, or a string cut) completes well under one video frame; "Fix everything" runs every applicable fix in one synchronous batch before the next render, with no intermediate flicker between fixed rows turning green.

**Constraints**: No network calls anywhere in the new code (Principle II); every pixel operation reused must keep the exact, already-tested definition of features 004/009/010 (Image Standards) rather than a second one; the written "How to fix it" explanation must remain next to every row, fixable or not (FR-013).

**Scale/Scope**: One page (`view/checks.ts`), one new service module (`services/autofix.ts`), small additions to `app.ts` wiring and `src/styles.css`; no new route, no new persisted state.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Gap-First | Does this remove a manual step between "problem shown" and "problem solved", rather than repeating a dialog Copilot Studio already has? | **Pass** — collapses "read → switch step → open editor → press tool → press Apply → switch back" into one click, for checks the tool can safely resolve alone. |
| II. Local, Never Toward Environments | Any network or environment call added? | **Pass** — every function reused or added (`autofix.ts`, the presets, `edit()`, `acceptIcon()`) is local and already covered by the existing "no network primitive" test. |
| III. Honest Preview | Does a fix ever claim something the tool cannot verify, or hide what it does not prove? | **Pass** — FR-013 keeps the existing "This does not prove…" / "How to fix it" text next to every row; the fix only ever changes a value the checks already compute from, so the preview recomputes from the same real data. |
| IV. Copilot Studio and Teams First | In scope? | **Pass** — entirely about Teams app manifest/icon compliance. |
| V. Marketplace Policy | New naming, author or claims risk? | **Pass** — no new text claims more than the tool does; "Fix it" only appears where it truly fixes the row. |
| VI. Community Visibility | Does the GitHub description still match? | **Needs a re-check, not a change now** — automatic fixing extends "edit" the live description already names; research.md §7 defers the actual re-check to after implementation, before any release is proposed. |
| VII. Enterprise UI and Navigation | New controls follow the UI standards? | **Pass by construction** — reuses the existing `btn`/`chk-*` classes, `icon()` helper and CSS custom properties already in `view/checks.ts`; no emoji, no native checkbox, explicit labels ("Fix it", "Fix everything", "Undo"). |
| VIII. Simplicity and Incremental Delivery | Does this block or widen the scope of another feature? | **Pass** — purely additive to already-shipped features 001/003/004/009/010; no feature is blocked. |
| Image Standards | New pixel operation defined without a written rule and an independent oracle? | **Pass** — no new pixel operation; reuses `presetTeamsColour`/`presetOutline` verbatim. The two new deterministic rules this feature does introduce (truncation, black/white accent choice) are written precisely in research.md §3–4 for an independent test oracle. |

No violations: the Complexity Tracking table below is empty on purpose.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries: the Constitution Check above found no violations.

## Project Structure

### Documentation (this feature)

```text
specs/011-automatic-check-fixes/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this tool exposes no external interface (API, CLI schema); its only
"contract" is the in-browser UI and the file formats it reads/writes, already covered by the
existing `test/` suites.

### Source Code (repository root)

```text
# Single project (this repository's existing shape; no frontend/backend split)
src/
├── services/
│   ├── autofix.ts        # NEW — canAutoFix / planFix / planFixAll (pure, no DOM)
│   ├── checks.ts          # unchanged — still the only source of Check[]
│   ├── fixes.ts           # unchanged — still the only source of "How to fix it" text
│   ├── edit/
│   │   ├── edits.ts       # unchanged — Edits shape reused as-is
│   │   └── fields.ts      # unchanged — FieldPath/IconSlot reused as-is
│   └── image/
│       ├── pipeline.ts    # unchanged — presetTeamsColour/presetOutline reused as-is
│       ├── accept.ts      # unchanged — toTarget/acceptResult reused as-is
│       ├── import.ts      # unchanged — importImage reused as-is
│       └── colour.ts      # unchanged — luminance/contrastRatio reused as-is
├── view/
│   └── checks.ts          # EDIT — adds the "Fix it" / "Fix everything" controls
├── app.ts                 # EDIT — wiring: click delegation, lastFix/Undo state, render
└── styles.css             # EDIT — styling for the new controls and the Undo banner

test/
├── autofix.test.ts         # NEW — oracle tests for services/autofix.ts
├── ui.checks.test.ts       # EDIT — screen-path tests for the new controls, loaded in jsdom
└── helpers/                # unchanged — package/fixture builders reused as-is
```

**Structure Decision**: Option 1 (single project), matching the repository's existing shape. No
new top-level directory: the feature is one service module plus edits to the view and wiring
layers it was always going to need, following the same `services/` (pure, tested) vs `view/`
(render) vs `app.ts` (wiring) split the rest of the tool already uses.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

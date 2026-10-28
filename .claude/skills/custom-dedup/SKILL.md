---
name: "custom-dedup"
description: "Analysis-only scan for duplicate and redundant code in src (duplicate helpers, dead code, unused exports, leftover console.log, duplicated constants). Reports findings; does not modify code."
user-invocable: true
disable-model-invocation: false
---

# Duplicate / redundant code analysis (read-only)

Read `.specify/memory/constitution.md` first (non-negotiable principles). Then scan `src/**` (UI, rendering, image processing, manifest handling, types) and `scripts/**`.

Find:
1. **Duplicate functions** — identical or near-identical logic across files (e.g. PNG/pixel helpers or zip/path helpers repeated between modules; code shared between the UI and the headless entry, if there is one).
2. **Redundant code** — unused exports/functions/variables, commented-out blocks, stray `console.log`.
3. **Duplicate data** — constants, regexes, GUIDs, path strings defined in several places; copies of the same reference values (sizes, limits, colours) in code and in tests.
4. **Consolidation opportunities** — similar functions to merge, UI-agnostic logic living in `app.ts` that belongs in a service module.

For each finding: `[DD-001] type (DUPLICATE|REDUNDANT|CONSOLIDATION) · severity (HIGH|MEDIUM|LOW) · files:lines · recommended fix · effort (small|medium|large)`.

Do not fix anything. Print the report in the terminal and offer to apply the fixes afterwards (then run `npm run build` and the smoke script if `package.json` has one from the project folder (the one with `package.json`)).

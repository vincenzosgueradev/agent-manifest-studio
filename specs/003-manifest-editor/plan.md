# Implementation Plan: Manifest Editor

**Branch**: `003-manifest-editor` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

## Summary

Step 2 becomes "Edit". A new editing layer sits between the loaded package and the export: the
edits of the user (fields, lists, replaced icons) are kept as data, turned into text splices on
`manifest.json` and into replaced zip entries, checked, previewed and exported. The proven path of
feature 001 (suffix by text edit, plan, checks, export, safety net) is kept and extended, not
replaced.

## Technical Context

Language and stack unchanged: TypeScript strict, Vite, Vitest (jsdom for UI), fflate, own PNG
decoder. No new dependency. No network, and no host API beyond the file dialog already used by
feature 001.

## Constitution Check

| Principle | Result |
|---|---|
| I Gap-first | The editor closes the loop "idea to package" next to the preview: pass |
| II Local, read-only toward environments | No environment access added; works with no connection: pass |
| III Honest preview | Preview and checks always use the edited package; a new icon is previewed before saving; what is not covered stays stated: pass |
| IV Copilot Studio and Teams first | Only Teams manifest fields: pass |
| V Marketplace policy | README "What this tool changes" updated and its claim tested: pass after the update |
| VI Visibility | not affected |
| VII Enterprise UI | Cards full width, one under another, no emoji, labelled controls: pass |
| VIII Simplicity | The wording "first release = only the names change" is superseded: **constitution amended to 1.2.0** (MINOR) |

Post-design re-check: pass.

## Structure

```text
src/services/edit/
  fields.ts      field table, validators, version bump, permission and domain rules
  jsonPatch.ts   structure walker; replace, insert or remove one member as text; verify
  edits.ts       Edits type, normalising, ops from edits, diffManifest
  iconEdit.ts    accept or refuse a chosen PNG for an icon slot
src/services/export.ts    planEdits (edits layered on the suffix path); exportPackage takes edits
src/services/zip.ts       writePackage appends entries the package did not have
src/view/editor.ts        the editor cards (built once per package, updated in place)
src/view/changes.ts       the Changes table of the Save step
src/app.ts                state.edits, handlers, wiring
test/...                  matrix tests with independent oracles, UI tests, mutation entries
```

## Design notes

- **Edits** are `{ fields: path to string, lists: path to string[], icons: slot to bytes }`. A value
  equal to the original is dropped (typing it back clears the marker). An empty value on an optional
  field means "remove the key".
- **Plan** = apply the suffix (old path), apply the valid field and list edits as splices, parse,
  run the checks on the edited manifest and the edited icon set. Invalid edits are reported
  (`invalid`) and skipped for the preview (the last valid value stays).
- **Safety net**: the parse of the output must equal the parse of the input with the same ops
  applied to a clone, and `diffManifest(input, output)` must list only paths that the edits touch.
- **Icons**: the slot path is the manifest path or `color.png` / `outline.png` (and the manifest
  member is added when it was missing); the bytes are validated by `decodePng` and the icon rules
  before they are kept.
- **Persistent inputs**: the editor builds its inputs once per package and updates state in place,
  so typing never loses focus (a lesson of feature 001).

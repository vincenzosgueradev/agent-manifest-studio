# Plan: Look Page

Files:
- `src/services/image/palette.ts` (new, pure): `buildPresets(picture, accent) -> PresetSet`, families, styles, score. Builds on `recommend.ts` (its three designs stay and are merged in as presets).
- `src/view/compare.ts` (new): the sticky before/after band; `renderCompare(model)`.
- `src/view/editor.ts`: card order (compare, accent, colour icon, outline icon, image editor, suggestions), labelled action rows, gallery cards; removes the borderless button.
- `src/app.ts`: `adviceFor` uses `buildPresets`; `onApplySuggestion` takes any preset id; `onIconBorderless` removed.
- `src/index.html`, `src/styles.css`: `#look-compare`, `.cmp-*`, `.pal-*`, `.ed-actions` grid; tokens only.
- `scripts/mutation-check.mjs`: entries for the new files.

`Suggestion` keeps its fields and gains `name`, `family`, `palette: [hex, hex, hex, hex]`, `score`; its `id` becomes `string`.

Constitution check: I (before and after removes a manual step), II (local), III (the order is a stated score, not a verdict),
V (README unchanged: still nothing leaves the machine), VII (tokens only, both themes), VIII (one release increment).
GitHub description: mention "palette presets" if it lists features; proposed, not applied.

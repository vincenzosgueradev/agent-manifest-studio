# Research: Two-Way Sync Between the Colour Icon and the Outline Icon

- 2026-10-29, by hand: the Look-page Suggestions gallery and its palette algorithm (specs/007, `palette.ts`,
  `recommend.ts`, `dominantColour`) were removed from the codebase on 2026-10-28 (007's own status note). The
  reverse direction of this feature cannot reuse them; it defines its own, much smaller rule instead (`baseColourFor`
  in FR-002), built only from the accent colour already in the manifest and the existing `rgbToHsl`/`fromHex` of
  `colour.ts`.
- The icon cards (`src/view/editor.ts`) no longer have one-click fixes either (005's second amendment moved them
  into the image editor). The only existing control on a card is "Edit image"; this feature adds the suggestion row
  next to it, not inside the editor.
- `presetOutline(source)` (`pipeline.ts`) is already exactly "colour icon -> outline icon": Outline maker (alpha
  cutoff 16, or brightness when the source has no alpha), trim, square, fit to 32. `evaluate(source, presetOutline(source)).picture`
  gives the final picture in one call; no new pixel algorithm needed for this direction.
- `outlineMaker` (`ops.ts`) never refuses: it is a per-pixel threshold with no "flat background" assumption (unlike
  `removeBg`/`hasFlatBorder`). The only failure mode either direction can hit is the one `acceptResult` already
  implements: a fully transparent result (`isEmptyPicture`) is refused with its existing message, and a result over
  100 KB is refused with its existing message. No new error text is needed.
- `shown.icons[slot].png` (the `IconSet` the rest of the tool already computes for the checks and the preview) is
  `{ kind: 'ok', header, rgba }` whenever the slot holds a readable PNG at the right size. A `Picture` for either
  slot is just `{ width: header.width, height: header.height, data: rgba }` — no second decode of the bytes.
- `fit(picture, 192, 100)` (already used by `presetTeamsColour`) scales a picture without stretching so it fills a
  192 square; the outline is already square so this exactly enlarges it. `fillOn(picture, colour)` (already used by
  the editor's "Fill background" tool) composites the white shape onto an opaque tile of one colour in one pass —
  together they are the whole "outline -> colour" picture, with no new resampling code.
- Loop safety does not need to track *where* a picture came from. Two small counters per slot (how many times it
  changed by a direct action, and which value of the other slot's counter its own suggestion was last resolved
  against) are enough: accepting or dismissing a suggestion advances only the resolved marker, never the direct
  counter of the slot it just wrote to, so the opposite suggestion cannot fire from it. Verified by hand against
  every scenario in spec.md's Edge Cases before writing `sync.ts` (see data-model.md).
- "Revert" in this feature means the existing "Revert all" control (there is no per-field icon revert); reverting
  already clears `edits` to `EMPTY`. Resetting `syncState` at the same time is the only addition `onRevertAll`
  needs.
- Base colour threshold: HSL saturation ≥ 0.2 is the same number the (now removed) 007 palette code used for "is
  this colour colourful enough to build on"; it is kept here as this feature's own, independently stated rule
  (Image Standards: no invented-looking numbers — this one is written here and tested, not quietly inherited).

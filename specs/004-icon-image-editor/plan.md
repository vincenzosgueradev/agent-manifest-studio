# Implementation Plan: Icon Image Editor

**Branch**: `004-icon-image-editor` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

## Summary

An image editor for the two icons. The maths lives in pure functions over RGBA arrays (testable in
Node); a pipeline keeps the picture and an ordered list of operations with undo and redo; a PNG writer
brings the result to the package through the replacement path of feature 003; a view draws the canvas,
the tools and the Teams-style preview.

## Technical Context

Stack unchanged: TypeScript strict, Vite, Vitest, fflate. No new dependency. No network. The browser
decoder (for JPEG, WebP, GIF, SVG) is the only use of a browser image API and is injectable.

## Constitution Check

| Principle | Result |
|---|---|
| I Gap-first | Closes the loop from "I have a picture" to "I have a Teams icon": pass |
| II Local, read-only | Pictures are processed in the window and leave only inside the saved package or a PNG the user saves: pass |
| III Honest preview | The editor draws the result as the preview step does and states what it does not cover: pass |
| IV Teams first | Colour and outline icons only: pass |
| V Marketplace policy | README "What this tool changes" updated and tested: pass after the update |
| VII Enterprise UI | Full-width card, labelled controls, keyboard equivalents, no emoji, both themes: pass |
| VIII Simplicity | A large feature; split in pure core, pipeline, view; each slice testable alone; the constitution gets a MINOR amendment (1.3.0) to say the tool edits images: **planned** |

## Structure

```text
src/services/image/
  types.ts       Picture, Op kinds, Pipeline
  colour.ts      distance, hex, hsl, luma, dominant colour
  ops.ts         removeBackground, trim, crop, fit, resize, rotate, flip, fill, solid, tone, outline
  resample.ts    area averaging and bilinear (premultiplied)
  pipeline.ts    apply, add, remove, update, undo, redo, reset, presets
  pngWrite.ts    encodePng (8-bit RGBA)
  import.ts      from PNG bytes or the host decoder; reduce to 1024
  accept.ts      what Apply refuses (empty, over 100 KB)
src/view/imageEditor.ts   canvas, tool list, operation rows, preview tiles, eyedropper, crop overlay
src/app.ts                state.editor, open / apply / cancel, accent from picture, save as PNG
test/image.*.test.ts      one file per module with an independent oracle; ui.image.test.ts
```

## Design notes

- The result is a function of `(picture, ops)`. The view keeps a prefix cache (result after op `i`) so a
  change to the last operation recomputes one step.
- Every operation is a plain object (`{ kind, ...values }`), so the list is printable, testable and
  can be serialised to a tooltip; values are validated before they are applied (a crop outside the
  picture is refused at entry, never at apply time).
- Apply: `result -> resize to target -> encodePng -> checkNewIcon -> Edits.icons[slot]`.
- Canvas: the view draws with `putImageData` on a canvas sized to the picture and scales with CSS;
  the preview tiles use the same `flattenOnAccent` as the Preview step (step 3 when written, step 4 now).
- Crop and eyedropper pointer events map screen coordinates to picture pixels with one tested
  function (`toPixel`), with the numeric inputs as the keyboard route.

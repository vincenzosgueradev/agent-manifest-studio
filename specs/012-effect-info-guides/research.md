# Research: Effect Info Guides in the Image Editor

- The toolbox already builds every tool button through one shared `tool()` helper and every preset through
  `button()` (`src/view/imageEditor.ts`), each already carrying a one-line hint passed as the native `title`
  attribute (`PRESET_HINT`, `OP_HINT`, and the `hint` literal passed to `tool()`). The info control is an addition
  next to that existing button, not a replacement of the hint.
- `applyOp(picture, op)` (`src/services/image/pipeline.ts`) and the operation functions it dispatches to
  (`src/services/image/ops.ts`) are pure, synchronous and already exhaustively tested; computing a guide's
  before/after pair is calling the same function with a fixed sample picture, nothing new to validate at the pixel
  level.
- `paintTile(canvas, rgba, width, height)` (`src/view/draw.ts`) already draws a `Picture`'s raw RGBA onto a canvas;
  the existing CSS class `icon-canvas--checker` (`src/styles.css`) already draws the checkerboard behind a
  transparent canvas via a CSS background, so a guide's before/after canvases reuse both without new drawing code.
- The image editor workspace (`#ie-card`, `role="dialog"`) is itself `position: fixed; inset: 0; z-index: 40`
  (`src/styles.css`); a guide overlay only needs a higher `z-index` and its own backdrop to sit on top of it, the
  same pattern already used for other full-page overlays in this codebase.
- `blank(width, height, rgba?)` (`src/services/image/types.ts`) already allocates a `Picture` of flat colour or
  transparency; building the fixed sample logo (a simple asymmetric "L" mark, so rotate and flip visibly change
  it) is a short, pure, deterministic pixel loop in the same style as the existing operation functions, with no
  new dependency.
- `presetTeamsColour(source)` and `presetOutline(source)` (`src/services/image/pipeline.ts`) already return the
  exact list of operations the two Quick preset buttons run; their guides reuse these functions on the sample
  logo instead of re-describing the recipe by hand.
- `imageEditor.ts` already defined, for its own step controls, a `Field` type and a `FIELDS: Record<OpKind,
  Field[]>` map (name, label, type, min/max/step or options, optional) that is the one existing, already-correct
  description of every parameter an operation exposes. `effectGuide.ts` importing it directly from
  `imageEditor.ts` would make the two modules import each other (`imageEditor.ts` already imports
  `effectGuide.ts` for `GuideKey`/`initEffectGuide`); extracting `Field`/`num`/`FIELDS`, unchanged, into a new
  `src/view/opFields.ts` both modules import avoids that cycle and gives the guide's Parameters section the exact
  same labels, ranges and choices the real tool shows, with zero duplication.

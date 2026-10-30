# Plan: Accent colour from the picture

- `src/services/image/pixel.ts`: `toPixel` (moved from `view/imageEditor.ts`, which re-exports it) and `colourAt`
  (opaque pixel to `#rrggbb`, or a refusal with its reason). No DOM.
- `src/view/accentPicker.ts`: `initAccentPicker({ onUse, current })` returns `open(picture, from)`, `close`, `isOpen`.
  One overlay appended to `document.body` on first use (`.guide-overlay` styles plus `.ap-overlay`: fixed, z-index 100,
  above the image editor workspace).
- `src/app.ts`: creates the picker; `onUse` writes `fields.accentColor` through `edit()`; wires the Look handler
  (`sourcePicture('color')`) and the image editor dependency `pickAccent`.
- `src/view/editor.ts`: `ed-accent-from-picture` (accent row), `ed-img-accent-color` (colour icon card), enabled state.
- `src/view/imageEditor.ts`: `ie-accent` in the options bar; disabled for the outline slot.
- `src/styles.css`: `.ap-*` rules, theme tokens only.
- No new dependency, no network, no change to the package format.

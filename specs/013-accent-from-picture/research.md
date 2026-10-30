# Research: Accent colour from the picture

- **Alpha**: the accent colour is `#RRGGBB` (schema `root.accentColor`). A pixel with alpha below 255 has an RGB that
  is not what anyone sees, so it is refused rather than rounded. Decided 2026-10-30.
- **Screen eyedropper**: `window.EyeDropper` would read any pixel on screen. Rejected: Principle II (the tool reads
  its own pictures only) and it is not in every host window.
- **Popup over the page, not a new step**: the same popup serves the Look step and the image editor, so it is
  attached to `document.body` and not to either.
- **Unknown**: what Teams draws behind a see-through colour icon (constitution, Verified Facts 2026-10-29). The tool
  does not claim the picked colour will be drawn behind the icon.

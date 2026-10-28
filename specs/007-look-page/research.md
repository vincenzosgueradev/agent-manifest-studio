# Research: Look Page

- 2026-10-28, by hand: *Make background transparent* (`onIconTransparent`) keeps logo colours and accent; *Logo without background* (`onIconBorderless`) = transparent + `solid` recolour + accent `#FFFFFF`. Not the same; the second is a preset of style `on-white`.
- `contrastOf`, `darkenUntil`, `rgbToHsl`, `hslToRgb`, `dominantColour` already exist in `services/image/colour.ts`; the palette uses them, no new colour maths library.
- The outline icon is a white silhouette of the logo and does not depend on the logo colour: it is computed once for all presets.
- Cost: a preset needs one `solid()` recolour of 192 x 192 pixels; 16 presets are cheap. The set is cached by icon bytes and accent as the old advice was.
- Sticky: `position: sticky; top: 0` works inside the host scroll container only if no ancestor has `overflow: hidden`. Unknown until tried in PPTB: manual check 1.
- Hue wheel families (analogous, complementary, split, triadic) are the standard colour-harmony sets; the numbers of the score are choices of this tool and are written in the spec.

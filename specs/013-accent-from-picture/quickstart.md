# Quickstart: Accent colour from the picture

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`
(2026-10-30: the 15 mutations of this feature are all killed).

Manual in PPTB (result: 2026-10-30, tried by the user in PPTB; "it works". Steps 1 to 7 not recorded one by one;
Teams drawing of the picked colour not checked):

1. Look step: press *From the picture* beside the accent colour: the popup opens, *Use this colour* is off.
2. Click the background of the icon: the chosen colour shows its hex; press *Use this colour*: the field, the Now
   row of the band and the swatch show it; the field is marked changed; *Revert* puts the old colour back.
3. Press *Accent from picture* on the colour icon card: same popup.
4. Open the image editor, add *Remove background* (do not Apply), press *Accent from picture*: the popup shows the
   picture with the step applied; click a pixel of the glyph, Use. The editor still has the same single step.
5. Click a see-through (chequered) pixel: a message says it is see-through and nothing is chosen.
6. Keyboard: Tab to the picture, arrows move, Shift+arrows move ten, Enter uses, Escape closes only the popup.
7. Both themes, and a narrow pane: the popup is readable, no sideways scroll.

Not covered by tests: how Teams draws the icon over the picked colour (test in Teams); the canvas pixels as the
host window draws them.

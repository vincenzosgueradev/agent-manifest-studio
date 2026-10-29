# Quickstart: Image Editor Workspace

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.

Manual in PPTB:

1. On Look press *Edit image* of the Colour icon: a workspace fills the window, the picture is large on the left, the tools are on the right.
2. Scroll the tools on the right: the picture on the left stays where it is.
3. Press `Escape`: it closes like Cancel. Open it again from the Outline icon card: the title says outline icon, 32 x 32.
4. Move the zoom slider; press Fit and 100 %; hold Ctrl and turn the mouse wheel on the picture.
5. Press Fit: the picture fills the area; move the slider to 100: it is at its own size. Press Show original after an edit: the picture of the package appears with a label on it.
6. Resize the window narrow and wide; both themes; keyboard only.

7. Look at the layout: toolbox on the left, picture in the middle with rulers, panels on the right, status bar at the bottom; the picture uses all the middle.
8. Press Grid: lines every 24 pixels and the 120 x 120 safe area appear over the picture; the rulers follow the zoom and the scroll.
9. Move the pointer over the picture: the pixel appears in the status bar. Both themes.

10. Look at the toolbox: five groups with a title, an icon and a colour each; the tools of the other icon are not offered.
11. Add Rotate: its button goes grey and its tooltip says why; remove the step: it comes back. Add Outline maker: Solid colour, Tone and Fill background go grey.
12. Press Revert all (red): every step goes, Undo brings them back; the result strip is under the picture.

Results: automatic checks run on 2026-10-29: `tsc`, `build`, `npm test` and `npm run test:full` pass; the targeted mutation run for `imageEditor.ts` is recorded in the commit. Manual checks: **pending**.

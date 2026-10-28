# Quickstart: Icon Image Editor

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.
Results are recorded at the foot of this file when they have been run.

Manual checks in PPTB (load the project root, then Load Tool):

1. Load a package, go to Edit, press "Edit image" on the colour icon: the current icon is on the canvas
   and the list is empty.
2. Press "Open another image" and choose a logo on a white background (PNG). Press "Teams-ready colour
   icon": the white goes, the logo is centred in the safe area, the preview on the accent colour looks
   right. Press Apply: the icon card says replaced and the Changes table lists the icon.
3. Move the tolerance of "Remove background" up and down on a logo with a soft edge: the edge changes
   live; softness and matte clean a halo.
4. Use the eyedropper on the canvas: the hex appears; send it to "Solid colour" and to the accent
   colour.
5. Crop by dragging and by typing numbers; trim; rotate; flip.
6. On the outline card press "Outline from this icon": the result is a white silhouette at 32 x 32 and
   the checks for the outline icon pass. Check it on the light and the dark app bar.
7. Open a JPEG and a WebP (and an SVG): record which ones the PPTB window can read. **UNVERIFIED until
   recorded here.**
8. Undo and Redo through several steps; remove a step in the middle; Reset; hold "Show original".
9. Press "Save image as PNG": open the file in another program and compare with the canvas.
10. Upload the saved package to Teams as a custom app and look at the icon in the app bar and in the
    app list. **Not covered by automatic tests.**
11. Try the editor in the light and the dark theme; use it with the keyboard only.

Automatic results (2026-10-27): `npx tsc --noEmit` clean; `npm run build` ok; `npm test` and `npm run test:full`
2694 tests passed (38 files); `npm run validate` all checks passed; mutations of the image editor files killed.

Manual checks: **pending** (the user's run in PPTB). Check 7 (reading JPEG, WebP and SVG in the PPTB window) is
UNVERIFIED until recorded here; check 10 (Teams) is not covered by any automatic test.

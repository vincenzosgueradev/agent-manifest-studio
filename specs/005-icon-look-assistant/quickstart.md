# Quickstart: Icon Look Assistant

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.
Mutation entries for `transparent.ts` and `recommend.ts` exist in `scripts/mutation-check.mjs`.

Manual checks in PPTB (load the project root, then Load Tool):

1. Load a package whose colour icon is a logo on a flat colour. In Edit, read the caption under the
   colour icon, press "Make background transparent": the chequered corners appear and the caption names
   the accent colour. Press Revert.
2. Press "Make background transparent" twice: the second time the message is information, not red.
3. Pick a colour, press "Logo without background": logo in that colour, accent colour white.
4. On the outline card read the caption, press "Make the shape white", move the Preview colour: only
   the tile changes; save and check that the preview colour is not in the file.
5. Open the Suggestions card with a one-colour logo and with a multi-colour logo; use each design and
   read the reasons and the contrast.
6. Change a name, go to Save: the version notice is shown; press "Raise it to X".
7. Upload the saved package to Teams as a custom app and look at both icons. **Not covered by automatic
   tests.**
8. Upload a package with the same version over an installed one: Teams refuses it. **Not covered by
   automatic tests.**
9. In Checks, open a failing check: read "How to fix it" and press "Go to Details" or "Go to Look".
10. Both themes, keyboard only.

Results: the tests of this feature already exist in the suite (traceability in `tasks.md`). This
specification adds documents only and changes no code, so no test was run for it. The full run
(`npm run test:full`, `npm run test:mutation`) for the release is **pending**. Manual checks: **pending**.

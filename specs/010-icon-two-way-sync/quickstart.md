# Quickstart: Two-Way Sync Between the Colour Icon and the Outline Icon

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.

Manual in PPTB:

1. Open a package, go to Look, edit the colour icon (Edit image -> any change -> Apply). The outline icon card
   shows "Regenerate the outline icon to match its shape?". Press "Regenerate": the outline becomes the new logo's
   white shape at 32 x 32, listed in Changes, and "Revert all" undoes it together with the colour icon edit.
2. Press "Not now" instead: the outline icon is untouched and the suggestion goes away; editing the colour icon
   again brings it back.
3. Edit only the outline icon. The colour icon card shows "Build a colour icon from its shape, on #...". Press it:
   the colour icon becomes the enlarged white shape on that colour tile, the accent colour changes to match, the
   outline icon is untouched, and both changes are listed in Changes as one action; "Revert all" undoes both.
4. Open a package whose colour and outline icons already do not match: no suggestion appears until you change one
   of them.
5. Accept the outline suggestion, then immediately edit the newly-generated outline icon by hand: the colour-icon
   suggestion now appears (a real further edit), but accepting the outline suggestion itself never produced one.
6. Both themes, keyboard only: the suggestion row's two buttons are reachable by Tab and have visible focus.

Results: pending — run the automatic checks above after implementation and record here, plus the manual checks.

Automatic, 2026-10-29: `npx tsc --noEmit` on the feature's own files (`src/services/image/sync.ts`, `src/app.ts`,
`src/view/editor.ts`) and `test/image.sync.test.ts` (15 tests) and `test/ui.sync.test.ts` (10 tests) all pass. The
workspace-wide `npx tsc --noEmit` currently also reports four pre-existing errors in `src/view/effectGuide.ts`
(feature 012, in progress, unrelated to this feature). `npm run build`, the full `npm test`, `npm run test:full`
and `npm run test:mutation` are **pending**: by agreement, they run once every in-progress feature (011, 012) is
finished, not after each one individually.

Manual checks: **pending**.

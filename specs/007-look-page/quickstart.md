# Quickstart: Look Page

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.

Manual in PPTB:

1. Open the Look step and scroll down to the image editor: the Original / Now band stays on top. **Not covered by automatic tests.**
2. Make the background transparent: Now changes, Original does not; the state words say Changed; Revert all puts them back to Unchanged.
3. Use a preset from the gallery: both icons and the accent colour change in the Now row; Revert all undoes it.
4. Check the gallery with a one-colour logo, a multi-colour logo and a grey logo: the palettes follow the logo.
5. The buttons of both icon cards line up in rows (Image, Quick fix); resize the window narrow and wide.
6. Both themes, keyboard only.

Results: automatic checks run on 2026-10-28: `tsc`, `build`, `npm test` and `npm run test:full` pass (2474 tests); the targeted mutation runs for `loader.ts`, `palette.ts`, `compare.ts`, `editor.ts`, `transparent.ts` and `recommend.ts` kill every mutant. The complete `npm run test:mutation` is **pending** (it must finish before a release). Manual checks: **pending**.

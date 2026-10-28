# Quickstart: Package Drop Zone

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.

Manual in PPTB:

1. Drag a package zip from Explorer onto the empty step: the zone highlights, the overlay says "Release to open this package"; release: the package loads. **Not covered by automatic tests.**
2. Drag it onto the loaded bar: the overlay says "replace"; release replaces.
3. Drag a .png, or two files: refused with the messages of the contract.
4. Drop a file on an empty part of the page: the window does not navigate.
5. Both themes, keyboard only (Tab to Open package, Enter).

Results: automatic checks run on 2026-10-28: `tsc`, `build`, `npm test` and `npm run test:full` pass (2474 tests); the targeted mutation runs for `loader.ts`, `palette.ts`, `compare.ts`, `editor.ts`, `transparent.ts` and `recommend.ts` kill every mutant. The complete `npm run test:mutation` is **pending** (it must finish before a release). Manual checks: **pending**.

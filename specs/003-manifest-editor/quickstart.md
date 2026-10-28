# Quickstart: Manifest Editor

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`,
`npm run test:mutation`. Results are recorded at the foot of this file when they have been run.

Manual checks in PPTB (load the project root, then Load Tool):

1. Load a package. Step 2 is "Details" (called "Edit" when this was written; the colour and the icons moved to step 3, "Look") and shows the groups full width, one under another.
2. Change the short description, the developer name, a link and the accent colour. Each shows a
   changed marker and a Revert; Revert all clears them.
3. Type 81 characters in the short description, a link starting `http://`, and `#12345`: each says
   why, and Save is blocked with the field named.
4. Press Bump patch: 1.0.0 becomes 1.0.1; Bump minor on 1.0.1 gives 1.1.0.
5. Choose a 192x192 PNG for the colour icon: it appears in the preview on the accent colour with its
   checks. Choose a 100x100 PNG: it is refused with the cause.
6. Add `contoso.com` to Valid domains, remove one, add `notifications` to device permissions.
7. In Save, the Changes table lists exactly those fields and the replaced icon. Save, unzip, compare
   with the original by hand: only those differ.
8. Upload the saved package to Teams as a custom app: it installs and shows the new name,
   description, colour and icon. **Not covered by the automatic tests.**
9. Open the tool in the light and the dark theme: every control and marker is readable.
10. In Teams, with a see-through colour icon and a white accent colour, look at the agent in the Agent Store and in
    the agent list with the Teams theme set to light and to dark: is the tile white, or see-through? **UNVERIFIED
    until recorded here** (the first observation: with the accent colour behind it the tile showed the accent colour).

Automatic results (2026-10-27): `npx tsc --noEmit` clean; `npm run build` ok; `npm test` and `npm run test:full`
2694 tests passed (38 files); `npm run validate` all checks passed; `npm run test:mutation` closed (every
mutation of the files of this feature killed; mutations judged equivalent were removed and are listed in the
report of the work).

Manual checks: **pending** (the user's run in PPTB). Checks 8 and 9 of the list above (Teams upload and the two
themes) are not covered by any automatic test.

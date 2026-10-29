# Quickstart: Automatic Check Fixes

## Prerequisites

- `npm install` already run once for this repo.
- A Teams app package (zip) with at least one check problem. The fastest way to get one:
  use the test helpers under `test/helpers/` (no real tenant data, per the Testing Standard) to
  build a package whose colour icon's logo sits outside the safe area, whose short name is 40
  characters, and whose accent colour is missing.

## Run the app locally

```powershell
npm run dev
```

Open the printed local URL, load the package above, and go to the Checks step (step 5).

## Validation scenarios

1. **Icon group, one click** — on the "Logo stays in the safe area" warning row, press "Fix it".
   Expect: the colour icon rows (size, square, safe area, format, weight) all turn green in the
   same action, a banner says what changed, and "Undo" puts the original icon back.
2. **Text length, one click** — on "Short name length" (failing because the name is over 30
   characters), press "Fix it". Expect: the name shown in Details is now exactly 30 characters, no
   other character changed, and the row turns green.
3. **Accent colour, one click** — on "Accent colour is #RRGGBB" (missing), press "Fix it". Expect:
   a valid `#RRGGBB` value is set and the row turns green; if the colour icon has a readable logo,
   "Logo stands out from the accent colour" also turns or stays green.
4. **No button where there should be none** — a package whose colour icon file is missing from the
   zip: the "Colour icon is in the package" row shows no "Fix it" control, only today's written
   explanation and the link to the Look step.
5. **Fix everything** — a package with one problem in each group above plus the missing icon file
   case: press "Fix everything" once. Expect: every fixable row turns green, the missing-icon row
   is untouched with its explanation unchanged, and one combined banner with one "Undo" appears.
6. **Undo** — immediately after any of the above, press "Undo". Expect: every value involved
   returns exactly to what it was before the fix ran, and the checks list recomputes back to its
   previous verdicts.

## Tests to run after implementing

```powershell
npx tsc --noEmit
npm test
npm run test:mutation
```

Per the Testing Standard (CLAUDE.md), the new pure functions (`services/autofix.ts`) need their
own oracle-based test matrix (including negative tests: an id not in the fixable set, a check that
already passes, a description that is missing rather than too long), and the Checks page's new
buttons need a screen-path test loaded in jsdom (`test/ui.checks.test.ts`).

Results: `tsc --noEmit` and `npm run build` pass; `test/autofix.test.ts` (16 tests) and
`test/ui.checks.test.ts` (10 tests, 5 of them new) pass. The full `npm test` and
`npm run test:mutation` runs are deferred until every feature in flight is done, per the user's
own instruction for this session, and must be run before this feature is proposed for release.

## Manual check this plan cannot automate

Whether Microsoft Teams renders the auto-fixed icon and the chosen accent colour the same way the
tool's own preview shows them is outside what any test here proves (Principle III, Honest
Preview); record that check, and its result, in this quickstart once it has been done by hand, the
same way earlier features in this repository do.

Manual checks: **pending**.

# Quickstart: Manifest Schema Validation

Automatic: `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:full`, `npm run test:mutation`.

Manual in PPTB:

1. Open a package that Copilot Studio gave you: the Package step shows, right under the Package card and above the App card, the Manifest schema card with the version and "follows v..." or the problems. Remove the package: the card goes away.
2. Open a package whose `manifest.json` you broke by hand (an unknown entry, a wrong type, a long name): each problem names its path, says what is wrong in plain words and what it expected.
3. Open one with `manifestVersion` 1.18 or 1.31: the card says it is not validated and lists the bundled versions.
4. Edit the short name to 31 characters: the card reacts at once.
5. Copy the schema URL and open it in a browser: it is the schema of the version shown.
6. Both themes, keyboard only; note how long the tool takes to open.
7. Upload a package that the card calls valid to Teams: it is accepted or it names a rule that is not in the schema (icons, domains). **Not covered by automatic tests.**

Results: automatic checks run on 2026-10-28: `tsc`, `build`, `npm test` and the oracle matrix with `TEST_FULL=1` (4000 random mutations and 400 per fragment for each of the 20 schemas) pass. The targeted mutation run for the schema files is recorded in task T011. With the schemas the tool went from 141 KB to 1.04 MB (202 KB compressed). Manual checks: **pending**.

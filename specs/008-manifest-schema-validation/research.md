# Research: Manifest Schema Validation

- 2026-10-28, by `curl`: schemas v1.10 to v1.17 and v1.19 to v1.30 return 200 (34 KB to 130 KB each); v1.18, v1.31 and v1.32 return 404.
- All use `"$schema": "http://json-schema.org/draft-04/schema#"`; they also use `const` and `if/then` (draft-06/07 keywords), so the oracle is `ajv` in its default draft-07 mode with the `$schema` line removed and `strict: false`.
- Size: 13 schemas, 860 KB minified, 747 KB with descriptions cut to the first sentence (160 characters), about 140 KB compressed. Acceptable for a tool that is loaded from disk; a dynamic import would be smaller at start but is forbidden by `noNetwork.test.ts` and fails through `file://`.
- Unknown until tried in PPTB: how long the first paint takes with the larger bundle (manual check 5).
- A package of Copilot Studio is expected to carry a version in this range; which one it writes today is not recorded here (the fixtures use 1.19).

# Research: Manifest Reader, Preview and Name Suffix Editor

All facts below were read on **2026-10-26** on Microsoft Learn unless stated otherwise. Re-read the
page before relying on a detail that is not in the constitution's *Verified Facts*.

## 1. Manifest limits (resolves FR-014)

| Field | Rule | Source |
|-------|------|--------|
| `name.short` | required, max 30 characters | `root.name` object, schema v1.30 |
| `name.full` | optional, max 100 characters | `root.name` object |
| `name.short` vs `name.full` | the two values "must be different" | `root`, `root.name` |
| `description.short` | required, max 80 characters | `root.description` object |
| `description.full` | required, max 4000 characters | `root.description` object |
| `accentColor` | required, "a valid HTML color code starting with '#', for example `#4464ee`" | `root` object |
| `icons.outline` | required, relative path to a 32x32 transparent PNG, border white, max path length 2048 | `root.icons` object |
| `icons.color` | required, relative path to a 192x192 full-colour PNG | `root.icons` object |
| `icons.color32x32` | optional, 32x32 full-colour PNG, transparent background | `root.icons` object |

Notes:

- The Microsoft Learn page on converting add-ins mentions 250 characters for `description.short`.
  That is the *conversion* rule of the old XML add-in manifest, not the schema; the schema says 80.
  The tool uses 80.
- The schema text for `accentColor` says "like `#FFFFF`" (five digits) in its example, which is a
  typo in the documentation. The tool accepts exactly `#` plus six hexadecimal digits (spec FR-015)
  and says in the check that three-digit forms are not accepted.
- The localisation page lists the same 30/100/80/4000 limits for the localised values.
  Declarative-agent packages may carry `name.short` as a key such as `[[DA_Name]]`; the real text is
  then in a language file. The tool treats such a value as "localisation key" (spec FR-030).

Decision: limits live in one constants module (`limits.ts`) and each is cited by a comment with the
date above.

## 2. Package structure

- A package is a zip with `manifest.json` in the root and the two icons at the relative paths
  declared by `icons.color` and `icons.outline` (the default of Copilot Studio is the root:
  `color.png`, `outline.png`). Source: "App package for Microsoft 365".
- Other files (localisation, declarative agent files) may exist; they are carried through untouched.
- Zip must not be a folder compressed (a top-level sub-folder is not a valid package). Source: SPFx
  Teams page. The tool refuses a package with no `manifest.json` in the root and says if one exists
  in a sub-folder.

Decision: icon paths are taken from the manifest; if they are missing from the manifest the tool
falls back to `color.png` / `outline.png` only to give a clearer message, never to guess silently.

## 3. Icon rules (already in the constitution; confirmed again)

- Colour icon 192x192, perfect square, no rounded corners, logo within the central 120x120.
- Outline icon 32x32, white on transparent, or transparent on white; no extra padding.
- The outline icon is shown on the app bar when the app is in use.

Decision: outline rule implemented as "every pixel with alpha above 0 is pure white". This accepts
both "white on transparent" and "transparent on white" (a transparent hole inside a white tile is
also made of white and transparent pixels only).

Not checked, and said so in the check text: the 120x120 safe area, padding of the outline, that
colour and outline icons "match".

## 4. Size limit of the icon file (carried from the constitution)

Documentation conflict: 72 KB (Copilot Studio "Create and delete agents") against 100 KB ("Configure
agent details"). Decision unchanged: **warning above 72 KB, failure above 100 KB**. The `KB` is
1024 bytes. A manual test settles it later; the thresholds live in `limits.ts`.

## 5. Tooling decisions (reuse of Agent Nameplate)

Read from `../agent-nameplate/` on 2026-10-26: TypeScript strict, Vite 8 with IIFE output and fixed
file names (`dist/assets/index.js`), `base: "./"`, `root: "./src"`, version injected as
`__APP_VERSION__` from `package.json`; Vitest 5 with `test/**/*.test.ts` and a setup file; jsdom
for UI tests; `fflate` 0.8.2 pinned for zip; a mutation script that breaks the code one defect at a
time and restores the files from memory.

| Topic | Decision | Alternatives rejected |
|-------|----------|-----------------------|
| Zip | `fflate` 0.8.2, exact version, same as Agent Nameplate (already reviewed there) | JSZip (larger, async, no gain); own inflate (risk without benefit) |
| PNG | Own decoder for IHDR, PLTE, tRNS, IDAT with `fflate`'s `unzlibSync` only for the zlib stream; own unfilter (types 0-4) | `pngjs` (Node-oriented, adds a dependency to review); browser `createImageBitmap` (async, colour-managed, not deterministic, cannot report bit depth/colour type) |
| Manifest edit | **Text-level replacement** of the two string values found by a small JSON tokenizer; everything else (spacing, order, BOM, unknown keys) stays byte-for-byte | `JSON.parse` then `JSON.stringify` (reformats the file, loses number forms, risks changing entries); regex (breaks on escaped quotes and nested `name` keys) |
| Safety net on the edit | After the replacement, the new text is parsed and compared with the old parse: the only differences allowed are the two values. A mismatch aborts the export | trust the tokenizer alone |
| Flattening formula | `out = floor((src*a + bg*(255-a) + 127) / 255)` per channel, integer maths, `a` in 0-255 | float maths (differs between runs and platforms) |
| Zip output | `zipSync`, entries recreated (never cloned: see Agent Nameplate `rezip.ts`), same names and order, **fixed entry date 1980-01-01** so the same input gives the same bytes | default `Date.now()` mtime (two exports differ) |
| Entry limits | Whole file max 5 MB, entry max 1 MB uncompressed, at most 200 entries; sizes read from the zip directory *before* any inflate, using the `filter` callback of `unzipSync` | inflate first and measure (zip bomb) |
| Path safety | Reject `..` segments, leading `/`, backslashes, drive letters, empty names and duplicates; directory entries (trailing `/`) are kept | silent fix-up of paths |
| File access | Open: `toolboxAPI.fileSystem.selectPath` + `readBinary`, with `<input type=file>` and drag-and-drop as the fallback when the API is absent. Save: `fileSystem.saveFile` (one dialog; the platform has no silent binary write: see Agent Nameplate `files.ts`) | terminal tricks (blocked by the platform) |
| Network | None. No `connections` feature in `package.json`; a test fails if `fetch`, `XMLHttpRequest` or `WebSocket` is called | |
| Headless / MCP | Not in this release (constitution Principle VI, VIII) | |

## 6. Observations that the plan relies on and that stay UNVERIFIED

- That a Copilot Studio package always has `name.short` and `name.full` carrying the same bracket
  suffix. Spec assumption; if names differ, both are shown and the same suffix is applied.
- That `saveFile` accepts a `Uint8Array`. Agent Nameplate passes one; quickstart step 9 records the
  result of the manual test.
- That Teams accepts the exported package as a custom app. Known to work for a renamed manifest
  with a different suffix only through the manual test (quickstart step 10).

## 7. What the tests cannot see (goes into the quickstart as manual checks)

- Pixels as Teams really draws them (masking, anti-aliasing, recolouring of the outline icon).
- Teams' own validation of the uploaded package.
- The dark and light theme of the real PPTB window.
- The native save dialog.

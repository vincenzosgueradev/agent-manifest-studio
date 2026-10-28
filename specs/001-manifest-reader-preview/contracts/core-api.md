# Contract: core modules (`src/services/`)

The modules below are pure: bytes and text in, values out. No DOM, no PPTB API, no network (only
`files.ts` touches the host). Tests call them directly; the screen only wires them. This is the
surface as built.

| Module | Function | Contract |
|--------|----------|----------|
| `limits.ts` | constants | `PACKAGE_MAX_BYTES` 5 MB, `ENTRY_MAX_BYTES` 1 MB, `ENTRY_MAX_COUNT` 200, `PACKAGE_UNPACKED_MAX_BYTES` 16 MB, `NAME_SHORT_MAX` 30, `NAME_FULL_MAX` 100, `DESC_SHORT_MAX` 80, `DESC_FULL_MAX` 4000, `COLOR_ICON_SIDE` 192, `OUTLINE_ICON_SIDE` 32, `COLOR32_ICON_SIDE` 32, `ICON_WARN_BYTES` 72 KB, `ICON_FAIL_BYTES` 100 KB, `SUFFIX_MAX` 20, `PNG_MAX_SIDE` 4096 |
| `zip.ts` | `readPackage(bytes, fileName): ReadResult` | `{ ok: true, pkg } \| { ok: false, code, message }`. Codes: `not-zip`, `too-large`, `entry-too-large`, `too-many-entries`, `unsafe-path`, `duplicate-path`, `no-manifest`, `manifest-in-subfolder`. Sizes and paths are checked from the zip directory **before** any entry is inflated. |
| `zip.ts` | `writePackage(pkg, replaced): Uint8Array` | Recreates every entry with the same path and order; `replaced` maps a path to new bytes; entry date fixed to 1980-01-01. The same input gives the same bytes. |
| `manifest.ts` | `decodeManifest(bytes): string \| null` | UTF-8 with the byte-order mark kept; `null` for bytes that are not UTF-8. |
| `manifest.ts` | `parseManifest(text): ManifestResult` | `{ ok: true, manifest } \| { ok: false, code: 'not-json' \| 'not-object', message }`. Never throws. |
| `manifest.ts` | `locateNames(text): LocateResult` | Finds the string literals of `name.short` and `name.full` in the top-level `name` object by walking the JSON text. A repeated key gives `duplicate-name-key`. |
| `suffix.ts` | `splitName`, `makeName`, `composeName`, `validateSuffix` | Rules of FR-019; `validateSuffix` returns `{ ok: true, value } \| { ok: false, message }`. |
| `rename.ts` | `applySuffix(text, suffix, locate?): RenameResult` | Replaces only the two string literals; keeps every other byte; parses old and new text and refuses (`integrity`) if they differ anywhere else. |
| `png.ts` | `decodePng(bytes): PngResult` | `not-png` \| `corrupt` (with reason) \| `unsupported` (with header and reason) \| `ok` (header and 8-bit RGBA). Checksums verified; decompression bounded by the header. |
| `preview.ts` | `parseAccent(text)`, `flattenOnAccent(rgba, accent)` | `#RRGGBB` only; `floor((src*a + bg*(255-a) + 127) / 255)` per channel; output alpha 255. |
| `iconset.ts` | `loadIcons(pkg, manifest): IconSet` | Finds and decodes the declared icons. |
| `checks.ts` | `runChecks(manifest, icons): Check[]` | One `Check` per rule in a stable order; a check that cannot be evaluated because its input is missing is left out (the check that explains the cause carries the failure). |
| `checks.ts` | `blockingChecks(before, after): Check[]` | `name.*` checks that fail in `after` and did not fail in `before`. |
| `export.ts` | `makeContext(pkg)` | Decodes and parses the manifest, loads the icons, runs the checks once. |
| `export.ts` | `planEdit(ctx, suffix \| null): PlanResult` | Names, manifest, checks, blocking and remaining failures for a typed suffix; `null` means nothing typed (no change). Cheap: runs on every key. |
| `export.ts` | `exportPackage(ctx, suffix \| null): ExportResult` | Refuses with `blocked` when `blockingChecks` is not empty; otherwise the new zip and `suggestFileName`. |
| `export.ts` | `suggestFileName(original, suffix \| null)` | FR-025; `null` gives `-copy`, empty gives `-no-suffix`. |
| `files.ts` | `hasHostFiles()`, `pickPackage()`, `readFileObject(file)`, `savePackage(name, bytes)` | The only module that touches the PPTB API; falls back to a browser download outside the host. |

## Invariants the tests assert

1. `writePackage(readPackage(x), {})` has the same decompressed entries as `x`, in the same order.
2. `applySuffix` changes no byte of the manifest text outside the two literals.
3. Every function that takes untrusted bytes returns an error value; none throws on bad input.
4. No source file calls `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` or `sendBeacon`, and
   running load, edit and export calls none of them.

## Known limitation

A zip entry whose name is an integer (`"1"`) would be reordered by the object that `fflate` takes
for writing. Teams packages do not have such entries; if one appears the order of the exported
archive may differ from the original, the content does not.

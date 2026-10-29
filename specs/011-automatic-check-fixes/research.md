# Research: Automatic Check Fixes

## 1. Where the logic lives

**Decision**: a new pure service module, `src/services/autofix.ts`, mirroring the shape of
`src/services/fixes.ts` (today's text-only guidance). It exposes:

- `canAutoFix(id: string): boolean` — whether a check id has a one-click fix at all.
- `planFix(id, input): FixPlan | null` — what pressing "Fix it" on one row does.
- `planFixAll(checks, input): FixPlan | null` — what pressing "Fix everything" does, built from
  the same per-id plans in the fixed order of FR-012.

`FixPlan` carries a plain-language summary (for the banner, FR-009) and either a patch to the
in-memory `Edits` (names, descriptions, accent colour) or new icon bytes plus the slot they go to.
Nothing in this module touches the DOM; the view only renders what `canAutoFix` says and the
wiring in `app.ts` calls `planFix`/`planFixAll` and feeds the result into the same `edit()` /
`acceptIcon()` functions the rest of the tool already uses for a manual change. This keeps the
existing "what the saved package differs by" proof (Principle VIII) true: an automatic fix is not
a new, separate kind of change, it is the tool performing the same kind of edit the user could
have typed or picked by hand.

**Alternatives considered**: putting the fix logic directly in `view/checks.ts` — rejected, the
view must stay free of business rules (it only renders `Check[]`, per its own file comment) and
the logic needs its own unit tests with an independent oracle (Testing Standard), which a view
file cannot cleanly host.

## 2. Which check ids get a one-click fix

Decided with the user before this plan (three questions, see spec Assumptions). The full id list,
cross-checked against every id `runChecks` (`src/services/checks.ts`) can produce:

| Check id | Fix it? | What the fix does |
|---|---|---|
| `color.size-px`, `color.square`, `color.safe-area`, `color.format`, `color.weight` | Yes, same action for all five | Re-run the picture through the "Teams-ready colour icon" steps (`presetTeamsColour`) and write it back as the colour icon |
| `outline.size-px`, `outline.white` | Yes, same action for both | Re-run the picture through the outline steps (`presetOutline`) and write it back as the outline icon |
| `name.short.length`, `name.full.length` | Yes, only when the verdict is `fail` *and* the name is not missing (it is too long) | Cut the text to exactly the allowed number of characters |
| `description.short.length`, `description.full.length` | Yes, only when the verdict is `fail` *and* the text is not missing (it is too long) | Cut the text to exactly the allowed number of characters |
| `accent.hex` | Yes | Set a valid `#RRGGBB` colour (see §4) |
| `color.contrast` | Yes | Replace the accent colour with one that passes the contrast rule against the logo (see §4) |
| `color.present`, `outline.present`, `color32.present`, `color32.size-px` | No | No image exists to fix; the tool cannot invent one |
| `color.png`, `outline.png` | No | The bytes cannot be decoded into pixels at all (this is different from `color.format`/`unsupported`, which still has a header and can go through the same read path the image editor already uses); there is nothing to re-encode |
| `name.distinct` | No | The tool cannot invent a full name that means something next to the short name |
| `schema.valid` | No | Too varied; stays in the Manifest schema card's own guidance |

`color.png`/`outline.png` are `fail` only for `not-png`/`corrupt`; a `not-png`/`corrupt` file truly
has no pixels to work from. `color.format` is a `warning` for `kind === 'unsupported'` (a 16-bit or
interlaced PNG the tool's own reader will not draw): this case still has a decodable picture
available through the same path the image editor already uses when the window offers a decoder
(`services/image/import.ts`, `importImage`), the same way pressing "Edit image" → "Apply" already
fixes it today. When the window offers no decoder, `importImage` reports that and the row falls
back to today's text-only guidance (no button is shown), it is not treated as an error.

## 3. Truncation (name and description length)

**Decision**: count characters the same way the check already does (`[...text].length`, i.e. by
Unicode code point, `services/checks.ts`), and cut with `[...text].slice(0, max).join('')`. The
result is exactly `max` characters, and every character that remains is byte-for-byte the same as
in the original text (FR-005/FR-006). No ellipsis or other mark is added, because adding one would
either exceed the limit again or silently remove one more character of real content than the limit
requires. No trimming of trailing whitespace is performed, for the same reason: it would make the
result not "exactly" the limit, and a value that is merely shorter than the limit still passes the
check, so there is nothing to gain by trimming further for correctness, only a cosmetic choice; a
user can still edit the result by hand afterwards in Details.

## 4. Accent colour

**Decision**:

- When the colour icon has a readable picture (`icon.png.kind === 'ok'`, or `'unsupported'` with a
  decoder available, same rule as §2): compute the logo colour exactly as
  `contrastCheck` in `services/checks.ts` already does (alpha-weighted average of the visible
  pixels), then its luminance (`services/image/colour.ts`, `luminance`). Compute the WCAG contrast
  ratio (`contrastRatio`) of that luminance against pure black (`#000000`) and against pure white
  (`#ffffff`), and set the accent colour to whichever of the two is higher. This covers both
  `accent.hex` (missing/invalid) and `color.contrast` (valid but too close) with one rule, and
  always clears the "at least 3 : 1" bar: for any logo luminance in `[0, 1]`, the greater of the
  two ratios is never below roughly 4.5 : 1 (the two curves cross at that value), so the fix always
  turns `color.contrast` green too, not only `accent.hex`.
- When no logo picture can be read at all (the colour icon is missing or its bytes cannot be
  decoded into pixels by any path the tool has): set a fixed fallback, `#000000`. It is always a
  valid `#RRGGBB` value, which is all `accent.hex` asks for when there is no logo to compare
  against; `color.contrast` does not apply in this case either (the check itself returns `null`
  when there is no readable picture, see `contrastCheck`).

**Alternatives considered**: a curated palette of "brand-safe" colours — rejected, it would be a
design opinion the tool has no basis for, and would not be obviously better than black/white by any
rule a test could check; computing against black/white is deterministic, always valid, and reuses
exactly the same colour math the existing warning already relies on, so no new colour theory enters
the tool.

## 5. Icon fixes reuse the existing presets, end to end

**Decision**: `planFix` for an icon-group id does, in order: (1) `importImage` the current icon
bytes (the same function the image editor's "Choose a PNG" already uses, so the exact same set of
readable files applies); (2) build the ops with `presetTeamsColour`/`presetOutline`
(`services/image/pipeline.ts`, unchanged — these already have a written definition and tests from
features 004/009/010); (3) `evaluate` them to a final `Picture`; (4) bring it to the exact slot
size with `toTarget`/`acceptResult` (`services/image/accept.ts`, the same function "Apply" in the
image editor already calls) to get PNG bytes; (5) hand those bytes to the same `onApply`/
`acceptIcon` path a manual "Apply" already goes through, so the same weight/size acceptance rule
(`checkNewIcon`) applies without being duplicated.

**Alternatives considered**: writing a second, simplified image pipeline just for the Checks page —
rejected, it would be a second definition of "fixed" that could drift from the image editor's own
presets, which the Image Standards (constitution) require to have one written, tested definition.

## 6. Applying a fix: wiring, order and Undo

- **Wiring**: the view adds a `data-fix="<check id>"` button next to any row `canAutoFix` allows,
  and one `#checks-fix-all-btn` button in the strip when at least one currently failing/warning row
  is fixable. `app.ts` adds a delegated click listener next to its existing one for `data-copy`,
  calling `planFix`/`planFixAll` and then the existing `edit()`/`acceptIcon()` functions — no new
  mutation path is introduced.
- **Order (FR-012)**: colour icon group, then outline icon group, then short name, then full name,
  then short description, then full description, then accent colour/contrast. This is the order
  the groups already appear in on the Checks page, so "top to bottom" and "the bulk fix's order"
  are the same thing, nothing extra to document on screen.
- **Undo (FR-009, SC-005)**: before changing `state.edits` (and, for an icon, before calling
  `onApply`), the exact `Edits` value (and, if an icon changed, the icon bytes about to be
  replaced) are kept as `state.lastFix`. A dismissible banner names what changed and offers
  "Undo", which restores that exact snapshot and clears `state.lastFix`. Any other change the user
  makes (typing a field, editing an icon, bumping the version, reverting, loading another package)
  clears `state.lastFix` first, and so does moving away from the Checks step — consistent with the
  rest of the tool's one-shot confirmations (for example the copy/save report status line), so
  there is exactly one new piece of state, not a second undo history next to the image editor's
  own.

## 7. Constitution re-check after this research

- **Principle II (local only)**: every function above is one of the tool's own, already-local
  services; nothing added calls the network or an environment.
- **Image Standards**: no new pixel operation is defined; the two presets already have their exact
  definition and oracle in features 004/009/010. The two new deterministic rules this feature does
  add (truncation, black/white accent choice) are written above precisely enough for a test oracle
  that shares no code with `src/`.
- **Principle VI (GitHub description)**: automatic fixing is an extension of "edit" the live
  description already names, not a new target or a new kind of input/output; no change to the
  description or topics is proposed by this plan. Re-check this call once the feature is built, per
  the constitution's own rule, before any release is proposed.

# Data Model: Effect Info Guides in the Image Editor

Nothing here is persisted (not to the manifest, not to storage); it is static, built-in content held in memory
for the lifetime of the page, plus one transient piece of UI state.

## `GuideKey`

One of the 13 toolbox entries a guide can describe:

`'removeBg' | 'fill' | 'trim' | 'crop' | 'square' | 'fit' | 'rotate' | 'flip' | 'solid' | 'tone' | 'outline' | 'presetTeams' | 'presetOutline'`

The 11 editing-operation keys line up one-to-one with `OpKind` (`src/services/image/types.ts`), except `flip`
which covers both the left-right and top-bottom buttons (FR-001, spec Edge Cases). `presetTeams` and
`presetOutline` cover the two Quick preset buttons, which have no `OpKind` of their own.

## `EffectGuide`

One static entry per `GuideKey`:

| Field | Type | Meaning |
|---|---|---|
| `key` | `GuideKey` | Which toolbox entry this guide describes. |
| `title` | `string` | The effect's name, exactly as shown on its button. |
| `lead` | `string` | One to two sentences: what the effect changes and why it matters. |
| `example` | `string` | One concrete, practical scenario for when to reach for this effect. |
| `tip` | `string` | One short caution or related-tool pointer. |
| `before` | `() => Picture` | Builds the fixed sample picture this guide starts from. |
| `after` | `(before: Picture) => Picture` | Applies the real effect (via `applyOp` or a preset's op list) to `before`, with sensible default settings, to produce the "after" picture. |

All five text fields are plain English, written once, the same for every user (FR-002, FR-007). `before` and
`after` call only existing, already-tested pixel code (`applyOp`, `presetTeamsColour`, `presetOutline`) plus one
new, pure sample-picture builder (`demoPicture` et al. in `src/services/image/demo.ts`); neither reads the
package currently open in the editor (FR-003).

## `Field` and `FIELDS` (shared, not new — moved, not duplicated)

`src/view/opFields.ts` holds the `Field` type and the `FIELDS: Record<OpKind, Field[]>` map that already existed
inside `imageEditor.ts` for the editor's own step controls (name, label, type, min/max/step or options, optional).
It was extracted, unchanged, into its own module so both `imageEditor.ts` (the real controls) and
`effectGuide.ts` (the guide's Parameters section) read the one definition, instead of one importing the other
(which would have made `imageEditor.ts` ↔ `effectGuide.ts` a circular import). Nothing about a parameter's name,
label, range or choices is ever written twice (FR-010).

## `PARAM_HELP` and `GUIDE_OP`

| Name | Type | Meaning |
|---|---|---|
| `GUIDE_OP` | `Partial<Record<GuideKey, OpKind>>` | Which `OpKind` a guide's Parameters section reads from `FIELDS`; absent for `presetTeams`/`presetOutline` (FR-009). |
| `PARAM_HELP` | `Record<OpKind, Record<string, string>>` | One plain-English explanation per parameter, keyed exactly as `FIELDS[opKind]` names it. |

This is the only hand-maintained content this sub-feature adds: everything else a Parameters row shows (the
label, and a range/options/on-off descriptor derived purely from the field's own `type`/`min`/`max`/`options`) is
read straight from `FIELDS`, never copied. `test/image.paramHelp.sync.test.ts` fails whenever `PARAM_HELP[kind]`
and `FIELDS[kind]` disagree on which names exist, in either direction, and whenever `GUIDE_OP` does not map every
`OpKind` through exactly one `GuideKey` — this is the standing, automatic "stay in sync" rule (FR-010, spec
Assumptions), enforced for every operation today and any added later.

## `GuideViewState` (transient UI state, held by the image editor's own module state)

| Field | Type | Meaning |
|---|---|---|
| `open` | `GuideKey \| null` | Which guide is currently shown, or `null` when none is (FR-006: at most one at a time). |

Opening a guide only changes `GuideViewState.open`; it never touches the editor's `Pipeline` (FR-005).

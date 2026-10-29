# Data model: Two-Way Sync Between the Colour Icon and the Outline Icon

## `SyncState` (`services/image/sync.ts`, session-only, not saved to the manifest)

```ts
interface SyncState {
    /** Bumped by one every time a slot's icon changes through a direct user action. */
    directVersion: Record<IconSlot, number>;
    /** For the suggestion shown on a slot's own card, the directVersion of the OTHER slot it was last resolved against. */
    resolvedAt: Record<IconSlot, number>;
}
```

- `initSyncState()` = `{ directVersion: { color: 0, outline: 0 }, resolvedAt: { color: 0, outline: 0 } }` — the
  baseline of a freshly opened package (spec FR-007).
- `markDirect(state, slot)` — `directVersion[slot] += 1`. Called only for a direct user action on `slot` (a new
  file or an applied edit in the image editor, including its own existing presets).
- `resolveSuggestion(state, slot)` — `resolvedAt[slot] = directVersion[otherSlot(slot)]`. Called whenever the
  suggestion shown on `slot`'s card is accepted or dismissed, and when `slot`'s icon is written by accepting that
  very suggestion (so the write itself does not count as direct — FR-006).
- `suggestionPending(state, slot)` — `directVersion[otherSlot(slot)] !== resolvedAt[slot]`.

This is the whole state; no field remembers *why* a picture looks the way it does, only two integers per slot.
Walking spec.md's acceptance scenarios against it:

| Step | `directVersion` | `resolvedAt` | `pending(color)` | `pending(outline)` |
|---|---|---|---|---|
| Package opened | `{0,0}` | `{0,0}` | false | false |
| Colour icon edited directly | `color:1` | `{0,0}` | false | **true** |
| Outline suggestion accepted (write via sync, not direct) | `color:1` | `outline:1` | false | false |
| Outline icon edited directly (by hand, afterwards) | `+outline:1→2` | `outline:1` | **true** | false |
| Colour suggestion dismissed | `color:1,outline:2` | `color:2,outline:1` | false | false |

No step ever makes both columns true at once from a single accept, which is exactly SC-005 (no loop).

## `SyncSuggestion` (`services/image/sync.ts`)

```ts
interface SyncSuggestion {
    slot: IconSlot;           // the card the suggestion is drawn on
    text: string;             // what it will replace, FR-009
    acceptLabel: string;      // the button's label
}
```

`suggestionFor(state, slot, icons: IconSet, accentHex: string | null): SyncSuggestion | null` returns `null` unless
`suggestionPending(state, slot)` **and** the other slot's icon is present and holds a readable PNG
(`icons[otherSlot(slot)].png?.kind === 'ok'`) — spec's "source missing or unreadable" edge case. Otherwise:

- `slot === 'outline'`: text `"The colour icon changed. Regenerate the outline icon to match its shape?"`, label
  `"Regenerate"`.
- `slot === 'color'`: colour = `baseColourFor(accentHex)`; text
  `` `The outline icon changed. Build a colour icon from its shape, on ${toHex(colour)}?` ``, label
  `"Build colour icon"`.

## Pure picture functions (`services/image/sync.ts`, reusing `ops.ts`/`pipeline.ts`)

- `TEAMS_BLUE: Rgb = { r: 0x2b, g: 0x5f, b: 0xd9 }` (the same fallback already written in spec.md and the removed
  007 code; re-declared here since the old module is gone).
- `baseColourFor(accentHex: string | null): Rgb` — `fromHex(accentHex)`; if it parses and `rgbToHsl(...).s >= 0.2`,
  that colour; otherwise `TEAMS_BLUE`.
- `regenerateOutline(colour: Picture): Picture` — `evaluate(colour, presetOutline(colour)).picture`.
- `buildColourFromOutline(outline: Picture, colour: Rgb, target = COLOR_ICON_SIDE): Picture` —
  `fillOn(fit(outline, target, 100), colour)`.

## `EditorModel` / `EditorHandlers` additions (`view/editor.ts`)

- `EditorModel.syncSuggestion: Record<IconSlot, SyncSuggestion | null>` — computed once per render in `app.ts`.
- `EditorHandlers.onSyncAccept(slot: IconSlot): void`, `onSyncDismiss(slot: IconSlot): void`.

No manifest field changes; `accentColor` and the icon slots are written through the existing `Edits` shape
(`edits.fields.accentColor`, `edits.icons[slot]`), so the Changes table and the Original/Now compare band (007)
show the result without any change to `export.ts` or `compare.ts`.

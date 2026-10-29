# Plan: Two-Way Sync Between the Colour Icon and the Outline Icon

Files:
- `src/services/image/sync.ts` (new, pure): `SyncState` (two small counters per slot), `initSyncState`,
  `otherSlot`, `markDirect`, `resolveSuggestion`, `suggestionPending`; `TEAMS_BLUE`, `baseColourFor(accentHex)`;
  `regenerateOutline(colour: Picture): Picture` (= `presetOutline` + `evaluate`, already in `pipeline.ts`);
  `buildColourFromOutline(outline: Picture, colour: Rgb, target = COLOR_ICON_SIDE): Picture` (= `fit` + `fillOn`,
  already in `ops.ts`); `suggestionFor(state, slot, icons, accentHex): SyncSuggestion | null` (the one function
  that decides whether a suggestion shows and what it says — kept in `services/`, not in a view).
- `src/app.ts`: `State` gains `syncState: SyncState`, set in `loadBytes` and reset in `onRevertAll`. `acceptIcon`
  (already the path every direct icon replacement goes through: a new file from the image editor, or one of its
  presets) calls `markDirect`. New `sourcePicture(slot)` builds a `Picture` straight from `shown.icons[slot].png`
  (already decoded by the existing checks pipeline — no second PNG decode). New `acceptSyncSuggestion(slot)` and
  `dismissSyncSuggestion(slot)` wire to `EditorHandlers.onSyncAccept` / `onSyncDismiss`; `render()` computes
  `syncSuggestion` for both slots with `suggestionFor` and passes it to `renderEditor`.
- `src/view/editor.ts`: `EditorModel` gains `syncSuggestion: Record<IconSlot, SyncSuggestion | null>`;
  `EditorHandlers` gains `onSyncAccept`, `onSyncDismiss`. `iconCard()` gets one more row (text + Accept + "Not
  now"), hidden when there is no suggestion for that slot; `updateIcon()` fills and shows/hides it.
- `src/styles.css`: `.ed-img-sync` (one new rule, tokens only, both themes already covered by the tokens).
- `scripts/mutation-check.mjs`: entry for `sync.ts`.
- Tests: `test/image.sync.test.ts` (new, oracle for `baseColourFor`, `regenerateOutline`, `buildColourFromOutline`,
  the `SyncState` counters and `suggestionFor`), `test/ui.workspace.test.ts` or a new `test/ui.sync.test.ts` for the
  card row and the click handlers, `test/edits.test.ts` additions for `acceptIcon` marking a slot direct.

No new manifest field, no new file-acceptance path: both directions end in the exact function the image editor's
own Apply button already uses (`acceptResult`, then `acceptIcon`), so the 100 KB / empty-picture refusals, the
Changes table and "Revert all" keep working unchanged (`onRevertAll` additionally resets `syncState`).

Constitution check: I (closes a gap found by hand without a manual step), II (local, no new file-acceptance code
path), III (the suggestion names exactly what it will replace and, for the colour icon, the colour it chooses —
never silently), VII (tokens only, both themes, the row reuses the existing button classes), VIII (one release
increment, no new dependency). GitHub description: no change (no new kind of input/output, only a shortcut on an
existing one).

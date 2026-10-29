# Tasks: Two-Way Sync Between the Colour Icon and the Outline Icon

- [X] T001 Tests first: `test/image.sync.test.ts` (oracle for `baseColourFor`, `regenerateOutline`,
  `buildColourFromOutline`, the `SyncState` counters against the table in data-model.md, `suggestionFor`'s text,
  labels and the "source missing/unreadable" guard)
- [X] T002 `src/services/image/sync.ts`: `SyncState`, `initSyncState`, `otherSlot`, `markDirect`,
  `resolveSuggestion`, `suggestionPending`, `SyncSuggestion`, `suggestionFor`, `TEAMS_BLUE`, `baseColourFor`,
  `regenerateOutline`, `buildColourFromOutline`
- [X] T003 Tests first: `test/ui.sync.test.ts` (suggestion appears after a direct colour-icon edit and not before;
  Accept replaces the outline icon and lists it in Changes; Not now hides it without changing anything; it does
  not reappear for the same state; the reverse direction sets the accent colour too; Revert all clears both the
  edit and the suggestion state; accepting never produces the opposite suggestion)
- [X] T004 `src/app.ts`: `State.syncState`, init in `loadBytes`, reset in `onRevertAll`; `acceptIcon` calls
  `markDirect`; `sourcePicture`, `acceptSyncSuggestion`, `dismissSyncSuggestion`; `render()` computes
  `syncSuggestion` and passes it to `renderEditor`; `initEditor` gains `onSyncAccept`/`onSyncDismiss`
- [X] T005 `src/view/editor.ts`: `EditorModel.syncSuggestion`, `EditorHandlers.onSyncAccept`/`onSyncDismiss`,
  the suggestion row in `iconCard()`, filled and shown/hidden in `updateIcon()`
- [X] T006 `src/styles.css`: `.ed-img-sync` (tokens only)
- [X] T007 CHANGELOG entry; `scripts/mutation-check.mjs` entry for `sync.ts`; `test/image.sync.test.ts` (15/15) and
  `test/ui.sync.test.ts` (10/10) pass; `npx tsc --noEmit` is clean on this feature's own files (the workspace-wide
  run has four pre-existing errors in `src/view/effectGuide.ts`, feature 012, unrelated and in progress)
- [ ] T008 `npm run build`, the full `npm test`, `npm run test:full` and `npm run test:mutation`, and the manual
  checks of quickstart.md — deferred by agreement until features 011 and 012 are also finished

## Traceability

| Requirement | Code | Test |
|---|---|---|
| FR-001 | sync.ts `regenerateOutline`, app.ts `acceptSyncSuggestion` | image.sync, ui.sync |
| FR-002 | sync.ts `baseColourFor`, `buildColourFromOutline` | image.sync, ui.sync |
| FR-003 | app.ts `acceptSyncSuggestion`/`dismissSyncSuggestion` (reuse `acceptResult`/`edit`) | ui.sync (Changes table, Revert) |
| FR-004 | sync.ts `resolveSuggestion`, `suggestionPending` | image.sync (table), ui.sync (no repeat) |
| FR-005 | app.ts `acceptSyncSuggestion` (writes only the target slot, and accent colour only for `color`) | ui.sync |
| FR-006 | sync.ts (`resolveSuggestion` never calls `markDirect`) | image.sync (table), ui.sync (no loop) |
| FR-007 | sync.ts `initSyncState` | image.sync, ui.sync (fresh package) |
| FR-008 | app.ts `acceptSyncSuggestion` (reuses `acceptResult`'s empty/size refusal) | ui.sync |
| FR-009 | sync.ts `suggestionFor` (`text`, `acceptLabel`) | image.sync |
| FR-004 (hidden when none) | styles.css `.ed-img-sync[hidden]` | ui.workspace ("the CSS lets the hidden sync suggestion go") |

## Notes

- No task renumbers or removes an existing file; `acceptIcon`, `acceptResult`, `presetOutline`, `fit`, `fillOn`,
  `IconSet`, the Changes table and "Revert all" are reused exactly as they are today (research.md).
- `test:mutation` must complete, and the manual checks of quickstart.md must be run and recorded, before this
  feature is proposed for a release (`/custom-ampush`).

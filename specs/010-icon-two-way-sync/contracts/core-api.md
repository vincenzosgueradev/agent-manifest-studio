# Core API: Two-Way Sync Between the Colour Icon and the Outline Icon

`src/services/image/sync.ts` (new, pure — no DOM, no canvas):

```ts
type IconSlot = 'color' | 'outline';

interface SyncState { directVersion: Record<IconSlot, number>; resolvedAt: Record<IconSlot, number> }

function initSyncState(): SyncState;
function otherSlot(slot: IconSlot): IconSlot;
function markDirect(state: SyncState, slot: IconSlot): SyncState;
function resolveSuggestion(state: SyncState, slot: IconSlot): SyncState;
function suggestionPending(state: SyncState, slot: IconSlot): boolean;

interface SyncSuggestion { slot: IconSlot; text: string; acceptLabel: string }
function suggestionFor(
    state: SyncState, slot: IconSlot, icons: IconSet, accentHex: string | null,
): SyncSuggestion | null;

const TEAMS_BLUE: Rgb;
function baseColourFor(accentHex: string | null): Rgb;
function regenerateOutline(colour: Picture): Picture;
function buildColourFromOutline(outline: Picture, colour: Rgb, target?: number): Picture;
```

All ten functions are pure: same arguments, same result, no mutation of their arguments (each returns a new
`SyncState` or `Picture`). `sync.ts` imports only from `./types`, `./colour`, `./ops`, `./pipeline`, `../../types`
(`IconSet`) and `../limits` (`COLOR_ICON_SIDE`) — nothing from `view/` and no network or environment primitive
(Principle II).

## `app.ts` wiring (not exported — internal to the module)

- `acceptIcon(slot, bytes)` (existing, the path every direct replacement already goes through) additionally calls
  `markDirect`.
- `sourcePicture(slot): Picture | null` — `shown.icons[slot]` turned into a `Picture` when its `png.kind === 'ok'`,
  else `null`.
- `acceptSyncSuggestion(slot: IconSlot): void` — resolves the suggestion first, then (if the source picture and the
  computed result are both usable) writes the target icon, and for `slot === 'color'` the accent colour, in one
  `edit()` call.
- `dismissSyncSuggestion(slot: IconSlot): void` — resolves the suggestion, no icon write.
- Both are passed to `initEditor` as `onSyncAccept` / `onSyncDismiss`.

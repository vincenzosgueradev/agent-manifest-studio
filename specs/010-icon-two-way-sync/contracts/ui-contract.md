# UI contract: Two-Way Sync Between the Colour Icon and the Outline Icon

Each icon card (`#ed-img-color`, `#ed-img-outline`) gains, after the existing `.ed-img-actions` row and before the
error message paragraph:

| Id | Element | Shown when |
|---|---|---|
| `ed-img-sync-row-{slot}` | wrapping `div.ed-img-sync` | `syncSuggestion[slot] !== null` |
| `ed-img-sync-{slot}` | `p` with the suggestion text | always inside the row above |
| `ed-sync-accept-{slot}` | `button.btn.btn--primary.btn--sm`, label = `acceptLabel` | always inside the row above |
| `ed-sync-dismiss-{slot}` | `button.btn.btn--secondary.btn--sm`, label `"Not now"` | always inside the row above |

Behaviour:

- `ed-sync-accept-{slot}` click -> `onSyncAccept(slot)`.
- `ed-sync-dismiss-{slot}` click -> `onSyncDismiss(slot)`.
- The row is hidden (not removed) when there is no suggestion, same pattern as `ed-img-caption`/`ed-img-msg`.
- No new ids on `ed-revert-all` / `ed-revert-all-look`: accepting a suggestion is an edit like any other, so the
  existing Revert all becomes enabled by it and clears it the same way; `onRevertAll` additionally resets the sync
  state so neither card shows a stale suggestion for a package that is, once more, exactly as opened.
- The suggestion never appears together with a disabled "Edit image" button state change: `Edit image` keeps its
  existing own disabled rule (another editor open on the other slot).

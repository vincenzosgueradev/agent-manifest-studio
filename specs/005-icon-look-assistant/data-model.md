# Data Model: Icon Look Assistant

No persisted data. In memory:

| Name | Shape | Lives in |
|---|---|---|
| `Suggestion` | `{ id, title, why[], icon: Picture, accent: string, outline: Picture, contrast: number }` | `services/image/recommend.ts` |
| `SuggestionSet` | `{ suggestions: Suggestion[], note: string \| null }` | same |
| `TransparentResult` | `{ ok: true, picture } \| { ok: false, message }` | `services/image/transparent.ts` |
| `advice` | `{ bytes, accent, set }`, cache of the last advice | `app.ts` |
| `iconMessage` | `{ color: string \| null, outline: string \| null }` | `app.ts` state |
| `versionHint` | `{ current: string, next: string \| null } \| null` | `app.ts` to `exportPanel.ts` |

Rules: `Picture` is RGBA and is never mutated by these functions. The preview colour of the outline icon
is the value of an input element only; it is not part of the state or the package.

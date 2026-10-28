# Contract: core functions

```ts
// services/image/transparent.ts
type TransparentResult = { ok: true; picture: Picture } | { ok: false; message: string };
makeTransparent(p: Picture): TransparentResult             // removes the flat colour at the edges; refuses: ALREADY_SEE_THROUGH, or no flat border
whiteShape(p: Picture): TransparentResult                  // visible pixels become (255,255,255), alpha kept; refuses: ALREADY_WHITE
borderlessIcon(p: Picture, colour: Rgb): TransparentResult // background away if any, then solid(colour)

// services/image/recommend.ts
recommend(picture: Picture, accent: string | null): SuggestionSet
// ids in order: 'brand-tile', 'coloured-logo', ['keep-colours']; icon 192, outline 32; the picture is not mutated
```

Rules: pure; no DOM; no network; the input picture is never modified; every message is a sentence a
user can act on.

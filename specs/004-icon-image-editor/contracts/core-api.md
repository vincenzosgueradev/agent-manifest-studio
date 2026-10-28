# Core API contract (feature 004)

```ts
// image/colour.ts
distancePercent(a: Rgb, b: Rgb): number
toHex(c: Rgb): string; fromHex(text: string): Rgb | null
luma(r, g, b): number
dominantColour(p: Picture): Rgb | null
cornerColour(p: Picture): Rgb

// image/ops.ts   (each returns a new Picture; inputs are never changed)
removeBackground(p, o: RemoveBgOp): Picture
trim(p, tolerance): Picture
crop(p, x, y, w, h): Picture                       // throws RangeError for an invalid rectangle; cropProblem() tells why first
cropProblem(p, x, y, w, h): string | null
square(p, fill: Rgb | null): Picture
fit(p, target, share): Picture
resize(p, w, h): Picture
rotate(p, quarters): Picture; flip(p, axis): Picture
fillOn(p, colour): Picture; solid(p, colour): Picture
tone(p, o: ToneOp): Picture
outlineMaker(p, o: OutlineOp): Picture

// image/pipeline.ts
applyOp(p: Picture, op: Op): Picture
evaluate(source: Picture, ops: Op[]): Picture
create(source): Pipeline; add(pl, op); remove(pl, i); update(pl, i, op); undo(pl); redo(pl); reset(pl)
presetTeamsColour(source: Picture): Op[]; presetOutline(source: Picture): Op[]

// image/pngWrite.ts
encodePng(p: Picture): Uint8Array

// image/import.ts
fromPng(bytes): ImportResult
fromHost(bytes, mime, decoder): Promise<ImportResult>
reduceTo(p, max): { picture: Picture; reduced: boolean }

// image/accept.ts
acceptResult(p: Picture, target: number): { ok: true; bytes: Uint8Array } | { ok: false; message: string }
```

Rules: operations never mutate their input; `evaluate` equals folding `applyOp`; `undo(redo(x))` is
`x`; `acceptResult` brings the picture to `target x target`, refuses an all-transparent picture and a PNG
over 100 KB, and the bytes read back with `decodePng` equal the resized picture.

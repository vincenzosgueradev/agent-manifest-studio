# Data Model: Icon Image Editor

- `Picture { width, height, data: Uint8Array /* RGBA, length = width * height * 4 */ }`.
- `Rgb { r, g, b }`; hex text `#RRGGBB`.
- `Op` (discriminated by `kind`):
  - `removeBg { mode: 'edges' | 'everywhere'; colour: Rgb | null /* null = corner colour */; tolerance: 0..100; softness: 0..100; matte: -5..5 }`
  - `trim { tolerance: 0..100 }`
  - `crop { x, y, w, h }`
  - `square { fill: Rgb | null }` (null = transparent)
  - `fit { target: number; share: 1..100 }`
  - `resize { w, h }`
  - `rotate { quarters: 1 | 2 | 3 }`, `flip { axis: 'h' | 'v' }`
  - `fill { colour: Rgb }`
  - `solid { colour: Rgb }`
  - `tone { hue: -180..180; saturation: -100..100; brightness: -100..100; contrast: -100..100; invert: boolean; gray: boolean; threshold: number | null /* 0..255 */ }`
  - `outline { mode: 'alpha' | 'brightness'; cutoff: 0..255 }`
- `Pipeline { source: Picture; ops: Op[]; undo: Op[][]; redo: Op[][] }` with at most 50 entries in `undo`.
- `Reading { r, g, b, a, x, y }` for the eyedropper.
- `EditorState` (in the app): `{ slot: 'color' | 'outline'; pipeline; name: string; target: number; note: string | null }`.
- Limits (limits.ts): `IMAGE_WORKING_MAX = 1024`, `HISTORY_MAX = 50`.

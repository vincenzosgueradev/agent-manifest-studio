# Data model: Accent colour from the picture

No stored data. Transient state of the popup: the picture (`Picture`, RGBA 8-bit) and the chosen pixel
`{ x, y, hex } | null`. `colourAt(picture, x, y)` returns `{ ok: true, colour, hex }` or `{ ok: false, message }`.
The only value written outside the popup is `edits.fields.accentColor` (string `#rrggbb`).

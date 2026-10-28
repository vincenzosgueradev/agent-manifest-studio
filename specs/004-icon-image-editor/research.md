# Research: Icon Image Editor (feature 004)

Read on **2026-10-27**. Facts about Teams icons are those already recorded in the constitution
(Verified Facts, read on 2026-10-26 on Microsoft Learn): colour icon 192 x 192 PNG, square, logo inside the
central 120 x 120, solid or fully transparent background; outline icon 32 x 32 PNG, white on
transparent; weight 72 KB / 100 KB (two pages disagree). Nothing in this feature changes those facts.

## 1. Definitions that the tests use as the oracle

All images are 8-bit RGBA, not premultiplied, row by row from the top left.

| Name | Definition |
|---|---|
| **Distance (percent)** | `100 * sqrt(dr^2 + dg^2 + db^2) / sqrt(3 * 255^2)`; black to white is 100. Alpha is not part of it. |
| **Remove background, "Everywhere"** | A pixel is removed when its distance to the chosen colour is at most `tolerance`. Removed: alpha 0 (colour kept). |
| **Remove background, "From the edges"** | The same test, but only pixels connected (4-neighbours) through candidates to a candidate on the image border. |
| **Softness `s` (0..100)** | `band = s`. A reachable pixel with `tolerance < d <= tolerance + band` keeps `round(a * (d - tolerance) / band)` as alpha; reachable means within `tolerance + band` of the colour, and in "From the edges" connected to the border through such pixels. `s = 0` is a hard cut. |
| **Matte `m` (-5..5)** | Applied to the hard-removed set R: `m > 0` adds the pixels within `m` 4-neighbour steps of R; `m < 0` takes out of R the pixels within `-m` steps of a pixel that is not in R. Soft pixels are decided before the matte and the matte only changes pixels it adds or frees. |
| **Trim** | Smallest box holding every pixel with alpha above 0; when no pixel has alpha below 255, every pixel whose distance to the top-left pixel is above `tolerance` (default 2). An image with nothing to keep is left unchanged. |
| **Crop `(x, y, w, h)`** | The exact sub-rectangle; refused unless `0 <= x`, `0 <= y`, `w, h >= 1`, `x + w <= width`, `y + h <= height`. |
| **Rotate / flip** | Exact pixel moves; four 90-degree rotations give the original. |
| **Fit `(target, share)`** | Scale the image by `s = share/100 * target / max(w, h)` (area averaging when `s < 1`, bilinear when `s > 1`), centre it on a transparent `target x target` square (offset `floor((target - w') / 2)`). `share = 62.5` is the safe area of a 192 icon. |
| **Resize `(w, h)`** | Area averaging when reducing, bilinear when enlarging, in premultiplied alpha, rounded half up. Oracle bound: for an integer reduction factor the result is the mean of each block within 1 per channel; for a flat colour it is exact. |
| **Fill `(colour)`** | `out = floor((src * a + bg * (255 - a) + 127) / 255)`, alpha 255 (the formula of the preview). |
| **Solid colour** | Pixels with alpha above 0 take the colour, alpha kept; others unchanged. |
| **Tone** | Hue shift in HSL degrees; saturation `S' = clamp(S * (100 + s) / 100)`; brightness `v' = clamp(v + 255 * b / 100)`; contrast `v' = clamp((v - 128) * (100 + c) / 100 + 128)`; invert `255 - v`; grayscale `round(0.299 r + 0.587 g + 0.114 b)`; threshold `luma >= cut ? 255 : 0`. Alpha never changes. |
| **Outline maker, "alpha"** | Pixels with alpha `>= cutoff` (default 16) become `(255, 255, 255, a)`; the rest `(255, 255, 255, 0)`. |
| **Outline maker, "brightness"** | `(255, 255, 255, round(a * (255 - luma) / 255))`. |
| **Dominant colour** | Among pixels with alpha at least 200 and a distance above 8 from the top-left pixel when that pixel is opaque: the most common colour after reducing each channel to 5 bits; the answer is the mean of the pixels in that group. Ties go to the group that appears first. |

## 2. PNG writer

An 8-bit RGBA, non-interlaced PNG: signature, `IHDR`, one `IDAT` (zlib stream by `fflate.zlibSync`,
level 9, row filters chosen per row by the smallest sum of absolute values, the usual heuristic), `IEND`,
each chunk with its CRC. No other chunk. Verified in the tests by (a) the tool's own reader, (b) an
independent reader in the test helpers (zlib inflate, unfilter written from the PNG specification), and
(c) a check of the CRC of every chunk.

## 3. Decoding other formats

JPEG, WebP, GIF and SVG are decoded by the host window through the standard browser APIs
(`createImageBitmap`, a 2D canvas to read the pixels). **UNVERIFIED** in the PPTB window: whether the
APIs and the formats are available there. The tool detects a missing API or a failed decode and refuses
with the cause; PNG always works through the tool's own reader. Manual check 7 of the quickstart records
the result. In the tests the browser decoder is replaced by a fake (the tests cannot run a real one).

## 4. Decisions

| Decision | Why | Alternatives |
|---|---|---|
| Non-destructive list of operations, recomputed from the picture | Exact undo and redo, editable earlier steps, testable one operation at a time | Destructive pixel history: memory heavy and no editing of earlier steps |
| Pure functions on RGBA arrays, no canvas in the maths | They run and are tested in Node; the canvas only displays | Canvas filters: untestable here and differ by browser |
| Working cap of 1024 px | Linear work on one million pixels per operation stays under a second; icons are 192 px | Full resolution: slow, no benefit for a 192 px result |
| Area averaging for reduction | Best quality for the usual case (large logo to 192 or 32) and exactly testable | Nearest or bilinear only: jagged at 32 px |
| Eyedropper and crop have typed alternatives | Keyboard use (FR-030) and testability | Mouse only |
| Apply uses the same `Edits.icons` path as a chosen file | One path to the package: preview, checks, Changes table and export already work | A second path: duplicates and diverges |
| No new dependency | `fflate` already provides zlib | An image library: audit cost and size |

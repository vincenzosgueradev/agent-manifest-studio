/**
 * The safe area of the colour icon: "if your icon includes a logo or brand mark, keep it within the
 * 120 x 120 safe area in the center" (Microsoft Learn, "Teams app icon for Teams Store and app bar",
 * read on 2026-10-26).
 *
 * What counts as the logo is an ASSUMPTION, and the check says so: the background is either
 * transparent or the colour of the top-left pixel; every pixel that differs from it is the logo.
 * A gradient or a photograph as background reads as logo everywhere.
 */

/** A difference of at most this much per channel still counts as the background (compression noise). */
const TOLERANCE = 8;

/** Number of logo pixels outside the central `safe` x `safe` square of a `width` x `height` image. */
export function countOutsideSafeArea(rgba: Uint8Array, width: number, height: number, safe: number): number {
    if (width === 0 || height === 0 || rgba.length < width * height * 4) return 0;
    const [r0, g0, b0, a0] = [rgba[0]!, rgba[1]!, rgba[2]!, rgba[3]!];
    const left = Math.floor((width - safe) / 2);
    const top = Math.floor((height - safe) / 2);
    let outside = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x >= left && x < left + safe && y >= top && y < top + safe) continue;
            const i = (y * width + x) * 4;
            const isLogo = a0 === 0
                ? rgba[i + 3]! > 0
                : Math.abs(rgba[i]! - r0) > TOLERANCE || Math.abs(rgba[i + 1]! - g0) > TOLERANCE
                    || Math.abs(rgba[i + 2]! - b0) > TOLERANCE || Math.abs(rgba[i + 3]! - a0) > TOLERANCE;
            if (isLogo) outside++;
        }
    }
    return outside;
}

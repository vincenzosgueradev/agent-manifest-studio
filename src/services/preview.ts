/**
 * The colour icon as Teams shows it: laid on the accent colour (FR-007).
 *
 * Integer maths only, so the same input gives the same bytes on every machine:
 *   out = floor((src * a + bg * (255 - a) + 127) / 255)     per channel, a in 0..255
 * which is the exact fraction rounded half up. Output alpha is always 255.
 */

export interface Rgb { r: number; g: number; b: number }

const HEX6 = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/** `#RRGGBB` only (FR-015); anything else is `null`. */
export function parseAccent(text: string): Rgb | null {
    const m = HEX6.exec(text);
    return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : null;
}

export function flattenOnAccent(rgba: Uint8Array, accent: Rgb): Uint8Array {
    const out = new Uint8Array(rgba.length);
    for (let i = 0; i + 3 < rgba.length; i += 4) {
        const a = rgba[i + 3]!;
        out[i] = Math.floor((rgba[i]! * a + accent.r * (255 - a) + 127) / 255);
        out[i + 1] = Math.floor((rgba[i + 1]! * a + accent.g * (255 - a) + 127) / 255);
        out[i + 2] = Math.floor((rgba[i + 2]! * a + accent.b * (255 - a) + 127) / 255);
        out[i + 3] = 255;
    }
    return out;
}

/**
 * Colour maths of the image editor: distance, hex, HSL, brightness, and the two questions the tools
 * ask of a picture (which colour is the background, which is the main colour).
 */

import type { Picture, Rgb } from './types';

/** Squared distance from black to white: the denominator that makes the distance a percentage. */
const MAX_SQ = 3 * 255 * 255;

const sq = (a: Rgb, b: Rgb): number => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

/** `100 * sqrt(dr^2 + dg^2 + db^2) / sqrt(3 * 255^2)`: black to white is 100. Alpha is not part of it. */
export function distancePercent(a: Rgb, b: Rgb): number {
    return 100 * Math.sqrt(sq(a, b) / MAX_SQ);
}

/** The same distance from raw channel values, without building objects (the hot loops use it). */
export function distancePercentRaw(r: number, g: number, b: number, to: Rgb): number {
    return 100 * Math.sqrt(((r - to.r) ** 2 + (g - to.g) ** 2 + (b - to.b) ** 2) / MAX_SQ);
}

export const toHex = (c: Rgb): string => `#${[c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;

const HEX6 = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
const HEX3 = /^#?([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;

/** `#RRGGBB`, `RRGGBB`, `#RGB` or `RGB`; anything else is `null`. */
export function fromHex(text: string): Rgb | null {
    const t = text.trim();
    const long = HEX6.exec(t);
    if (long) return { r: parseInt(long[1]!, 16), g: parseInt(long[2]!, 16), b: parseInt(long[3]!, 16) };
    const short = HEX3.exec(t);
    return short ? { r: parseInt(short[1]! + short[1]!, 16), g: parseInt(short[2]! + short[2]!, 16), b: parseInt(short[3]! + short[3]!, 16) } : null;
}

export const luma = (r: number, g: number, b: number): number => Math.round(0.299 * r + 0.587 * g + 0.114 * b);

export const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** Hue in degrees (0 to 360), saturation and lightness in 0 to 1. */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h: number;
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    return { h: h < 0 ? h + 360 : h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let [r1, g1, b1] = [0, 0, 0];
    if (hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (hp < 3) [r1, g1, b1] = [0, c, x];
    else if (hp < 4) [r1, g1, b1] = [0, x, c];
    else if (hp < 5) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const m = l - c / 2;
    return { r: clamp255((r1 + m) * 255), g: clamp255((g1 + m) * 255), b: clamp255((b1 + m) * 255) };
}

export function pixelAt(p: Picture, x: number, y: number): { r: number; g: number; b: number; a: number } | null {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= p.width || y >= p.height) return null;
    const i = (y * p.width + x) * 4;
    return { r: p.data[i]!, g: p.data[i + 1]!, b: p.data[i + 2]!, a: p.data[i + 3]! };
}

/** The most common colour of the four corners; on a tie the first of top-left, top-right, bottom-left, bottom-right. */
export function cornerColour(p: Picture): Rgb {
    const corners = [[0, 0], [p.width - 1, 0], [0, p.height - 1], [p.width - 1, p.height - 1]] as const;
    const seen: Array<{ c: Rgb; n: number }> = [];
    for (const [x, y] of corners) {
        const px = pixelAt(p, x, y);
        if (!px) continue;
        const hit = seen.find(s => s.c.r === px.r && s.c.g === px.g && s.c.b === px.b);
        if (hit) hit.n++; else seen.push({ c: { r: px.r, g: px.g, b: px.b }, n: 1 });
    }
    if (seen.length === 0) return { r: 255, g: 255, b: 255 };
    let best = seen[0]!;
    for (const s of seen) if (s.n > best.n) best = s;
    return best.c;
}

/**
 * The main colour of the logo: among pixels with alpha at least 200 and, when the top-left pixel is
 * opaque, further than 8 percent from it, the most common colour after reducing each channel to 5 bits;
 * the answer is the mean of the pixels in that group. A tie goes to the group that appears first.
 */
export function dominantColour(p: Picture): Rgb | null {
    const first = pixelAt(p, 0, 0);
    const background = first && first.a === 255 ? { r: first.r, g: first.g, b: first.b } : null;
    const groups = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < p.data.length; i += 4) {
        if (p.data[i + 3]! < 200) continue;
        const r = p.data[i]!, g = p.data[i + 1]!, b = p.data[i + 2]!;
        if (background && distancePercentRaw(r, g, b, background) <= 8) continue;
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        const grp = groups.get(key);
        if (grp) { grp.n++; grp.r += r; grp.g += g; grp.b += b; } else groups.set(key, { n: 1, r, g, b });
    }
    let best: { n: number; r: number; g: number; b: number } | null = null;
    for (const grp of groups.values()) if (!best || grp.n > best.n) best = grp;
    return best ? { r: Math.round(best.r / best.n), g: Math.round(best.g / best.n), b: Math.round(best.b / best.n) } : null;
}

/** WCAG relative luminance of an sRGB colour, 0 (black) to 1 (white). */
export function luminance(r: number, g: number, b: number): number {
    const lin = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two luminances, 1 to 21. */
export const contrastRatio = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The contrast between two colours. */
export const contrastOf = (a: Rgb, b: Rgb): number => contrastRatio(luminance(a.r, a.g, a.b), luminance(b.r, b.g, b.b));

/**
 * `colour` made darker, a little at a time and keeping its hue, until it has at least `min` contrast against
 * `against`; a colour that already has it is returned as it is. Stops at a lightness of 5 percent.
 */
export function darkenUntil(colour: Rgb, against: Rgb, min: number): Rgb {
    if (contrastOf(colour, against) >= min) return colour;
    const { h, s, l } = rgbToHsl(colour.r, colour.g, colour.b);
    let level = l;
    let out = colour;
    while (level > 0.05 && contrastOf(out, against) < min) {
        level -= 0.01;
        out = hslToRgb(h, s, Math.max(0.05, level));
    }
    return out;
}

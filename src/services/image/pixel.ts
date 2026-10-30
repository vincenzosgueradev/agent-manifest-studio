/**
 * Which pixel of a picture a pointer is over, and which single colour a pixel can give (the accent colour taken from
 * the picture, feature 013). No DOM: the caller passes the rectangle of the canvas on screen.
 */

import { toHex } from './colour';
import type { Picture, Rgb } from './types';

/** The pixel of a picture under a pointer: the rectangle is the canvas on screen. */
export function toPixel(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, width: number, height: number): { x: number; y: number } | null {
    if (rect.width <= 0 || rect.height <= 0) return null;
    const fx = (clientX - rect.left) / rect.width, fy = (clientY - rect.top) / rect.height;
    if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) return null;
    return { x: Math.min(width - 1, Math.floor(fx * width)), y: Math.min(height - 1, Math.floor(fy * height)) };
}

export type PixelColour = { ok: true; colour: Rgb; hex: string } | { ok: false; message: string };

/**
 * The colour of one pixel as `#rrggbb`. The accent colour is a single opaque colour, so only a pixel that is fully
 * opaque has one: a see-through or partly see-through pixel is refused with the reason, never rounded to a colour
 * that nobody sees.
 */
export function colourAt(p: Picture, x: number, y: number): PixelColour {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= p.width || y >= p.height) return { ok: false, message: 'That point is outside the picture.' };
    const i = (y * p.width + x) * 4;
    const a = p.data[i + 3]!;
    if (a === 0) return { ok: false, message: 'That pixel is see-through, so it has no colour. Choose a pixel that is filled.' };
    if (a < 255) return { ok: false, message: 'That pixel is partly see-through, so its colour depends on what is behind it. Choose a pixel that is fully filled.' };
    const colour = { r: p.data[i]!, g: p.data[i + 1]!, b: p.data[i + 2]! };
    return { ok: true, colour, hex: toHex(colour) };
}

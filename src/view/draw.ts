/** Drawing helpers shared by the views that paint small pictures (the editor, the before and after band, the gallery). */

import { parseCssColor } from './preview';
import { flattenOnAccent } from '../services/preview';

export interface PngLike { header: { width: number; height: number }; rgba: Uint8Array }

function cssRgb(name: string, fallback: string): { r: number; g: number; b: number } {
    const raw = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue(name) : '';
    return parseCssColor(raw, fallback);
}

export function paintTile(canvas: HTMLCanvasElement, rgba: Uint8Array, width: number, height: number): void {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(width, height);
    img.data.set(rgba);
    ctx.putImageData(img, 0, 0);
}

/** The shape of an icon in one colour: every visible pixel takes the colour, the alpha stays. */
function tinted(rgba: Uint8Array, c: { r: number; g: number; b: number }): Uint8Array {
    const out = rgba.slice();
    for (let i = 0; i < out.length; i += 4) { out[i] = c.r; out[i + 1] = c.g; out[i + 2] = c.b; }
    return out;
}

/** The outline icon as an app bar of Teams draws it: its shape in the colour of the bar, on the colour of the bar. */
export function paintOnBar(canvas: HTMLCanvasElement, rgba: Uint8Array, width: number, height: number, theme: 'light' | 'dark'): void {
    const fg = cssRgb(`--bar-${theme}-fg`, theme === 'light' ? '#424242' : '#ffffff');
    const bg = cssRgb(`--bar-${theme}-bg`, theme === 'light' ? '#f0f0f0' : '#2b2b2b');
    paintTile(canvas, flattenOnAccent(tinted(rgba, fg), bg), width, height);
}

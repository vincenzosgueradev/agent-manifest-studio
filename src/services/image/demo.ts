/**
 * Fixed, built-in sample pictures used only by the effect guides (specs/012-effect-info-guides): an asymmetric
 * "L" mark, generated in code so every guide's before/after pair is the same for every user and never the icon
 * currently open in the editor (FR-003). Pure pixel loops, same style as `ops.ts`: no canvas, no DOM.
 */

import { blank, type Picture, type Rgb } from './types';

/** A glyph pixel's colour, given its position inside the glyph's own box (not the whole canvas). */
type GlyphColour = Rgb | ((lx: number, ly: number, bar: number, innerW: number, innerH: number) => Rgb);

export const DEMO_BLUE: Rgb = { r: 37, g: 99, b: 235 };
export const DEMO_WHITE: Rgb = { r: 255, g: 255, b: 255 };
export const DEMO_GOLD: Rgb = { r: 217, g: 164, b: 6 };

export interface DemoOptions {
    width: number;
    height: number;
    /** `null` for a fully transparent background. */
    background: Rgb | null;
    glyph: GlyphColour;
    /** Empty margin between the canvas edge and the glyph's own box; default ~12% of the shorter side. */
    padding?: number;
}

/** An "L" mark (a vertical stem and a horizontal foot): asymmetric enough that Rotate and Flip visibly change it. */
export function demoPicture(o: DemoOptions): Picture {
    const { width, height, background, glyph } = o;
    const padding = o.padding ?? Math.round(Math.min(width, height) * 0.12);
    const pic = background ? blank(width, height, [background.r, background.g, background.b, 255]) : blank(width, height);
    const innerW = width - 2 * padding, innerH = height - 2 * padding;
    if (innerW <= 0 || innerH <= 0) return pic;
    const bar = Math.max(2, Math.round(Math.min(innerW, innerH) * 0.28));
    const colourAt = typeof glyph === 'function' ? glyph : (): Rgb => glyph;
    for (let ly = 0; ly < innerH; ly++) {
        for (let lx = 0; lx < innerW; lx++) {
            if (!(lx < bar || ly >= innerH - bar)) continue;
            const c = colourAt(lx, ly, bar, innerW, innerH);
            const x = padding + lx, y = padding + ly;
            const i = (y * width + x) * 4;
            pic.data[i] = c.r; pic.data[i + 1] = c.g; pic.data[i + 2] = c.b; pic.data[i + 3] = 255;
        }
    }
    return pic;
}

/** A flat-colour square tile with a white mark: the "ordinary export" look (Remove background, Crop, Rotate, Flip). */
export const demoOpaque = (): Picture => demoPicture({ width: 48, height: 48, background: DEMO_BLUE, glyph: DEMO_WHITE });

/** The same mark already on a see-through background (Fill background's starting point). */
export const demoTransparent = (): Picture => demoPicture({ width: 48, height: 48, background: null, glyph: DEMO_BLUE });

/** A small mark with a wide empty margin around it (Trim). */
export const demoPadded = (): Picture => demoPicture({ width: 64, height: 64, background: null, glyph: DEMO_BLUE, padding: 18 });

/** A non-square, see-through canvas (Make square). */
export const demoWide = (): Picture => demoPicture({ width: 64, height: 40, background: null, glyph: DEMO_BLUE });

/** The same shape, but on a flat background and already non-square (the Teams-ready preset's starting point). */
export const demoWideOpaque = (): Picture => demoPicture({ width: 64, height: 40, background: DEMO_BLUE, glyph: DEMO_WHITE });

/** A mark that fills almost the whole canvas, edge to edge (Fit). */
export const demoNearFill = (): Picture => demoPicture({ width: 48, height: 48, background: null, glyph: DEMO_BLUE, padding: 1 });

/** A mark in two colours on a see-through background (Solid colour, Tone, Outline maker). */
export const demoTwoTone = (): Picture => demoPicture({
    width: 48, height: 48, background: null,
    glyph: (lx, _ly, bar) => (lx < bar ? DEMO_BLUE : DEMO_GOLD),
});

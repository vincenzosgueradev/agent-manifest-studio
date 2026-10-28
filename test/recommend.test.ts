/**
 * Feature 004: the advice on the design of the icons. The contrast is computed here from the WCAG definition, with
 * no code of the tool, and each design is checked against the guidance that it claims to follow.
 */
import { describe, expect, it } from 'vitest';
import { recommend } from '../src/services/image/recommend';
import { contrastOf, darkenUntil, toHex, fromHex } from '../src/services/image/colour';
import type { Picture } from '../src/services/image/types';
import * as O from './helpers/image-oracle';

const pic = (p: O.Pic): Picture => O.fromPic(p);

// WCAG 2.x, written out
const lin = (v: number): number => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c: [number, number, number]): number => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const wcag = (a: [number, number, number], b: [number, number, number]): number => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

const TEAL: [number, number, number, number] = [7, 104, 125, 255];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const RED: [number, number, number, number] = [200, 30, 30, 255];

/** A white square glyph on a flat teal background, 200 x 160, so that it needs trimming and fitting. */
const whiteOnTeal = (): Picture => pic(O.make(200, 160, (x, y) => (x >= 40 && x < 160 && y >= 30 && y < 130 ? WHITE : TEAL)));
/** A two-colour logo (red and white) on transparency. */
const twoColours = (): Picture => pic(O.make(120, 120, (x, y) => (x >= 20 && x < 100 && y >= 20 && y < 100 ? (x < 60 ? RED : WHITE) : [0, 0, 0, 0])));

const visible = (p: Picture): Array<[number, number, number, number]> => {
    const out: Array<[number, number, number, number]> = [];
    for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3]! > 0) out.push([p.data[i]!, p.data[i + 1]!, p.data[i + 2]!, p.data[i + 3]!]);
    return out;
};

const box = (p: Picture): { w: number; h: number } => {
    let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (p.data[(y * p.width + x) * 4 + 3]! > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

describe('darkenUntil', () => {
    it('leaves a colour that already has the contrast', () => {
        const c = { r: 20, g: 40, b: 120 };
        expect(darkenUntil(c, { r: 255, g: 255, b: 255 }, 4.5)).toBe(c);
    });

    it('darkens a light colour, keeping its hue, until the contrast is reached', () => {
        for (const hex of ['#ffff00', '#ffa575', '#7fe0c0', '#ff69b4', '#9ec5fe']) {
            const out = darkenUntil(fromHex(hex)!, { r: 255, g: 255, b: 255 }, 4.5);
            expect(wcag(rgb(toHex(out)), [255, 255, 255]), hex).toBeGreaterThanOrEqual(4.5);
            expect(contrastOf(out, { r: 255, g: 255, b: 255 })).toBeCloseTo(wcag(rgb(toHex(out)), [255, 255, 255]), 6);
        }
    });

    it('never goes darker than it has to: one step lighter would not have been enough', () => {
        const start = fromHex('#ffa575')!;
        const out = darkenUntil(start, { r: 255, g: 255, b: 255 }, 4.5);
        const lighter = darkenUntil(start, { r: 255, g: 255, b: 255 }, 4.4);
        expect(wcag(rgb(toHex(lighter)), [255, 255, 255])).toBeGreaterThanOrEqual(4.4);
        expect(lum(rgb(toHex(out)))).toBeLessThanOrEqual(lum(rgb(toHex(lighter))));
    });

    it('stops at black-ish for a contrast that cannot be reached', () => {
        const out = darkenUntil({ r: 250, g: 250, b: 250 }, { r: 255, g: 255, b: 255 }, 30);
        expect(out.r).toBeLessThan(40);
    });
});

describe('the advice for a white logo on a flat teal background', () => {
    const set = recommend(whiteOnTeal(), '#07687d');
    const byId = (id: string) => set.suggestions.find(s => s.id === id)!;

    it('offers the two designs for a one-colour logo, with no note', () => {
        expect(set.note).toBeNull();
        expect(set.suggestions.map(s => s.id)).toEqual(['brand-tile', 'coloured-logo']);
    });

    it('every design is complete: a 192 colour icon, a 32 outline icon, a valid accent colour', () => {
        for (const s of set.suggestions) {
            expect([s.icon.width, s.icon.height], s.id).toEqual([192, 192]);
            expect([s.outline.width, s.outline.height], s.id).toEqual([32, 32]);
            expect(s.accent, s.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(s.title.length, s.id).toBeGreaterThan(8);
            expect(s.why.length, s.id).toBeGreaterThanOrEqual(3);
        }
    });

    it('the background is gone and the logo is inside the central 120 x 120 pixels', () => {
        for (const s of set.suggestions) {
            expect(s.icon.data[3], s.id).toBe(0);                 // the corner is see-through
            const b = box(s.icon);
            expect(b.w, s.id).toBeLessThanOrEqual(120);
            expect(b.h, s.id).toBeLessThanOrEqual(120);
            expect(Math.max(b.w, b.h), s.id).toBeGreaterThanOrEqual(118);   // as large as the safe area allows
        }
    });

    it('the logo of the white design is white whatever colour the original is', () => {
        const s = recommend(twoColours(), '#07687d').suggestions.find(x => x.id === 'brand-tile')!;
        const px = visible(s.icon);
        expect(px.length).toBeGreaterThan(1000);
        for (const p of px) expect([p[0], p[1], p[2]]).toEqual([255, 255, 255]);
    });

    it('white logo on the brand colour: the logo is white and the contrast with the accent is at least 4.5 : 1', () => {
        const s = byId('brand-tile');
        for (const px of visible(s.icon)) expect([px[0], px[1], px[2]]).toEqual([255, 255, 255]);
        expect(wcag([255, 255, 255], rgb(s.accent))).toBeGreaterThanOrEqual(4.5);
        expect(s.contrast).toBeCloseTo(wcag([255, 255, 255], rgb(s.accent)), 6);
    });

    it('coloured logo on white: the accent is white and the logo colour has at least 4.5 : 1 against it', () => {
        const s = byId('coloured-logo');
        expect(s.accent).toBe('#FFFFFF');
        const colours = new Set(visible(s.icon).map(p => `${p[0]},${p[1]},${p[2]}`));
        expect(colours.size).toBe(1);
        const [r, g, b] = [...colours][0]!.split(',').map(Number) as [number, number, number];
        expect(wcag([r!, g!, b!], [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    });

    it('the outline icon is a white shape on see-through, the shape of the logo', () => {
        for (const s of set.suggestions) {
            const px = visible(s.outline);
            expect(px.length, s.id).toBeGreaterThan(100);
            for (const p of px) expect([p[0], p[1], p[2]], s.id).toEqual([255, 255, 255]);
            expect(s.outline.data[3], s.id).toBe(0);
        }
    });

    it('every sentence of the reasons is about this design: it names the colour and the numbers', () => {
        const tile = byId('brand-tile');
        expect(tile.why.join(' ')).toContain(tile.accent);
        expect(tile.why.join(' ')).toContain(`${tile.contrast.toFixed(1)} : 1`);
        expect(tile.why.join(' ')).toContain('120 x 120');
        expect(tile.why.join(' ')).toContain('white shape on see-through');
    });
});

describe('the brand colour', () => {
    it('comes from the logo when it has a colour, dark enough for white to stand on it', () => {
        const yellow = pic(O.make(120, 120, (x, y) => (x >= 20 && x < 100 && y >= 20 && y < 100 ? [255, 230, 0, 255] : [0, 0, 0, 0])));
        const s = recommend(yellow, '#ffffff').suggestions.find(x => x.id === 'brand-tile')!;
        const [h] = [rgb(s.accent)];
        expect(wcag([255, 255, 255], h)).toBeGreaterThanOrEqual(4.5);
        expect(h[0]).toBeGreaterThan(h[2]);                 // still a yellow-ish hue, not grey or blue
    });

    it('comes from the accent colour of the package when the logo is white or grey', () => {
        const s = recommend(whiteOnTeal(), '#C81E1E').suggestions.find(x => x.id === 'brand-tile')!;
        expect(rgb(s.accent)[0]).toBeGreaterThan(rgb(s.accent)[2]);   // red, taken from the package
    });

    it('falls back to a blue when neither has a colour', () => {
        const grey = pic(O.make(120, 120, (x, y) => (x >= 20 && x < 100 && y >= 20 && y < 100 ? [255, 255, 255, 255] : [0, 0, 0, 0])));
        const s = recommend(grey, '#FFFFFF').suggestions.find(x => x.id === 'brand-tile')!;
        const c = rgb(s.accent);
        expect(c[2]).toBeGreaterThan(c[0]);                 // blue
        expect(wcag([255, 255, 255], c)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('a logo with several colours', () => {
    it('adds the design that keeps the colours, with an accent colour that stands out from them', () => {
        const set = recommend(twoColours(), '#07687d');
        expect(set.suggestions.map(s => s.id)).toEqual(['brand-tile', 'coloured-logo', 'keep-colours']);
        const keep = set.suggestions[2]!;
        expect(['#ffffff', '#1f2937']).toContain(keep.accent.toLowerCase());
        expect(keep.contrast).toBeGreaterThanOrEqual(3);
        const colours = new Set(visible(keep.icon).map(p => `${p[0]},${p[1]},${p[2]}`));
        expect(colours.size).toBeGreaterThanOrEqual(2);     // the colours are kept
        expect(box(keep.icon).w).toBeLessThanOrEqual(120);
    });

    it('always finds an accent colour with at least 3 : 1, because white or the dark ink separates from any average colour', () => {
        for (const v of [0, 40, 90, 118, 128, 140, 180, 230, 255]) {
            const logo = pic(O.make(120, 120, (x, y) => (x >= 20 && x < 100 && y >= 20 && y < 100 ? (x < 60 ? [v, v, v, 255] : [Math.min(255, v + 40), 0, 0, 255]) : [0, 0, 0, 0])));
            const keep = recommend(logo, null).suggestions.find(s => s.id === 'keep-colours');
            if (keep) expect(keep.contrast, `grey ${v}`).toBeGreaterThanOrEqual(3);
        }
    });
});

describe('what it does with a picture it cannot read', () => {
    it('gives a note and no design for an opaque picture with no flat background', () => {
        const gradient = pic(O.make(100, 100, (x, y) => [x * 2, y * 2, 100, 255]));
        const set = recommend(gradient, '#07687d');
        expect(set.suggestions).toEqual([]);
        expect(set.note).toContain('not one flat colour');
    });

    it('works on a see-through picture, and on one with a flat background alike', () => {
        const a = recommend(pic(O.make(120, 120, (x, y) => (x >= 20 && x < 100 && y >= 20 && y < 100 ? WHITE : [0, 0, 0, 0]))), '#07687d');
        const b = recommend(pic(O.make(120, 120, (x, y) => (x >= 20 && x < 100 && y >= 20 && y < 100 ? WHITE : TEAL))), '#07687d');
        expect(a.suggestions.map(s => s.id)).toEqual(b.suggestions.map(s => s.id));
        expect(a.suggestions[0]!.accent).toBe(b.suggestions[0]!.accent);
    });

    it('does not change the picture it is given', () => {
        const p = whiteOnTeal();
        const before = p.data.slice();
        recommend(p, '#07687d');
        expect(Array.from(p.data)).toEqual(Array.from(before));
    });
});

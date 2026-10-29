/**
 * Feature 004: every operation against the reference implementations of test/helpers/image-oracle.ts,
 * which are written from research.md section 1 and share no code with src/.
 */
import { describe, expect, it } from 'vitest';
import { crop, cropProblem, fillOn, fit, flip, isEmptyPicture, outlineMaker, removeBackground, rotate, solid, square, tone, trim, trimBox } from '../src/services/image/ops';
import { resizePicture as resize } from '../src/services/image/resample';
import { cornerColour, distancePercent, fromHex, toHex, luma } from '../src/services/image/colour';
import type { Picture, ToneOp } from '../src/services/image/types';
import * as O from './helpers/image-oracle';
import { cases, rng } from './helpers/combinatorics';

const pic = (p: O.Pic): Picture => O.fromPic(p);
const same = (a: Picture, b: O.Pic): boolean => a.width === b.w && a.height === b.h && a.data.every((v, i) => v === b.px[(i / 4) | 0]![i % 4]);

const RED: [number, number, number, number] = [200, 30, 30, 255];

// ── pictures ──────────────────────────────────────────────────────────────────

/** A red glyph (a ring: it encloses a white hole) on a white background. */
const ring = (w = 24, h = 20): O.Pic => O.make(w, h, (x, y) => {
    const cx = w / 2 - 0.5, cy = h / 2 - 0.5;
    const r = Math.hypot(x - cx, y - cy);
    return r <= 7 && r >= 4 ? RED : [255, 255, 255, 255];
});

const gradient = (w = 20, h = 20): O.Pic => O.make(w, h, (x, y) => [Math.round(255 * x / (w - 1)), Math.round(255 * y / (h - 1)), 128, 255]);

const noisy = (seed: number, w = 16, h = 14): O.Pic => {
    const r = rng(seed);
    return O.make(w, h, () => [Math.floor(r() * 256), Math.floor(r() * 256), Math.floor(r() * 256), r() < 0.2 ? Math.floor(r() * 256) : 255]);
};

const transparentLogo = (): O.Pic => O.make(30, 24, (x, y) => (x >= 6 && x < 20 && y >= 4 && y < 15 ? RED : [0, 0, 0, 0]));

const PICTURES: Array<[string, O.Pic]> = [['ring on white', ring()], ['gradient', gradient()], ['noise 1', noisy(1)], ['noise 2', noisy(2)], ['transparent logo', transparentLogo()]];

// ── background ────────────────────────────────────────────────────────────────

describe('remove background against the reference', () => {
    const all = cases<[[string, O.Pic], 'edges' | 'everywhere', number, number, number]>([PICTURES, ['edges', 'everywhere'], [0, 5, 12, 40], [0, 10, 30], [-2, 0, 2]]);
    for (const [[name, p], mode, tol, soft, matte] of all) {
        it(`${name} / ${mode} / tol ${tol} / soft ${soft} / matte ${matte}`, () => {
            const colour: O.Rgb3 = [p.px[0]![0], p.px[0]![1], p.px[0]![2]];
            const got = removeBackground(pic(p), { kind: 'removeBg', mode, colour: { r: colour[0], g: colour[1], b: colour[2] }, tolerance: tol, softness: soft, matte });
            expect(same(got, O.removeBg(p, mode, colour, tol, soft, matte))).toBe(true);
        });
    }

    it('from the edges leaves a white hole inside the logo, everywhere removes it too', () => {
        const p = ring();
        const white = { r: 255, g: 255, b: 255 };
        const edges = removeBackground(pic(p), { kind: 'removeBg', mode: 'edges', colour: white, tolerance: 5, softness: 0, matte: 0 });
        const everywhere = removeBackground(pic(p), { kind: 'removeBg', mode: 'everywhere', colour: white, tolerance: 5, softness: 0, matte: 0 });
        const centre = (12 + 10 * 24) * 4 + 3;   // inside the hole of the ring
        expect(edges.data[3]).toBe(0);           // the corner is background
        expect(edges.data[centre]).toBe(255);    // the enclosed white stays
        expect(everywhere.data[centre]).toBe(0);
    });

    it('takes the corner colour when no colour is given', () => {
        const p = ring();
        const a = removeBackground(pic(p), { kind: 'removeBg', mode: 'edges', colour: null, tolerance: 5, softness: 0, matte: 0 });
        const b = removeBackground(pic(p), { kind: 'removeBg', mode: 'edges', colour: { r: 255, g: 255, b: 255 }, tolerance: 5, softness: 0, matte: 0 });
        expect(Array.from(a.data)).toEqual(Array.from(b.data));
    });

    it('tolerance 0 removes only the exact colour, and the limit is inclusive', () => {
        const p = O.make(3, 1, x => [255 - x, 255, 255, 255]);   // distances 0, 1/441.67*100, 2/441.67*100
        const colour = { r: 255, g: 255, b: 255 };
        const got = removeBackground(pic(p), { kind: 'removeBg', mode: 'everywhere', colour, tolerance: 0, softness: 0, matte: 0 });
        expect([got.data[3], got.data[7], got.data[11]]).toEqual([0, 255, 255]);
        const exact = 100 / Math.sqrt(3 * 255 * 255);   // distance of one step
        const inclusive = removeBackground(pic(p), { kind: 'removeBg', mode: 'everywhere', colour, tolerance: exact, softness: 0, matte: 0 });
        expect([inclusive.data[3], inclusive.data[7], inclusive.data[11]]).toEqual([0, 0, 255]);
    });

    it('does not change its input', () => {
        const input = pic(ring());
        const before = input.data.slice();
        removeBackground(input, { kind: 'removeBg', mode: 'edges', colour: null, tolerance: 20, softness: 10, matte: 2 });
        expect(Array.from(input.data)).toEqual(Array.from(before));
    });

    it('softness fades instead of cutting: a pixel in the band keeps part of its alpha', () => {
        const p = O.make(2, 1, x => (x === 0 ? [255, 255, 255, 255] : [255, 255, 215, 255]));   // distance of the second: 40/441.67*100 = 9.06
        const got = removeBackground(pic(p), { kind: 'removeBg', mode: 'everywhere', colour: { r: 255, g: 255, b: 255 }, tolerance: 4, softness: 10, matte: 0 });
        expect(got.data[3]).toBe(0);
        const expected = Math.floor(255 * ((100 * 40 / Math.sqrt(3 * 255 * 255) - 4) / 10) + 0.5);
        expect(got.data[7]).toBe(expected);
        expect(got.data[7]).toBeGreaterThan(0);
        expect(got.data[7]).toBeLessThan(255);
    });

    it('matte grows and shrinks the cut by whole pixels', () => {
        const p = O.make(9, 1, x => (x < 4 ? [255, 255, 255, 255] : [10, 10, 10, 255]));
        const run = (matte: number) => removeBackground(pic(p), { kind: 'removeBg', mode: 'everywhere', colour: { r: 255, g: 255, b: 255 }, tolerance: 3, softness: 0, matte });
        const alphas = (g: Picture) => Array.from({ length: 9 }, (_, x) => g.data[x * 4 + 3]);
        expect(alphas(run(0))).toEqual([0, 0, 0, 0, 255, 255, 255, 255, 255]);
        expect(alphas(run(2))).toEqual([0, 0, 0, 0, 0, 0, 255, 255, 255]);
        expect(alphas(run(-1))).toEqual([0, 0, 0, 255, 255, 255, 255, 255, 255]);
    });
});

describe('fill', () => {
    it('lays the picture on a colour with the formula of the preview, fully opaque', () => {
        const p = noisy(5);
        const got = fillOn(pic(p), { r: 7, g: 104, b: 125 });
        expect(same(got, O.fill(p, [7, 104, 125]))).toBe(true);
        for (let i = 3; i < got.data.length; i += 4) expect(got.data[i]).toBe(255);
    });
});

// ── framing ───────────────────────────────────────────────────────────────────

describe('crop', () => {
    const p = noisy(9, 12, 10);
    it('cuts the exact rectangle', () => {
        for (const [x, y, w, h] of [[0, 0, 12, 10], [3, 2, 5, 4], [11, 9, 1, 1], [0, 5, 12, 5]] as const) {
            expect(same(crop(pic(p), x, y, w, h), O.crop(p, x, y, w, h))).toBe(true);
        }
    });
    it('says why a rectangle is refused', () => {
        const q = pic(p);
        const bad: Array<[number, number, number, number, RegExp]> = [
            [0, 0, 0, 5, /at least 1/], [0, 0, 5, 0, /at least 1/], [-1, 0, 3, 3, /before/], [0, -1, 3, 3, /before/],
            [10, 0, 3, 3, /outside/], [0, 8, 3, 3, /outside/], [1.5, 0, 3, 3, /whole/], [0, 0, NaN, 3, /whole/],
        ];
        for (const [x, y, w, h, why] of bad) {
            expect(cropProblem(q, x, y, w, h), `${x},${y},${w},${h}`).toMatch(why);
            expect(() => crop(q, x, y, w, h)).toThrow(RangeError);
        }
        expect(cropProblem(q, 0, 0, 12, 10)).toBeNull();
    });
});

describe('trim', () => {
    it('cuts to the box of the visible pixels (transparent picture)', () => {
        const p = transparentLogo();
        const box = O.bbox(p, 2)!;
        expect(trimBox(pic(p), 2)).toEqual(box);
        expect(same(trim(pic(p), 2), O.crop(p, box.x, box.y, box.w, box.h))).toBe(true);
    });
    it('cuts to the box that differs from the top-left pixel (opaque picture)', () => {
        const p = ring();
        const box = O.bbox(p, 2)!;
        expect(trimBox(pic(p), 2)).toEqual(box);
        expect(trim(pic(p), 2).width).toBe(box.w);
    });
    it('leaves an empty or flat picture as it is', () => {
        const empty = pic(O.make(5, 4, () => [0, 0, 0, 0]));
        expect(trimBox(empty, 2)).toBeNull();
        expect(trim(empty, 2)).toEqual(empty);
        const flat = pic(O.make(5, 4, () => [9, 9, 9, 255]));
        expect(trim(flat, 2).width).toBe(5);
    });
    it('a tolerance hides faint noise', () => {
        const p = O.make(10, 10, (x, y) => (x === 5 && y === 5 ? [255, 255, 250, 255] : x === 2 && y === 3 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
        expect(trimBox(pic(p), 0)).toEqual({ x: 2, y: 3, w: 4, h: 3 });
        expect(trimBox(pic(p), 5)).toEqual({ x: 2, y: 3, w: 1, h: 1 });
    });
});

describe('square and fit', () => {
    it('square pads the short side with transparency, centred, without stretching', () => {
        const p = noisy(3, 8, 4);
        const got = square(pic(p), null);
        expect([got.width, got.height]).toEqual([8, 8]);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
            const gi = ((y + 2) * 8 + x) * 4;
            expect(Array.from(got.data.slice(gi, gi + 4))).toEqual(O.get(p, x, y));
        }
        for (let x = 0; x < 8; x++) expect(got.data[x * 4 + 3]).toBe(0);
    });
    it('square pads with a colour when given one', () => {
        const got = square(pic(O.make(4, 2, () => RED)), { r: 1, g: 2, b: 3 });
        expect(Array.from(got.data.slice(0, 4))).toEqual([1, 2, 3, 255]);
        expect(Array.from(got.data.slice((1 * 4 + 0) * 4, (1 * 4 + 0) * 4 + 4))).toEqual([200, 30, 30, 255]);
    });
    it('fit puts a flat picture at the right size and place', () => {
        const got = fit(pic(O.make(100, 50, () => RED)), 192, 62.5);   // scale 1.2 -> 120 x 60 at (36, 66)
        expect([got.width, got.height]).toEqual([192, 192]);
        const at = (x: number, y: number) => Array.from(got.data.slice((y * 192 + x) * 4, (y * 192 + x) * 4 + 4));
        expect(at(36, 66)).toEqual(RED);
        expect(at(155, 125)).toEqual(RED);
        expect(at(35, 66)[3]).toBe(0);
        expect(at(156, 66)[3]).toBe(0);
        expect(at(36, 65)[3]).toBe(0);
        expect(at(36, 126)[3]).toBe(0);
    });
    it('fit at 100 percent fills the longer side', () => {
        const got = fit(pic(O.make(10, 40, () => RED)), 32, 100);
        const columns = new Set<number>();
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (got.data[(y * 32 + x) * 4 + 3]! > 0) columns.add(x);
        expect(Math.min(...columns)).toBe(12);
        expect(Math.max(...columns)).toBe(19);
        expect(got.data[(0 * 32 + 12) * 4 + 3]).toBe(255);
        expect(got.data[(31 * 32 + 12) * 4 + 3]).toBe(255);
    });
});

describe('resize', () => {
    it('a flat picture stays flat at any size', () => {
        for (const [w, h] of [[1, 1], [3, 7], [100, 100], [7, 3]] as const) {
            const got = resize(pic(O.make(10, 10, () => [10, 20, 30, 255])), w, h);
            for (let i = 0; i < got.data.length; i += 4) expect(Array.from(got.data.slice(i, i + 4))).toEqual([10, 20, 30, 255]);
        }
    });
    it('an integer reduction is the mean of each block, within 1', () => {
        const p = noisy(11, 12, 12);
        const opaque = O.make(12, 12, (x, y) => { const v = O.get(p, x, y); return [v[0], v[1], v[2], 255]; });
        const got = resize(pic(opaque), 4, 3);   // 3 x 4 blocks
        for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) {
            for (let k = 0; k < 3; k++) {
                let sum = 0;
                for (let by = 0; by < 4; by++) for (let bx = 0; bx < 3; bx++) sum += O.get(opaque, x * 3 + bx, y * 4 + by)[k]!;
                expect(Math.abs(got.data[(y * 4 + x) * 4 + k]! - sum / 12)).toBeLessThanOrEqual(1);
            }
        }
    });
    it('transparent pixels do not bleed their colour into the result', () => {
        const checker = O.make(4, 4, (x, y) => ((x + y) % 2 === 0 ? [200, 0, 0, 255] : [100, 200, 255, 0]));
        const got = resize(pic(checker), 2, 2);
        for (let i = 0; i < 4; i++) {
            expect([got.data[i * 4], got.data[i * 4 + 1], got.data[i * 4 + 2]]).toEqual([200, 0, 0]);
            expect(got.data[i * 4 + 3]).toBe(128);   // 127.5 rounds half up
        }
    });
    it('enlarging keeps the corners and stays between the neighbours', () => {
        const p = pic(O.make(2, 2, (x, y) => [x * 200, y * 200, 0, 255]));
        const got = resize(p, 8, 8);
        expect(Array.from(got.data.slice(0, 4))).toEqual([0, 0, 0, 255]);
        expect(Array.from(got.data.slice((7 * 8 + 7) * 4, (7 * 8 + 7) * 4 + 4))).toEqual([200, 200, 0, 255]);
        for (let i = 0; i < got.data.length; i += 4) { expect(got.data[i]).toBeLessThanOrEqual(200); expect(got.data[i + 1]).toBeLessThanOrEqual(200); }
        // the pixel centres are aligned: output column 3 of 8 sits at 0.375 of the way from input pixel 0 to 1
        expect(Math.abs(got.data[3 * 4]! - 75)).toBeLessThanOrEqual(1);
        expect(Math.abs(got.data[4 * 4]! - 125)).toBeLessThanOrEqual(1);
    });
    it('refuses a size that is not whole numbers of at least 1', () => {
        const p = pic(O.make(2, 2, () => RED));
        for (const [w, h] of [[0, 1], [1, 0], [1.5, 2], [-1, 2]] as const) expect(() => resize(p, w, h)).toThrow(RangeError);
    });
    it('the same size is a copy', () => {
        const p = pic(noisy(4));
        const got = resize(p, p.width, p.height);
        expect(Array.from(got.data)).toEqual(Array.from(p.data));
        expect(got.data).not.toBe(p.data);
    });
});

describe('rotate and flip', () => {
    const p = noisy(21, 7, 5);
    it('rotate by 90 clockwise matches the reference, and the others are repeats of it', () => {
        const r1 = O.rotate90(p), r2 = O.rotate90(r1), r3 = O.rotate90(r2);
        expect(same(rotate(pic(p), 1), r1)).toBe(true);
        expect(same(rotate(pic(p), 2), r2)).toBe(true);
        expect(same(rotate(pic(p), 3), r3)).toBe(true);
    });
    it('four rotations and two flips return the original', () => {
        const q = pic(p);
        expect(Array.from(rotate(rotate(rotate(rotate(q, 1), 1), 1), 1).data)).toEqual(Array.from(q.data));
        expect(Array.from(flip(flip(q, 'h'), 'h').data)).toEqual(Array.from(q.data));
        expect(Array.from(flip(flip(q, 'v'), 'v').data)).toEqual(Array.from(q.data));
    });
    it('flip matches the reference', () => {
        expect(same(flip(pic(p), 'h'), O.flipH(p))).toBe(true);
        expect(same(flip(pic(p), 'v'), O.flipV(p))).toBe(true);
    });
    it('a quarter turn swaps the sides', () => {
        const got = rotate(pic(p), 1);
        expect([got.width, got.height]).toEqual([5, 7]);
        expect(rotate(pic(p), 2).width).toBe(7);
    });
});

// ── colour ────────────────────────────────────────────────────────────────────

const PALETTE: Array<[number, number, number, number]> = [
    [0, 0, 0, 255], [255, 255, 255, 255], [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [7, 104, 125, 255], [200, 30, 30, 128],
    [128, 128, 128, 255], [250, 240, 10, 255], [12, 200, 140, 0], [90, 60, 200, 255], [33, 33, 34, 255],
];
const paletteStrip = (): Picture => pic({ w: PALETTE.length, h: 1, px: PALETTE });

describe('solid colour', () => {
    it('gives every visible pixel the colour and keeps alpha, transparent pixels stay as they were', () => {
        const got = solid(paletteStrip(), { r: 1, g: 2, b: 3 });
        PALETTE.forEach((v, i) => {
            const px = Array.from(got.data.slice(i * 4, i * 4 + 4));
            expect(px).toEqual(v[3] > 0 ? [1, 2, 3, v[3]] : v);
        });
    });
});

describe('tone against the reference', () => {
    const values: ToneOp[] = [];
    const base: ToneOp = { kind: 'tone', hue: 0, saturation: 0, brightness: 0, contrast: 0, invert: false, gray: false, threshold: null };
    for (const hue of [0, 90, -180, 33]) values.push({ ...base, hue });
    for (const saturation of [-100, -40, 60, 100]) values.push({ ...base, saturation });
    for (const brightness of [-100, -30, 25, 100]) values.push({ ...base, brightness });
    for (const contrast of [-100, -50, 50, 100]) values.push({ ...base, contrast });
    values.push({ ...base, invert: true }, { ...base, gray: true }, { ...base, threshold: 128 }, { ...base, threshold: 0 }, { ...base, threshold: 255 });
    values.push({ ...base, hue: 40, saturation: 20, brightness: -10, contrast: 15, invert: true, gray: false, threshold: null });
    values.push({ ...base, hue: -70, saturation: -20, brightness: 30, contrast: -25, invert: false, gray: true, threshold: 100 });
    values.forEach((t, n) => {
        it(`case ${n}: ${JSON.stringify({ ...t, kind: undefined })}`, () => {
            const got = tone(paletteStrip(), t);
            PALETTE.forEach((v, i) => {
                const expected = O.tonePx(v, t);
                const have = Array.from(got.data.slice(i * 4, i * 4 + 4));
                // HSL goes through floating point: a channel may differ by one from the reference at a rounding edge
                const slack = t.hue !== 0 || t.saturation !== 0 ? 1 : 0;
                have.slice(0, 3).forEach((c, k) => expect(Math.abs(c - expected[k]!), `pixel ${i} channel ${k}`).toBeLessThanOrEqual(slack));
                expect(have[3]).toBe(v[3]);
            });
        });
    });

    it('the defaults change nothing at all', () => {
        const q = paletteStrip();
        expect(Array.from(tone(q, base).data)).toEqual(Array.from(q.data));
    });
    it('invert twice is the identity', () => {
        const q = paletteStrip();
        const once = tone(q, { ...base, invert: true });
        expect(Array.from(tone(once, { ...base, invert: true }).data)).toEqual(Array.from(q.data));
    });
    it('a threshold gives only black and white', () => {
        const got = tone(paletteStrip(), { ...base, threshold: 100 });
        for (let i = 0; i < got.data.length; i += 4) expect([0, 255]).toContain(got.data[i]);
    });
});

describe('outline maker against the reference', () => {
    for (const mode of ['alpha', 'brightness'] as const) {
        for (const cutoff of [0, 16, 128, 255]) {
            it(`${mode} / cutoff ${cutoff}`, () => {
                const got = outlineMaker(paletteStrip(), { kind: 'outline', mode, cutoff });
                PALETTE.forEach((v, i) => expect(Array.from(got.data.slice(i * 4, i * 4 + 4))).toEqual(O.outlinePx(v, mode, cutoff)));
            });
        }
    }
    it('every visible pixel is pure white, whatever the input', () => {
        const got = outlineMaker(pic(noisy(30, 20, 20)), { kind: 'outline', mode: 'alpha', cutoff: 16 });
        for (let i = 0; i < got.data.length; i += 4) {
            if (got.data[i + 3]! > 0) expect([got.data[i], got.data[i + 1], got.data[i + 2]]).toEqual([255, 255, 255]);
        }
    });
    it('a dark logo on white becomes a white silhouette in the brightness mode', () => {
        const dark = pic(O.make(4, 1, x => (x < 2 ? [10, 10, 10, 255] : [255, 255, 255, 255])));
        const got = outlineMaker(dark, { kind: 'outline', mode: 'brightness', cutoff: 16 });
        expect([got.data[3], got.data[7], got.data[11], got.data[15]]).toEqual([245, 245, 0, 0]);
    });
});

describe('colour helpers', () => {
    it('distance: black to white is 100, equal is 0, and it is symmetric', () => {
        expect(distancePercent({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(100, 10);
        expect(distancePercent({ r: 5, g: 6, b: 7 }, { r: 5, g: 6, b: 7 })).toBe(0);
        const a = { r: 10, g: 200, b: 3 }, b = { r: 90, g: 20, b: 250 };
        expect(distancePercent(a, b)).toBe(distancePercent(b, a));
        expect(distancePercent(a, b)).toBeCloseTo(O.dist([10, 200, 3], [90, 20, 250]), 10);
    });
    it('hex both ways', () => {
        expect(toHex({ r: 7, g: 104, b: 125 })).toBe('#07687d');
        expect(fromHex('#07687D')).toEqual({ r: 7, g: 104, b: 125 });
        expect(fromHex('07687d')).toEqual({ r: 7, g: 104, b: 125 });
        expect(fromHex('#abc')).toEqual({ r: 170, g: 187, b: 204 });
        for (const bad of ['', '#12', '#12345', '#1234567', '#ggg', 'red', '#12 456']) expect(fromHex(bad)).toBeNull();
    });
    it('luma', () => {
        expect(luma(255, 255, 255)).toBe(255);
        expect(luma(0, 0, 0)).toBe(0);
        expect(luma(255, 0, 0)).toBe(O.lumaOf(255, 0, 0));
    });
    it('corner colour is the most common, ties go to the first corner', () => {
        const p = O.make(5, 5, (x, y) => ((x === 4 && y === 4) ? [1, 1, 1, 255] : (x === 0 && y === 4) ? [1, 1, 1, 255] : (x === 4 && y === 0) ? [2, 2, 2, 255] : [9, 9, 9, 255]));
        expect(cornerColour(pic(p))).toEqual({ r: 1, g: 1, b: 1 });   // two corners are 1,1,1; 9,9,9 and 2,2,2 once... but top-left is 9
        const tie = O.make(5, 5, (x, y) => (x === 0 && y === 0 ? [7, 7, 7, 255] : (x === 4 && y === 0 ? [8, 8, 8, 255] : [9, 9, 9, 255])));
        expect(cornerColour(pic(tie))).toEqual({ r: 9, g: 9, b: 9 });
        const four = O.make(2, 2, (x, y) => [x * 10, y * 10, 0, 255]);
        expect(cornerColour(pic(four))).toEqual({ r: 0, g: 0, b: 0 });
    });
    it('isEmptyPicture', () => {
        expect(isEmptyPicture(pic(O.make(3, 3, () => [1, 2, 3, 0])))).toBe(true);
        expect(isEmptyPicture(pic(O.make(3, 3, (x, y) => [1, 2, 3, x === 1 && y === 1 ? 1 : 0])))).toBe(false);
    });
});

describe('no operation changes its input', () => {
    it('every operation leaves its input bytes as they were', () => {
        const input = pic(noisy(77, 10, 8));
        const before = input.data.slice();
        const base: ToneOp = { kind: 'tone', hue: 30, saturation: 10, brightness: 10, contrast: 10, invert: true, gray: true, threshold: 50 };
        trim(input, 2); crop(input, 1, 1, 3, 3); square(input, null); fit(input, 16, 50); resize(input, 5, 5); rotate(input, 1); flip(input, 'h');
        fillOn(input, { r: 1, g: 1, b: 1 }); solid(input, { r: 1, g: 1, b: 1 }); tone(input, base); outlineMaker(input, { kind: 'outline', mode: 'alpha', cutoff: 1 });
        expect(Array.from(input.data)).toEqual(Array.from(before));
    });
});

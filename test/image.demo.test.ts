/**
 * The fixed sample pictures used only by the effect guides (feature 012, services/image/demo.ts). An independent
 * oracle: these checks come from what `demo.ts` documents each builder does, not from re-running its own loop.
 */
import { describe, expect, it } from 'vitest';
import { demoNearFill, demoOpaque, demoPadded, demoTransparent, demoTwoTone, demoWide, demoWideOpaque, DEMO_BLUE, DEMO_GOLD } from '../src/services/image/demo';
import type { Picture } from '../src/services/image/types';

const px = (p: Picture, x: number, y: number): [number, number, number, number] => {
    const i = (y * p.width + x) * 4;
    return [p.data[i]!, p.data[i + 1]!, p.data[i + 2]!, p.data[i + 3]!];
};

/** Every pixel in the picture, as `[x, y, rgba]`. */
function* everyPixel(p: Picture): Generator<[number, number, [number, number, number, number]]> {
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) yield [x, y, px(p, x, y)];
}

describe('demoOpaque', () => {
    it('is 48 x 48, opaque everywhere, with a blue background at the corners', () => {
        const p = demoOpaque();
        expect([p.width, p.height]).toEqual([48, 48]);
        for (const [, , [, , , a]] of everyPixel(p)) expect(a).toBe(255);
        expect(px(p, 0, 0)).toEqual([DEMO_BLUE.r, DEMO_BLUE.g, DEMO_BLUE.b, 255]);
        expect(px(p, 47, 0)).toEqual([DEMO_BLUE.r, DEMO_BLUE.g, DEMO_BLUE.b, 255]);
        expect(px(p, 0, 47)).toEqual([DEMO_BLUE.r, DEMO_BLUE.g, DEMO_BLUE.b, 255]);
    });

    it('draws a white mark somewhere other than the background colour', () => {
        const p = demoOpaque();
        const hasWhite = [...everyPixel(p)].some(([, , [r, g, b]]) => r === 255 && g === 255 && b === 255);
        expect(hasWhite).toBe(true);
    });

    it('pins the default margin (12% of the side) and the glyph bar (28% of what is left)', () => {
        // 48 side -> padding = round(48 * 0.12) = 6; inner = 36 -> bar = round(36 * 0.28) = 10.
        const p = demoOpaque();
        expect(px(p, 5, 5)).toEqual([DEMO_BLUE.r, DEMO_BLUE.g, DEMO_BLUE.b, 255]);   // still in the margin
        expect(px(p, 6, 6)).toEqual([255, 255, 255, 255]);   // first pixel of the glyph's stem
        expect(px(p, 14, 6)).toEqual([255, 255, 255, 255]);   // local x = 8, inside a 10-pixel-wide bar
        expect(px(p, 22, 6)).toEqual([DEMO_BLUE.r, DEMO_BLUE.g, DEMO_BLUE.b, 255]);   // local x = 16, past the bar, not yet the foot
    });
});

describe('demoTransparent', () => {
    it('is 48 x 48, see-through at the corners, with a blue mark somewhere', () => {
        const p = demoTransparent();
        expect([p.width, p.height]).toEqual([48, 48]);
        expect(px(p, 0, 0)[3]).toBe(0);
        const hasBlue = [...everyPixel(p)].some(([, , [r, g, b, a]]) => a === 255 && r === DEMO_BLUE.r && g === DEMO_BLUE.g && b === DEMO_BLUE.b);
        expect(hasBlue).toBe(true);
    });
});

describe('demoPadded', () => {
    it('is 64 x 64 with an 18 pixel see-through margin on every side', () => {
        const p = demoPadded();
        expect([p.width, p.height]).toEqual([64, 64]);
        for (let x = 0; x < 64; x++) { expect(px(p, x, 0)[3]).toBe(0); expect(px(p, x, 17)[3]).toBe(0); }
        for (let y = 0; y < 64; y++) { expect(px(p, 0, y)[3]).toBe(0); expect(px(p, 17, y)[3]).toBe(0); }
        const hasVisible = [...everyPixel(p)].some(([, , [, , , a]]) => a > 0);
        expect(hasVisible).toBe(true);
    });
});

describe('demoWide and demoWideOpaque', () => {
    it('are 64 x 40, not square', () => {
        expect([demoWide().width, demoWide().height]).toEqual([64, 40]);
        expect([demoWideOpaque().width, demoWideOpaque().height]).toEqual([64, 40]);
    });

    it('demoWideOpaque has a flat blue border, demoWide a see-through one', () => {
        expect(px(demoWideOpaque(), 0, 0)).toEqual([DEMO_BLUE.r, DEMO_BLUE.g, DEMO_BLUE.b, 255]);
        expect(px(demoWide(), 0, 0)[3]).toBe(0);
    });
});

describe('demoNearFill', () => {
    it('is 48 x 48 with only a 1 pixel margin', () => {
        const p = demoNearFill();
        expect([p.width, p.height]).toEqual([48, 48]);
        expect(px(p, 0, 0)[3]).toBe(0);
        expect(px(p, 5, 5)[3]).toBe(255);
    });
});

describe('demoTwoTone', () => {
    it('contains both colours of the mark, on a see-through background', () => {
        const p = demoTwoTone();
        expect(px(p, 0, 0)[3]).toBe(0);
        const pixels = [...everyPixel(p)];
        expect(pixels.some(([, , [r, g, b, a]]) => a === 255 && r === DEMO_BLUE.r && g === DEMO_BLUE.g && b === DEMO_BLUE.b)).toBe(true);
        expect(pixels.some(([, , [r, g, b, a]]) => a === 255 && r === DEMO_GOLD.r && g === DEMO_GOLD.g && b === DEMO_GOLD.b)).toBe(true);
    });
});

/**
 * Feature 013: which colour a pixel can give to the accent colour. The expected values are written by hand from
 * the spec (specs/013-accent-from-picture/spec.md): fully opaque gives `#rrggbb`, anything else is refused.
 */
import { describe, expect, it } from 'vitest';
import { colourAt } from '../src/services/image/pixel';

/** 2 x 2: opaque orange, see-through, alpha 254, alpha 1 (all with an RGB that would look valid). */
const pic = {
    width: 2, height: 2,
    data: new Uint8Array([
        255, 136, 0, 255, /**/ 17, 34, 51, 0,
        1, 2, 3, 254, /**/ 9, 9, 9, 1,
    ]),
};

describe('colourAt', () => {
    it('gives the hex of an opaque pixel, lower case, two digits per channel', () => {
        expect(colourAt(pic, 0, 0)).toEqual({ ok: true, colour: { r: 255, g: 136, b: 0 }, hex: '#ff8800' });
        expect(colourAt({ width: 1, height: 1, data: new Uint8Array([0, 5, 10, 255]) }, 0, 0)).toMatchObject({ ok: true, hex: '#00050a' });
    });

    it('refuses a fully see-through pixel, and says so', () => {
        const r = colourAt(pic, 1, 0);
        expect(r.ok).toBe(false);
        expect(!r.ok && r.message).toContain('see-through');
    });

    it('refuses a partly see-through pixel at both ends of the alpha range (254 and 1)', () => {
        for (const [x, y] of [[0, 1], [1, 1]] as const) {
            const r = colourAt(pic, x, y);
            expect(r.ok).toBe(false);
            expect(!r.ok && r.message).toContain('partly see-through');
        }
    });

    it('reads the pixel at (x, y) of a rectangle that is not square, not (y, x)', () => {
        const wide = { width: 3, height: 1, data: new Uint8Array([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255]) };
        expect(colourAt(wide, 2, 0)).toMatchObject({ ok: true, hex: '#030303' });
        expect(colourAt(wide, 0, 0)).toMatchObject({ ok: true, hex: '#010101' });
    });

    it('refuses a point outside the picture, a negative one and one that is not a whole number', () => {
        for (const [x, y] of [[-1, 0], [0, -1], [2, 0], [0, 2], [0.5, 0], [NaN, 0]] as const) {
            const r = colourAt(pic, x, y);
            expect(r.ok, `${x},${y}`).toBe(false);
            expect(!r.ok && r.message).toContain('outside');
        }
    });
});

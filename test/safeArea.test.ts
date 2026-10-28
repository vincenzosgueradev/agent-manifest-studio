/**
 * The safe area (Microsoft Learn: logo within the central 120 x 120 of the 192 x 192 icon).
 * Expected counts are worked out by hand from the geometry.
 */
import { describe, expect, it } from 'vitest';
import { countOutsideSafeArea } from '../src/services/safeArea';

function image(width: number, height: number, bg: [number, number, number, number]): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) data.set(bg, i);
    return data;
}
const put = (data: Uint8Array, width: number, x: number, y: number, px: [number, number, number, number]) => data.set(px, (y * width + x) * 4);

describe('countOutsideSafeArea on 192 x 192 with a 120 x 120 safe area (36 to 155)', () => {
    const W = 192;
    const WHITE: [number, number, number, number] = [255, 255, 255, 255];

    it('an empty transparent icon has nothing outside', () => {
        expect(countOutsideSafeArea(image(W, W, [0, 0, 0, 0]), W, W, 120)).toBe(0);
    });

    it('a glyph in the middle is inside', () => {
        const d = image(W, W, [0, 0, 0, 0]);
        for (let y = 66; y < 126; y++) for (let x = 66; x < 126; x++) put(d, W, x, y, WHITE);
        expect(countOutsideSafeArea(d, W, W, 120)).toBe(0);
    });

    it.each([
        // [x, y, expected]: the square is x and y from 36 up to and including 155
        [35, 100, 1], [36, 100, 0], [155, 100, 0], [156, 100, 1],
        [100, 35, 1], [100, 36, 0], [100, 155, 0], [100, 156, 1],
        [1, 0, 1], [191, 191, 1], [36, 36, 0], [155, 155, 0], [35, 35, 1], [156, 156, 1],
    ])('one logo pixel at %i,%i counts %i', (x, y, expected) => {
        const d = image(W, W, [0, 0, 0, 0]);
        put(d, W, x!, y!, WHITE);
        expect(countOutsideSafeArea(d, W, W, 120)).toBe(expected);
    });

    it('the whole icon as logo: everything outside the 120 x 120 square', () => {
        const d = image(W, W, [0, 0, 0, 0]);
        for (let i = 3; i < d.length; i += 4) d[i] = 255;
        d.set([0, 0, 0, 0], 0);   // the top-left pixel stays transparent: it defines the background
        expect(countOutsideSafeArea(d, W, W, 120)).toBe(W * W - 120 * 120 - 1);
    });

    it('on a transparent background any alpha above 0 is logo, whatever its colour', () => {
        const d = image(W, W, [10, 20, 30, 0]);
        put(d, W, 5, 5, [0, 0, 0, 1]);
        put(d, W, 6, 5, [200, 200, 200, 0]);   // transparent: not logo
        expect(countOutsideSafeArea(d, W, W, 120)).toBe(1);
    });

    it('on a solid background a pixel that differs by more than 8 is logo, 8 or less is noise', () => {
        const bg: [number, number, number, number] = [10, 20, 30, 255];
        const d = image(W, W, bg);
        put(d, W, 1, 1, [18, 20, 30, 255]);   // +8 red: background
        put(d, W, 2, 1, [10, 12, 30, 255]);   // -8 green: background
        put(d, W, 3, 1, [10, 20, 39, 255]);   // +9 blue: logo
        put(d, W, 4, 1, [10, 20, 30, 246]);   // alpha -9: logo
        expect(countOutsideSafeArea(d, W, W, 120)).toBe(2);
    });

    it('a solid background of the same colour everywhere is not logo', () => {
        expect(countOutsideSafeArea(image(W, W, [7, 104, 125, 255]), W, W, 120)).toBe(0);
    });
});

describe('countOutsideSafeArea in general', () => {
    it('works for any size: 10 x 10 with a 4 x 4 square has it from 3 to 6', () => {
        const d = image(10, 10, [0, 0, 0, 0]);
        put(d, 10, 2, 5, [1, 1, 1, 255]);   // outside
        put(d, 10, 3, 5, [1, 1, 1, 255]);   // inside
        put(d, 10, 6, 6, [1, 1, 1, 255]);   // inside
        put(d, 10, 7, 6, [1, 1, 1, 255]);   // outside
        expect(countOutsideSafeArea(d, 10, 10, 4)).toBe(2);
    });

    it('an odd margin rounds down: 11 x 11 with a 4 x 4 square starts at 3', () => {
        const d = image(11, 11, [0, 0, 0, 0]);
        put(d, 11, 2, 5, [1, 1, 1, 255]);
        put(d, 11, 3, 5, [1, 1, 1, 255]);
        expect(countOutsideSafeArea(d, 11, 11, 4)).toBe(1);
    });

    it('refuses nonsense quietly', () => {
        expect(countOutsideSafeArea(new Uint8Array(0), 0, 0, 120)).toBe(0);
        expect(countOutsideSafeArea(new Uint8Array(8), 192, 192, 120)).toBe(0);
    });

    it('does not change its input', () => {
        const d = image(10, 10, [0, 0, 0, 0]);
        put(d, 10, 0, 0, [9, 9, 9, 255]);
        const copy = d.slice();
        countOutsideSafeArea(d, 10, 10, 4);
        expect(Array.from(d)).toEqual(Array.from(copy));
    });
});

describe('countOutsideSafeArea with a translucent background', () => {
    it('a uniform translucent background is the background, not logo', () => {
        const d = image(192, 192, [10, 20, 30, 128]);
        expect(countOutsideSafeArea(d, 192, 192, 120)).toBe(0);
    });

    it('a pixel of another colour or another alpha outside is logo', () => {
        const d = image(192, 192, [10, 20, 30, 128]);
        put(d, 192, 5, 100, [200, 20, 30, 128]);
        put(d, 192, 6, 100, [10, 20, 30, 255]);
        put(d, 192, 7, 100, [10, 20, 30, 0]);
        expect(countOutsideSafeArea(d, 192, 192, 120)).toBe(3);
    });
});

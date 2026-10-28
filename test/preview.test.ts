/**
 * FR-007, FR-015: the colour icon as Teams shows it, laid on the accent colour.
 */
import { describe, expect, it } from 'vitest';
import { flattenOnAccent, parseAccent } from '../src/services/preview';
import { FLATTEN_HAND_TABLE, flattenOracle } from './helpers/oracle';
import { cases } from './helpers/combinatorics';

describe('the oracle itself matches values computed by hand', () => {
    it.each(FLATTEN_HAND_TABLE)('src $src alpha $a over $bg is $out', ({ src, a, bg, out }) => {
        expect(flattenOracle(src, a, bg)).toBe(out);
    });
});

describe('flattenOnAccent: alpha x channel x accent', () => {
    const alphas = [0, 1, 2, 127, 128, 253, 254, 255];
    const channels = [0, 1, 127, 128, 254, 255];
    const accents = ['#000000', '#FFFFFF', '#07687D', '#FF8040', '#010203'];
    for (const [a, c, accent] of cases<[number, number, string]>([alphas, channels, accents])) {
        it(`alpha ${a}, channel ${c}, accent ${accent}`, () => {
            const bg = parseAccent(accent)!;
            const out = flattenOnAccent(new Uint8Array([c, 255 - c, (c * 3) & 255, a]), bg);
            expect(out[0]).toBe(flattenOracle(c, a, bg.r));
            expect(out[1]).toBe(flattenOracle(255 - c, a, bg.g));
            expect(out[2]).toBe(flattenOracle((c * 3) & 255, a, bg.b));
            expect(out[3]).toBe(255);
        });
    }

    it('transparent areas take the accent colour and opaque areas are kept', () => {
        const bg = { r: 7, g: 104, b: 125 };
        const out = flattenOnAccent(new Uint8Array([200, 100, 50, 0, 200, 100, 50, 255]), bg);
        expect(Array.from(out)).toEqual([7, 104, 125, 255, 200, 100, 50, 255]);
    });

    it('does not change its input and gives the same bytes every time', () => {
        const src = new Uint8Array([1, 2, 3, 77, 4, 5, 6, 200]);
        const copy = src.slice();
        const a = flattenOnAccent(src, { r: 9, g: 9, b: 9 });
        const b = flattenOnAccent(src, { r: 9, g: 9, b: 9 });
        expect(Array.from(src)).toEqual(Array.from(copy));
        expect(Array.from(a)).toEqual(Array.from(b));
    });

    it('an empty image gives an empty image', () => {
        expect(flattenOnAccent(new Uint8Array(0), { r: 1, g: 2, b: 3 }).length).toBe(0);
    });
});

describe('parseAccent: #RRGGBB only (FR-015)', () => {
    it.each([
        ['#000000', { r: 0, g: 0, b: 0 }],
        ['#ffffff', { r: 255, g: 255, b: 255 }],
        ['#07687D', { r: 7, g: 104, b: 125 }],
        ['#aBcDeF', { r: 171, g: 205, b: 239 }],
    ])('accepts %s', (text, rgb) => {
        expect(parseAccent(text)).toEqual(rgb);
    });

    it.each(['', '#', '#fff', '#FFFF', '#ffffffff', 'ffffff', '#gggggg', '#12345', '#1234567', ' #ffffff', '#ffffff ', 'red', '#ff ff ff'])('rejects %j', text => {
        expect(parseAccent(text)).toBeNull();
    });
});

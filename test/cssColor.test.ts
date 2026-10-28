/**
 * Found by hand in PPTB (2026-10-26): the build shortens `#ffffff` to `#fff` in the stylesheet, the
 * preview read the bar colour with a six-digit pattern, got nothing and threw "Cannot read
 * properties of null (reading '1')" right after a package loaded correctly. jsdom does not load the
 * stylesheet, which is why no test saw it. This pins the colour reader to every form a browser can
 * hand back for a custom property.
 */
import { describe, expect, it } from 'vitest';
import { parseCssColor } from '../src/view/preview';

const FALLBACK = '#424242';
const FB = { r: 0x42, g: 0x42, b: 0x42 };

describe('parseCssColor', () => {
    it.each([
        ['#ffffff', { r: 255, g: 255, b: 255 }],
        ['#FFFFFF', { r: 255, g: 255, b: 255 }],
        [' #07687d ', { r: 7, g: 104, b: 125 }],
        ['#fff', { r: 255, g: 255, b: 255 }],           // what the minifier writes
        ['#FFF', { r: 255, g: 255, b: 255 }],
        ['#0af', { r: 0, g: 170, b: 255 }],
        ['rgb(255, 255, 255)', { r: 255, g: 255, b: 255 }],
        ['rgb(66,66,66)', { r: 66, g: 66, b: 66 }],
        ['rgba(10, 20, 30, 0.5)', { r: 10, g: 20, b: 30 }],
    ])('reads %j', (text, expected) => {
        expect(parseCssColor(text, FALLBACK)).toEqual(expected);
    });

    it.each(['', '   ', 'red', '#', '#ff', '#ffff', '#fffff', '#fffffff', '#ggg', 'var(--x)', 'rgb(1,2)'])('falls back for %j instead of throwing', text => {
        expect(() => parseCssColor(text, FALLBACK)).not.toThrow();
        expect(parseCssColor(text, FALLBACK)).toEqual(FB);
    });
});

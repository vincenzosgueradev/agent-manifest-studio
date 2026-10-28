/** The safe-area check: the logo inside the central 120 x 120 of the colour icon. */
import { describe, expect, it } from 'vitest';
import { readPackage } from '../src/services/zip';
import { decodeManifest, parseManifest } from '../src/services/manifest';
import { loadIcons } from '../src/services/iconset';
import { runChecks } from '../src/services/checks';
import { packageBytes, type PackageOpts } from './helpers/fixture';
import { encodePng, type Rgba } from './helpers/png-encoder';

function safeArea(opts: PackageOpts) {
    const read = readPackage(packageBytes(opts), 'x.zip');
    if (!read.ok) throw new Error(read.code);
    const parsed = parseManifest(decodeManifest(read.pkg.entries[0]!.data)!);
    if (!parsed.ok) throw new Error(parsed.code);
    return runChecks(parsed.manifest, loadIcons(read.pkg, parsed.manifest)).find(c => c.id === 'color.safe-area');
}

const icon = (bg: Rgba, logo: (x: number, y: number) => boolean, fg: Rgba = [255, 255, 255, 255]) =>
    encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (logo(x, y) ? fg : bg) });

describe('color.safe-area', () => {
    it('passes for a logo in the middle of a transparent icon', () => {
        const c = safeArea({});
        expect(c?.verdict).toBe('pass');
        expect(c?.found).toBe('inside the central 120 x 120 pixels');
    });

    it('warns, with the number of pixels, when the logo reaches outside', () => {
        const c = safeArea({ color: icon([0, 0, 0, 0], (x, y) => x >= 20 && x < 170 && y >= 70 && y < 120) });
        expect(c?.verdict).toBe('warning');
        // 50 rows; per row the columns 20..35 (16) and 156..169 (14) are outside
        expect(c?.found).toBe(`${50 * (16 + 14)} pixels outside the central 120 x 120`);
    });

    it('says "1 pixel" for one pixel', () => {
        const c = safeArea({ color: icon([0, 0, 0, 0], (x, y) => x === 10 && y === 10) });
        expect(c?.found).toBe('1 pixel outside the central 120 x 120');
    });

    it('a solid background of one colour is not logo, even if it fills the whole icon', () => {
        expect(safeArea({ color: icon([7, 104, 125, 255], (x, y) => x >= 66 && x < 126 && y >= 66 && y < 126) })?.verdict).toBe('pass');
    });

    it('on a solid background a logo near the edge is found', () => {
        const c = safeArea({ color: icon([7, 104, 125, 255], (x, y) => x >= 4 && x < 30 && y === 100) });
        expect(c?.verdict).toBe('warning');
        expect(c?.found).toBe('26 pixels outside the central 120 x 120');
    });

    it('states its assumption and what it does not prove', () => {
        const c = safeArea({})!;
        expect(c.notProven).toContain('top-left pixel');
        expect(c.notProven).toContain('crops or masks');
        expect(c.expected).toContain('central 120 x 120');
    });

    it('is left out when the icon is not 192 x 192 or cannot be drawn', () => {
        const wrongSize = encodePng({ width: 100, height: 100, colorType: 6, pixel: () => [0, 0, 0, 0] });
        expect(safeArea({ color: wrongSize })).toBeUndefined();
        expect(safeArea({ color: new TextEncoder().encode('not an image') })).toBeUndefined();
    });
});

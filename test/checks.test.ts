/**
 * FR-011 to FR-017, SC-004: each rule broken alone is reported, and nothing else is.
 * The expected verdicts are written from the spec (limits in the constitution's Verified Facts).
 */
import { describe, expect, it } from 'vitest';
import { readPackage } from '../src/services/zip';
import { decodeManifest, parseManifest } from '../src/services/manifest';
import { loadIcons } from '../src/services/iconset';
import { blockingChecks, runChecks } from '../src/services/checks';
import type { Check, Verdict } from '../src/types';
import { packageBytes, type PackageOpts, colorIcon } from './helpers/fixture';
import { encodePng, padPngTo, solidPng } from './helpers/png-encoder';
import { cases } from './helpers/combinatorics';

function checksFor(opts: PackageOpts = {}): Check[] {
    const read = readPackage(packageBytes(opts), 'x.zip');
    if (!read.ok) throw new Error(read.code);
    const text = decodeManifest(read.pkg.entries.find(e => e.path === 'manifest.json')!.data)!;
    const parsed = parseManifest(text);
    if (!parsed.ok) throw new Error(parsed.code);
    return runChecks(parsed.manifest, loadIcons(read.pkg, parsed.manifest));
}

const verdicts = (cs: Check[]): Record<string, Verdict> => Object.fromEntries(cs.map(c => [c.id, c.verdict]));

/** Ids whose verdict differs between two runs, counting added and removed ones. */
function changed(a: Check[], b: Check[]): string[] {
    const va = verdicts(a), vb = verdicts(b);
    // the contrast check depends on the colour icon and the accent colour together: it has its own tests below
    return [...new Set([...Object.keys(va), ...Object.keys(vb)])].filter(id => id !== 'color.contrast' && va[id] !== vb[id]).sort();
}

const BASE = checksFor();
const KB = 1024;
const chars = (n: number): string => 'x'.repeat(n);

const whiteGlyph32 = (side: number, pixel: [number, number, number, number]) =>
    encodePng({ width: side, height: side, colorType: 6, pixel: (x, y) => (x >= 8 && x < 12 && y >= 8 && y < 12 ? pixel : [0, 0, 0, 0]) });

describe('the valid base package', () => {
    it('passes every check, in a stable order, with the ids of the data model', () => {
        expect(BASE.map(c => c.id)).toEqual([
            'color.present', 'color.png', 'color.size-px', 'color.square', 'color.format', 'color.safe-area', 'color.weight',
            'outline.present', 'outline.png', 'outline.size-px', 'outline.white',
            'name.short.length', 'name.full.length', 'name.distinct',
            'description.short.length', 'description.full.length', 'accent.hex', 'color.contrast',
        ]);
        expect(BASE.filter(c => c.verdict !== 'pass')).toEqual([]);
    });

    it('every check says what was found, the rule, and what it does not prove (FR-011, FR-016)', () => {
        for (const c of BASE) {
            expect(c.label.length, c.id).toBeGreaterThan(3);
            expect(c.found.length, c.id).toBeGreaterThan(0);
            expect(c.expected.length, c.id).toBeGreaterThan(3);
            expect(c.notProven.length, c.id).toBeGreaterThan(10);
        }
    });

    it('a declared small colour icon adds its own checks', () => {
        const cs = checksFor({ manifest: { color32Path: 'c32.png' } });
        expect(cs.map(c => c.id)).toContain('color32.present');
        expect(cs.map(c => c.id)).toContain('color32.size-px');
        expect(verdicts(cs)['color32.size-px']).toBe('pass');
        const bad = checksFor({ manifest: { color32Path: 'c32.png' }, color32: solidPng(48, 48, [1, 2, 3, 255]) });
        expect(verdicts(bad)['color32.size-px']).toBe('warning');   // optional icon: a warning, not a failure
    });
});

describe('boundaries', () => {
    const cases_: Array<[string, PackageOpts, Record<string, Verdict | 'omitted'>]> = [
        // weight of the colour icon: 72 KB pass, +1 warning, 100 KB warning, +1 fail (1 KB = 1024 bytes)
        ['colour icon exactly 72 KB', { color: padPngTo(colorIcon(), 72 * KB) }, {}],
        ['colour icon 72 KB + 1 byte', { color: padPngTo(colorIcon(), 72 * KB + 1) }, { 'color.weight': 'warning' }],
        ['colour icon exactly 100 KB', { color: padPngTo(colorIcon(), 100 * KB) }, { 'color.weight': 'warning' }],
        ['colour icon 100 KB + 1 byte', { color: padPngTo(colorIcon(), 100 * KB + 1) }, { 'color.weight': 'fail' }],
        // names and descriptions
        ['short name 30 characters', { manifest: { nameShort: chars(30) } }, {}],
        ['short name 31 characters', { manifest: { nameShort: chars(31) } }, { 'name.short.length': 'fail' }],
        ['full name 100 characters', { manifest: { nameFull: chars(100) } }, {}],
        ['full name 101 characters', { manifest: { nameFull: chars(101) } }, { 'name.full.length': 'fail' }],
        ['short description 80', { manifest: { descShort: chars(80) } }, {}],
        ['short description 81', { manifest: { descShort: chars(81) } }, { 'description.short.length': 'fail' }],
        ['full description 4000', { manifest: { descFull: chars(4000) } }, {}],
        ['full description 4001', { manifest: { descFull: chars(4001) } }, { 'description.full.length': 'fail' }],
        // dimensions
        ['colour icon 192x192', { color: solidPng(192, 192, [1, 2, 3, 255]) }, {}],
        ['colour icon 191x192', { color: solidPng(191, 192, [1, 2, 3, 255]) }, { 'color.size-px': 'fail', 'color.square': 'fail', 'color.safe-area': 'omitted' }],
        ['colour icon 192x191', { color: solidPng(192, 191, [1, 2, 3, 255]) }, { 'color.size-px': 'fail', 'color.square': 'fail', 'color.safe-area': 'omitted' }],
        ['colour icon 193x193 (square, wrong size)', { color: solidPng(193, 193, [1, 2, 3, 255]) }, { 'color.size-px': 'fail', 'color.safe-area': 'omitted' }],
        ['outline 32x32', { outline: whiteGlyph32(32, [255, 255, 255, 255]) }, {}],
        ['outline 31x31', { outline: whiteGlyph32(31, [255, 255, 255, 255]) }, { 'outline.size-px': 'fail' }],
        ['outline 33x33', { outline: whiteGlyph32(33, [255, 255, 255, 255]) }, { 'outline.size-px': 'fail' }],
        // outline colour: every pixel with alpha above 0 must be white
        ['outline pixel 254,255,255 opaque', { outline: whiteGlyph32(32, [254, 255, 255, 255]) }, { 'outline.white': 'fail' }],
        ['outline pixel 255,255,254 opaque', { outline: whiteGlyph32(32, [255, 255, 254, 255]) }, { 'outline.white': 'fail' }],
        ['outline pixel white with alpha 1', { outline: whiteGlyph32(32, [255, 255, 255, 1]) }, {}],
        ['outline pixel not white with alpha 1', { outline: whiteGlyph32(32, [254, 255, 255, 1]) }, { 'outline.white': 'fail' }],
        ['outline pixel any colour with alpha 0', { outline: whiteGlyph32(32, [10, 20, 30, 0]) }, {}],
        // accent colour: # and exactly six hexadecimal digits
        ['accent #07687d', { manifest: { accent: '#07687d' } }, {}],
        ['accent #07687D (upper case)', { manifest: { accent: '#07687D' } }, {}],
        ['accent #fff', { manifest: { accent: '#fff' } }, { 'accent.hex': 'fail' }],
        ['accent #07687dff', { manifest: { accent: '#07687dff' } }, { 'accent.hex': 'fail' }],
        ['accent without #', { manifest: { accent: '07687d' } }, { 'accent.hex': 'fail' }],
        ['accent not hexadecimal', { manifest: { accent: '#07687g' } }, { 'accent.hex': 'fail' }],
        ['accent absent', { manifest: { omit: ['accentColor'] } }, { 'accent.hex': 'fail' }],
    ];
    it.each(cases_)('%s', (_name, opts, expected) => {
        const v = verdicts(checksFor(opts));
        const base = verdicts(BASE);
        for (const [id, verdict] of Object.entries(expected)) expect(v[id], id).toBe(verdict === 'omitted' ? undefined : verdict);
        for (const id of Object.keys(base)) {
            // the contrast check follows the icon and the accent colour together and has its own tests below
            if (!(id in expected) && id !== 'color.contrast') expect(v[id], `${id} must stay as in the base`).toBe(base[id]);
        }
    });

    it('counts characters, not UTF-16 units: 30 emoji are 30 characters', () => {
        expect(verdicts(checksFor({ manifest: { nameShort: '\u{1F600}'.repeat(30) } }))['name.short.length']).toBe('pass');
        expect(verdicts(checksFor({ manifest: { nameShort: '\u{1F600}'.repeat(31) } }))['name.short.length']).toBe('fail');
    });

    it('found shows the length and the limit', () => {
        const c = checksFor({ manifest: { nameShort: chars(31) } }).find(x => x.id === 'name.short.length')!;
        expect(c.found).toContain('31');
        expect(c.expected).toContain('30');
    });
});

describe('each rule broken alone changes exactly the expected checks', () => {
    const alone: Array<[string, PackageOpts, string[]]> = [
        ['colour icon missing from the package', { color: null }, ['color.format', 'color.png', 'color.present', 'color.safe-area', 'color.size-px', 'color.square', 'color.weight']],
        ['outline missing from the package', { outline: null }, ['outline.png', 'outline.present', 'outline.size-px', 'outline.white']],
        ['colour icon not declared', { manifest: { colorPath: null } }, ['color.format', 'color.png', 'color.present', 'color.safe-area', 'color.size-px', 'color.square', 'color.weight']],
        ['colour icon is not a PNG', { color: new TextEncoder().encode('plain text') }, ['color.format', 'color.png', 'color.safe-area', 'color.size-px', 'color.square']],
        ['colour icon is a damaged PNG', { color: colorIcon().slice(0, 100) }, ['color.format', 'color.png', 'color.safe-area', 'color.size-px', 'color.square']],
        ['outline is not a PNG', { outline: new TextEncoder().encode('plain text') }, ['outline.png', 'outline.size-px', 'outline.white']],
        ['colour icon 16-bit (valid PNG the tool cannot draw)', { color: encodePng({ width: 192, height: 192, colorType: 6, bitDepth: 16, pixel: () => [1, 2, 3, 4] }) }, ['color.format', 'color.safe-area']],
        ['short name missing', { manifest: { nameShort: null } }, ['name.short.length']],
        ['short name a localisation key', { manifest: { nameShort: '[[DA_Name]]' } }, ['name.short.length']],
        ['short name equals full name', { manifest: { nameShort: 'Same', nameFull: 'Same' } }, ['name.distinct']],
        ['short description missing', { manifest: { descShort: null } }, ['description.short.length']],
        ['full description missing', { manifest: { descFull: null } }, ['description.full.length']],
    ];
    it.each(alone)('%s', (_n, opts, expectedChanged) => {
        expect(changed(BASE, checksFor(opts))).toEqual([...expectedChanged].sort());
    });

    it('a missing full name is fine (it is optional)', () => {
        expect(changed(BASE, checksFor({ manifest: { nameFull: null } }))).toEqual([]);
    });

    it('a missing optional full name still reports what was found', () => {
        const c = checksFor({ manifest: { nameFull: null } }).find(x => x.id === 'name.full.length')!;
        expect(c.found).toContain('not declared');
    });
});

describe('every PAIR of independent broken rules reports exactly the union', () => {
    const breakers: Array<[string, PackageOpts, string[]]> = [
        ['weight fail', { color: padPngTo(colorIcon(), 100 * KB + 1) }, ['color.weight']],
        ['colour size', { color: solidPng(193, 193, [1, 2, 3, 255]) }, ['color.safe-area', 'color.size-px']],
        ['outline size', { outline: whiteGlyph32(31, [255, 255, 255, 255]) }, ['outline.size-px']],
        ['outline colour', { outline: whiteGlyph32(32, [1, 1, 1, 255]) }, ['outline.white']],
        ['short too long', { manifest: { nameShort: chars(31) } }, ['name.short.length']],
        ['full too long', { manifest: { nameFull: chars(101) } }, ['name.full.length']],
        ['short description too long', { manifest: { descShort: chars(81) } }, ['description.short.length']],
        ['full description too long', { manifest: { descFull: chars(4001) } }, ['description.full.length']],
        ['accent', { manifest: { accent: 'red' } }, ['accent.hex']],
    ];
    const merge = (a: PackageOpts, b: PackageOpts): PackageOpts => ({ ...a, ...b, manifest: { ...a.manifest, ...b.manifest } });
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < breakers.length; i++) for (let j = i + 1; j < breakers.length; j++) pairs.push([i, j]);
    it.each(pairs)('pair %i + %i', (i, j) => {
        const [, oa, ea] = breakers[i]!;
        const [, ob, eb] = breakers[j]!;
        // two breakers that replace the same file cannot be combined: the second would win
        if ((oa.color && ob.color) || (oa.outline && ob.outline)) return;
        expect(changed(BASE, checksFor(merge(oa, ob)))).toEqual([...ea, ...eb].sort());
    });

    it('one breaker per file, all at once', () => {
        const pick = [0, 3, 4, 5, 6, 7, 8].map(i => breakers[i]!);
        const all = pick.reduce((acc, [, o]) => merge(acc, o), {} as PackageOpts);
        expect(changed(BASE, checksFor(all))).toEqual(pick.flatMap(b => b[2]).sort());
    });
});

describe('verdict values of the single broken rules', () => {
    const v = (opts: PackageOpts, id: string) => verdicts(checksFor(opts))[id];
    it('missing required things fail', () => {
        expect(v({ color: null }, 'color.present')).toBe('fail');
        expect(v({ outline: null }, 'outline.present')).toBe('fail');
        expect(v({ manifest: { nameShort: null } }, 'name.short.length')).toBe('fail');
        expect(v({ manifest: { descShort: null } }, 'description.short.length')).toBe('fail');
        expect(v({ manifest: { descFull: null } }, 'description.full.length')).toBe('fail');
    });
    it('a file that is not a PNG fails', () => {
        expect(v({ color: new TextEncoder().encode('x') }, 'color.png')).toBe('fail');
        expect(v({ outline: new TextEncoder().encode('x') }, 'outline.png')).toBe('fail');
    });
    it('what the tool cannot draw is a warning, not a failure (Teams may accept it)', () => {
        const opts = { color: encodePng({ width: 192, height: 192, colorType: 6 as const, bitDepth: 16 as const, pixel: () => [1, 2, 3, 4] as [number, number, number, number] }) };
        expect(v(opts, 'color.format')).toBe('warning');
        expect(v(opts, 'color.png')).toBe('pass');
    });
    it('a localisation key cannot be measured: warning', () => {
        expect(v({ manifest: { nameShort: '[[DA_Name]]' } }, 'name.short.length')).toBe('warning');
    });
    it('the missing file is named in the found text', () => {
        const c = checksFor({ color: null }).find(x => x.id === 'color.present')!;
        expect(c.found).toContain('color.png');
        expect(c.found).toContain('not in the package');
    });
});

describe('blockingChecks: only a name check that was fine and now fails blocks the export (FR-021)', () => {
    const mk = (id: string, verdict: Verdict): Check => ({ id, label: id, verdict, found: '', expected: '', notProven: 'x' });
    const ids = ['name.short.length', 'name.full.length', 'name.distinct'];
    const states: Verdict[] = ['pass', 'warning', 'fail'];
    for (const id of ids) {
        for (const before of states) {
            for (const after of states) {
                it(`${id}: ${before} -> ${after}`, () => {
                    const b = [mk(id, before), mk('color.weight', 'pass')];
                    const a = [mk(id, after), mk('color.weight', 'pass')];
                    const blocked = blockingChecks(b, a).map(c => c.id);
                    expect(blocked).toEqual(after === 'fail' && before !== 'fail' ? [id] : []);
                });
            }
        }
    }

    it('a failure outside the name checks never blocks, even if it is new', () => {
        const b = [mk('color.weight', 'pass'), mk('accent.hex', 'pass')];
        const a = [mk('color.weight', 'fail'), mk('accent.hex', 'fail')];
        expect(blockingChecks(b, a)).toEqual([]);
    });

    it('a name check that was not in the original and fails now blocks', () => {
        expect(blockingChecks([], [mk('name.short.length', 'fail')]).map(c => c.id)).toEqual(['name.short.length']);
    });

    it('a failure that was already there does not block', () => {
        const original = checksFor({ manifest: { nameShort: chars(40) } });
        expect(blockingChecks(original, original)).toEqual([]);
    });
});

describe('matrix: size x weight x name length behave independently', () => {
    const sizes: Array<[number, Verdict]> = [[192, 'pass'], [193, 'fail']];
    const weights: Array<[number, Verdict]> = [[50 * KB, 'pass'], [80 * KB, 'warning'], [101 * KB, 'fail']];
    const lengths: Array<[number, Verdict]> = [[30, 'pass'], [31, 'fail']];
    for (const [[side, sv], [bytes, wv], [len, nv]] of cases<[[number, Verdict], [number, Verdict], [number, Verdict]]>([sizes, weights, lengths])) {
        it(`side ${side}, ${bytes} bytes, name ${len}`, () => {
            const color = padPngTo(solidPng(side, side, [1, 2, 3, 255]), bytes);
            const v = verdicts(checksFor({ color, manifest: { nameShort: chars(len) } }));
            expect([v['color.size-px'], v['color.weight'], v['name.short.length']]).toEqual([sv, wv, nv]);
        });
    }
});

describe('the logo stands out from the accent colour', () => {
    const glyph = (rgba: [number, number, number, number], side = 192, from = 60, to = 132) =>
        encodePng({ width: side, height: side, colorType: 6, pixel: (x, y) => (x >= from && x < to && y >= from && y < to ? rgba : [0, 0, 0, 0]) });
    const contrast = (opts: PackageOpts) => checksFor(opts).find(c => c.id === 'color.contrast');

    // ratios worked out by hand from the WCAG formula: white on #07687d about 6.4:1, white on white 1:1
    it('passes for a white logo on the teal accent colour', () => {
        const c = contrast({})!;
        expect(c.verdict).toBe('pass');
        expect(parseFloat(c.found)).toBeGreaterThan(5);
    });

    const table: Array<[string, [number, number, number, number], string, Verdict, number, number]> = [
        ['white logo on white', [255, 255, 255, 255], '#FFFFFF', 'warning', 1, 1],
        ['white logo on a light blue', [255, 255, 255, 255], '#E8F1FB', 'warning', 1.0, 1.2],
        ['white logo on orange', [255, 255, 255, 255], '#FFA575', 'warning', 1.7, 2.2],
        ['white logo on mid grey', [255, 255, 255, 255], '#767676', 'pass', 4.4, 4.7],
        ['black logo on white', [0, 0, 0, 255], '#FFFFFF', 'pass', 20.9, 21.1],
        ['black logo on black', [0, 0, 0, 255], '#000000', 'warning', 1, 1],
        ['red logo on its own colour', [200, 30, 30, 255], '#C81E1E', 'warning', 1, 1],
    ];
    for (const [name, rgba, accent, verdict, low, high] of table) {
        it(name, () => {
            const c = contrast({ color: glyph(rgba), manifest: { accent } })!;
            expect(c.verdict).toBe(verdict);
            const ratio = parseFloat(c.found);
            expect(ratio).toBeGreaterThanOrEqual(low - 0.05);
            expect(ratio).toBeLessThanOrEqual(high + 0.05);
        });
    }

    it('the limit is 3 : 1, inclusive', () => {
        // #949494 against white is 3.03 : 1, #959595 is 2.99 : 1
        expect(contrast({ color: glyph([255, 255, 255, 255]), manifest: { accent: '#949494' } })!.verdict).toBe('pass');
        expect(contrast({ color: glyph([255, 255, 255, 255]), manifest: { accent: '#959595' } })!.verdict).toBe('warning');
    });

    it('does not apply when the icon brings its own background', () => {
        const opaque = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 60 && x < 132 && y >= 60 && y < 132 ? [255, 255, 255, 255] : [7, 104, 125, 255]) });
        expect(contrast({ color: opaque, manifest: { accent: '#FFFFFF' } })).toBeUndefined();
    });

    it('does not apply when the picture is empty, unreadable, or the accent colour is not valid', () => {
        expect(contrast({ color: glyph([1, 2, 3, 0]) })).toBeUndefined();
        expect(contrast({ manifest: { accent: 'teal' } })).toBeUndefined();
        expect(contrast({ manifest: { accent: null } })).toBeUndefined();
        expect(contrast({ color: new Uint8Array([1, 2, 3]) })).toBeUndefined();
    });

    it('needs a tenth of the icon to be see-through', () => {
        const nearlyFull = (see: number) => encodePng({ width: 100, height: 100, colorType: 6, pixel: (x, y) => (y * 100 + x < see ? [0, 0, 0, 0] : [255, 255, 255, 255]) });
        expect(contrast({ color: nearlyFull(999), manifest: { accent: '#FFFFFF' } })).toBeUndefined();   // 9.99 percent
        expect(contrast({ color: nearlyFull(1000), manifest: { accent: '#FFFFFF' } })).toBeDefined();    // exactly 10 percent
    });

    it('a half-transparent logo counts by its colour, weighted by its alpha', () => {
        const faint = glyph([255, 255, 255, 40]);
        expect(contrast({ color: faint, manifest: { accent: '#FFFFFF' } })!.verdict).toBe('warning');
        expect(contrast({ color: faint, manifest: { accent: '#000000' } })!.verdict).toBe('pass');
    });

    it('says what it does not prove', () => {
        expect(contrast({})!.notProven).toContain('Microsoft 365 Copilot');
    });
});

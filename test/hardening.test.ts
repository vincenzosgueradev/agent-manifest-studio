/**
 * Tests added after the first mutation run: each one closes a defect that the suite had let through
 * (scripts/mutation-check.mjs). The name of each block says which.
 */
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { readPackage } from '../src/services/zip';
import { decodePng } from '../src/services/png';
import { locateNames } from '../src/services/manifest';
import { applySuffix } from '../src/services/rename';
import { exportPackage, makeContext, planEdit } from '../src/services/export';
import { runChecks } from '../src/services/checks';
import { loadIcons } from '../src/services/iconset';
import { parseManifest } from '../src/services/manifest';
import { buildManifest } from './helpers/manifest-builder';
import { colorIcon, packageEntries } from './helpers/fixture';
import { chunk, encodePng, expectedRgba, padPngTo, PNG_SIGNATURE, solidPng, type PngSpec } from './helpers/png-encoder';
import { deflatedZip, type RawEntry } from './helpers/zip-builder';

const enc = new TextEncoder();
const MB = 1024 * 1024;
const manifest = (): RawEntry => ({ name: 'manifest.json', data: enc.encode('{}') });
const filler = (name: string, size: number): RawEntry => ({ name, data: new Uint8Array(size).fill(3) });

describe('zip: the unpacked total is bounded exactly at 16 MB', () => {
    it('16 MB in total is accepted, one byte more is refused', () => {
        // manifest 2 bytes + 15 entries of 1 MB + one entry that completes the total
        const make = (lastSize: number) => deflatedZip([
            manifest(), ...Array.from({ length: 15 }, (_, i) => filler(`f${i}.bin`, MB)), filler('last.bin', lastSize),
        ]);
        expect(readPackage(make(MB - 2), 'a.zip').ok).toBe(true);
        const over = readPackage(make(MB - 1), 'a.zip');
        expect(over.ok).toBe(false);
        if (!over.ok) expect(over.code).toBe('too-large');
    });
});

describe('png: tall images are bounded as well as wide ones', () => {
    it('1 x 4097 is refused before any pixel memory is requested', () => {
        const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 16, 1, 8, 6, 0, 0, 0]);
        const r = decodePng(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', new Uint8Array(deflateSync(new Uint8Array(4)))), ...chunk('IEND', new Uint8Array(0))]));
        expect(r.kind).toBe('unsupported');
        if (r.kind === 'unsupported') expect(r.reason).toContain('4096');
    });
});

describe('png: structure that must be refused', () => {
    const tiny = (extra: Uint8Array[], ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])) =>
        new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...extra.flatMap(c => Array.from(c))]);

    it('filter type 5 does not exist', () => {
        const idat = chunk('IDAT', new Uint8Array(deflateSync(new Uint8Array([5, 0, 0, 0, 0]))));
        const r = decodePng(tiny([idat, chunk('IEND', new Uint8Array(0))]));
        expect(r.kind).toBe('corrupt');
        if (r.kind === 'corrupt') expect(r.reason).toContain('filter type 5');
    });

    it('a file cut right after the image data has no end chunk', () => {
        const whole = solidPng(4, 4, [1, 2, 3, 255]);
        const r = decodePng(whole.slice(0, whole.length - 12));
        expect(r.kind).toBe('corrupt');
        if (r.kind === 'corrupt') expect(r.reason).toContain('IEND');
    });

    it('a file with no image data says so', () => {
        const r = decodePng(tiny([chunk('IEND', new Uint8Array(0))]));
        expect(r.kind).toBe('corrupt');
        if (r.kind === 'corrupt') expect(r.reason).toContain('IDAT');
    });

    it.each([[2, 4], [2, 1], [3, 16], [6, 1], [4, 4], [0, 3]])('colour type %i cannot have bit depth %i', (colorType, depth) => {
        const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, depth, colorType, 0, 0, 0]);
        const idat = chunk('IDAT', new Uint8Array(deflateSync(new Uint8Array(8))));
        const r = decodePng(tiny([idat, chunk('IEND', new Uint8Array(0))], ihdr));
        expect(r.kind).toBe('corrupt');
        if (r.kind === 'corrupt') expect(r.reason).toContain('Bit depth');
    });
});

describe('png: the Paeth filter on the values where its tie-breaks matter', () => {
    // Pixel (1,1) has left a, up b, up-left c. Equal distances must pick a before b before c.
    const decodeWith = (c: number, b: number, a: number) => {
        const spec: PngSpec = {
            width: 2, height: 2, colorType: 0, filter: 4,
            pixel: (x, y) => [x === 0 && y === 0 ? c : x === 1 && y === 0 ? b : x === 0 && y === 1 ? a : 7, 0, 0, 255],
        };
        const r = decodePng(encodePng(spec));
        expect(r.kind).toBe('ok');
        if (r.kind === 'ok') expect(Array.from(r.rgba)).toEqual(Array.from(expectedRgba(spec)));
    };
    it('a = 0, b = 3, c = 2: distances to a and c are equal, a wins', () => decodeWith(2, 3, 0));
    it('a = 3, b = 0, c = 2: distances to b and c are equal, b wins', () => decodeWith(2, 0, 3));
});

describe('rename: the safety net catches a result that is valid JSON but wrong', () => {
    it('a span that points at another string of the manifest is refused', () => {
        const text = buildManifest();
        const target = '"Answers sales questions"';
        const start = text.indexOf(target);
        const real = locateNames(text);
        if (!real.ok) throw new Error('fixture');
        const wrong = () => ({ ok: true as const, short: { start, end: start + target.length }, full: real.full });
        const r = applySuffix(text, 'UAT', wrong);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('integrity');
    });
});

describe('checks: the outline icon is measured in both directions', () => {
    const run = (outline: Uint8Array) => {
        const read = readPackage(deflatedZip(packageEntries({ outline })), 'a.zip');
        if (!read.ok) throw new Error(read.code);
        const parsed = parseManifest(new TextDecoder().decode(read.pkg.entries[0]!.data));
        if (!parsed.ok) throw new Error(parsed.code);
        return Object.fromEntries(runChecks(parsed.manifest, loadIcons(read.pkg, parsed.manifest)).map(c => [c.id, c.verdict]));
    };
    const rect = (w: number, h: number) => encodePng({ width: w, height: h, colorType: 6, pixel: () => [255, 255, 255, 255] });
    it('32 x 33 and 33 x 32 fail the size', () => {
        expect(run(rect(32, 33))['outline.size-px']).toBe('fail');
        expect(run(rect(33, 32))['outline.size-px']).toBe('fail');
        expect(run(rect(32, 32))['outline.size-px']).toBe('pass');
    });
    it('and the colour icon likewise', () => {
        const read = readPackage(deflatedZip(packageEntries({ color: rect(192, 193) })), 'a.zip');
        if (!read.ok) throw new Error(read.code);
        const parsed = parseManifest(new TextDecoder().decode(read.pkg.entries[0]!.data));
        if (!parsed.ok) throw new Error(parsed.code);
        const v = Object.fromEntries(runChecks(parsed.manifest, loadIcons(read.pkg, parsed.manifest)).map(c => [c.id, c.verdict]));
        expect(v['color.size-px']).toBe('fail');
        expect(v['color.square']).toBe('fail');
    });
});

describe('export: failures the package already had stay visible when nothing is changed', () => {
    it('in the plan and in the export of an untouched package', () => {
        const read = readPackage(deflatedZip(packageEntries({ color: padPngTo(colorIcon(), 110 * 1024) })), 'a.zip');
        if (!read.ok) throw new Error(read.code);
        const made = makeContext(read.pkg);
        if (!made.ok) throw new Error(made.message);
        const plan = planEdit(made.ctx, null);
        expect(plan.ok && plan.plan.remaining.map(c => c.id)).toEqual(['color.weight']);
        const exported = exportPackage(made.ctx, null);
        expect(exported.ok && exported.remaining.map(c => c.id)).toEqual(['color.weight']);
    });
});

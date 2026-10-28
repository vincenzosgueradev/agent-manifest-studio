/** Feature 003: Edits normalising, text operations from edits, the diff of two manifests, and icon acceptance. */
import { describe, expect, it } from 'vitest';
import { diffManifest, effectiveIcons, EMPTY, isEmpty, normalise, opsFrom, originalOf, type Edits } from '../src/services/edit/edits';
import { checkNewIcon } from '../src/services/edit/iconEdit';
import { parseManifest } from '../src/services/manifest';
import { writePackage } from '../src/services/zip';
import { buildManifest } from './helpers/manifest-builder';
import { colorIcon, outlineIcon } from './helpers/fixture';
import { encodePng, padPngTo, solidPng } from './helpers/png-encoder';

const original = (o = {}) => {
    const r = parseManifest(buildManifest(o));
    if (!r.ok) throw new Error('manifest');
    return originalOf(r.manifest);
};
const edits = (e: Partial<Edits>): Edits => ({ fields: {}, lists: {}, icons: {}, ...e });

describe('normalise', () => {
    const o = original({ validDomains: ['a.com'] });
    it('drops a value equal to the original and keeps the others', () => {
        const n = normalise(edits({ fields: { version: '1.0.0', accentColor: '#000000' }, lists: { validDomains: ['a.com'], permissions: [] } }), o);
        expect(n.fields).toEqual({ accentColor: '#000000' });
        expect(n.lists).toEqual({});
    });
    it('an optional field the manifest lacks and the user left empty is no edit', () => {
        const none = original({ omit: ['name.full'] });
        expect(normalise(edits({ fields: { 'name.full': '' } }), none).fields).toEqual({});
    });
    it('a name that is a localisation key cannot be edited', () => {
        const keyed = original({ nameShort: '[[NAME_KEY]]' });
        expect(normalise(edits({ fields: { 'name.short': 'x' } }), keyed).fields).toEqual({});
    });
    it('a list is compared in order', () => {
        const two = original({ validDomains: ['a.com', 'b.com'] });
        expect(normalise(edits({ lists: { validDomains: ['b.com', 'a.com'] } }), two).lists).toEqual({ validDomains: ['b.com', 'a.com'] });
    });
    it('isEmpty', () => {
        expect(isEmpty(EMPTY)).toBe(true);
        expect(isEmpty(edits({ fields: { version: '1' } }))).toBe(false);
        expect(isEmpty(edits({ icons: { color: new Uint8Array(1) } }))).toBe(false);
    });
});

describe('opsFrom', () => {
    const o = original({});
    it('a valid field becomes a set, an emptied optional field a remove', () => {
        const { ops, invalid } = opsFrom(edits({ fields: { version: '2.0.0', 'name.full': '' } }), o);
        expect(invalid).toEqual([]);
        // the order of the field table, not the order the edits were made
        expect(ops).toEqual([{ path: ['name', 'full'], remove: true }, { path: ['version'], value: '2.0.0' }]);
    });
    it('an invalid field is reported and gives no operation', () => {
        const { ops, invalid } = opsFrom(edits({ fields: { accentColor: 'nope', version: '2.0.0' } }), o);
        expect(ops).toEqual([{ path: ['version'], value: '2.0.0' }]);
        expect(invalid.map(i => i.path)).toEqual(['accentColor']);
    });
    it('an emptied list is removed, a new list is set', () => {
        const withList = original({ validDomains: ['a.com'] });
        expect(opsFrom(edits({ lists: { validDomains: [] } }), withList).ops).toEqual([{ path: ['validDomains'], remove: true }]);
        expect(opsFrom(edits({ lists: { devicePermissions: ['media'] } }), o).ops).toEqual([{ path: ['devicePermissions'], value: ['media'] }]);
    });
    it('keeps an entry the manifest already had even when it would not be accepted now', () => {
        const odd = original({ validDomains: ['https://legacy.com'] });
        const { ops, invalid } = opsFrom(edits({ lists: { validDomains: ['https://legacy.com', 'new.com'] } }), odd);
        expect(invalid).toEqual([]);
        expect(ops).toEqual([{ path: ['validDomains'], value: ['https://legacy.com', 'new.com'] }]);
    });
    it('refuses a new bad entry beside an old one', () => {
        const odd = original({ validDomains: ['https://legacy.com'] });
        expect(opsFrom(edits({ lists: { validDomains: ['https://legacy.com', 'https://new.com'] } }), odd).invalid.map(i => i.path)).toEqual(['validDomains']);
    });
});

describe('diffManifest', () => {
    const a = '{"x":1,"o":{"p":"a","q":[1,2]},"gone":true}';
    it('lists changed, added and removed values by path, arrays as one value', () => {
        expect(diffManifest(a, '{"x":2,"o":{"p":"a","q":[1,3],"r":"n"},"added":[1]}')).toEqual([
            { path: 'x', before: '1', after: '2' },
            { path: 'o.q', before: '[1,2]', after: '[1,3]' },
            { path: 'o.r', before: null, after: 'n' },
            { path: 'added', before: null, after: '[1]' },
            { path: 'gone', before: 'true', after: null },
        ]);
    });
    it('says nothing for equal manifests whatever their formatting', () => {
        expect(diffManifest(a, JSON.stringify(JSON.parse(a), null, 4))).toEqual([]);
        expect(diffManifest('﻿' + a, a)).toEqual([]);
    });
});

describe('effectiveIcons', () => {
    it('drops bytes equal to the current ones', () => {
        const same = colorIcon();
        const r = effectiveIcons(edits({ icons: { color: colorIcon(), outline: outlineIcon() } }), { color: same, outline: new Uint8Array(3) });
        expect(Object.keys(r)).toEqual(['outline']);
    });
});

describe('checkNewIcon', () => {
    it('accepts the right size', () => {
        expect(checkNewIcon('color', colorIcon()).ok).toBe(true);
        expect(checkNewIcon('outline', outlineIcon()).ok).toBe(true);
    });
    it('refuses the wrong size, naming both', () => {
        const r = checkNewIcon('color', solidPng(100, 100, [1, 2, 3, 255]));
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.message).toMatch(/192 x 192.*100 x 100/);
        expect(checkNewIcon('outline', colorIcon()).ok).toBe(false);
        expect(checkNewIcon('color', solidPng(192, 191, [0, 0, 0, 255])).ok).toBe(false);
    });
    it('refuses what is not a readable PNG', () => {
        expect(checkNewIcon('color', new Uint8Array([1, 2, 3])).ok).toBe(false);
        const damaged = colorIcon().slice(0, 40);
        expect(checkNewIcon('color', damaged).ok).toBe(false);
    });
    it('weight: a warning size is accepted, above 100 KB refused', () => {
        const base = encodePng({ width: 192, height: 192, colorType: 6, pixel: () => [10, 20, 30, 255] });
        expect(checkNewIcon('color', padPngTo(base, 80 * 1024)).ok).toBe(true);
        expect(checkNewIcon('color', padPngTo(base, 100 * 1024)).ok).toBe(true);
        expect(checkNewIcon('color', padPngTo(base, 100 * 1024 + 1)).ok).toBe(false);
    });
    it('a non-white outline is accepted here: the checks report it', () => {
        expect(checkNewIcon('outline', solidPng(32, 32, [200, 10, 10, 255])).ok).toBe(true);
    });
});

describe('writePackage adds entries the package did not have', () => {
    const pkg = { fileName: 'a.zip', byteLength: 0, entries: [{ path: 'manifest.json', data: new Uint8Array([1]), isDirectory: false }] };
    it('appends after the existing entries, replaces the existing', () => {
        const zip = writePackage(pkg, { 'manifest.json': new Uint8Array([2]), 'new.png': new Uint8Array([3, 3]) });
        // read back with fflate directly through the helper
        return import('./helpers/zip-builder').then(({ unzipSync }) => {
            const files = unzipSync(zip);
            expect(Object.keys(files)).toEqual(['manifest.json', 'new.png']);
            expect([...files['manifest.json']!]).toEqual([2]);
            expect([...files['new.png']!]).toEqual([3, 3]);
        });
    });
    it('without replacements it is unchanged', () => {
        return import('./helpers/zip-builder').then(({ unzipSync }) => {
            expect(Object.keys(unzipSync(writePackage(pkg)))).toEqual(['manifest.json']);
        });
    });
});

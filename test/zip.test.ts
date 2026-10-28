/**
 * FR-001, FR-002, FR-003: reading a package. Expected codes come from the spec, not from `src/`.
 */
import { describe, expect, it } from 'vitest';
import { readPackage } from '../src/services/zip';
import { declareSize, deflatedZip, rawZip, unzipSync, type RawEntry } from './helpers/zip-builder';
import { packageBytes, packageEntries } from './helpers/fixture';
import { cases } from './helpers/combinatorics';

const enc = new TextEncoder();
const MB = 1024 * 1024;

const manifest = (): RawEntry => ({ name: 'manifest.json', data: enc.encode('{}') });
const filler = (name: string, size = 10): RawEntry => ({ name, data: new Uint8Array(size).fill(7) });

function expectRefused(bytes: Uint8Array, code: string): void {
    const r = readPackage(bytes, 'x.zip');
    expect(r.ok).toBe(false);
    if (!r.ok) {
        expect(r.code).toBe(code);
        expect(r.message.length).toBeGreaterThan(10);
    }
}

describe('readPackage: valid packages', () => {
    it('keeps every entry in the order of the zip directory', () => {
        const r = readPackage(packageBytes(), 'agent.zip');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.pkg.entries.map(e => e.path)).toEqual(['manifest.json', 'color.png', 'outline.png']);
        expect(r.pkg.fileName).toBe('agent.zip');
    });

    it('returns the decompressed bytes of each entry', () => {
        const entries = packageEntries();
        const r = readPackage(deflatedZip(entries), 'a.zip');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        entries.forEach((e, i) => expect(Array.from(r.pkg.entries[i]!.data)).toEqual(Array.from(e.data)));
    });

    it('works for stored (uncompressed) entries as well as deflated ones', () => {
        for (const bytes of [rawZip(packageEntries()), deflatedZip(packageEntries())]) {
            const r = readPackage(bytes, 'a.zip');
            expect(r.ok).toBe(true);
        }
    });

    it('keeps directory entries and marks them', () => {
        const r = readPackage(rawZip([manifest(), { name: 'assets/', data: new Uint8Array(0) }, filler('assets/color.png')]), 'a.zip');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.pkg.entries.map(e => [e.path, e.isDirectory])).toEqual([
            ['manifest.json', false], ['assets/', true], ['assets/color.png', false],
        ]);
    });

    it('accepts exactly 200 entries and an entry of exactly 1 MB', () => {
        const many = [manifest(), ...Array.from({ length: 199 }, (_, i) => filler(`f${i}.txt`, 1))];
        expect(readPackage(deflatedZip(many), 'a.zip').ok).toBe(true);
        expect(readPackage(deflatedZip([manifest(), filler('big.bin', MB)]), 'a.zip').ok).toBe(true);
    });
});

describe('readPackage: refusals name their cause', () => {
    it('not a zip: empty, random bytes, text, truncated', () => {
        expectRefused(new Uint8Array(0), 'not-zip');
        expectRefused(enc.encode('this is not a zip'), 'not-zip');
        expectRefused(new Uint8Array(500).map((_, i) => (i * 37) & 255), 'not-zip');
        const good = packageBytes();
        expectRefused(good.slice(0, Math.floor(good.length / 2)), 'not-zip');
        expectRefused(good.slice(0, 10), 'not-zip');
    });

    it('a zip without manifest.json', () => {
        expectRefused(deflatedZip([filler('color.png'), filler('outline.png')]), 'no-manifest');
        expectRefused(deflatedZip([]), 'no-manifest');
    });

    it('a manifest only inside a sub-folder (a compressed folder) gets its own code', () => {
        expectRefused(deflatedZip([{ name: 'myapp/manifest.json', data: enc.encode('{}') }, filler('myapp/color.png')]), 'manifest-in-subfolder');
    });

    const unsafe = ['../evil.txt', '/abs.txt', 'a\\b.txt', 'C:/x.txt', 'a/../b.txt', 'a//b.txt', './a.txt', 'a/./b.txt'];
    it.each(unsafe)('unsafe path %s', name => {
        expectRefused(rawZip([manifest(), { name, data: new Uint8Array(1) }]), 'unsafe-path');
    });

    it('an empty entry name', () => {
        expectRefused(rawZip([manifest(), { name: '', data: new Uint8Array(1) }]), 'unsafe-path');
    });

    it('a duplicated path', () => {
        expectRefused(rawZip([manifest(), filler('color.png'), filler('color.png')]), 'duplicate-path');
    });

    it('201 entries', () => {
        const many = [manifest(), ...Array.from({ length: 200 }, (_, i) => filler(`f${i}.txt`, 1))];
        expectRefused(deflatedZip(many), 'too-many-entries');
    });

    it('an entry of 1 MB + 1 byte', () => {
        expectRefused(deflatedZip([manifest(), filler('big.bin', MB + 1)]), 'entry-too-large');
    });

    it('entries that are each fine but together exceed 16 MB unpacked are refused as too large', () => {
        const entries = [manifest(), ...Array.from({ length: 17 }, (_, i) => filler('big' + i + '.bin', MB))];
        expectRefused(deflatedZip(entries), 'too-large');
        const ok = [manifest(), ...Array.from({ length: 15 }, (_, i) => filler('big' + i + '.bin', MB))];
        expect(readPackage(deflatedZip(ok), 'a.zip').ok).toBe(true);
    });

    it('a file of 5 MB + 1 byte is refused as too large, whatever its content', () => {
        expectRefused(new Uint8Array(5 * MB + 1), 'too-large');
    });

    it('a file of exactly 5 MB is not "too large" (the next check decides)', () => {
        const r = readPackage(new Uint8Array(5 * MB), 'a.zip');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('not-zip');
    });

    it('a zip bomb is refused from the size in the directory, before anything is inflated', () => {
        // A tiny entry whose directory claims 4 GB: if the tool inflated first it would report a
        // corrupt archive (not-zip); the right answer comes only from checking the size first.
        const bomb = declareSize(deflatedZip([manifest(), filler('big.bin', 100)]), 'big.bin', 0xfffffff0);
        expectRefused(bomb, 'entry-too-large');
    });
});

describe('readPackage: matrix of defect x entry position', () => {
    const defects: Array<[string, (e: RawEntry[]) => RawEntry[], string]> = [
        ['traversal', e => [...e, { name: '../x', data: new Uint8Array(1) }], 'unsafe-path'],
        ['duplicate', e => [...e, e[1]!], 'duplicate-path'],
        ['no manifest', e => e.slice(1), 'no-manifest'],
    ];
    const positions = ['first', 'middle', 'last'] as const;
    for (const [dName, apply, code] of defects) {
        for (const pos of positions) {
            it(`${dName} (${pos})`, () => {
                const base = packageEntries();
                let entries = apply(base);
                if (dName !== 'no manifest') {
                    const bad = entries.pop()!;
                    const at = pos === 'first' ? 0 : pos === 'middle' ? 1 : entries.length;
                    // keep manifest.json somewhere; the hostile entry moves around it
                    entries.splice(at, 0, bad);
                }
                expectRefused(rawZip(entries), code);
            });
        }
    }
});

describe('readPackage never throws on arbitrary bytes', () => {
    it('seeded random inputs', () => {
        const good = packageBytes();
        for (const [cut, flip] of cases<[number, number]>([[1, 5, 20, 60, 100, 200], [0, 1, 7, 42, 99]], 100, 0)) {
            const mutated = good.slice(0, Math.min(good.length, good.length - cut));
            mutated[flip % Math.max(mutated.length, 1)] ^= 0xff;
            expect(() => readPackage(mutated, 'x.zip')).not.toThrow();
        }
    });
});

describe('what the test helpers build is what a reader sees', () => {
    it('the independent reader agrees on the fixture', () => {
        const names = Object.keys(unzipSync(packageBytes()));
        expect(names).toEqual(['manifest.json', 'color.png', 'outline.png']);
    });
});

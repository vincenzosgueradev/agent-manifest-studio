/**
 * FR-021 to FR-025, SC-003: the exported package against the original, entry by entry.
 * The comparison reads both archives with the test helpers, not with `src/`.
 */
import { describe, expect, it } from 'vitest';
import { readPackage } from '../src/services/zip';
import { exportPackage, makeContext, planEdit, suggestFileName, type EditContext } from '../src/services/export';
import { packageEntries, packageBytes, colorIcon, type PackageOpts } from './helpers/fixture';
import { deflatedZip, unzipSync, type RawEntry } from './helpers/zip-builder';
import { padPngTo } from './helpers/png-encoder';
import { buildManifest, LAYOUTS, type ManifestOpts } from './helpers/manifest-builder';
import { cases } from './helpers/combinatorics';

// ignoreBOM: keep the byte-order mark in the text so the tests can see it
const dec = new TextDecoder('utf-8', { ignoreBOM: true });
const enc = new TextEncoder();

function ctxFor(entries: RawEntry[], fileName = 'agent.zip'): EditContext {
    const read = readPackage(deflatedZip(entries), fileName);
    if (!read.ok) throw new Error(read.code);
    const made = makeContext(read.pkg);
    if (!made.ok) throw new Error(made.message);
    return made.ctx;
}

const extras: RawEntry[] = [
    { name: 'assets/readme.txt', data: enc.encode('keep me exactly') },
    { name: 'languages/', data: new Uint8Array(0) },
    { name: 'languages/it.json', data: enc.encode('{"name":{"short":"Aiutante [DEV]"}}') },
];

const variants: Array<[string, PackageOpts]> = [
    ['plain', {}],
    ['extra files and a directory entry', { extra: extras }],
    ['small colour icon declared', { manifest: { color32Path: 'c32.png' } }],
    ['unknown manifest keys', { manifest: { unknownBefore: { zzz: 1 }, unknownAfter: { aaa: [1, 2] } } }],
    ['icons in a sub-folder', { manifest: { colorPath: 'assets/color.png', outlinePath: 'assets/outline.png' } }],
];
const suffixes: Array<[string | null, string, string]> = [
    ['UAT', 'Sales Helper [UAT]', 'Sales Helper for the field team [UAT]'],
    ['PROD', 'Sales Helper [PROD]', 'Sales Helper for the field team [PROD]'],
    ['Test 2', 'Sales Helper [Test 2]', 'Sales Helper for the field team [Test 2]'],
    ['', 'Sales Helper', 'Sales Helper for the field team'],
    [null, 'Sales Helper [DEV]', 'Sales Helper for the field team [DEV]'],
];

describe('exportPackage: only the two names differ (matrix of package x suffix x layout)', () => {
    for (const [[vName, vOpts], [suffix, wantShort, wantFull], layout] of cases<[[string, PackageOpts], [string | null, string, string], (typeof LAYOUTS)[number]]>([variants, suffixes, LAYOUTS])) {
        it(`${vName} / ${JSON.stringify(suffix)} / ${layout}`, () => {
            const entries = packageEntries({ ...vOpts, manifest: { ...vOpts.manifest, layout } });
            const ctx = ctxFor(entries);
            const r = exportPackage(ctx, suffix);
            expect(r.ok).toBe(true);
            if (!r.ok) return;

            const out = unzipSync(r.bytes);
            // same names in the same order (directory entries included)
            expect(Object.keys(out)).toEqual(entries.map(e => e.name));
            for (const e of entries) {
                if (e.name === 'manifest.json') continue;
                expect(Array.from(out[e.name]!), e.name).toEqual(Array.from(e.data));
            }
            // the manifest: only the two values differ
            const oldText = dec.decode(entries[0]!.data);
            const newText = dec.decode(out['manifest.json']!);
            const expected = JSON.parse(oldText.replace(/^﻿/, ''));
            expected.name.short = wantShort;
            expected.name.full = wantFull;
            expect(JSON.parse(newText.replace(/^﻿/, ''))).toEqual(expected);
            expect(newText.charCodeAt(0) === 0xfeff).toBe(layout === 'bom');
            if (suffix === null) expect(newText).toBe(oldText);   // nothing typed: the manifest is not even re-written
        });
    }
});

describe('exportPackage: no change', () => {
    it('keeps every byte of every entry, the manifest included (FR-024)', () => {
        const entries = packageEntries({ extra: extras });
        const r = exportPackage(ctxFor(entries), null);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const out = unzipSync(r.bytes);
        for (const e of entries) expect(Array.from(out[e.name]!), e.name).toEqual(Array.from(e.data));
        expect(r.plan.changed).toBe(false);
    });

    it('typing the suffix the names already have is also no change', () => {
        const ctx = ctxFor(packageEntries());
        const r = planEdit(ctx, 'DEV');
        expect(r.ok && r.plan.changed).toBe(false);
        expect(r.ok && r.plan.text).toBe(ctx.manifestText);
    });
});

describe('exportPackage: deterministic bytes', () => {
    it('the same input gives the same bytes, twice', () => {
        const ctx = ctxFor(packageEntries({ extra: extras }));
        const a = exportPackage(ctx, 'UAT');
        const b = exportPackage(ctx, 'UAT');
        expect(a.ok && b.ok).toBe(true);
        if (a.ok && b.ok) expect(Array.from(a.bytes)).toEqual(Array.from(b.bytes));
    });

    it('every entry carries the fixed date 1980-01-01 00:00', () => {
        const r = exportPackage(ctxFor(packageEntries({ extra: extras })), 'UAT');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const dv = new DataView(r.bytes.buffer, r.bytes.byteOffset, r.bytes.byteLength);
        let found = 0;
        for (let i = 0; i + 46 <= r.bytes.length; i++) {
            if (dv.getUint32(i, true) === 0x02014b50) {
                expect(dv.getUint16(i + 12, true), 'time').toBe(0);
                expect(dv.getUint16(i + 14, true), 'date').toBe(0x0021);
                found++;
            }
        }
        expect(found).toBe(packageEntries({ extra: extras }).length);
    });

    it('the exported package can be read again by the tool', () => {
        const r = exportPackage(ctxFor(packageEntries({ extra: extras })), 'UAT');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const again = readPackage(r.bytes, 'out.zip');
        expect(again.ok).toBe(true);
        if (again.ok) expect(again.pkg.entries.map(e => e.path)).toEqual(packageEntries({ extra: extras }).map(e => e.name));
    });
});

describe('exportPackage: what blocks and what does not (FR-021)', () => {
    const long = 'A'.repeat(20);

    it('a suffix that makes the short name too long blocks, and says which check', () => {
        const ctx = ctxFor(packageEntries());
        const r = exportPackage(ctx, long);
        expect(r.ok).toBe(false);
        if (r.ok || r.reason !== 'blocked') throw new Error('expected a block');
        expect(r.blocking.map(c => c.id)).toEqual(['name.short.length']);
        expect(r.blocking[0]!.found).toContain('35');
    });

    it('a suffix that makes the full name too long blocks the full name check', () => {
        const ctx = ctxFor(packageEntries({ manifest: { nameFull: 'F'.repeat(88) + ' [DEV]' } }));
        const r = exportPackage(ctx, 'A'.repeat(10));
        expect(r.ok).toBe(false);
        if (!r.ok && r.reason === 'blocked') expect(r.blocking.map(c => c.id)).toEqual(['name.full.length']);
    });

    it('a name that was already too long does not block a rename (the user may need the copy)', () => {
        const ctx = ctxFor(packageEntries({ manifest: { nameShort: 'S'.repeat(40) + ' [DEV]' } }));
        const r = exportPackage(ctx, 'UAT');
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.remaining.map(c => c.id)).toEqual(['name.short.length']);
    });

    it('failures unrelated to the names never block, and are listed as remaining', () => {
        const ctx = ctxFor(packageEntries({ color: padPngTo(colorIcon(), 110 * 1024), manifest: { accent: 'nope' } }));
        const r = exportPackage(ctx, 'UAT');
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.remaining.map(c => c.id).sort()).toEqual(['accent.hex', 'color.weight']);
    });

    it('warnings are not failures', () => {
        const ctx = ctxFor(packageEntries({ color: padPngTo(colorIcon(), 80 * 1024) }));
        const r = exportPackage(ctx, 'UAT');
        expect(r.ok && r.remaining).toEqual([]);
    });

    it('the plan shows the block as the user types, before any export', () => {
        const ctx = ctxFor(packageEntries());
        const p = planEdit(ctx, long);
        expect(p.ok && p.plan.blocking.map(c => c.id)).toEqual(['name.short.length']);
        const q = planEdit(ctx, 'UAT');
        expect(q.ok && q.plan.blocking).toEqual([]);
    });

    it('clearing the suffix can fix a name that is too long', () => {
        const ctx = ctxFor(packageEntries({ manifest: { nameShort: 'S'.repeat(26) + ' [DEV]' } }));
        expect(ctx.checks.find(c => c.id === 'name.short.length')!.verdict).toBe('fail');
        const p = planEdit(ctx, '');
        expect(p.ok && p.plan.checks.find(c => c.id === 'name.short.length')!.verdict).toBe('pass');
    });
});

describe('exportPackage: names that are localisation keys (FR-030)', () => {
    it('are not changed; the literal one is; the plan reports null for the key', () => {
        const ctx = ctxFor(packageEntries({ manifest: { nameShort: '[[DA_Name]]' } }));
        const p = planEdit(ctx, 'UAT');
        expect(p.ok && [p.plan.short, p.plan.full]).toEqual([null, 'Sales Helper for the field team [UAT]']);
        const r = exportPackage(ctx, 'UAT');
        expect(r.ok).toBe(true);
        if (r.ok) expect(JSON.parse(dec.decode(unzipSync(r.bytes)['manifest.json']!)).name.short).toBe('[[DA_Name]]');
    });
});

describe('makeContext', () => {
    it('refuses a manifest that is not UTF-8 or not JSON, with a message', () => {
        for (const data of [new Uint8Array([0x7b, 0xff, 0x7d]), enc.encode('nope'), enc.encode('[]')]) {
            const read = readPackage(deflatedZip([{ name: 'manifest.json', data }]), 'a.zip');
            expect(read.ok).toBe(true);
            if (!read.ok) continue;
            const made = makeContext(read.pkg);
            expect(made.ok).toBe(false);
            if (!made.ok) expect(made.message.length).toBeGreaterThan(5);
        }
    });

    it('holds the checks of the package as loaded', () => {
        const ctx = ctxFor(packageEntries());
        expect(ctx.checks.length).toBe(18);
        expect(ctx.checks.every(c => c.verdict === 'pass')).toBe(true);
    });
});

describe('suggestFileName (FR-025)', () => {
    it.each([
        ['Agent.zip', 'UAT', 'Agent-UAT.zip'],
        ['Agent.ZIP', 'UAT', 'Agent-UAT.zip'],
        ['Agent', 'UAT', 'Agent-UAT.zip'],
        ['My Agent v2.zip', 'Test 2', 'My Agent v2-Test 2.zip'],
        ['Agent.zip', '', 'Agent-no-suffix.zip'],
        ['Agent.zip', '   ', 'Agent-no-suffix.zip'],
        ['Agent.zip', 'a<b>c:d"e/f\\g|h?i*j', 'Agent-abcdefghij.zip'],
        ['Agent.zip', '<>:"/\\|?*', 'Agent-no-suffix.zip'],
        ['Agent.zip', 'UAT.', 'Agent-UAT.zip'],
        ['Agent.zip', 'a\tb', 'Agent-ab.zip'],
        ['Agent.zip', null, 'Agent-copy.zip'],
        ['a.zip.zip', 'X', 'a.zip-X.zip'],
    ])('%j + %j = %j', (original, suffix, expected) => {
        expect(suggestFileName(original, suffix)).toBe(expected);
    });

    it('the original file is never the suggestion', () => {
        for (const s of [null, '', 'UAT']) expect(suggestFileName('Agent.zip', s)).not.toBe('Agent.zip');
    });

    it('the export carries the suggestion', () => {
        const r = exportPackage(ctxFor(packageEntries(), 'Sales.zip'), 'PROD');
        expect(r.ok && r.suggestedFileName).toBe('Sales-PROD.zip');
    });
});

describe('plan: the names as they will be', () => {
    it('follow the typed suffix, for any manifest layout', () => {
        for (const layout of LAYOUTS) {
            const m: ManifestOpts = { layout };
            const p = planEdit(ctxFor(packageEntries({ manifest: m })), 'UAT');
            expect(p.ok && [p.plan.short, p.plan.full]).toEqual(['Sales Helper [UAT]', 'Sales Helper for the field team [UAT]']);
        }
    });

    it('packageBytes and packageEntries describe the same package', () => {
        expect(Object.keys(unzipSync(packageBytes()))).toEqual(packageEntries().map(e => e.name));
        expect(buildManifest()).toContain('Sales Helper');
    });
});

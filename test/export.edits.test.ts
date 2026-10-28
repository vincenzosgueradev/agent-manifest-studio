/**
 * Feature 003, FR-005, FR-019 to FR-023, SC-002, SC-003, SC-005: edits layered on the package, read back
 * from the saved zip with the test helpers. The expected manifest is computed here, by hand.
 */
import { describe, expect, it } from 'vitest';
import { readPackage } from '../src/services/zip';
import { exportPackage, makeContext, planEdits, type EditContext } from '../src/services/export';
import { EMPTY, type Edits } from '../src/services/edit/edits';
import { packageEntries, colorIcon, type PackageOpts } from './helpers/fixture';
import { deflatedZip, unzipSync, type RawEntry } from './helpers/zip-builder';
import { encodePng, solidPng } from './helpers/png-encoder';
import { LAYOUTS, type Layout } from './helpers/manifest-builder';
import { cases } from './helpers/combinatorics';

const dec = new TextDecoder('utf-8', { ignoreBOM: true });
const enc = new TextEncoder();
const bom = (t: string): string => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

function ctxFor(o: PackageOpts = {}, extra: RawEntry[] = []): EditContext {
    const read = readPackage(deflatedZip([...packageEntries(o), ...extra]), 'agent.zip');
    if (!read.ok) throw new Error(read.code);
    const made = makeContext(read.pkg);
    if (!made.ok) throw new Error(made.message);
    return made.ctx;
}

const edits = (e: Partial<Edits>): Edits => ({ fields: {}, lists: {}, icons: {}, ...e });

/** A new 192x192 colour icon that differs from the fixture. */
const newColor = (): Uint8Array => encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 70 && x < 120 && y >= 70 && y < 120 ? [255, 255, 255, 255] : [0, 0, 0, 0]) });
const newOutline = (): Uint8Array => encodePng({ width: 32, height: 32, colorType: 6, pixel: (x, y) => (x >= 4 && x < 28 && y >= 4 && y < 28 ? [255, 255, 255, 255] : [0, 0, 0, 0]) });

function saved(ctx: EditContext, suffix: string | null, e: Edits): { files: Record<string, Uint8Array>; manifest: Record<string, any>; text: string } {
    const r = exportPackage(ctx, suffix, e);
    if (!r.ok) throw new Error(JSON.stringify(r));
    const files = unzipSync(r.bytes);
    const text = dec.decode(files['manifest.json']!);
    return { files, manifest: JSON.parse(bom(text)), text };
}

const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

interface Group { name: string; edits: () => Edits; expect: (m: Record<string, any>) => void; paths: string[]; icons?: string[] }

const groups: Group[] = [
    {
        name: 'descriptions', paths: ['description.short', 'description.full'],
        edits: () => edits({ fields: { 'description.short': 'Short text', 'description.full': 'Line one\nLine two "quoted"' } }),
        expect: m => { expect(m.description).toEqual({ short: 'Short text', full: 'Line one\nLine two "quoted"' }); },
    },
    {
        name: 'developer', paths: ['developer.name', 'developer.websiteUrl', 'developer.privacyUrl'],
        edits: () => edits({ fields: { 'developer.name': 'Fabrikam', 'developer.websiteUrl': 'https://fabrikam.test', 'developer.privacyUrl': 'https://fabrikam.test/p' } }),
        expect: m => { expect(m.developer).toEqual({ name: 'Fabrikam', websiteUrl: 'https://fabrikam.test', privacyUrl: 'https://fabrikam.test/p', termsOfUseUrl: 'https://example.com/terms' }); },
    },
    {
        name: 'terms of use removed', paths: ['developer.termsOfUseUrl'],
        edits: () => edits({ fields: { 'developer.termsOfUseUrl': '' } }),
        expect: m => { expect(m.developer).toEqual({ name: 'Contoso', websiteUrl: 'https://example.com', privacyUrl: 'https://example.com/privacy' }); },
    },
    {
        name: 'accent and version', paths: ['accentColor', 'version'],
        edits: () => edits({ fields: { accentColor: '#ABCDEF', version: '2.3.4' } }),
        expect: m => { expect(m.accentColor).toBe('#ABCDEF'); expect(m.version).toBe('2.3.4'); },
    },
    {
        name: 'lists', paths: ['validDomains', 'permissions', 'devicePermissions'],
        edits: () => edits({ lists: { validDomains: ['contoso.com', '*.fabrikam.test'], permissions: ['identity'], devicePermissions: ['media', 'notifications'] } }),
        expect: m => { expect(m.validDomains).toEqual(['contoso.com', '*.fabrikam.test']); expect(m.permissions).toEqual(['identity']); expect(m.devicePermissions).toEqual(['media', 'notifications']); },
    },
    {
        name: 'colour icon', paths: [], icons: ['color.png'],
        edits: () => edits({ icons: { color: newColor() } }),
        expect: () => undefined,
    },
    {
        name: 'both icons', paths: [], icons: ['color.png', 'outline.png'],
        edits: () => edits({ icons: { color: newColor(), outline: newOutline() } }),
        expect: () => undefined,
    },
    {
        name: 'everything', paths: ['name.short', 'description.short', 'developer.name', 'accentColor', 'version', 'validDomains'], icons: ['color.png'],
        edits: () => edits({ fields: { 'name.short': 'New name', 'description.short': 'D', 'developer.name': 'Dev', accentColor: '#000000', version: '9.9.9' }, lists: { validDomains: ['a.com'] }, icons: { color: newColor() } }),
        expect: m => { expect(m.name.short).toBe('New name'); expect(m.validDomains).toEqual(['a.com']); },
    },
];

describe('what is saved against what was loaded', () => {
    const all = cases<[Layout, Group]>([LAYOUTS, groups]);
    for (const [layout, g] of all) {
        it(`${layout} / ${g.name}`, () => {
            const ctx = ctxFor({ manifest: { layout, unknownBefore: { 'x-note': 'keep' }, unknownAfter: { custom: { deep: [1, { a: 'b' }] } } } }, [
                { name: 'assets/readme.txt', data: enc.encode('keep me exactly') },
            ]);
            const original = JSON.parse(bom(ctx.manifestText)) as Record<string, any>;
            const out = saved(ctx, null, g.edits());

            // 1. the manifest: every path outside the edited ones is the same value
            const touched = new Set(g.paths.map(p => p.split('.')[0]!));
            for (const key of Object.keys(original)) {
                if (!touched.has(key)) expect(out.manifest[key]).toEqual(original[key]);
            }
            g.expect(out.manifest);
            // 2. unknown entries survive, in place and as text
            expect(out.manifest['x-note']).toBe('keep');
            expect(out.manifest.custom).toEqual({ deep: [1, { a: 'b' }] });
            expect(Object.keys(out.manifest).filter(k => k in original)).toEqual(Object.keys(original).filter(k => k in out.manifest));
            // 3. every other file is identical, the replaced ones are the new bytes
            const before = unzipSync(deflatedZip([...packageEntries({ manifest: { layout } }), { name: 'assets/readme.txt', data: enc.encode('keep me exactly') }]));
            for (const [name, data] of Object.entries(before)) {
                if (name === 'manifest.json') continue;
                if (g.icons?.includes(name)) expect(same(out.files[name]!, data)).toBe(false);
                else expect(same(out.files[name]!, data)).toBe(true);
            }
            // 4. formatting is kept
            if (layout === 'bom') expect(out.text.charCodeAt(0)).toBe(0xfeff);
            if (layout === 'crlf') expect(out.text.replace(/\r\n/g, '')).not.toContain('\n');
            if (layout === 'compact') expect(out.text).not.toContain('\n');
        });
    }
});

describe('the Changes list equals the real differences', () => {
    for (const g of groups.filter(x => x.paths.length > 0)) {
        it(g.name, () => {
            const ctx = ctxFor({});
            const planned = planEdits(ctx, null, g.edits());
            expect(planned.ok).toBe(true);
            if (!planned.ok) return;
            const rows = planned.plan.changes.map(c => c.path).sort();
            // top-level arrays and optional removals appear under their own path
            expect(rows).toEqual([...g.paths].sort());
        });
    }

    it('says the old and the new value', () => {
        const ctx = ctxFor({});
        const planned = planEdits(ctx, null, edits({ fields: { version: '1.0.1' } }));
        if (!planned.ok) throw new Error('plan');
        expect(planned.plan.changes).toEqual([{ path: 'version', before: '1.0.0', after: '1.0.1' }]);
    });

    it('lists the replaced icons with both sizes', () => {
        const ctx = ctxFor({});
        const planned = planEdits(ctx, null, edits({ icons: { color: newColor() } }));
        if (!planned.ok) throw new Error('plan');
        const [c] = planned.plan.iconChanges;
        expect(c!.slot).toBe('color');
        expect(c!.path).toBe('color.png');
        expect(c!.before).toEqual({ width: 192, height: 192, bytes: colorIcon().length });
        expect(c!.after).toMatchObject({ width: 192, height: 192 });
    });
});

describe('nothing changes when nothing changed', () => {
    it('exports an identical copy for empty edits', () => {
        const ctx = ctxFor({});
        const out = saved(ctx, null, EMPTY);
        expect(out.text).toBe(ctx.manifestText);
    });

    it('typing the original values back is not a change', () => {
        const ctx = ctxFor({});
        const e = edits({ fields: { version: '1.0.0', accentColor: '#07687d', 'developer.name': 'Contoso' }, lists: { validDomains: [] } });
        const planned = planEdits(ctx, null, e);
        if (!planned.ok) throw new Error('plan');
        expect(planned.plan.changed).toBe(false);
        expect(saved(ctx, null, e).text).toBe(ctx.manifestText);
    });

    it('replacing an icon with its own bytes is not a change', () => {
        const ctx = ctxFor({});
        const planned = planEdits(ctx, null, edits({ icons: { color: colorIcon() } }));
        if (!planned.ok) throw new Error('plan');
        expect(planned.plan.changed).toBe(false);
        expect(planned.plan.iconChanges).toEqual([]);
    });
});

describe('invalid edits block, and are named', () => {
    const bad: Array<[string, Partial<Edits>, string]> = [
        ['short description over 80', { fields: { 'description.short': 'x'.repeat(81) } }, 'description.short'],
        ['empty required field', { fields: { 'description.full': '' } }, 'description.full'],
        ['developer name over 32', { fields: { 'developer.name': 'y'.repeat(33) } }, 'developer.name'],
        ['http link', { fields: { 'developer.websiteUrl': 'http://x.test' } }, 'developer.websiteUrl'],
        ['link with a space', { fields: { 'developer.privacyUrl': 'https://x.test/a b' } }, 'developer.privacyUrl'],
        ['bad colour', { fields: { accentColor: '#12345' } }, 'accentColor'],
        ['bad version', { fields: { version: 'one' } }, 'version'],
        ['domain with a scheme', { lists: { validDomains: ['https://x.com'] } }, 'validDomains'],
        ['duplicate domain', { lists: { validDomains: ['a.com', 'A.com'] } }, 'validDomains'],
        ['undocumented permission', { lists: { devicePermissions: ['camera'] } }, 'devicePermissions'],
    ];
    for (const [name, e, path] of bad) {
        it(name, () => {
            const ctx = ctxFor({});
            const r = exportPackage(ctx, null, edits(e));
            expect(r.ok).toBe(false);
            if (r.ok || r.reason !== 'blocked') throw new Error('expected blocked');
            expect(r.invalid.map(i => i.path)).toEqual([path]);
            expect(r.invalid[0]!.message.length).toBeGreaterThan(10);
        });
    }

    it('an invalid edit is left out of the preview, a valid one beside it is kept', () => {
        const ctx = ctxFor({});
        const planned = planEdits(ctx, null, edits({ fields: { version: 'nope', accentColor: '#111111' } }));
        if (!planned.ok) throw new Error('plan');
        expect(planned.plan.invalid.map(i => i.path)).toEqual(['version']);
        expect(planned.plan.manifest.appVersion).toBe('1.0.0');
        expect(planned.plan.manifest.accentColor).toBe('#111111');
    });

    it('equal short and full names are blocked by the existing check', () => {
        const ctx = ctxFor({});
        const r = exportPackage(ctx, null, edits({ fields: { 'name.full': 'Sales Helper [DEV]' } }));
        expect(r.ok).toBe(false);
        if (r.ok || r.reason !== 'blocked') throw new Error('expected blocked');
        expect(r.blocking.map(c => c.id)).toContain('name.distinct');
    });
});

describe('edits and the suffix together', () => {
    it('the suffix applies first, an edited name wins over it', () => {
        const ctx = ctxFor({});
        const out = saved(ctx, 'UAT', edits({ fields: { 'name.full': 'Custom full name' } }));
        expect(out.manifest.name).toEqual({ short: 'Sales Helper [UAT]', full: 'Custom full name' });
    });

    it('a name edit equal to the suffix result is not a second change', () => {
        const ctx = ctxFor({});
        const out = saved(ctx, 'UAT', edits({ fields: { 'name.short': 'Sales Helper [UAT]' } }));
        expect(out.manifest.name.short).toBe('Sales Helper [UAT]');
    });
});

describe('icons that the package did not have', () => {
    it('adds the entry and the manifest member when the manifest declares no colour icon', () => {
        const ctx = ctxFor({ manifest: { colorPath: null }, color: null });
        const out = saved(ctx, null, edits({ icons: { color: newColor() } }));
        expect(out.manifest.icons.color).toBe('color.png');
        expect(same(out.files['color.png']!, newColor())).toBe(true);
    });

    it('adds the entry at the declared path when the file is missing from the package', () => {
        const ctx = ctxFor({ color: null });
        expect(ctx.checks.find(c => c.id === 'color.present')!.verdict).toBe('fail');
        const planned = planEdits(ctx, null, edits({ icons: { color: newColor() } }));
        if (!planned.ok) throw new Error('plan');
        expect(planned.plan.checks.find(c => c.id === 'color.present')!.verdict).toBe('pass');   // the checks see the added icon
        const out = saved(ctx, null, edits({ icons: { color: newColor() } }));
        expect(out.manifest.icons.color).toBe('color.png');
        expect(same(out.files['color.png']!, newColor())).toBe(true);
    });

    it('keeps the declared path of an icon in a sub-folder', () => {
        const ctx = ctxFor({ manifest: { colorPath: 'assets/color.png' } });
        const out = saved(ctx, null, edits({ icons: { color: newColor() } }));
        expect(out.manifest.icons.color).toBe('assets/color.png');
        expect(same(out.files['assets/color.png']!, newColor())).toBe(true);
        expect(out.files['color.png']).toBeUndefined();
    });

    it('the checks and the preview see the new icon', () => {
        const ctx = ctxFor({ color: solidPng(100, 100, [1, 2, 3, 255]) });
        expect(ctx.checks.find(c => c.id === 'color.size-px')!.verdict).toBe('fail');
        const planned = planEdits(ctx, null, edits({ icons: { color: newColor() } }));
        if (!planned.ok) throw new Error('plan');
        expect(planned.plan.checks.find(c => c.id === 'color.size-px')!.verdict).toBe('pass');
        expect(planned.plan.icons.color.png!.kind).toBe('ok');
    });
});

describe('what the safety net refuses', () => {
    it('refuses a manifest that repeats an edited key, and says nothing was produced', () => {
        const dup = '{"version":"1.0.0","version":"2.0.0","name":{"short":"A"},"description":{"short":"a","full":"b"},"developer":{"name":"d"},"accentColor":"#000000","icons":{"color":"color.png","outline":"outline.png"}}';
        const ctx = ctxFor({ manifestText: dup });
        const r = exportPackage(ctx, null, edits({ fields: { version: '3.0.0' } }));
        expect(r.ok).toBe(false);
        if (r.ok || r.reason !== 'failed') throw new Error('expected failed');
        expect(r.message).toContain('repeats');
    });
});

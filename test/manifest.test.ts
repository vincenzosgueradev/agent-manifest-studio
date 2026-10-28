/**
 * FR-004, FR-005, FR-006, FR-030: reading the manifest.
 */
import { describe, expect, it } from 'vitest';
import { decodeManifest, parseManifest } from '../src/services/manifest';
import { buildManifest, DEFAULTS, LAYOUTS } from './helpers/manifest-builder';
import type { ManifestView } from '../src/types';

function read(text: string): ManifestView {
    const r = parseManifest(text);
    if (!r.ok) throw new Error(`expected a manifest, got ${r.code}`);
    return r.manifest;
}

describe('parseManifest: every item the tool shows', () => {
    const m = read(buildManifest({ permissions: ['identity'], validDomains: ['contoso.com', '*.example.com'], botIds: ['b1', 'b2'] }));

    it('names, descriptions and versions', () => {
        expect(m.nameShort.raw).toBe(DEFAULTS.nameShort);
        expect(m.nameFull.raw).toBe(DEFAULTS.nameFull);
        expect(m.descriptionShort).toBe(DEFAULTS.descShort);
        expect(m.descriptionFull).toBe(DEFAULTS.descFull);
        expect(m.appVersion).toBe('1.0.0');
        expect(m.manifestVersion).toBe('1.19');
        expect(m.schemaUrl).toContain('MicrosoftTeams.schema.json');
        expect(m.appId).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('developer, accent colour and icons as written', () => {
        expect(m.developer).toEqual({
            name: 'Contoso', websiteUrl: 'https://example.com',
            privacyUrl: 'https://example.com/privacy', termsOfUseUrl: 'https://example.com/terms',
        });
        expect(m.accentColor).toBe('#07687d');
        expect(m.icons).toEqual({ color: 'color.png', outline: 'outline.png', color32x32: null });
    });

    it('bot ids, permissions and valid domains', () => {
        expect(m.botIds).toEqual(['b1', 'b2']);
        expect(m.permissions).toEqual(['identity']);
        expect(m.validDomains).toEqual(['contoso.com', '*.example.com']);
    });

    it('permissions and valid domains are null (not declared) when absent', () => {
        const none = read(buildManifest());
        expect(none.permissions).toBeNull();
        expect(none.validDomains).toBeNull();
    });

    it('the optional small colour icon is shown when declared', () => {
        expect(read(buildManifest({ color32Path: 'c32.png' })).icons.color32x32).toBe('c32.png');
    });

    it('a complete manifest has nothing missing and nothing unknown', () => {
        expect(m.missingKeys).toEqual([]);
        expect(m.unknownKeys).toEqual([]);
    });
});

describe('parseManifest: layouts give the same reading', () => {
    it.each(LAYOUTS)('%s', layout => {
        const a = read(buildManifest({ layout: 'indent2' }));
        const b = read(buildManifest({ layout }));
        expect(b).toEqual(a);
    });

    it('unicode escapes are decoded', () => {
        const m = read(buildManifest({ nameShort: 'Caffè ☕ [DEV]', unicodeEscapes: true }));
        expect(m.nameShort.raw).toBe('Caffè ☕ [DEV]');
    });
});

describe('parseManifest: missing and unknown entries are named (FR-006)', () => {
    const required = [
        'name.short', 'description.short', 'description.full', 'icons.color', 'icons.outline',
        'accentColor', 'developer.name', 'version', 'id', 'manifestVersion',
    ];
    it.each(required)('missing %s', path => {
        const m = read(buildManifest({ omit: [path] }));
        expect(m.missingKeys).toEqual([path]);
    });

    it('a missing short name has kind "missing"', () => {
        const m = read(buildManifest({ nameShort: null }));
        expect(m.nameShort.kind).toBe('missing');
        expect(m.nameShort.raw).toBe('');
        expect(m.nameFull.kind).toBe('literal');
    });

    it('unknown top-level keys are listed in document order, known ones are not', () => {
        const m = read(buildManifest({ unknownBefore: { zebra: 1 }, unknownAfter: { alpha: { x: 1 } }, decoyNested: true }));
        expect(m.unknownKeys).toEqual(['zebra', 'alpha']);
    });

    it('several missing keys are all named', () => {
        const m = read(buildManifest({ omit: ['accentColor', 'icons.outline'] }));
        expect([...m.missingKeys].sort()).toEqual(['accentColor', 'icons.outline']);
    });
});

describe('parseManifest: localisation keys (FR-030)', () => {
    it('[[KEY]] is a key, not a name', () => {
        const m = read(buildManifest({ nameShort: '[[DA_Name]]', nameFull: '[[DA_Full]]' }));
        expect(m.nameShort).toMatchObject({ kind: 'localisationKey', raw: '[[DA_Name]]', suffix: '', hasBrackets: false });
        expect(m.nameFull.kind).toBe('localisationKey');
    });
    it('one key and one literal name are told apart', () => {
        const m = read(buildManifest({ nameShort: '[[DA_Name]]' }));
        expect([m.nameShort.kind, m.nameFull.kind]).toEqual(['localisationKey', 'literal']);
    });
    it('a key followed by text is not a pure key', () => {
        expect(read(buildManifest({ nameShort: '[[KEY]] [DEV]' })).nameShort.kind).toBe('literal');
    });
});

describe('parseManifest: names carry their suffix', () => {
    it('base, separator and suffix come from the name', () => {
        const m = read(buildManifest());
        expect(m.nameShort).toMatchObject({ base: 'Sales Helper', suffix: 'DEV', separator: ' ', hasBrackets: true, kind: 'literal' });
        expect(m.nameFull).toMatchObject({ base: 'Sales Helper for the field team', suffix: 'DEV' });
    });
});

describe('parseManifest: refusals', () => {
    it.each([
        ['', 'not-json'],
        ['not json', 'not-json'],
        ['{"a":', 'not-json'],
        ['{a:1}', 'not-json'],
        ['[]', 'not-object'],
        ['"text"', 'not-object'],
        ['42', 'not-object'],
        ['null', 'not-object'],
        ['true', 'not-object'],
    ])('%j gives %s', (text, code) => {
        const r = parseManifest(text);
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.code).toBe(code);
            expect(r.message.length).toBeGreaterThan(5);
        }
    });

    it('never throws on odd shapes', () => {
        for (const text of [
            '{}', '{"name":null}', '{"name":"x"}', '{"name":{"short":5}}', '{"icons":[]}', '{"bots":"x"}',
            '{"bots":[null,1,{"botId":7}]}', '{"permissions":"x"}', '{"validDomains":[1,2]}', '{"developer":5}',
            '{"description":{"short":null}}', '﻿{}', '{"accentColor":{}}',
        ]) {
            expect(() => parseManifest(text), text).not.toThrow();
        }
    });
});

describe('decodeManifest', () => {
    it('keeps the byte-order mark so re-encoding gives the same bytes', () => {
        const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x7d]);
        const text = decodeManifest(bytes)!;
        expect(text.charCodeAt(0)).toBe(0xfeff);
        expect(Array.from(new TextEncoder().encode(text))).toEqual(Array.from(bytes));
    });
    it('refuses bytes that are not UTF-8 instead of replacing them', () => {
        expect(decodeManifest(new Uint8Array([0x7b, 0xff, 0x7d]))).toBeNull();
    });
});

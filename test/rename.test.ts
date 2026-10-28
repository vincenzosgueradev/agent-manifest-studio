/**
 * FR-023: the export changes the two name values and nothing else. The oracle is the manifest
 * builder of the tests (an independent serializer) and a text comparison around the name object.
 */
import { describe, expect, it } from 'vitest';
import { locateNames } from '../src/services/manifest';
import { applySuffix } from '../src/services/rename';
import { buildManifest, LAYOUTS, type ManifestOpts } from './helpers/manifest-builder';
import { cases } from './helpers/combinatorics';

const SHORT = 'Sales Helper [DEV]';
const FULL = 'Sales Helper for the field team [DEV]';

const fixtures: Array<[string, ManifestOpts]> = [
    ['plain', {}],
    ['decoy name object before the real one', { decoyNested: true }],
    ['full before short', { fullFirst: true }],
    ['unknown keys around', { unknownBefore: { aaa: { name: { short: 'no' } } }, unknownAfter: { zzz: [1, 2, { name: 'x' }] } }],
    ['unicode escapes in the file', { unicodeEscapes: true, nameShort: 'Caffè ☕ [DEV]', nameFull: 'Caffè ☕ per il team [DEV]' }],
    ['quotes and backslashes in the names', { nameShort: 'Say "hi" \\ [DEV]', nameFull: 'Say "hi" \\ to all [DEV]' }],
    ['a description that looks like a name object', { descShort: 'He said "name": {"short":"zzz"}', descFull: '"name":{"short":"a","full":"b"}' }],
];
const suffixes = ['', 'UAT', 'PROD', 'Test 2', 'a"b\\c', 'é☕'];

/** [text before the real name object, the object, text after] - found without parsing the name. */
function aroundNameObject(text: string): [string, string, string] {
    const all = [...text.matchAll(/"name"\s*:\s*\{[^{}]*\}/g)];
    const m = all[all.length - 1]!;
    return [text.slice(0, m.index), m[0], text.slice(m.index! + m[0].length)];
}

const strip = (t: string) => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

describe('applySuffix: matrix of layout x fixture x suffix', () => {
    for (const [layout, [fixtureName, fixture], suffix] of cases<[(typeof LAYOUTS)[number], [string, ManifestOpts], string]>([LAYOUTS, fixtures, suffixes])) {
        it(`${layout} / ${fixtureName} / ${JSON.stringify(suffix)}`, () => {
            const opts: ManifestOpts = { ...fixture, layout };
            const text = buildManifest(opts);
            const r = applySuffix(text, suffix);
            expect(r.ok).toBe(true);
            if (!r.ok) return;

            const baseShort = (opts.nameShort ?? SHORT).replace(/ \[DEV\]$/, '');
            const baseFull = (opts.nameFull ?? FULL).replace(/ \[DEV\]$/, '');
            const wantShort = suffix === '' ? baseShort : `${baseShort} [${suffix}]`;
            const wantFull = suffix === '' ? baseFull : `${baseFull} [${suffix}]`;
            expect(r.short).toBe(wantShort);
            expect(r.full).toBe(wantFull);

            // 1. every byte outside the name object is the same
            const [b0, , a0] = aroundNameObject(text);
            const [b1, obj1, a1] = aroundNameObject(r.text);
            expect(b1).toBe(b0);
            expect(a1).toBe(a0);
            // 2. the name object holds exactly the two new values, in the original key order
            const parsed = JSON.parse(obj1.slice(obj1.indexOf('{')));
            expect(Object.keys(parsed)).toEqual(opts.fullFirst ? ['full', 'short'] : ['short', 'full']);
            expect(parsed).toEqual({ short: wantShort, full: wantFull });
            // 3. the whole manifest, parsed, equals the old one with only the two values replaced
            const expected = JSON.parse(strip(text));
            expected.name.short = wantShort;
            expected.name.full = wantFull;
            expect(JSON.parse(strip(r.text))).toEqual(expected);
            // 4. layout details survive: BOM and line endings
            expect(r.text.charCodeAt(0) === 0xfeff).toBe(layout === 'bom');
            expect(r.text.includes('\r\n')).toBe(layout === 'crlf');
        });
    }

    it('without unicode escapes the result is byte-identical to a manifest built with the new names', () => {
        for (const layout of LAYOUTS) {
            const r = applySuffix(buildManifest({ layout }), 'UAT');
            expect(r.ok && r.text).toBe(buildManifest({ layout, nameShort: 'Sales Helper [UAT]', nameFull: 'Sales Helper for the field team [UAT]' }));
        }
    });
});

describe('applySuffix: no change is no change', () => {
    it('typing the suffix the names already have gives the very same text', () => {
        for (const layout of LAYOUTS) {
            const text = buildManifest({ layout, unicodeEscapes: true, nameShort: 'Caffè [DEV]', nameFull: 'Caffè per tutti [DEV]' });
            const r = applySuffix(text, 'DEV');
            expect(r.ok && r.text).toBe(text);
        }
    });

    it('a name without a suffix gets one appended in brackets', () => {
        const r = applySuffix(buildManifest({ nameShort: 'Sales', nameFull: 'Sales Helper' }), 'UAT');
        expect(r.ok && [r.short, r.full]).toEqual(['Sales [UAT]', 'Sales Helper [UAT]']);
    });

    it('names that are localisation keys are left alone; the other one changes (FR-030)', () => {
        const text = buildManifest({ nameShort: '[[DA_Name]]' });
        const r = applySuffix(text, 'UAT');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.short).toBeNull();
        expect(r.full).toBe('Sales Helper for the field team [UAT]');
        expect(JSON.parse(r.text).name.short).toBe('[[DA_Name]]');
        const both = applySuffix(buildManifest({ nameShort: '[[A]]', nameFull: '[[B]]' }), 'UAT');
        expect(both.ok && [both.short, both.full, both.text]).toEqual([null, null, buildManifest({ nameShort: '[[A]]', nameFull: '[[B]]' })]);
    });

    it('a missing name is not invented', () => {
        const text = buildManifest({ nameFull: null });
        const r = applySuffix(text, 'UAT');
        expect(r.ok && [r.short, r.full]).toEqual(['Sales Helper [UAT]', null]);
        expect(r.ok && JSON.parse(r.text).name).toEqual({ short: 'Sales Helper [UAT]' });
    });
});

describe('locateNames: finds the real literals, nothing else', () => {
    it('spans cover exactly the quoted values of the top-level name object', () => {
        const text = buildManifest({ decoyNested: true, descShort: '"name":{"short":"x"}' });
        const spans = locateNames(text);
        expect(spans.ok).toBe(true);
        if (!spans.ok) return;
        expect(JSON.parse(text.slice(spans.short!.start, spans.short!.end))).toBe(SHORT);
        expect(JSON.parse(text.slice(spans.full!.start, spans.full!.end))).toBe(FULL);
    });

    it('a duplicated key in the name object, or a second name object, is refused', () => {
        for (const text of [
            '{"name":{"short":"A","short":"B","full":"C"}}',
            '{"name":{"short":"A","full":"C","full":"D"}}',
            '{"name":{"short":"A"},"name":{"short":"B"}}',
        ]) {
            const r = locateNames(text);
            expect(r.ok, text).toBe(false);
            if (!r.ok) expect(r.code).toBe('duplicate-name-key');
        }
    });

    it('a manifest without a name object has no spans; a broken one is not-json', () => {
        const none = locateNames('{"id":"x"}');
        expect(none.ok && [none.short, none.full]).toEqual([null, null]);
        const bad = locateNames('{"name":{"short":"A"');
        expect(bad.ok).toBe(false);
        if (!bad.ok) expect(bad.code).toBe('not-json');
        expect(locateNames('[]').ok).toBe(true);   // not an object: nothing to find, nothing to change
    });

    it('a name that is not a string is not a span', () => {
        const r = locateNames('{"name":{"short":5,"full":null}}');
        expect(r.ok && [r.short, r.full]).toEqual([null, null]);
    });

    it('escaped quotes and braces inside strings do not confuse it', () => {
        const text = '{"description":{"short":"a \\" } {"},"name":{"short":"x\\"}y","full":"z"}}';
        const r = locateNames(text);
        expect(r.ok).toBe(true);
        if (r.ok) expect(JSON.parse(text.slice(r.short!.start, r.short!.end))).toBe('x"}y');
    });
});

describe('applySuffix: the safety net', () => {
    it('refuses when the located spans do not give the expected result', () => {
        const text = buildManifest();
        // a tokenizer that points one character off must not produce a manifest
        const shifted = (t: string) => {
            const r = locateNames(t);
            if (!r.ok) return r;
            return { ...r, short: { start: r.short!.start + 1, end: r.short!.end + 1 }, full: r.full };
        };
        const r = applySuffix(text, 'UAT', shifted);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('integrity');
    });

    it('refuses when a span covers more than the name value', () => {
        const text = buildManifest();
        const wide = (t: string) => {
            const r = locateNames(t);
            if (!r.ok) return r;
            return { ...r, short: { start: r.short!.start - 9, end: r.short!.end }, full: r.full };
        };
        expect(applySuffix(text, 'UAT', wide).ok).toBe(false);
    });

    it('passes the duplicate-key refusal on', () => {
        const r = applySuffix('{"name":{"short":"A [DEV]","short":"B"}}', 'UAT');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('duplicate-name-key');
    });

    it('a manifest that is not JSON is refused with its own code', () => {
        const r = applySuffix('{ not json', 'UAT');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('not-json');
    });
});

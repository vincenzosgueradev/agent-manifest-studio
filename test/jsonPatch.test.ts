/** Feature 003: editing members of manifest.json as text. The oracle is written here, not taken from src/. */
import { describe, expect, it } from 'vitest';
import { patchText, verifyPatch, type Op } from '../src/services/edit/jsonPatch';
import { buildManifest, LAYOUTS, type Layout } from './helpers/manifest-builder';
import { cases } from './helpers/combinatorics';

const bom = (t: string): string => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
const parse = (t: string): Record<string, any> => JSON.parse(bom(t));

/** The expected parsed result, computed by hand-written code with no part of src/. */
function expected(before: string, ops: Op[]): unknown {
    const o = parse(before);
    for (const op of ops) {
        const [a, b] = op.path;
        const remove = 'remove' in op;
        if (b === undefined) {
            if (remove) delete o[a!]; else o[a!] = (op as any).value;
        } else {
            if (remove) { if (o[a!]) delete o[a!][b]; } else { (o[a!] ??= {})[b] = (op as any).value; }
        }
    }
    return o;
}

const apply = (text: string, ops: Op[]): string => {
    const r = patchText(text, ops);
    if (!r.ok) throw new Error(r.message);
    return r.text;
};

describe('replace a value', () => {
    for (const layout of LAYOUTS) {
        it(`replaces a top-level string in ${layout}`, () => {
            const before = buildManifest({ layout });
            const out = apply(before, [{ path: ['version'], value: '2.0.0' }]);
            expect(parse(out)).toEqual(expected(before, [{ path: ['version'], value: '2.0.0' }]));
            // everything outside the value is byte for byte the same
            expect(out.replace('"2.0.0"', '"1.0.0"')).toBe(before);
        });

        it(`replaces a nested string in ${layout}`, () => {
            const before = buildManifest({ layout });
            const out = apply(before, [{ path: ['developer', 'name'], value: 'Fabrikam "Inc"' }]);
            expect(parse(out).developer.name).toBe('Fabrikam "Inc"');
            expect(out.replace(JSON.stringify('Fabrikam "Inc"'), '"Contoso"')).toBe(before);
        });
    }

    it('writes quotes, backslashes, line breaks and characters above U+FFFF so that they read back as typed', () => {
        const before = buildManifest({});
        const tricky = 'a "b" \\ c\nd\te \u{1F600} è';
        const out = apply(before, [{ path: ['description', 'full'], value: tricky }]);
        expect(parse(out).description.full).toBe(tricky);
    });
});

describe('add a member', () => {
    for (const layout of LAYOUTS) {
        it(`adds an array to the top level in ${layout}`, () => {
            const before = buildManifest({ layout });
            const ops: Op[] = [{ path: ['validDomains'], value: ['contoso.com', 'b.example.com'] }];
            const out = apply(before, ops);
            expect(parse(out)).toEqual(expected(before, ops));
            // the original text is a prefix-and-suffix of the new text around the insertion
            const key = out.indexOf('"validDomains"');
            expect(key).toBeGreaterThan(0);
            expect(out.replace(/,\s*"validDomains"[\s\S]*?\]/, '')).toBe(before);
        });

        it(`adds an optional member to a nested object in ${layout}`, () => {
            const before = buildManifest({ layout, omit: ['developer.termsOfUseUrl'] });
            const ops: Op[] = [{ path: ['developer', 'termsOfUseUrl'], value: 'https://example.com/terms' }];
            const out = apply(before, ops);
            expect(parse(out)).toEqual(expected(before, ops));
        });
    }

    it('creates a parent object that is missing', () => {
        const before = buildManifest({ omit: ['developer'] });
        const ops: Op[] = [{ path: ['developer', 'name'], value: 'Contoso' }];
        const out = apply(before, ops);
        expect(parse(out)).toEqual(expected(before, ops));
    });

    it('adds into an empty object', () => {
        const before = '{ "name": {}, "version": "1.0.0" }';
        const ops: Op[] = [{ path: ['name', 'short'], value: 'X' }];
        expect(parse(apply(before, ops))).toEqual({ name: { short: 'X' }, version: '1.0.0' });
        const compact = '{"name":{},"version":"1.0.0"}';
        expect(apply(compact, ops)).toBe('{"name":{"short":"X"},"version":"1.0.0"}');
    });

    it('adds to the compact layout without inventing spaces', () => {
        const before = buildManifest({ layout: 'compact' });
        const out = apply(before, [{ path: ['validDomains'], value: ['a.com'] }]);
        expect(out).not.toContain('\n');
        expect(out).toContain('"validDomains":["a.com"]');
    });
});

describe('remove a member', () => {
    for (const layout of LAYOUTS) {
        for (const key of ['first', 'middle', 'last'] as const) {
            it(`removes the ${key} member of the developer object in ${layout}`, () => {
                const before = buildManifest({ layout });
                const field = { first: 'name', middle: 'websiteUrl', last: 'termsOfUseUrl' }[key];
                const ops: Op[] = [{ path: ['developer', field], remove: true }];
                const out = apply(before, ops);
                expect(parse(out)).toEqual(expected(before, ops));
            });
        }
    }

    it('removing a member that is not there changes nothing', () => {
        const before = buildManifest({});
        expect(apply(before, [{ path: ['validDomains'], remove: true }])).toBe(before);
        expect(apply(before, [{ path: ['developer', 'nothing'], remove: true }])).toBe(before);
        expect(apply(before, [{ path: ['nothing', 'x'], remove: true }])).toBe(before);
    });

    it('removes the only member of an object', () => {
        const before = '{"a":{"x":1},"b":2}';
        expect(apply(before, [{ path: ['a', 'x'], remove: true }])).toBe('{"a":{},"b":2}');
    });

    it('removes a top-level array and keeps the neighbours', () => {
        const before = buildManifest({ validDomains: ['a.com'], permissions: ['identity'] });
        const ops: Op[] = [{ path: ['validDomains'], remove: true }];
        const out = apply(before, ops);
        expect(parse(out)).toEqual(expected(before, ops));
        expect(parse(out).permissions).toEqual(['identity']);
    });
});

describe('arrays', () => {
    it('keeps a multi-line array multi-line and a one-line array on one line', () => {
        const multi = '{\n  "validDomains": [\n    "a.com",\n    "b.com"\n  ],\n  "version": "1"\n}';
        const out = apply(multi, [{ path: ['validDomains'], value: ['a.com', 'c.com'] }]);
        expect(out).toBe('{\n  "validDomains": [\n    "a.com",\n    "c.com"\n  ],\n  "version": "1"\n}');
        const one = '{ "validDomains": ["a.com", "b.com"], "version": "1" }';
        expect(apply(one, [{ path: ['validDomains'], value: ['x.com'] }])).toBe('{ "validDomains": ["x.com"], "version": "1" }');
    });

    it('keeps a one-line array on one line when it is inside an object', () => {
        const before = '{ "a": { "list": ["x", "y"], "n": 1 } }';
        expect(apply(before, [{ path: ['a', 'list'], value: ['z'] }])).toBe('{ "a": { "list": ["z"], "n": 1 } }');
        const multi = '{\n  "a": {\n    "list": [\n      "x"\n    ]\n  }\n}';
        expect(apply(multi, [{ path: ['a', 'list'], value: ['y', 'z'] }])).toBe('{\n  "a": {\n    "list": [\n      "y",\n      "z"\n    ]\n  }\n}');
    });

    it('writes an empty list as []', () => {
        const before = '{"validDomains":["a.com"],"v":1}';
        expect(apply(before, [{ path: ['validDomains'], value: [] }])).toBe('{"validDomains":[],"v":1}');
    });
});

describe('matrix: layout x operation x position', () => {
    const ops: Array<[string, Op[]]> = [
        ['replace version', [{ path: ['version'], value: '9.9.9' }]],
        ['replace short description', [{ path: ['description', 'short'], value: 'New short' }]],
        ['add and replace', [{ path: ['validDomains'], value: ['a.com'] }, { path: ['accentColor'], value: '#112233' }]],
        ['remove and add', [{ path: ['developer', 'termsOfUseUrl'], remove: true }, { path: ['devicePermissions'], value: ['media'] }]],
        ['many', [
            { path: ['name', 'short'], value: 'N' }, { path: ['description', 'full'], value: 'L\nM' },
            { path: ['developer', 'websiteUrl'], value: 'https://x.test' }, { path: ['permissions'], value: ['identity'] },
            { path: ['version'], value: '0.0.1' },
        ]],
    ];
    const all = cases<[Layout, [string, Op[]], boolean]>([LAYOUTS, ops, [false, true]]);
    for (const [layout, [name, list], escapes] of all) {
        it(`${layout} / ${name} / ${escapes ? 'escaped' : 'plain'}`, () => {
            const before = buildManifest({ layout, unicodeEscapes: escapes, unknownBefore: { 'x-note': 'keep è' }, unknownAfter: { custom: { deep: [1, 2, { a: 'b' }] } } });
            const out = apply(before, list);
            expect(parse(out)).toEqual(expected(before, list));
            expect(verifyPatch(before, out, list)).toBe(true);
            // unknown entries are untouched, as text
            expect(out).toContain(JSON.stringify({ deep: [1, 2, { a: 'b' }] }, null, layout === 'compact' ? undefined : 2).split('\n')[0]!.slice(0, 1));
            if (layout === 'bom') expect(out.charCodeAt(0)).toBe(0xfeff);
            if (layout === 'crlf') expect(out.replace(/\r\n/g, '')).not.toContain('\n');
        });
    }
});

describe('refusals', () => {
    it('refuses text that is not JSON', () => {
        expect(patchText('{ nope', [{ path: ['version'], value: '1' }]).ok).toBe(false);
        expect(patchText('[1,2]', [{ path: ['version'], value: '1' }]).ok).toBe(false);
    });

    it('refuses a repeated key in the edited object', () => {
        const dup = '{"version":"1","version":"2"}';
        const r = patchText(dup, [{ path: ['version'], value: '3' }]);
        expect(r.ok).toBe(false);
        const dupNested = '{"developer":{"name":"a","name":"b"}}';
        expect(patchText(dupNested, [{ path: ['developer', 'name'], value: 'c' }]).ok).toBe(false);
    });

    it('refuses to edit inside a member that is not an object', () => {
        expect(patchText('{"developer":"text"}', [{ path: ['developer', 'name'], value: 'x' }]).ok).toBe(false);
    });

    it('refuses a path that is too deep or empty', () => {
        expect(patchText('{"a":{"b":{"c":1}}}', [{ path: ['a', 'b', 'c'], value: 2 }]).ok).toBe(false);
        expect(patchText('{"a":1}', [{ path: [], value: 2 }]).ok).toBe(false);
    });

    it('a repeated key elsewhere does not stop an unrelated edit', () => {
        const text = '{"version":"1","other":{"x":1,"x":2}}';
        const r = patchText(text, [{ path: ['version'], value: '2' }]);
        expect(r.ok).toBe(true);
    });
});

describe('the safety net of patchText', () => {
    it('refuses a wrong splice even when the result is valid JSON', () => {
        const before = '{"a":"1","b":"2"}';
        const wrong = (): { ok: true; text: string } => ({ ok: true, text: '{"a":"9","b":"3"}' });   // changes b as well
        const r = patchText(before, [{ path: ['a'], value: '9' }], wrong);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.message).toContain('Nothing was produced');
        const right = (): { ok: true; text: string } => ({ ok: true, text: '{"a":"9","b":"2"}' });
        expect(patchText(before, [{ path: ['a'], value: '9' }], right).ok).toBe(true);
    });
});

describe('the safety net', () => {
    const before = '{"a":"1","b":"2"}';
    it('accepts the right result', () => {
        expect(verifyPatch(before, '{"a":"9","b":"2"}', [{ path: ['a'], value: '9' }])).toBe(true);
    });
    it('rejects a result that changed another value', () => {
        expect(verifyPatch(before, '{"a":"9","b":"3"}', [{ path: ['a'], value: '9' }])).toBe(false);
    });
    it('rejects a result that lost or gained a key', () => {
        expect(verifyPatch(before, '{"a":"9"}', [{ path: ['a'], value: '9' }])).toBe(false);
        expect(verifyPatch(before, '{"a":"9","b":"2","c":1}', [{ path: ['a'], value: '9' }])).toBe(false);
    });
    it('rejects a result that is not JSON', () => {
        expect(verifyPatch(before, '{"a":', [{ path: ['a'], value: '9' }])).toBe(false);
    });
    it('rejects the original when an edit was expected', () => {
        expect(verifyPatch(before, before, [{ path: ['a'], value: '9' }])).toBe(false);
    });
});

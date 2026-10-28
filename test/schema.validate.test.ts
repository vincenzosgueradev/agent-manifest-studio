/**
 * Feature 008: the validator, keyword by keyword. Expected messages, paths and counts are written from
 * specs/008-manifest-schema-validation/contracts/ui-contract.md with tiny schemas of their own.
 */
import { describe, expect, it } from 'vitest';
import { validate } from '../src/services/schema/validate';

type S = Record<string, unknown>;
const obj = (properties: S, extra: S = {}): S => ({ type: 'object', properties, ...extra });
const one = (data: unknown, schema: S) => {
    const r = validate(data, schema);
    expect(r.unsupported).toEqual([]);
    return r.problems;
};

describe('a valid value', () => {
    it('has no problem and counts what it compared', () => {
        const r = validate({ a: 'x', b: [1, 2] }, obj({ a: { type: 'string' }, b: { type: 'array', items: { type: 'integer' } } }));
        expect(r.problems).toEqual([]);
        expect(r.checked).toBe(1 + 1 + 1 + 2);   // the object, a, the array, its two items
    });
});

describe('what is counted', () => {
    it('only the values on the main path, not those compared inside oneOf or anyOf', () => {
        expect(validate('a', { anyOf: [{ type: 'string' }, { type: 'number' }] }).checked).toBe(1);
        expect(validate({ a: 1 }, { oneOf: [obj({ a: { type: 'number' } }), obj({ a: { type: 'string' } })] }).checked).toBe(1);
    });
    it('a node and the target of its $ref are one value', () => {
        const schema = { definitions: { g: { type: 'string' } }, ...obj({ id: { $ref: '#/definitions/g' } }) };
        expect(validate({ id: 'a' }, schema).checked).toBe(2);
    });
    it('a $ref with a keyword next to it checks both, as the validators of later drafts do', () => {
        const schema = { definitions: { g: { type: 'string' } }, ...obj({ id: { $ref: '#/definitions/g', maxLength: 2 } }) };
        expect(validate({ id: 'abc' }, schema).problems.map(p => p.keyword)).toEqual(['maxLength']);
    });
});

describe('required and additionalProperties', () => {
    const schema = obj({ name: { type: 'string' }, id: { type: 'string' } }, { required: ['name', 'id'], additionalProperties: false });

    it('a missing entry is blamed on its own path', () => {
        const [p, ...rest] = one({ name: 'x' }, schema);
        expect(rest).toEqual([]);
        expect(p).toMatchObject({ path: 'id', keyword: 'required', message: 'Missing the required entry "id".', expected: 'an entry "id"', found: 'not there' });
    });

    it('a nested missing entry has the dotted path', () => {
        const nested = obj({ developer: schema });
        expect(one({ developer: { id: 'x' } }, nested)[0]).toMatchObject({ path: 'developer.name', keyword: 'required' });
    });

    it('an unknown entry is blamed on itself, and lists the known ones', () => {
        const [p] = one({ name: 'x', id: 'y', extra: 1 }, schema);
        expect(p).toMatchObject({ path: 'extra', keyword: 'additionalProperties', message: '"extra" is not an entry of this schema here.', expected: 'one of: id, name', found: '"extra"' });
    });

    it('suggests a known entry within two edits, in any case, and not a far one', () => {
        expect(one({ name: 'x', id: 'y', nmae: 1 }, schema)[0]!.suggestion).toBe('Did you mean "name"?');
        expect(one({ name: 'x', id: 'y', NAME2: 1 }, schema)[0]!.suggestion).toBe('Did you mean "name"?');
        expect(one({ name: 'x', id: 'y', completelyElse: 1 }, schema)[0]!.suggestion).toBeNull();
        expect(one({ name: 'x', id: 'y', nmae: 1 }, schema)[0]!.suggestion).not.toBeNull();
        expect(one({ name: 'x', id: 'y', xyz: 1 }, schema)[0]!.suggestion).toBeNull();   // three edits from "id", four from "name"
    });

    it('without additionalProperties: false an unknown entry is fine', () => {
        expect(one({ a: 1 }, obj({}))).toEqual([]);
    });

    it('every problem of one object is reported, not the first only', () => {
        expect(one({ extra: 1, other: 2 }, schema).map(p => p.keyword).sort()).toEqual(['additionalProperties', 'additionalProperties', 'required', 'required']);
    });
});

describe('type', () => {
    const cases: Array<[string, unknown, string | null]> = [
        ['string', 'x', null], ['string', 1, 'number'], ['string', null, 'null'], ['string', [], 'array'], ['string', {}, 'object'], ['string', true, 'boolean'],
        ['integer', 3, null], ['integer', 3.5, 'number'], ['integer', '3', 'string'],
        ['number', 3.5, null], ['number', 'x', 'string'],
        ['boolean', false, null], ['boolean', 0, 'number'],
        ['array', [], null], ['array', {}, 'object'],
        ['object', {}, null], ['object', [], 'array'], ['object', null, 'null'],
        ['null', null, null], ['null', 0, 'number'],
    ];
    it.each(cases)('%s with %j', (type, value, found) => {
        const p = one(value, { type });
        if (found === null) expect(p).toEqual([]);
        else expect(p[0]).toMatchObject({ keyword: 'type', message: `Must be ${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}, not ${/^[aeiou]/.test(found) ? 'an' : 'a'} ${found}.`, expected: type, found });
    });

    it('a list of types accepts any of them and names them all', () => {
        expect(one(null, { type: ['boolean', 'null'] })).toEqual([]);
        expect(one(true, { type: ['boolean', 'null'] })).toEqual([]);
        expect(one('x', { type: ['boolean', 'null'] })[0]).toMatchObject({ expected: 'boolean or null', found: 'string' });
    });

    it('the problem is on the path of the value', () => {
        expect(one({ a: [1, 'x'] }, obj({ a: { type: 'array', items: { type: 'integer' } } }))[0]).toMatchObject({ path: 'a[1]', keyword: 'type' });
    });

    it('a keyword for another type is ignored (maxLength on a number)', () => {
        expect(one(5, { maxLength: 1 })).toEqual([]);
    });
});

describe('enum, const, pattern, format', () => {
    it('enum', () => {
        expect(one('a', { enum: ['a', 'b'] })).toEqual([]);
        expect(one('c', { enum: ['a', 'b'] })[0]).toMatchObject({ keyword: 'enum', message: 'Must be one of the allowed values.', expected: 'a, b', found: '"c"' });
        expect(one(1, { enum: ['1'] })).toHaveLength(1);
    });
    it('const', () => {
        expect(one('1.19', { const: '1.19' })).toEqual([]);
        expect(one('1.2', { const: '1.19' })[0]).toMatchObject({ keyword: 'const', message: 'Must be exactly "1.19".', expected: '"1.19"', found: '"1.2"' });
    });
    it('pattern is unanchored and says what it wants', () => {
        expect(one('abc123', { pattern: '[0-9]+' })).toEqual([]);
        expect(one('abc', { pattern: '[0-9]+' })[0]).toMatchObject({ keyword: 'pattern', message: 'Does not have the required form.', expected: 'the pattern /[0-9]+/', found: '"abc"' });
        expect(one('abc1', { pattern: '^[0-9]+$' })).toHaveLength(1);
    });
    it('format uri wants a scheme', () => {
        for (const ok of ['https://example.com', 'http://a.b/c?d=e', 'mailto:a@b.c']) expect(one(ok, { type: 'string', format: 'uri' }), ok).toEqual([]);
        for (const bad of ['example.com', 'not a url', '', '/relative/path', '://x', 'https:', 'a:']) {
            expect(one(bad, { type: 'string', format: 'uri' })[0], bad).toMatchObject({ keyword: 'format', message: 'Must be a web address (a URL).', expected: 'a URL such as https://example.com' });
        }
    });
    it('an unknown format is not an error of the data', () => {
        expect(one('x', { type: 'string', format: 'something-else' })).toEqual([]);
    });
});

describe('lengths, sizes and counts', () => {
    it('maxLength counts characters, not UTF-16 units', () => {
        expect(one('abcd', { maxLength: 4 })).toEqual([]);
        expect(one('abcde', { maxLength: 4 })[0]).toMatchObject({ keyword: 'maxLength', message: 'Is 5 characters long; the limit is 4.', expected: 'at most 4 characters', found: '5 characters' });
        expect(one('😀😀', { maxLength: 2 })).toEqual([]);
        expect(one('😀😀😀', { maxLength: 2 })).toHaveLength(1);
    });
    it('minLength', () => {
        expect(one('ab', { minLength: 2 })).toEqual([]);
        expect(one('a', { minLength: 2 })[0]).toMatchObject({ keyword: 'minLength', message: 'Is 1 character long; at least 2 are needed.', expected: 'at least 2 characters', found: '1 character' });
    });
    it('minimum and maximum include their limit', () => {
        expect(one(5, { minimum: 5, maximum: 5 })).toEqual([]);
        expect(one(6, { maximum: 5 })[0]).toMatchObject({ keyword: 'maximum', message: 'Is 6; the largest allowed is 5.', expected: 'at most 5', found: '6' });
        expect(one(4, { minimum: 5 })[0]).toMatchObject({ keyword: 'minimum', message: 'Is 4; the smallest allowed is 5.', expected: 'at least 5', found: '4' });
    });
    it('maxItems and minItems', () => {
        expect(one([1, 2], { maxItems: 2, minItems: 2 })).toEqual([]);
        expect(one([1, 2, 3], { maxItems: 2 })[0]).toMatchObject({ keyword: 'maxItems', message: 'Has 3 items; at most 2 are allowed.', expected: 'at most 2 items', found: '3 items' });
        expect(one([1], { minItems: 2 })[0]).toMatchObject({ keyword: 'minItems', message: 'Has 1 item; at least 2 are needed.', expected: 'at least 2 items', found: '1 item' });
    });
    it('uniqueItems compares by value', () => {
        expect(one([1, 2, 3], { uniqueItems: true })).toEqual([]);
        expect(one([{ a: 1 }, { a: 1 }], { uniqueItems: true })[0]).toMatchObject({ keyword: 'uniqueItems', message: 'The same item appears more than once.', expected: 'different items', found: 'a repeated item' });
        expect(one([1, '1'], { uniqueItems: true })).toEqual([]);
        expect(one([{ a: 1, b: 2 }, { b: 2, a: 1 }], { uniqueItems: true })).toHaveLength(1);
    });
    it('minProperties', () => {
        expect(one({ a: 1 }, { minProperties: 1 })).toEqual([]);
        expect(one({}, { minProperties: 1 })[0]).toMatchObject({ keyword: 'minProperties', message: 'Needs at least 1 entry.', expected: 'at least 1 entry', found: '0 entries' });
    });
});

describe('combinators, dependencies, $ref', () => {
    it('anyOf passes when one branch matches', () => {
        expect(one('a', { anyOf: [{ type: 'string' }, { type: 'number' }] })).toEqual([]);
    });
    it('anyOf with no right type says the types allowed, once', () => {
        const p = one(true, { anyOf: [{ type: 'string' }, { type: 'number' }] });
        expect(p).toHaveLength(1);
        expect(p[0]).toMatchObject({ keyword: 'anyOf', message: 'Does not match any of the 2 allowed shapes.', expected: 'string or number', found: 'boolean' });
    });
    it('anyOf with the right type shows the problems of the closest branch after the summary', () => {
        const schema = { anyOf: [obj({ a: { type: 'string' } }, { required: ['a', 'z'] }), obj({ b: { type: 'string' }, c: { type: 'string' } }, { required: ['b', 'c'] })] };
        const p = one({ b: 'x' }, schema);
        expect(p[0]).toMatchObject({ keyword: 'anyOf', message: 'Does not match any of the 2 allowed shapes.' });
        expect(p.slice(1).map(x => [x.path, x.keyword, x.inCombinator])).toEqual([['c', 'required', true]]);
    });
    it('oneOf needs exactly one', () => {
        const schema = { oneOf: [{ type: 'string' }, { type: 'string', maxLength: 2 }] };
        expect(one('abc', schema)).toEqual([]);   // only the first matches
        const both = one('a', schema);
        expect(both).toHaveLength(1);
        expect(both[0]).toMatchObject({ keyword: 'oneOf', message: 'Matches more than one of the allowed shapes; it must match exactly one.' });
        expect(one(1, schema)[0]).toMatchObject({ keyword: 'oneOf', message: 'Does not match any of the 2 allowed shapes.' });
    });
    it('not', () => {
        expect(one('a', { not: { enum: ['b'] } })).toEqual([]);
        expect(one('b', { not: { enum: ['b'] } })[0]).toMatchObject({ keyword: 'not', message: 'This value is not allowed here.', found: '"b"' });
    });
    it('if/then applies then only when if matches', () => {
        const schema = obj({ kind: {}, url: {} }, { if: { properties: { kind: { const: 'web' } }, required: ['kind'] }, then: { required: ['url'] } });
        expect(one({ kind: 'app' }, schema)).toEqual([]);
        expect(one({ kind: 'web', url: 'x' }, schema)).toEqual([]);
        expect(one({ kind: 'web' }, schema)[0]).toMatchObject({ path: 'url', keyword: 'required' });
    });
    it('dependencies do nothing while the key that triggers them is absent', () => {
        expect(one({}, { dependencies: { a: ['b'] } })).toEqual([]);
        expect(one({ c: 1 }, { dependencies: { a: { required: ['b'] } } })).toEqual([]);
        expect(one({ a: 1 }, { dependencies: { a: { required: ['b'] } } })[0]).toMatchObject({ path: 'b', keyword: 'required' });
    });
    it('dependencies (array form)', () => {
        const schema = { dependencies: { a: ['b'] } };
        expect(one({ a: 1, b: 2 }, schema)).toEqual([]);
        expect(one({ b: 2 }, schema)).toEqual([]);
        expect(one({ a: 1 }, schema)[0]).toMatchObject({ path: 'b', keyword: 'dependencies', message: '"a" needs "b" to be present too.', expected: 'an entry "b"', found: 'not there' });
    });
    it('$ref into definitions, and the description of the target is used', () => {
        const schema = { definitions: { guid: { type: 'string', pattern: '^[0-9a-f]{4}$', description: 'A four digit id.' } }, ...obj({ id: { $ref: '#/definitions/guid' } }) };
        expect(one({ id: 'abcd' }, schema)).toEqual([]);
        expect(one({ id: 'zz' }, schema)[0]).toMatchObject({ path: 'id', keyword: 'pattern', description: 'A four digit id.' });
    });
    it('the description of the entry itself wins over the one of its target', () => {
        const schema = { definitions: { s: { type: 'string', description: 'target' } }, ...obj({ x: { $ref: '#/definitions/s', description: 'own' } }) };
        expect(one({ x: 1 }, schema)[0]!.description).toBe('own');
    });
    it('a problem has the description of its schema entry, or null', () => {
        const schema = obj({ n: { type: 'string', maxLength: 1, description: 'The name.' }, m: { type: 'string', maxLength: 1 } });
        expect(one({ n: 'ab', m: 'ab' }, schema).map(p => [p.path, p.description])).toEqual([['n', 'The name.'], ['m', null]]);
    });
});

describe('what the validator does not know', () => {
    it('an unknown keyword is reported, never ignored', () => {
        expect(validate('x', { type: 'string', patternProperties: {} }).unsupported).toEqual(['patternProperties']);
        expect(validate('x', { type: 'string', multipleOf: 2 }).unsupported).toEqual(['multipleOf']);
    });
    it('annotation keywords are not unsupported', () => {
        expect(validate('x', { type: 'string', description: 'd', default: 'x', title: 't', $schema: 'u', 'x-source': 'u', definitions: {} }).unsupported).toEqual([]);
    });
    it('a $ref that is not a local definition is reported', () => {
        expect(validate('x', { $ref: 'http://elsewhere/schema.json' }).unsupported).toEqual(['$ref http://elsewhere/schema.json']);
        expect(validate('x', { $ref: '#/definitions/missing', definitions: {} }).unsupported).toEqual(['$ref #/definitions/missing']);
    });
});

describe('paths', () => {
    it('the root is (manifest) and indexes are in brackets', () => {
        expect(one(1, { type: 'string' })[0]!.path).toBe('(manifest)');
        expect(one({ bots: [{ scopes: ['x', 1] }] }, obj({ bots: { type: 'array', items: obj({ scopes: { type: 'array', items: { type: 'string' } } }) } }))[0]!.path).toBe('bots[0].scopes[1]');
    });
});

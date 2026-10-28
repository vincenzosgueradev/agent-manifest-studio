/** FR-018, FR-019: what counts as a suffix, and how a name is rebuilt around a new one. */
import { describe, expect, it } from 'vitest';
import { composeName, makeName, splitName, validateSuffix } from '../src/services/suffix';
import { SPLIT_TABLE } from './helpers/oracle';
import { cases } from './helpers/combinatorics';

describe('splitName against the hand-written table', () => {
    it.each(SPLIT_TABLE)('%j', (raw, base, separator, suffix, hasBrackets) => {
        expect(splitName(raw)).toEqual({ base, separator, suffix, hasBrackets });
    });
});

describe('splitName / composeName: matrix of base x ending', () => {
    const bases = ['', 'Sales', 'Sales Helper for the field team', 'Caffè Assistente', 'مساعد', 'x'.repeat(120), 'A [B]'];
    const endings = ['', ' [DEV]', '[DEV]', ' [A][B]', ' []', ' [' + 'x'.repeat(20) + ']', ' [' + 'x'.repeat(21) + ']', ' [a[b]]', '[DEV] ', '  [DEV]'];
    for (const [base, ending] of cases<[string, string]>([bases, endings])) {
        const raw = base + ending;
        it(`${JSON.stringify(raw.length > 40 ? raw.slice(0, 20) + '...' + raw.slice(-24) : raw)}`, () => {
            const p = splitName(raw);
            // a suffix is recognised only by the rule of FR-019, written here independently
            const m = /^([\s\S]*?)( ?)\[([^[\]]{1,20})\]$/.exec(raw);
            expect(p.hasBrackets).toBe(m !== null);
            if (m) {
                expect(p.suffix).toBe(m[3]);
                expect(p.separator).toBe(m[2]);
                expect(p.base).toBe(m[1]);
                expect(p.base + p.separator + '[' + p.suffix + ']').toBe(raw);
            } else {
                expect(p.base).toBe(raw);
                expect(p.suffix).toBe('');
            }
            // round trip: rebuilding with the suffix it already has gives the same name back
            expect(composeName(p, p.suffix)).toBe(p.hasBrackets ? raw : (p.suffix === '' ? raw : raw));
        });
    }
});

describe('composeName', () => {
    const named = (raw: string) => splitName(raw);
    it.each([
        ['Sales Helper [DEV]', 'UAT', 'Sales Helper [UAT]'],
        ['Sales Helper [DEV]', 'PROD', 'Sales Helper [PROD]'],
        ['Sales Helper[DEV]', 'UAT', 'Sales Helper[UAT]'],           // the original separator is kept
        ['Sales Helper [DEV]', '', 'Sales Helper'],                  // an empty suffix removes it, with its space
        ['Sales Helper  [DEV]', '', 'Sales Helper '],                // only one separator space belongs to the suffix
        ['Sales Helper', 'UAT', 'Sales Helper [UAT]'],               // none recognised: appended in brackets
        ['Sales Helper', '', 'Sales Helper'],
        ['Sales (DEV)', 'UAT', 'Sales (DEV) [UAT]'],                 // other separators are not suffixes
        ['', 'UAT', '[UAT]'],                                        // no leading space on an empty base
        [' [DEV]', 'UAT', ' [UAT]'],
        ['Sales [Test 2]', 'Test 3', 'Sales [Test 3]'],
    ])('%j + %j = %j', (raw, suffix, expected) => {
        expect(composeName(named(raw), suffix)).toBe(expected);
    });
});

describe('makeName', () => {
    it('a null value is a missing name', () => {
        expect(makeName(null)).toEqual({ raw: '', kind: 'missing', base: '', suffix: '', separator: '', hasBrackets: false });
    });
    it.each(['[[DA_Name]]', '[[x]]', '[[ a b ]]', '[[]]'])('%s is a localisation key', raw => {
        const n = makeName(raw);
        expect(n.kind).toBe('localisationKey');
        expect(n.suffix).toBe('');
        expect(n.base).toBe(raw);
    });
    it.each(['[[KEY]] [DEV]', '[x]', 'a [[KEY]]', '[[KEY]'])('%s is a literal name', raw => {
        expect(makeName(raw).kind).toBe('literal');
    });
    it('a literal name carries its parts', () => {
        expect(makeName('Sales [UAT]')).toEqual({ raw: 'Sales [UAT]', kind: 'literal', base: 'Sales', separator: ' ', suffix: 'UAT', hasBrackets: true });
    });
});

describe('validateSuffix: 0 to 20 characters, no square brackets, no control characters', () => {
    it.each([
        ['', ''], ['UAT', 'UAT'], ['  UAT  ', 'UAT'], ['Test 2', 'Test 2'], ['x'.repeat(20), 'x'.repeat(20)],
        ['é☕', 'é☕'], ['\u{1F600}'.repeat(20), '\u{1F600}'.repeat(20)],
    ])('accepts %j', (input, value) => {
        expect(validateSuffix(input)).toEqual({ ok: true, value });
    });

    it.each([
        ['x'.repeat(21)], ['[UAT]'], ['UAT]'], ['[UAT'], ['a\u0000b'], ['a\tb'], ['a\nb'], ['a\u007fb'], ['\u{1F600}'.repeat(21)],
    ])('rejects %j with a message', input => {
        const r = validateSuffix(input);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.message.length).toBeGreaterThan(10);
    });

    it('the limit is counted after trimming', () => {
        expect(validateSuffix(' ' + 'x'.repeat(20) + ' ').ok).toBe(true);
    });
});

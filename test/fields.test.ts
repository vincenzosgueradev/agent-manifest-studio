/** Feature 003: the rules of each field (FR-004, FR-007 to FR-009, FR-014 to FR-016), written from research.md, not from src/. */
import { describe, expect, it } from 'vitest';
import { bumpVersion, DEVICE_PERMISSION_VALUES, FIELDS, PERMISSION_VALUES, validateDomain, validateField, validatePermission, type FieldPath } from '../src/services/edit/fields';

const LIMITS: Array<[FieldPath, number, boolean]> = [
    ['name.short', 30, true], ['name.full', 100, false], ['description.short', 80, true], ['description.full', 4000, true],
    ['developer.name', 32, true],
    ['accentColor', 7, true], ['version', 256, true],
];

const sample = (path: FieldPath, n: number): string => {
    if (path === 'accentColor') return '#' + 'a'.repeat(n - 1);
    if (path === 'version') return n >= 5 ? '1.0.0' + '-' + 'a'.repeat(n - 6) : '1.0.0'.slice(0, n);
    if (path.endsWith('Url')) return 'https://x.test/' + 'a'.repeat(n - 15);
    return 'a'.repeat(n);
};

describe('limits', () => {
    for (const [path, max, required] of LIMITS) {
        it(`${path}: at the limit passes, one over fails`, () => {
            if (path === 'accentColor') {
                expect(validateField(path, '#aabbcc')).toBeNull();
                expect(validateField(path, '#aabbccd')).not.toBeNull();
                return;
            }
            expect(validateField(path, sample(path, max))).toBeNull();
            expect(validateField(path, sample(path, max + 1))).not.toBeNull();
        });
        it(`${path}: empty is ${required ? 'invalid' : 'allowed'}`, () => {
            expect(validateField(path, '') === null).toBe(!required);
        });
    }

    it('the table has the same fields and limits as this list', () => {
        expect(FIELDS.map(f => [f.path, f.max, f.required])).toEqual(LIMITS.map(([p, m, r]) => [p, m, r]));
    });

    it('counts characters, not bytes', () => {
        expect(validateField('developer.name', 'è'.repeat(32))).toBeNull();
        expect(validateField('developer.name', 'è'.repeat(33))).not.toBeNull();
    });
});

describe('accent colour', () => {
    for (const v of ['#000000', '#FFFFFF', '#07687d', '#aBcDeF']) it(`accepts ${v}`, () => expect(validateField('accentColor', v)).toBeNull());
    for (const v of ['000000', '#fff', '#12345', '#1234567', '#gggggg', 'red', 'rgb(0,0,0)', '#12 456']) it(`refuses ${v}`, () => expect(validateField('accentColor', v)).not.toBeNull());
});

describe('version', () => {
    for (const v of ['1.0.0', '0.0.1', '12.345.6789', '1.2.3-beta.1', '1.2.3+build.5']) it(`accepts ${v}`, () => expect(validateField('version', v)).toBeNull());
    for (const v of ['1', '1.0', '1.0.0.0', 'v1.0.0', '1.a.0', '2024-01', '1.0.0 ']) it(`refuses ${v}`, () => expect(validateField('version', v)).not.toBeNull());
});

describe('bumpVersion', () => {
    // expected values written by hand
    const table: Array<[string, 'patch' | 'minor', string | null]> = [
        ['1.2.3', 'patch', '1.2.4'], ['1.2.3', 'minor', '1.3.0'], ['0.0.0', 'patch', '0.0.1'], ['0.0.0', 'minor', '0.1.0'],
        ['9.9.9', 'patch', '9.9.10'], ['9.9.9', 'minor', '9.10.0'], ['1.0.99999', 'patch', null], ['1.99999.5', 'minor', null],
        ['1.0', 'patch', null], ['1.0', 'minor', null], ['1.2.3-beta', 'patch', null], ['2024-01', 'minor', null], ['', 'patch', null], ['1.0.0.0', 'patch', null],
        ['10.20.30', 'patch', '10.20.31'], ['10.20.30', 'minor', '10.21.0'],
    ];
    for (const [from, part, to] of table) {
        it(`${from} ${part} -> ${to ?? 'refused'}`, () => {
            const r = bumpVersion(from, part);
            if (to === null) {
                expect(r.ok).toBe(false);
                if (!r.ok) expect(r.reason.length).toBeGreaterThan(10);
            } else {
                expect(r).toEqual({ ok: true, value: to });
            }
        });
    }

    it('the result is always a valid version', () => {
        for (const v of ['1.0.0', '3.14.15', '0.9.9']) for (const part of ['patch', 'minor'] as const) {
            const r = bumpVersion(v, part);
            expect(r.ok && validateField('version', r.value) === null).toBe(true);
        }
    });
});

describe('valid domains (Teams rules, research.md section 2)', () => {
    const ok = ['contoso.com', 'a.b.example.co.uk', '*.example.com', '*.*.domain.com', 'sub-domain.example.org', 'EXAMPLE.com', '1.example.com'];
    const bad: Array<[string, string]> = [
        ['', 'empty'], ['   ', 'spaces only'], ['localhost', 'one part'], ['https://x.com', 'scheme'], ['x.com/path', 'path'], ['x.com:8080', 'port'],
        ['foo.*.myteam.domain.com', 'wildcard not first'], ['*foo.com', 'wildcard inside a part'], ['*.com', 'wildcard with one fixed part'], ['*', 'wildcard alone'],
        ['-bad.com', 'leading hyphen'], ['bad-.com', 'trailing hyphen'], ['ba d.com', 'space'], ['a..com', 'empty part'], ['*.onmicrosoft.com', 'outside control'],
        ['x'.repeat(2049) + '.com', 'too long'],
    ];
    for (const v of ok) it(`accepts ${v}`, () => expect(validateDomain(v, [])).toBeNull());
    for (const [v, why] of bad) it(`refuses ${JSON.stringify(v.slice(0, 20))} (${why})`, () => expect(validateDomain(v, [])).not.toBeNull());

    it('names the reason: a scheme, a path and a port each get their own message', () => {
        expect(validateDomain('https://x.com', [])).toContain('without https://');
        expect(validateDomain('x.com/path', [])).toContain('without a path');
        expect(validateDomain('x.com:8080', [])).toContain('without a port');
    });

    it('refuses a duplicate whatever its case', () => {
        expect(validateDomain('Contoso.com', ['contoso.com'])).not.toBeNull();
        expect(validateDomain('other.com', ['contoso.com'])).toBeNull();
    });

    it('refuses the 101st entry', () => {
        const hundred = Array.from({ length: 100 }, (_, i) => `d${i}.example.com`);
        expect(validateDomain('d100.example.com', hundred.slice(0, 99))).toBeNull();
        expect(validateDomain('d100.example.com', hundred)).not.toBeNull();
    });
});

describe('permissions (research.md section 1)', () => {
    it('lists exactly the documented values', () => {
        expect([...PERMISSION_VALUES].sort()).toEqual(['identity', 'messageTeamMembers']);
        expect([...DEVICE_PERMISSION_VALUES].sort()).toEqual(['geolocation', 'media', 'midi', 'notifications', 'openExternal']);
    });
    it('accepts a documented value not yet present, refuses the rest', () => {
        expect(validatePermission('devicePermissions', 'media', [])).toBeNull();
        expect(validatePermission('devicePermissions', 'media', ['media'])).not.toBeNull();
        expect(validatePermission('devicePermissions', 'camera', [])).not.toBeNull();
        expect(validatePermission('permissions', 'media', [])).not.toBeNull();
        expect(validatePermission('permissions', 'identity', [])).toBeNull();
    });
    it('keeps within the schema counts', () => {
        expect(validatePermission('permissions', 'messageTeamMembers', ['identity'])).toBeNull();
        expect(validatePermission('devicePermissions', 'midi', ['geolocation', 'media', 'notifications', 'openExternal'])).toBeNull();
    });
});

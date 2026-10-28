/** The checks report: the same package gives the same report, and it holds what was checked. */
import { describe, expect, it } from 'vitest';
import { buildReport, reportFileName, reportText } from '../src/services/report';
import { makeContext } from '../src/services/export';
import { readPackage } from '../src/services/zip';
import { packageBytes } from './helpers/fixture';
import { padPngTo } from './helpers/png-encoder';
import { colorIcon } from './helpers/fixture';

function ctxFor(opts = {}, name = 'Sales.zip') {
    const read = readPackage(packageBytes(opts), name);
    if (!read.ok) throw new Error(read.code);
    const made = makeContext(read.pkg);
    if (!made.ok) throw new Error(made.message);
    return made.ctx;
}

describe('buildReport', () => {
    it('names the tool, the package and the app, and counts the verdicts', () => {
        const ctx = ctxFor({ color: padPngTo(colorIcon(), 80 * 1024), manifest: { nameShort: 'x'.repeat(31) } });
        const r = buildReport('Sales.zip', ctx.manifest, ctx.checks, '1.2.3');
        expect(r.tool).toBe('Agent Manifest Studio');
        expect(r.version).toBe('1.2.3');
        expect(r.package).toBe('Sales.zip');
        expect(r.app).toEqual({ id: '11111111-2222-3333-4444-555555555555', version: '1.0.0', shortName: 'x'.repeat(31), fullName: 'Sales Helper for the field team [DEV]' });
        expect(r.summary).toEqual({ pass: ctx.checks.length - 3, warning: 2, fail: 1 });   // the 31-letter name is also over the 30 of the schema
    });

    it('lists every check with its verdict, found value, rule and what is not proven', () => {
        const ctx = ctxFor();
        const r = buildReport('a.zip', ctx.manifest, ctx.checks, '0.0.0');
        expect(r.checks.map(c => c.id)).toEqual(ctx.checks.map(c => c.id));
        for (const c of r.checks) {
            expect(Object.keys(c).sort()).toEqual(['expected', 'found', 'id', 'label', 'notProven', 'verdict']);
            expect(c.notProven.length).toBeGreaterThan(10);
        }
    });

    it('is the same for the same package, with no date or machine information', () => {
        const a = reportText(buildReport('a.zip', ctxFor().manifest, ctxFor().checks, '1.0.0'));
        const b = reportText(buildReport('a.zip', ctxFor().manifest, ctxFor().checks, '1.0.0'));
        expect(a).toBe(b);
        expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
        expect(a).not.toMatch(/[A-Z]:\\/);
    });

    it('text is indented JSON that ends with a newline and reads back to the same report', () => {
        const ctx = ctxFor();
        const r = buildReport('a.zip', ctx.manifest, ctx.checks, '1.0.0');
        const text = reportText(r);
        expect(text.endsWith('}\n')).toBe(true);
        expect(text).toContain('\n  "tool"');
        expect(JSON.parse(text)).toEqual(r);
    });
});

describe('reportFileName', () => {
    it.each([
        ['Sales.zip', 'Sales-checks.json'],
        ['Sales.ZIP', 'Sales-checks.json'],
        ['Sales', 'Sales-checks.json'],
        ['a b.zip', 'a b-checks.json'],
    ])('%j gives %j', (input, expected) => {
        expect(reportFileName(input)).toBe(expected);
    });
});

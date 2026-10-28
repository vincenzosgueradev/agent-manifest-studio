// @vitest-environment jsdom
/**
 * Feature 008 on the real page: the Manifest schema card, the check row, the report and the reaction to edits.
 * Texts and ids come from specs/008-manifest-schema-validation/contracts/ui-contract.md.
 */
import { describe, expect, it } from 'vitest';
import { boot, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const text = (id: string): string => $(id).textContent ?? '';
const URL19 = 'https://developer.microsoft.com/en-us/json-schemas/teams/v1.19/MicrosoftTeams.schema.json';

async function loaded(opts: Parameters<typeof packageBytes>[0] = {}): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(opts));
    return ui;
}

const problems = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('#schema-body .sch-problem')];
const groups = (): string[] => [...document.querySelectorAll('#schema-body .sch-group')].map(g => g.getAttribute('data-group')!);

describe('a manifest that follows its schema', () => {
    it('says so, with the version, the address and how much was compared', async () => {
        await loaded();
        expect($('schema').closest('#step-checks')).not.toBeNull();
        expect(text('schema-headline')).toBe('The manifest follows schema v1.19');
        expect(text('schema-version')).toBe('v1.19');
        expect(text('schema-url')).toBe(URL19);
        expect(text('schema-checked')).toMatch(/^\d+ entries compared with the schema$/);
        expect(Number(/^(\d+)/.exec(text('schema-checked'))![1])).toBeGreaterThan(15);
        expect(text('schema-chip')).toBe('follows v1.19');
        expect(problems()).toHaveLength(0);
    });

    it('has a copy button for the address and says what it does not prove', async () => {
        await loaded();
        const copy = document.querySelector<HTMLElement>('#schema [data-copy]');
        expect(copy!.getAttribute('data-copy')).toBe(URL19);
        expect(text('schema-proof')).toContain('does not prove');
        expect(text('schema-proof')).toContain('Teams');
    });

    it('is before the automatic checks in the same step', async () => {
        await loaded();
        const order = [...document.querySelectorAll('#step-checks > section')].map(s => s.id);
        expect(order.indexOf('schema')).toBeLessThan(order.indexOf('checks'));
    });

    it('has a check row that passes', async () => {
        await loaded();
        const row = document.querySelector('#checks-body [data-check-id="schema.valid"]')!;
        expect(row.getAttribute('data-verdict')).toBe('pass');
        expect(row.textContent).toContain('Manifest follows its JSON schema');
    });
});

describe('how the manifest is written', () => {
    it('a byte order mark, CRLF lines and a compact layout do not matter', async () => {
        for (const layout of ['bom', 'crlf', 'compact', 'indent4'] as const) {
            await loaded({ manifest: { layout } });
            expect(text('schema-headline'), layout).toBe('The manifest follows schema v1.19');
        }
    });
});

describe('a manifest with problems', () => {
    it('counts them, groups them by the top-level entry and explains each one', async () => {
        await loaded({ manifest: { unknownAfter: { acentColor: '#fff', zzzzzzzz: 1 }, omit: ['developer.privacyUrl'] } });
        expect(text('schema-headline')).toBe('3 problems against schema v1.19');
        expect(text('schema-chip')).toBe('3 problems');
        expect(groups().sort()).toEqual(['acentColor', 'developer', 'zzzzzzzz']);
        const dev = problems().find(p => p.querySelector('.sch-path')!.textContent === 'developer.privacyUrl')!;
        expect(dev.querySelector('.sch-message')!.textContent).toBe('Missing the required entry "privacyUrl".');
        expect(dev.textContent).toContain('Expected');
        expect(dev.textContent).toContain('an entry "privacyUrl"');
        expect(dev.textContent).toContain('Found');
        expect(dev.textContent).toContain('not there');
        expect(dev.textContent).toContain('Schema says');
    });

    it('says "1 problem" for one, and suggests the entry that was meant', async () => {
        await loaded({ manifest: { unknownAfter: { acentColor: '#fff' } } });
        expect(text('schema-headline')).toBe('1 problem against schema v1.19');
        const p = problems()[0]!;
        expect(p.querySelector('.sch-message')!.textContent).toBe('"acentColor" is not an entry of this schema here.');
        expect(p.querySelector('.sch-hint')!.textContent).toBe('Did you mean "accentColor"?');
    });

    it('a far-off unknown entry has no suggestion', async () => {
        await loaded({ manifest: { unknownAfter: { zzzzzzzzzz: 1 } } });
        expect(document.querySelector('#schema-body .sch-hint')).toBeNull();
    });

    it('the check row is a warning, never a failure, and the package can still be saved', async () => {
        const ui = await loaded({ manifest: { unknownAfter: { acentColor: '#fff' } } });
        const row = document.querySelector('#checks-body [data-check-id="schema.valid"]')!;
        expect(row.getAttribute('data-verdict')).toBe('warning');
        expect(row.textContent).toContain('1 problem against v1.19');
        await ui.click('export-btn');
        expect(ui.fakes.saved).toHaveLength(1);
    });

    it('a problem that is a limit says by how much', async () => {
        await loaded({ manifest: { nameShort: 'x'.repeat(31) } });
        const p = problems().find(x => x.querySelector('.sch-path')!.textContent === 'name.short')!;
        expect(p.querySelector('.sch-message')!.textContent).toBe('Is 31 characters long; the limit is 30.');
    });

    it('the problems can be copied as text', async () => {
        await loaded({ manifest: { unknownAfter: { acentColor: '#fff' } } });
        const copy = $('schema-copy-problems');
        expect(copy.getAttribute('data-copy')).toContain('acentColor');
        expect(copy.getAttribute('data-copy')).toContain('is not an entry of this schema here.');
        expect(copy.getAttribute('data-copy')).toContain('Did you mean "accentColor"?');
    });
});

describe('it follows the edits', () => {
    it('is worked out on the manifest as it will be saved: fixing the short name clears the problem', async () => {
        const ui = await loaded({ manifest: { nameShort: 'x'.repeat(31) } });
        expect(text('schema-headline')).toBe('1 problem against schema v1.19');
        await ui.type('ed-name.short', 'Sales Helper');
        expect(text('schema-headline')).toBe('The manifest follows schema v1.19');
        expect(problems()).toHaveLength(0);
    });
});

describe('versions and notes', () => {
    it('a manifestVersion with no schema is not validated, and the card names the ones that are', async () => {
        for (const v of ['1.18', '1.31', 'abc', '2.0']) {
            await loaded({ manifest: { manifestVersion: v } });
            expect(text('schema-headline'), v).toBe('The manifest was not validated');
            expect(text('schema-chip'), v).toBe('not validated');
            expect(text('schema-notes'), v).toContain('1.10 to 1.17 and 1.19 to 1.30');
            expect(problems(), v).toHaveLength(0);
            expect(document.querySelector('#checks-body [data-check-id="schema.valid"]')!.getAttribute('data-verdict'), v).toBe('warning');
        }
    });

    it('1.18 is said not to exist', async () => {
        await loaded({ manifest: { manifestVersion: '1.18' } });
        expect(text('schema-notes')).toContain('Microsoft does not publish a schema 1.18');
    });

    it('a missing manifestVersion is checked against the newest schema, with a note', async () => {
        await loaded({ manifest: { manifestVersion: null } });
        expect(text('schema-version')).toBe('v1.30');
        expect(text('schema-notes')).toContain('does not say its manifestVersion');
        expect(problems().some(p => p.querySelector('.sch-path')!.textContent === 'manifestVersion')).toBe(true);
    });

    it('a $schema address of another version than manifestVersion gets a note', async () => {
        await loaded({ manifest: { schemaUrl: 'https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json' } });
        expect(text('schema-notes')).toContain('$schema points to v1.17 but manifestVersion is 1.19');
        expect(text('schema-version')).toBe('v1.19');
    });

    it('a matching $schema address has no note, and neither has a missing one', async () => {
        await loaded();
        expect(document.querySelectorAll('#schema-notes .sch-note')).toHaveLength(0);
        await loaded({ manifest: { schemaUrl: null } });
        expect(document.querySelectorAll('#schema-notes .sch-note')).toHaveLength(0);
    });

    it('every bundled version validates a package of that version', async () => {
        for (const v of ['1.10', '1.17', '1.19', '1.22', '1.24', '1.30']) {
            await loaded({ manifest: { manifestVersion: v, schemaUrl: null } });
            expect(text('schema-version'), v).toBe(`v${v}`);
            expect(text('schema-url'), v).toBe(`https://developer.microsoft.com/en-us/json-schemas/teams/v${v}/MicrosoftTeams.schema.json`);
        }
    });
});

describe('the report', () => {
    it('holds a schema section with the version, the state and the problems', async () => {
        const ui = await loaded({ manifest: { unknownAfter: { acentColor: '#fff' } } });
        await ui.click('save-report-btn');
        const report = JSON.parse(ui.fakes.saved[0]!.text!);
        expect(report.schema).toMatchObject({ state: 'invalid', version: '1.19', url: URL19, checked: expect.any(Number) });
        expect(report.schema.problems).toHaveLength(1);
        expect(report.schema.problems[0]).toMatchObject({ path: 'acentColor', keyword: 'additionalProperties', suggestion: 'Did you mean "accentColor"?' });
        expect(report.checks.map((c: { id: string }) => c.id)).toContain('schema.valid');
    });

    it('says valid, with no problems, for a manifest that follows its schema', async () => {
        const ui = await loaded();
        await ui.click('save-report-btn');
        const report = JSON.parse(ui.fakes.saved[0]!.text!);
        expect(report.schema).toMatchObject({ state: 'valid', problems: [] });
    });
});

describe('after removing the package', () => {
    it('the card is empty', async () => {
        const ui = await loaded();
        await ui.click('remove-btn');
        expect($('schema-body').children).toHaveLength(0);
    });
});

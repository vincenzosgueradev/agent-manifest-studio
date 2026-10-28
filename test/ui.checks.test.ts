// @vitest-environment jsdom
/** FR-011, FR-016, FR-017 on the real page. */
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const row = (id: string) => document.querySelector<HTMLElement>(`[data-check-id="${id}"]`)!;

describe('the checks region', () => {
    it('shows one row per check with verdict, found value, rule and what is not proven', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const rows = document.querySelectorAll('[data-check-id]');
        expect(rows.length).toBe(19);
        const r = row('name.short.length');
        expect(r.dataset.verdict).toBe('pass');
        expect(r.textContent).toContain('18 characters');              // "Sales Helper [DEV]"
        expect(r.textContent).toContain('at most 30 characters');
        expect(r.textContent).toContain('Does not prove the name is free');   // the column "Does not prove", no need to expand
        expect(r.querySelector('details')).toBeNull();
        expect(r.querySelector('.col-status')).not.toBeNull();                 // status, check, found; rule and limits under them
        expect(ui.text('checks-summary')).toBe('19 passed, 0 with a warning, 0 failed.');
    });

    it('verdicts differ by shape and by word, not only by colour', async () => {
        const ui = await boot();
        // weight warning (80 KB), name failure (31 chars), everything else passes
        const { padPngTo } = await import('./helpers/png-encoder');
        const { colorIcon } = await import('./helpers/fixture');
        await ui.open('a.zip', packageBytes({ color: padPngTo(colorIcon(), 80 * 1024), manifest: { nameShort: 'x'.repeat(31) } }));
        const classOf = (id: string) => row(id).querySelector('.ind')!.className;
        expect(classOf('color.present')).toContain('ind--pass');
        expect(classOf('color.weight')).toContain('ind--warning');
        expect(classOf('name.short.length')).toContain('ind--fail');
        expect(new Set(['color.present', 'color.weight', 'name.short.length'].map(classOf)).size).toBe(3);
        expect(row('color.present').textContent).toContain('Pass');
        expect(row('color.weight').textContent).toContain('Warning');
        expect(row('name.short.length').textContent).toContain('Fail');
        expect(ui.text('checks-summary')).toBe('16 passed, 2 with a warning, 1 failed.');
    });

    it('a declared icon that is not in the package fails and names the file (FR-017)', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ outline: null }));
        const r = row('outline.present');
        expect(r.dataset.verdict).toBe('fail');
        expect(r.textContent).toContain('outline.png');
        expect(r.textContent).toContain('not in the package');
    });

    it('long found values are truncated with the full text in title', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: 'x'.repeat(20) } }));
        const found = row('name.short.length').querySelector<HTMLElement>('.check-found')!;
        expect(found.title).toBe('20 characters');
    });

    it('uses no emoji anywhere on the checks', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(ui.text('checks')).not.toMatch(/\p{Extended_Pictographic}/u);
    });
});

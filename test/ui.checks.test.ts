// @vitest-environment jsdom
/** FR-011, FR-016, FR-017 on the real page. */
import { describe, expect, it } from 'vitest';
import { boot, flush } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';
import { encodePng } from './helpers/png-encoder';

const row = (id: string) => document.querySelector<HTMLElement>(`[data-check-id="${id}"]`)!;

/** A colour icon whose glyph fills almost the whole canvas: well outside the safe area (specs/011-automatic-check-fixes). */
const badSafeAreaColorIcon = (): Uint8Array => encodePng({
    width: 192, height: 192, colorType: 6,
    pixel: (x, y) => (x < 10 || x >= 182 || y < 10 || y >= 182 ? [0, 0, 0, 0] : [255, 255, 255, 255]),
});

async function clickFix(id: string): Promise<void> {
    document.querySelector<HTMLElement>(`[data-fix="${id}"]`)!.click();
    await flush();
}

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

describe('one-click fixes (specs/011-automatic-check-fixes)', () => {
    it('"Fix it" on a safe-area warning turns the whole colour-icon group green and shows Undo', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: badSafeAreaColorIcon() }));
        expect(row('color.safe-area').dataset.verdict).not.toBe('pass');
        expect(document.getElementById('checks-undo')!.hidden).toBe(true);

        await clickFix('color.safe-area');

        for (const id of ['color.size-px', 'color.square', 'color.safe-area', 'color.format', 'color.weight']) {
            expect(row(id).dataset.verdict, id).toBe('pass');
        }
        const undo = document.getElementById('checks-undo')!;
        expect(undo.hidden).toBe(false);
        expect(undo.textContent).toContain('colour icon');
        expect(document.getElementById('checks-undo-btn')).not.toBeNull();
    });

    it('"Fix it" on a too-long short name cuts it to exactly 30 characters', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: 'x'.repeat(40) } }));
        expect(row('name.short.length').dataset.verdict).toBe('fail');

        await clickFix('name.short.length');

        expect(row('name.short.length').dataset.verdict).toBe('pass');
        expect(ui.$<HTMLInputElement>('ed-name.short').value).toBe('x'.repeat(30));
    });

    it('"Fix it" on a missing accent colour sets a valid one and the row turns green', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { accent: null } }));
        expect(row('accent.hex').dataset.verdict).toBe('fail');

        await clickFix('accent.hex');

        expect(row('accent.hex').dataset.verdict).toBe('pass');
    });

    it('"Undo" restores the checks exactly as they were before the fix', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: badSafeAreaColorIcon() }));
        await clickFix('color.safe-area');
        expect(row('color.safe-area').dataset.verdict).toBe('pass');

        await ui.click('checks-undo-btn');

        expect(row('color.safe-area').dataset.verdict).not.toBe('pass');
        expect(document.getElementById('checks-undo')!.hidden).toBe(true);
    });

    it('"Fix everything" fixes every fixable row, leaves an unfixable one untouched, and then hides itself', async () => {
        const ui = await boot();
        // a fixable colour-icon problem, a fixable long name, plus an unfixable one (outline file missing)
        await ui.open('a.zip', packageBytes({ color: badSafeAreaColorIcon(), outline: null, manifest: { nameShort: 'x'.repeat(40) } }));
        const fixAll = document.getElementById('checks-fix-all-btn')!;
        expect(fixAll.hidden).toBe(false);

        fixAll.click();
        await flush();

        expect(row('color.safe-area').dataset.verdict).toBe('pass');
        expect(row('name.short.length').dataset.verdict).toBe('pass');
        expect(row('outline.present').dataset.verdict).toBe('fail');   // out of the tool's reach: untouched
        expect(document.getElementById('checks-undo')!.hidden).toBe(false);
        expect(document.getElementById('checks-fix-all-btn')!.hidden).toBe(true);
    });
});

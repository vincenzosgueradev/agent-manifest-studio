// @vitest-environment jsdom
/** Added after the first mutation run (see hardening.test.ts). */
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { colorIcon, packageBytes } from './helpers/fixture';
import { padPngTo } from './helpers/png-encoder';

const input = () => document.getElementById('suffix-input') as HTMLInputElement;
const exportBtn = () => document.getElementById('export-btn') as HTMLButtonElement;

describe('the input starts with the suffix the package has', () => {
    it('taken from the full name when the short name has none', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: 'Sales', nameFull: 'Sales Helper [DEV]' } }));
        expect(input().value).toBe('DEV');
    });
    it('empty when neither name has one', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: 'Sales', nameFull: 'Sales Helper' } }));
        expect(input().value).toBe('');
    });
});

describe('failures the package already had are visible before anything is typed', () => {
    it('listed under the export button', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: padPngTo(colorIcon(), 110 * 1024) }));
        expect(ui.text('export-remaining')).toContain('Colour icon weight');
    });
});

describe('an unusable suffix never reaches the export, even if the button is forced', () => {
    it('forcing the click saves nothing', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', '[bad]');
        expect(exportBtn().disabled).toBe(true);
        exportBtn().disabled = false;   // what a script or a broken browser could do
        await ui.click('export-btn');
        expect(ui.fakes.saved).toHaveLength(0);
    });
});

describe('an icon the manifest does not declare says so', () => {
    it('instead of claiming it is missing from the package', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { omit: ['icons.outline'], outlinePath: 'outline.png' }, outline: null }));
        expect(ui.text('preview-outline-problem')).toContain('does not declare');
        expect(ui.text('preview-outline-problem')).not.toContain('not in the package');
    });
});

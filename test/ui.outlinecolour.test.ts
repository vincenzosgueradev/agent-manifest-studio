// @vitest-environment jsdom
/**
 * The colour that can be tried on the outline icon (a preview, never saved), on the real page.
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

async function loaded(opts: Parameters<typeof packageBytes>[0] = {}): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(opts));
    return ui;
}

describe('the colour to try on the outline icon', () => {
    const bar = (ui: Ui) => ui.pixels($('ed-img-onbar-outline') as HTMLCanvasElement)!;
    const centre = (p: { data: Uint8ClampedArray; width: number }) => Array.from(p.data.slice((16 * p.width + 16) * 4, (16 * p.width + 16) * 4 + 3));

    it('shows the shape on the app bar in the colour of the picker, and the file is not touched', async () => {
        const ui = await loaded();
        const picker = $('ed-img-bar-colour') as HTMLInputElement;
        expect(picker.type).toBe('color');
        expect(picker.getAttribute('aria-label')).toContain('not saved');
        expect(centre(bar(ui))).toEqual([91, 95, 199]);                   // Teams purple by default
        picker.value = '#00aa55';
        picker.dispatchEvent(new Event('input', { bubbles: true }));
        await flush(3);
        expect(centre(bar(ui))).toEqual([0, 170, 85]);
        expect($('changes-none')).not.toBeNull();                         // nothing changed in the package
        expect($('ed-img-outline').getAttribute('data-changed')).toBe('false');
        expect($('ed-img-white-outline')).not.toBeNull();                 // the file stays the white shape that Teams asks for
    });

    it('the corner of the tile is the colour of the bar, not the colour tried', async () => {
        const ui = await loaded();
        const p = bar(ui);
        expect(p.data[3]).toBe(255);
        expect(Array.from(p.data.slice(0, 3))).not.toEqual([91, 95, 199]);
    });

    it('is not on the colour icon card', async () => {
        await loaded();
        expect(document.querySelector('#ed-img-color #ed-img-bar-colour')).toBeNull();
    });
});

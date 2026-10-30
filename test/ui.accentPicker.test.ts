// @vitest-environment jsdom
/**
 * Feature 013 on the real page: the accent colour taken from a pixel of the colour icon, from the Look step (the
 * accent row and the colour icon card) and from the image editor. Expected texts and ids come from
 * specs/013-accent-from-picture/contracts/ui-contract.md.
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { colorIcon, packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const btn = (id: string) => $(id) as HTMLButtonElement;
const overlay = (): HTMLElement | null => document.getElementById('ap-overlay');
const isOpen = (): boolean => !!overlay() && !overlay()!.hidden;
const accent = (): string => ($('ed-accentColor') as HTMLInputElement).value.toLowerCase();

/** The icon: a white square at 66..125 on a solid orange (255, 136, 0) background. */
const ORANGE: [number, number, number, number] = [255, 136, 0, 255];

async function loaded(color: Uint8Array | null = colorIcon(ORANGE)): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(color === null ? {} : { color }));
    return ui;
}

/** Makes the popup canvas 192 x 192 on screen, so that a client point is a pixel of the picture. */
function click(x: number, y: number): void {
    const canvas = $('ap-canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 192, height: 192, right: 192, bottom: 192, x: 0, y: 0, toJSON: () => ({}) });
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
}

describe('opening from the Look step', () => {
    it('is closed until asked', async () => {
        await loaded();
        expect(isOpen()).toBe(false);
    });

    for (const id of ['ed-accent-from-picture', 'ed-img-accent-color']) {
        it(`${id} opens the popup with Use this colour switched off`, async () => {
            const ui = await loaded();
            await ui.click(id);
            expect(isOpen()).toBe(true);
            expect(btn('ap-use').disabled).toBe(true);
            expect($('ap-now-hex').textContent).toBe('#07687d');
            expect($('ap-lead').textContent).toContain('the colour icon');
        });
    }

    it('only the colour icon card has the button, not the outline icon card', async () => {
        await loaded();
        expect(document.querySelectorAll('#ed-img-color #ed-img-accent-color')).toHaveLength(1);
        expect(document.querySelectorAll('#ed-img-outline [id^="ed-img-accent"]')).toHaveLength(0);
    });

    it('the buttons are off, with the reason, when the package has no colour icon', async () => {
        const ui = await boot();   // an icon file that is not a PNG
        await ui.open('Bad.zip', packageBytes({ color: new Uint8Array([1, 2, 3, 4]) }));
        for (const id of ['ed-accent-from-picture', 'ed-img-accent-color']) {
            expect(btn(id).disabled).toBe(true);
            expect(btn(id).title).toContain('not a PNG');
        }
    });
});

describe('choosing a pixel', () => {
    it('Use this colour sets the accent colour to the pixel, and only that field', async () => {
        const ui = await loaded();
        const before = ($('ed-version') as HTMLInputElement).value;
        await ui.click('ed-accent-from-picture');
        click(5, 5);   // the orange background
        expect($('ap-chosen-hex').textContent).toBe('#ff8800');
        expect(btn('ap-use').disabled).toBe(false);
        await ui.click('ap-use');
        await flush(3);
        expect(isOpen()).toBe(false);
        expect(accent()).toBe('#ff8800');
        expect($('cmp-now-accent').textContent!.toLowerCase()).toBe('#ff8800');
        expect($('cmp-state-accent').textContent).toBe('Changed');
        expect(($('ed-version') as HTMLInputElement).value).toBe(before);
        expect($('cmp-state-color').textContent).toBe('Unchanged');
    });

    it('picks the glyph colour when the click is on the glyph (x and y are not swapped)', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        click(100, 70);   // inside the white square (66..125)
        expect($('ap-chosen-hex').textContent).toBe('#ffffff');
        click(100, 20);   // above it: orange
        expect($('ap-chosen-hex').textContent).toBe('#ff8800');
    });

    it('a see-through pixel is refused with the reason and keeps the earlier choice', async () => {
        const ui = await loaded(colorIcon([0, 0, 0, 0]));
        await ui.click('ed-accent-from-picture');
        click(100, 100);   // the white glyph
        click(5, 5);       // see-through
        expect($('ap-message').hidden).toBe(false);
        expect($('ap-message').textContent).toContain('see-through');
        expect($('ap-chosen-hex').textContent).toBe('#ffffff');
        expect(btn('ap-use').disabled).toBe(false);
    });

    it('a refused pixel alone leaves Use this colour off', async () => {
        const ui = await loaded(colorIcon([0, 0, 0, 0]));
        await ui.click('ed-accent-from-picture');
        click(5, 5);
        expect(btn('ap-use').disabled).toBe(true);
    });

    it('a good pixel after a refused one clears the message', async () => {
        const ui = await loaded(colorIcon([0, 0, 0, 0]));
        await ui.click('ed-accent-from-picture');
        click(5, 5);
        click(100, 100);
        expect($('ap-message').hidden).toBe(true);
    });

    it('the arrow keys move the choice and Enter uses it', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        const canvas = $('ap-canvas');
        // from the middle (96, 96, white) four steps right stay inside the glyph; Shift moves by ten
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect($('ap-chosen-hex').textContent).toBe('#ffffff');
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }));
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }));
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }));
        // y is 66, the edge of the glyph; three more steps of ten reach 36: orange
        for (let i = 0; i < 3; i++) canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }));
        expect($('ap-chosen-hex').textContent).toBe('#ff8800');
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await flush(3);
        expect(isOpen()).toBe(false);
        expect(accent()).toBe('#ff8800');
    });
});

describe('leaving without a change', () => {
    it('Cancel closes and leaves the accent colour as it was', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        click(5, 5);
        await ui.click('ap-cancel');
        expect(isOpen()).toBe(false);
        expect(accent()).toBe('#07687d');
        expect($('cmp-state-accent').textContent).toBe('Unchanged');
    });

    it('Escape closes it', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        $('ap-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(isOpen()).toBe(false);
        expect(accent()).toBe('#07687d');
    });

    it('a click on the dark area around the panel closes it, a click inside does not', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        $('ap-panel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(isOpen()).toBe(true);
        overlay()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(isOpen()).toBe(false);
    });

    it('a second opening starts clean: no earlier choice, Use this colour off', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        click(5, 5);
        await ui.click('ap-cancel');
        await ui.click('ed-accent-from-picture');
        expect($('ap-chosen-hex').textContent).toBe('-');
        expect(btn('ap-use').disabled).toBe(true);
    });

    it('Revert on the accent row puts the original colour back after a pick', async () => {
        const ui = await loaded();
        await ui.click('ed-accent-from-picture');
        click(5, 5);
        await ui.click('ap-use');
        await flush(3);
        await ui.click('ed-revert-accentColor');
        expect(accent()).toBe('#07687d');
    });
});

describe('from the image editor', () => {
    it('has the button for the colour icon, and the popup shows the picture as it is now', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(btn('ie-accent').disabled).toBe(false);
        await ui.click('ie-accent');
        expect(isOpen()).toBe(true);
        expect($('ap-lead').textContent).toContain('the picture as it is now');
        click(5, 5);
        await ui.click('ap-use');
        await flush(3);
        expect(isOpen()).toBe(false);
        expect($('ie-card').hidden).toBe(false);   // the editor stays open and untouched
        expect($('ie-ops-empty')).not.toBeNull();   // no step was added
        await ui.click('ie-cancel');
        expect(accent()).toBe('#ff8800');          // the accent colour stays: it is not part of the picture
    });

    it('Escape closes the popup only, not the editor behind it', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-accent');
        $('ap-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(isOpen()).toBe(false);
        expect($('ie-card').hidden).toBe(false);
    });

    it('the Look buttons are off while the editor is open, and the editor button is off for the outline icon', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(btn('ed-accent-from-picture').disabled).toBe(true);
        expect(btn('ed-img-accent-color').disabled).toBe(true);
        await ui.click('ie-cancel');
        expect(btn('ed-accent-from-picture').disabled).toBe(false);
        await ui.click('ed-img-edit-outline');
        expect(btn('ie-accent').disabled).toBe(true);
    });
});

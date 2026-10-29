// @vitest-environment jsdom
/**
 * Feature 007 on the real page: the before and after band, the order of the cards, the labelled rows of actions, the
 * gallery of presets and the removed button. Expected texts and ids come from specs/007-look-page/contracts/ui-contract.md.
 */
import { describe, expect, it } from 'vitest';
import { boot, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';
import { encodePng } from './helpers/png-encoder';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

async function loaded(opts: Parameters<typeof packageBytes>[0] = {}): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(opts));
    return ui;
}

const state = (id: string): string => $(id).textContent ?? '';
const cardTitles = (): string[] => [...document.querySelectorAll('#look-groups > .panel .card-title')].map(t => t.textContent ?? '');

describe('the before and after band', () => {
    it('is the first thing of the Look step, with the rows Original and Now', async () => {
        await loaded();
        const band = $('look-compare');
        expect(band.parentElement!.id).toBe('step-look');
        const children = [...band.parentElement!.children];
        expect(children.indexOf(band)).toBeLessThanOrEqual(1);   // after the header only
        expect($('cmp-original')).not.toBeNull();
        expect($('cmp-now')).not.toBeNull();
        expect($('cmp-original').textContent).toContain('Original');
        expect($('cmp-now').textContent).toContain('Now');
    });

    it('draws the colour icon and the outline icon on a light and a dark bar in both rows', async () => {
        await loaded();
        for (const row of ['original', 'now']) {
            expect($(`cmp-${row}-color`)).toBeInstanceOf(HTMLCanvasElement);
            expect($(`cmp-${row}-bar-light`)).toBeInstanceOf(HTMLCanvasElement);
            expect($(`cmp-${row}-bar-dark`)).toBeInstanceOf(HTMLCanvasElement);
            expect($(`cmp-${row}-accent`).textContent).toBe('#07687d');
        }
    });

    it('says Unchanged for the icons and the accent colour until something is edited', async () => {
        await loaded();
        expect(state('cmp-state-color')).toBe('Unchanged');
        expect(state('cmp-state-outline')).toBe('Unchanged');
        expect(state('cmp-state-accent')).toBe('Unchanged');
    });

    it('the Original row never changes, the Now row follows the edit, and revert brings both back', async () => {
        const ui = await loaded();
        await ui.type('ed-accentColor', '#c81e1e');
        expect($('cmp-now-accent').textContent!.toLowerCase()).toBe('#c81e1e');
        expect($('cmp-original-accent').textContent).toBe('#07687d');
        expect(state('cmp-state-accent')).toBe('Changed');
        expect(state('cmp-state-color')).toBe('Unchanged');
        await ui.click('ed-revert-all-look');
        expect($('cmp-now-accent').textContent).toBe('#07687d');
        expect(state('cmp-state-accent')).toBe('Unchanged');
    });

    it('says Changed only for the icon that changed: the colour icon alone, then the outline icon alone', async () => {
        const flat = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 66 && x < 126 && y >= 66 && y < 126 ? [255, 255, 255, 255] : [7, 104, 125, 255]) });
        const ui = await loaded({ color: flat });
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-removeBg');
        await ui.click('ie-apply');
        expect(state('cmp-state-color')).toBe('Changed');
        expect(state('cmp-state-outline')).toBe('Unchanged');
        expect(state('cmp-state-accent')).toBe('Unchanged');
        await ui.click('ed-revert-all-look');
        await ui.click('ed-img-edit-outline');
        await ui.click('ie-add-rotate');
        await ui.click('ie-apply');
        expect(state('cmp-state-outline')).toBe('Changed');
        expect(state('cmp-state-color')).toBe('Unchanged');
    });

    it('marks a changed state in the markup, an unchanged one not', async () => {
        const ui = await loaded();
        expect($('cmp-state-accent').classList.contains('is-changed')).toBe(false);
        await ui.type('ed-accentColor', '#c81e1e');
        expect($('cmp-state-accent').classList.contains('is-changed')).toBe(true);
        expect($('cmp-state-color').classList.contains('is-changed')).toBe(false);
    });

    it('the same colour in another spelling is not a change', async () => {
        const ui = await loaded();
        await ui.type('ed-accentColor', '#07687D');
        expect(state('cmp-state-accent')).toBe('Unchanged');
    });

    it('is forgotten with the package', async () => {
        const ui = await loaded();
        await ui.click('remove-btn');
        expect($('look-compare').children).toHaveLength(0);
        expect($('look-compare').hidden).toBe(true);
    });
});

describe('the order of the cards', () => {
    it('is the accent colour, the colour icon, the outline icon and the place of the image editor', async () => {
        await loaded();
        expect(cardTitles()).toEqual(['Look', 'Colour icon', 'Outline icon']);
        const order = [...$('look-groups').children].map(c => c.id);
        expect(order.indexOf('image-editor-root')).toBeGreaterThan(order.indexOf('ed-img-outline'));
        expect(order[order.length - 1]).toBe('image-editor-root');
    });

    it('the image editor opens after the icon cards', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-card').parentElement!.id).toBe('image-editor-root');
        expect($('ie-card').classList.contains('ie-workspace')).toBe(true);        // a workspace over the page (feature 009)
        expect([...$('look-groups').children].map(c => c.id).pop()).toBe('image-editor-root');
    });

    it('has no suggestions card any more', async () => {
        await loaded();
        expect(document.getElementById('ed-card-suggest')).toBeNull();
        expect(document.getElementById('ed-suggest-list')).toBeNull();
    });
});

describe('the icon cards have one action, Edit image (2026-10-29)', () => {
    const buttons = (id: string): string[] => [...document.querySelectorAll(`#${id} button`)].map(b => b.id);

    it('each card has the Edit image button and no other control', async () => {
        await loaded();
        expect(buttons('ed-img-color')).toEqual(['ed-img-edit-color']);
        expect(buttons('ed-img-outline')).toEqual(['ed-img-edit-outline']);
        for (const id of ['ed-img-color', 'ed-img-outline']) {
            expect(document.querySelectorAll(`#${id} input, #${id} select, #${id} textarea`), id).toHaveLength(0);
            expect(document.querySelector(`#${id} button`)!.textContent!.trim(), id).toBe('Edit image');
        }
    });

    it('the controls that moved into the image editor, or went, are not on the cards', async () => {
        await loaded();
        for (const id of ['ed-img-pick-color', 'ed-img-pick-outline', 'ed-img-revert-color', 'ed-img-revert-outline', 'ed-img-transparent-color', 'ed-img-white-outline',
            'ed-img-outline-preset', 'ed-img-bar-colour', 'ed-img-onbar-outline', 'ed-img-file-color', 'ed-img-file-outline', 'ed-img-borderless-color', 'ed-img-logo-colour']) {
            expect(document.getElementById(id), id).toBeNull();
        }
        expect(document.querySelector('.ed-act-row')).toBeNull();
    });

    it('the one button is Edit image and opens the editor of its icon; it is disabled while the other icon is being edited', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(($('ed-img-edit-outline') as HTMLButtonElement).disabled).toBe(true);
        expect($('ed-img-edit-outline').title).toContain('Another image editor is open');
        expect(($('ed-img-edit-color') as HTMLButtonElement).disabled).toBe(false);
    });

    it('every control of the editor is the way to what the cards used to do: Remove background, Outline from this icon, Solid colour, Open another image', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-add-removeBg', 'ie-add-solid', 'ie-open-other', 'ie-preset-teams']) expect(document.getElementById(id), id).not.toBeNull();
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-outline');
        for (const id of ['ie-preset-outline', 'ie-add-solid', 'ie-open-other']) expect(document.getElementById(id), id).not.toBeNull();
    });
});

describe('a see-through icon is shown alone (FR-014, FR-015)', () => {
    const flat = (): Uint8Array => encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 66 && x < 126 && y >= 66 && y < 126 ? [255, 255, 255, 255] : [7, 104, 125, 255]) });

    it('the colour icon card has one picture, not a second one on the accent colour', async () => {
        await loaded();
        expect(document.getElementById('ed-img-onaccent-color')).toBeNull();
        expect(document.getElementById('ed-img-onaccent-label')).toBeNull();
        expect(document.querySelectorAll('#ed-img-color .ed-img-fig canvas')).toHaveLength(1);
    });

    it('the tile of the band keeps the see-through pixels and sits on a chequerboard', async () => {
        const ui = await loaded();
        for (const row of ['original', 'now']) {
            const canvas = $(`cmp-${row}-color`) as HTMLCanvasElement;
            expect(canvas.classList.contains('ed-checker'), row).toBe(true);
            expect(ui.pixels(canvas)!.data[3], row).toBe(0);                // the corner is see-through, not the accent colour
        }
    });

    it('an opaque icon is drawn as it is, with no chequerboard, and becomes see-through in the Now row only', async () => {
        const ui = await loaded({ color: flat() });
        expect($('cmp-original-color').classList.contains('ed-checker')).toBe(false);
        expect($('cmp-now-color').classList.contains('ed-checker')).toBe(false);
        expect(ui.pixels($('cmp-now-color') as HTMLCanvasElement)!.data[3]).toBe(255);
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-removeBg');
        await ui.click('ie-apply');
        expect($('cmp-now-color').classList.contains('ed-checker')).toBe(true);
        expect(ui.pixels($('cmp-now-color') as HTMLCanvasElement)!.data[3]).toBe(0);
        expect($('cmp-original-color').classList.contains('ed-checker')).toBe(false);
        expect(ui.pixels($('cmp-original-color') as HTMLCanvasElement)!.data[3]).toBe(255);
    });

    it('the accent colour is still written as text in both rows', async () => {
        await loaded();
        expect($('cmp-original-accent').textContent).toBe('#07687d');
        expect($('cmp-now-accent').textContent).toBe('#07687d');
    });
});

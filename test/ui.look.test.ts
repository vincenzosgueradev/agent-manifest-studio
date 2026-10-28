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
const field = (path: string) => $(`ed-${path}`) as HTMLInputElement;

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
        await ui.click('ed-img-transparent-color');
        expect(state('cmp-state-color')).toBe('Changed');
        expect(state('cmp-state-outline')).toBe('Unchanged');
        expect(state('cmp-state-accent')).toBe('Unchanged');
        await ui.click('ed-revert-all-look');
        const coloured = encodePng({ width: 32, height: 32, colorType: 6, pixel: (x, y) => (x >= 8 && x < 24 && y >= 8 && y < 24 ? [200, 30, 30, 255] : [0, 0, 0, 0]) });
        const ui2 = await loaded({ outline: coloured });
        await ui2.click('ed-img-white-outline');
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
        expect([...$('look-groups').children].map(c => c.id).pop()).toBe('image-editor-root');
    });

    it('has no suggestions card any more', async () => {
        await loaded();
        expect(document.getElementById('ed-card-suggest')).toBeNull();
        expect(document.getElementById('ed-suggest-list')).toBeNull();
    });
});

describe('the actions of the icon cards', () => {
    const rows = (id: string) => [...document.querySelectorAll(`#${id} .ed-act-row`)].map(r => ({
        label: r.querySelector('.ed-act-label')!.textContent,
        buttons: [...r.querySelectorAll('.ed-act-buttons > button')].map(b => (b.textContent ?? '').trim()),
    }));

    it('colour icon: Image (Edit image, Choose, Revert) and Quick fix (Make background transparent)', async () => {
        await loaded();
        expect(rows('ed-img-color')).toEqual([
            { label: 'Image', buttons: ['Edit image', 'Choose a 192 x 192 PNG', 'Revert'] },
            { label: 'Quick fix', buttons: ['Make background transparent'] },
        ]);
    });

    it('outline icon: Image (Edit image, Choose, Revert) and Quick fix (Outline from this icon, Make the shape white)', async () => {
        await loaded();
        expect(rows('ed-img-outline')).toEqual([
            { label: 'Image', buttons: ['Edit image', 'Choose a 32 x 32 PNG', 'Revert'] },
            { label: 'Quick fix', buttons: ['Outline from this icon', 'Make the shape white'] },
        ]);
    });

    it('the preview colour picker is in the caption of its picture, not among the buttons', async () => {
        await loaded();
        expect($('ed-img-bar-colour').closest('figcaption')).not.toBeNull();
        expect($('ed-img-bar-colour').closest('.ed-act-buttons')).toBeNull();
    });

    it('Logo without background and its colour picker are gone', async () => {
        await loaded();
        expect(document.getElementById('ed-img-borderless-color')).toBeNull();
        expect(document.getElementById('ed-img-logo-colour')).toBeNull();
    });

    it('Make background transparent still works', async () => {
        const flat = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 66 && x < 126 && y >= 66 && y < 126 ? [255, 255, 255, 255] : [7, 104, 125, 255]) });
        const ui = await loaded({ color: flat });
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-color').getAttribute('data-changed')).toBe('true');
        expect(field('accentColor').value.toLowerCase()).toBe('#07687d');
    });
});

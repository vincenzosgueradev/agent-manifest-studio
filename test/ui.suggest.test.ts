// @vitest-environment jsdom
/**
 * Feature 004 on the real page: the suggested designs, and the colour that can be tried on the outline icon
 * (a preview, never saved).
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';
import { encodePng } from './helpers/png-encoder';
import { unzipSync } from './helpers/zip-builder';
import * as O from './helpers/image-oracle';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const field = (path: string) => $(`ed-${path}`) as HTMLInputElement;

async function loaded(opts: Parameters<typeof packageBytes>[0] = {}): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(opts));
    return ui;
}

const lum = (c: number[]): number => {
    const l = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * l(c[0]!) + 0.7152 * l(c[1]!) + 0.0722 * l(c[2]!);
};
const wcag = (a: number[], b: number[]): number => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const rgb = (hex: string): number[] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

describe('the suggestions', () => {
    it('are a card of the Look step, with a design each: preview, accent colour, contrast, reasons and a button', async () => {
        await loaded();
        expect($('ed-card-suggest').hidden).toBe(false);
        expect(document.querySelector('#look-groups > .panel .card-title')!.textContent).toBe('Suggestions');
        const items = [...document.querySelectorAll('#ed-suggest-list .sg-item')];
        expect(items.map(i => i.getAttribute('data-id'))).toEqual(['brand-tile', 'coloured-logo']);
        for (const item of items) {
            const id = item.getAttribute('data-id');
            expect(item.querySelector('.sg-title')!.textContent!.length).toBeGreaterThan(8);
            expect(item.querySelector('.sg-facts')!.textContent).toMatch(/Accent colour #[0-9a-fA-F]{6} - contrast \d+\.\d : 1/);
            expect(item.querySelectorAll('.sg-why li').length).toBeGreaterThanOrEqual(3);
            expect($(`ed-sg-${id}-apply`).textContent).toContain('Use this design');
            expect($(`ed-sg-${id}-icon`)).not.toBeNull();
            expect($(`ed-sg-${id}-bar-light`)).not.toBeNull();
            expect($(`ed-sg-${id}-bar-dark`)).not.toBeNull();
        }
    });

    it('keeps the accent colour when it already stands out from a white logo', async () => {
        const ui = await loaded();                                      // #07687d: white on it is about 6 : 1
        await ui.click('ed-sg-brand-tile-apply');
        expect(field('accentColor').value.toLowerCase()).toBe('#07687d');
        expect(document.querySelector('#changes-table tr[data-path="accentColor"]')).toBeNull();
        expect(document.querySelector('#changes-table tr[data-icon="outline"]')).not.toBeNull();
    });

    it('nothing is changed until one is chosen', async () => {
        await loaded();
        expect($('changes-none')).not.toBeNull();
        expect(field('accentColor').value).toBe('#07687d');
    });

    it('using the white logo on the brand colour changes the colour icon, the accent colour and the outline icon together', async () => {
        const ui = await loaded({ manifest: { accent: '#ffa575' } });   // a light orange: white on it is hard to read
        await ui.click('ed-sg-brand-tile-apply');
        const accent = field('accentColor').value;
        expect(accent.toLowerCase()).not.toBe('#ffa575');               // it was darkened to reach the contrast
        expect(accent).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(wcag([255, 255, 255], rgb(accent))).toBeGreaterThanOrEqual(4.5);          // white on it is easy to read
        expect(document.querySelector('#changes-table tr[data-icon="color"]')).not.toBeNull();
        expect(document.querySelector('#changes-table tr[data-icon="outline"]')).not.toBeNull();
        expect(document.querySelector('#changes-table tr[data-path="accentColor"]')).not.toBeNull();
        // the checks that the advice follows now pass
        const verdict = (id: string) => document.querySelector(`#checks-body [data-check-id="${id}"]`)?.getAttribute('data-verdict');
        expect(verdict('color.safe-area')).toBe('pass');
        expect(verdict('outline.white')).toBe('pass');
        expect(verdict('color.contrast')).toBe('pass');
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        const colour = O.readPng(out['color.png']!);
        expect([colour.width, colour.height]).toEqual([192, 192]);
        expect(colour.data[3]).toBe(0);
        const outline = O.readPng(out['outline.png']!);
        expect([outline.width, outline.height]).toEqual([32, 32]);
        expect(JSON.parse(new TextDecoder().decode(out['manifest.json']!)).accentColor).toBe(accent);
    });

    it('using the coloured logo on white sets the accent colour to white', async () => {
        const ui = await loaded();
        await ui.click('ed-sg-coloured-logo-apply');
        expect(field('accentColor').value).toBe('#FFFFFF');
        const verdict = document.querySelector('#checks-body [data-check-id="color.contrast"]')!.getAttribute('data-verdict');
        expect(verdict).toBe('pass');
    });

    it('the designs are worked out again for the icon that is there now', async () => {
        const ui = await loaded();
        await ui.click('ed-sg-brand-tile-apply');
        // the colour icon is now white on see-through: the advice still offers the two designs for it
        const ids = [...document.querySelectorAll('#ed-suggest-list .sg-item')].map(i => i.getAttribute('data-id'));
        expect(ids).toEqual(['brand-tile', 'coloured-logo']);
    });

    it('says why there is no suggestion when the picture has no flat background and nothing see-through', async () => {
        const gradient = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => [x, y, 100, 255] });
        await loaded({ color: gradient });
        expect(document.querySelectorAll('#ed-suggest-list .sg-item')).toHaveLength(0);
        expect($('ed-suggest-note').hidden).toBe(false);
        expect($('ed-suggest-note').textContent).toContain('not one flat colour');
        expect($('ed-card-suggest').hidden).toBe(false);
    });

    it('a logo with two colours gets the third design, the one that keeps them', async () => {
        const logo = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 50 && x < 140 && y >= 50 && y < 140 ? (x < 95 ? [200, 30, 30, 255] : [255, 255, 255, 255]) : [0, 0, 0, 0]) });
        await loaded({ color: logo });
        const ids = [...document.querySelectorAll('#ed-suggest-list .sg-item')].map(i => i.getAttribute('data-id'));
        expect(ids).toEqual(['brand-tile', 'coloured-logo', 'keep-colours']);
    });

    it('is forgotten with the package', async () => {
        const ui = await loaded();
        await ui.click('remove-btn');
        expect($('look-groups').children).toHaveLength(0);
    });
});

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

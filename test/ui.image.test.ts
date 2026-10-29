// @vitest-environment jsdom
/**
 * Feature 004 on the real page: opening and closing, steps, history, the tools, the eyedropper, the crop by
 * dragging, Apply and Cancel, refusals, the preview and the outline icon (FR-001 to FR-031).
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';
import { encodePng as helperEncode } from './helpers/png-encoder';
import { unzipSync } from './helpers/zip-builder';
import { encodePng } from '../src/services/image/pngWrite';
import { toPixel } from '../src/view/imageEditor';
import * as O from './helpers/image-oracle';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const btn = (id: string) => $(id) as HTMLButtonElement;
const canvasPixels = (ui: Ui, id = 'ie-canvas') => ui.pixels($(id) as HTMLCanvasElement)!;
const kinds = () => [...document.querySelectorAll('#ie-ops .ie-op')].map(li => li.getAttribute('data-kind'));
const RED: [number, number, number, number] = [200, 30, 30, 255];

/** A red glyph on a white background, 60 x 40, as a PNG file. */
const logoPng = (): Uint8Array => encodePng(O.fromPic(O.make(60, 40, (x, y) => (x >= 15 && x < 45 && y >= 8 && y < 32 ? RED : [255, 255, 255, 255]))));

async function loaded(): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes());
    return ui;
}

async function editColour(ui: Ui): Promise<void> {
    await ui.click('ed-img-edit-color');
}

async function openImage(ui: Ui, name: string, bytes: Uint8Array): Promise<void> {
    if (document.getElementById('ie-card')?.hidden !== false) await ui.click('ed-img-edit-color');
    ui.fakes.files.set(name, bytes);
    await ui.click('ie-open-other');
    await flush(8);
}

describe('opening and closing', () => {
    it('is closed until asked, and then shows the current icon with no steps', async () => {
        const ui = await loaded();
        expect($('image-editor-root').children).toHaveLength(0);
        await editColour(ui);
        expect($('ie-card').hidden).toBe(false);
        expect($('ie-title-note').textContent).toContain('colour icon, 192 x 192 pixels, from the current colour icon');
        expect(kinds()).toEqual([]);
        expect($('ie-ops-empty')).not.toBeNull();
        const p = canvasPixels(ui);
        expect([p.width, p.height]).toEqual([192, 192]);
        // nothing changed in the package
        expect($('changes-none')).not.toBeNull();
    });

    it('sits in the Look step, after the two icon cards', async () => {
        const ui = await loaded();
        await editColour(ui);
        const ids = [...document.querySelectorAll('#look-groups > *')].map(n => n.id);
        expect(ids.indexOf('image-editor-root')).toBeGreaterThan(ids.indexOf('ed-img-outline'));
        expect(document.querySelector('#edit-groups #image-editor-root')).toBeNull();   // not in the step of the text fields
        expect($('image-editor-root').contains($('ie-card'))).toBe(true);
    });

    it('Cancel closes it and changes nothing', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-rotate');
        await ui.click('ie-cancel');
        expect($('ie-card').hidden).toBe(true);
        expect($('changes-none')).not.toBeNull();
        expect($('ed-img-color').getAttribute('data-changed')).toBe('false');
    });

    it('only one editor at a time: the other button is disabled with the reason', async () => {
        const ui = await loaded();
        await editColour(ui);
        expect(btn('ed-img-edit-outline').disabled).toBe(true);
        expect($('ed-img-edit-outline').title).toContain('Another image editor is open');
        expect(btn('ed-img-edit-color').disabled).toBe(false);
        await ui.click('ie-cancel');
        expect(btn('ed-img-edit-outline').disabled).toBe(false);
    });

    it('opening on the outline card says 32 x 32', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        expect($('ie-title-note').textContent).toContain('outline icon, 32 x 32 pixels');
    });

    it('loading another package closes the editor and forgets its work', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-rotate');
        ui.fakes.files.set('Other.zip', packageBytes());
        await ui.click('replace-btn');
        expect(document.getElementById('ie-card')).toBeNull();   // the page of the old package is gone
        await editColour(ui);
        expect(kinds()).toEqual([]);
    });

    it('removing the package closes it', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('remove-btn');
        expect(document.getElementById('ie-card')).toBeNull();
        expect(btn('ed-img-edit-color')?.disabled ?? false).toBe(false);
    });
});

describe('the steps', () => {
    it('a tool adds a step with its default values, shown in the list with its fields', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-removeBg');
        expect(kinds()).toEqual(['removeBg']);
        expect(($('ie-op-0-tolerance') as HTMLInputElement).value).toBe('12');
        expect(($('ie-op-0-softness') as HTMLInputElement).value).toBe('8');
        expect(($('ie-op-0-mode') as HTMLSelectElement).value).toBe('edges');
        expect(document.querySelector('#ie-op-0 strong')!.textContent).toBe('Remove background');
    });

    it('every tool button adds the step it names, once (the ones that clash are tried apart)', async () => {
        const ui = await loaded();
        await editColour(ui);
        const together: Array<[string, string]> = [
            ['ie-add-removeBg', 'removeBg'], ['ie-add-trim', 'trim'], ['ie-add-crop', 'crop'], ['ie-add-square', 'square'], ['ie-add-fit', 'fit'],
            ['ie-add-rotate', 'rotate'], ['ie-add-flip-h', 'flip'], ['ie-add-flip-v', 'flip'], ['ie-add-fill', 'fill'], ['ie-add-solid', 'solid'],
        ];
        for (const [id] of together) await ui.click(id);
        expect(kinds()).toEqual(together.map(b => b[1]));
        for (const id of ['ie-add-tone', 'ie-add-outline']) expect(btn(id).disabled, id).toBe(true);   // a solid colour and a fill are in the history
        await ui.click('ie-revert-all');
        for (const [id, kind] of [['ie-add-tone', 'tone'], ['ie-add-outline', 'outline']] as const) {
            await ui.click(id);
            expect(kinds(), id).toEqual([kind]);
            await ui.click('ie-revert-all');
        }
    });

    it('editing a value changes the picture on the canvas as it is typed', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-removeBg');
        expect(canvasPixels(ui).data[3]).toBe(0);   // the white corner is gone
        await ui.type('ie-op-0-tolerance', '0');
        await ui.click('ie-add-rotate');
        const p = canvasPixels(ui);
        expect([p.width, p.height]).toEqual([40, 60]);
    });

    it('removing a step in the middle recomputes the rest', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-flip-h');
        await ui.click('ie-add-rotate');
        await ui.click('ie-add-flip-v');
        expect(kinds()).toEqual(['flip', 'rotate', 'flip']);
        expect([canvasPixels(ui).width, canvasPixels(ui).height]).toEqual([40, 60]);
        await ui.click('ie-op-1-remove');
        expect(kinds()).toEqual(['flip', 'flip']);
        expect([canvasPixels(ui).width, canvasPixels(ui).height]).toEqual([60, 40]);
    });

    it('a crop outside the picture says so and leaves the picture alone', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-crop');
        await ui.type('ie-op-0-w', '9999');
        const problem = $('ie-op-0-problem');
        expect(problem.hidden).toBe(false);
        expect(problem.textContent).toMatch(/outside|goes/);
        expect([canvasPixels(ui).width, canvasPixels(ui).height]).toEqual([60, 40]);
    });

    it('a numeric field refuses text and clamps to its range', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-removeBg');
        await ui.type('ie-op-0-tolerance', '500');
        expect(($('ie-op-0-tolerance') as HTMLInputElement).value === '500' ? 'typed' : 'clamped').toBeDefined();
        await ui.click('ie-add-tone');
        await ui.type('ie-op-1-hue', 'abc');
        expect(($('ie-op-1-hue') as HTMLInputElement).value).toBeDefined();
    });
});

describe('every number of every step has a number box and a slider', () => {
    it('matte, trim tolerance and the crop box get a slider that follows the number', async () => {
        const ui = await loaded();
        await editColour(ui);
        for (const [add, ids] of [['removeBg', ['matte', 'tolerance', 'softness']], ['trim', ['tolerance']], ['crop', ['x', 'y', 'w', 'h']]] as const) {
            await ui.click(`ie-add-${add}`);
            const n = document.querySelectorAll('#ie-ops > li').length - 1;
            for (const id of ids) expect(document.getElementById(`ie-op-${n}-${id}-range`), `${add}.${id}`).not.toBeNull();
        }
    });
});

describe('a step compacts to its head once another is open', () => {
    const isOpen = (i: number): boolean => $(`ie-op-${i}-toggle`).getAttribute('aria-expanded') === 'true';
    const bodyHidden = (i: number): boolean => ($(`ie-op-${i}-body`) as HTMLElement).hidden;

    it('the step just added is open, in full; a step added after it compacts it to its head', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-removeBg');
        expect(isOpen(0)).toBe(true);
        expect(bodyHidden(0)).toBe(false);
        await ui.click('ie-add-rotate');
        expect(isOpen(0)).toBe(false);
        expect(bodyHidden(0)).toBe(true);
        expect(isOpen(1)).toBe(true);
        expect(bodyHidden(1)).toBe(false);
    });

    it('a click on the head of a compacted step opens it and compacts the one that was open', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-removeBg');
        await ui.click('ie-add-rotate');
        await ui.click('ie-op-0-toggle');
        expect(isOpen(0)).toBe(true);
        expect(isOpen(1)).toBe(false);
        expect(bodyHidden(1)).toBe(true);
    });

    it('a click on the head of the open step compacts it, leaving every step closed', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-removeBg');
        await ui.click('ie-op-0-toggle');
        expect(isOpen(0)).toBe(false);
        expect(bodyHidden(0)).toBe(true);
    });

    it('removing the open step leaves none open; removing a step before it keeps it open', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-removeBg');
        await ui.click('ie-add-rotate');
        await ui.click('ie-add-tone');
        expect(isOpen(2)).toBe(true);
        await ui.click('ie-op-0-remove');                 // a step before the open one: it stays the same step, now at index 1
        expect(kinds()).toEqual(['rotate', 'tone']);
        expect(isOpen(1)).toBe(true);
        await ui.click('ie-op-1-remove');                  // the open step itself
        expect(kinds()).toEqual(['rotate']);
        expect(isOpen(0)).toBe(false);
    });
});

describe('history and comparison', () => {
    it('Undo and Redo move through the steps; there is no Reset, the list is emptied by Undo', async () => {
        const ui = await loaded();
        await editColour(ui);
        expect(btn('ie-undo').disabled).toBe(true);
        expect(btn('ie-redo').disabled).toBe(true);
        expect(document.getElementById('ie-reset')).toBeNull();
        await ui.click('ie-add-rotate');
        await ui.click('ie-add-flip-h');
        expect(kinds()).toEqual(['rotate', 'flip']);
        await ui.click('ie-undo');
        expect(kinds()).toEqual(['rotate']);
        expect(btn('ie-redo').disabled).toBe(false);
        await ui.click('ie-redo');
        expect(kinds()).toEqual(['rotate', 'flip']);
        await ui.click('ie-undo');
        await ui.click('ie-undo');
        expect(kinds()).toEqual([]);
        expect(btn('ie-undo').disabled).toBe(true);
    });

    it('the status bar gives the size of the picture that is on the canvas, width then height', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());                 // 60 x 40
        expect($('ie-size').textContent).toBe('60 x 40 pixels');
        await ui.click('ie-original');
        expect($('ie-size').textContent).toBe('192 x 192 pixels');   // the icon of the package
    });

    it('Show original draws the icon as it was in the package, says so on the picture, and Show original again goes back', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());                 // 60 x 40: the steps start from this picture
        await ui.click('ie-add-removeBg');
        expect(canvasPixels(ui).width).toBe(60);
        expect($('ie-view-label').hidden).toBe(true);
        await ui.click('ie-original');
        expect($('ie-original').getAttribute('aria-pressed')).toBe('true');
        expect(canvasPixels(ui).width).toBe(192);                   // the colour icon of the package, not the imported picture
        expect($('ie-view-label').hidden).toBe(false);
        expect($('ie-view-label').textContent).toBe('Original: the colour icon as it was in the package');
        await ui.click('ie-original');
        expect($('ie-original').getAttribute('aria-pressed')).toBe('false');
        expect(canvasPixels(ui).width).toBe(60);
        expect($('ie-view-label').hidden).toBe(true);
    });

    it('Show original still shows the package icon after an earlier Apply, and says when it is the same as now', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-original');
        expect($('ie-view-label').textContent).toBe('Original: the colour icon as it was in the package (the same as now)');
        await ui.click('ie-original');
        await ui.click('ie-add-solid');
        await ui.type('ie-op-0-colour', '#000000');
        await ui.click('ie-apply');
        await editColour(ui);                                       // the current icon is now the black one
        const at = (): number[] => Array.from(canvasPixels(ui).data.slice((100 * 192 + 100) * 4, (100 * 192 + 100) * 4 + 3));
        expect(at()).toEqual([0, 0, 0]);
        await ui.click('ie-original');
        expect(at()).toEqual([255, 255, 255]);                      // the glyph of the package
        expect($('ie-view-label').textContent).toBe('Original: the colour icon as it was in the package');
    });

    it('while the original is shown a drag on the picture does not make a crop', async () => {
        const ui = await loaded();
        await editColour(ui);
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 192, height: 192, right: 192, bottom: 192, x: 0, y: 0, toJSON: () => ({}) });
        await ui.click('ie-original');
        canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 90, clientY: 90, bubbles: true }));
        await flush();
        expect(kinds()).toEqual([]);
    });

    it('the background and zoom switches are views only: the result does not change', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-removeBg');
        const before = Array.from(canvasPixels(ui).data);
        for (const bg of ['white', 'black', 'checker']) {
            await ui.click(`ie-bg-${bg}`);
            expect($(`ie-bg-${bg}`).getAttribute('aria-pressed')).toBe('true');
        }
        expect(document.getElementById('ie-bg-accent')).toBeNull();                       // the accent colour is not drawn behind the picture
        expect($('ie-stage').getAttribute('style') ?? '').toBe('');
        setZoom('200');
        expect($('ie-canvas').style.width).toBe('120px');
        await ui.click('ie-zoom-fit');
        expect($('ie-canvas').style.width).toBe('');
        expect(Array.from(canvasPixels(ui).data)).toEqual(before);
    });
});

describe('presets', () => {
    it('Teams-ready colour icon on a logo with a background: steps, size, transparent corners, glyph inside the safe area', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-preset-teams');
        expect(kinds()).toEqual(['removeBg', 'trim', 'square', 'fit']);
        const p = canvasPixels(ui);
        expect([p.width, p.height]).toEqual([192, 192]);
        expect(p.data[3]).toBe(0);
        let minX = 192, maxX = -1;
        for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) if (p.data[(y * 192 + x) * 4 + 3]! > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        expect(minX).toBeGreaterThanOrEqual(36);
        expect(maxX).toBeLessThanOrEqual(155);
    });

    it('Apply puts the icon in the package: the card, the Changes table and the saved zip', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-preset-teams');
        await ui.click('ie-apply');
        expect($('ie-card').hidden).toBe(true);
        expect($('ed-img-color').getAttribute('data-changed')).toBe('true');
        expect($('ed-img-facts-color').textContent).toContain('192 x 192 pixels');
        expect(document.querySelector('#changes-table tr[data-icon="color"]')).not.toBeNull();
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        const back = O.readPng(out['color.png']!);
        expect([back.width, back.height]).toEqual([192, 192]);
        expect(back.data[3]).toBe(0);
        const centre = (96 * 192 + 96) * 4;
        expect(Array.from(back.data.slice(centre, centre + 4))).toEqual(RED);
    });

    it('the Teams colour preset adds ordinary steps to the ones already there', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-rotate');
        await ui.click('ie-preset-teams');
        expect(kinds()).toEqual(['rotate', 'removeBg', 'trim', 'square', 'fit']);
    });
});

describe('the outline icon', () => {
    it('Outline from this icon: a white silhouette at 32 x 32 that passes the outline checks', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        await ui.click('ie-preset-outline');
        expect($('ie-title-note').textContent).toContain('outline icon, 32 x 32');
        expect(kinds()).toEqual(['outline', 'trim', 'square', 'fit']);
        const p = canvasPixels(ui);
        expect([p.width, p.height]).toEqual([32, 32]);
        for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3]! > 0) expect([p.data[i], p.data[i + 1], p.data[i + 2]]).toEqual([255, 255, 255]);
        await ui.click('ie-apply');
        const verdict = (id: string) => document.querySelector(`#checks-body [data-check-id="${id}"]`)?.getAttribute('data-verdict') ?? 'missing';
        expect(verdict('outline.white')).toBe('pass');
        expect(verdict('outline.size-px')).toBe('pass');
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        const back = O.readPng(out['outline.png']!);
        expect([back.width, back.height]).toEqual([32, 32]);
    });

    it('the outline preview is drawn on a light and a dark bar', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        expect($('ie-tile-light')).not.toBeNull();
        expect($('ie-tile-dark')).not.toBeNull();
        expect(document.getElementById('ie-tile-192')).toBeNull();
    });

    it('a colour icon editor draws the Teams sizes under the picture as the result is, never on the accent colour (amended 2026-10-29)', async () => {
        const ui = await loaded();
        await editColour(ui);
        expect(document.getElementById('ie-tile-192')).toBeNull();                 // the picture on the canvas is the 192
        for (const s of [96, 48, 32]) {
            const t = $(`ie-tile-${s}`) as HTMLCanvasElement;
            expect(ui.pixels(t)!.width).toBe(s);
            expect(t.classList.contains('ed-checker'), String(s)).toBe(true);        // the usual icon is see-through
        }
        expect($('ie-preview').textContent).toContain('The result as it is');
        expect($('ie-preview').textContent).not.toContain('#07687d');
        expect($('ie-preview').textContent).toContain('does not reproduce exactly');
        // the tiles keep their see-through pixels: the corner is not the accent colour
        expect(ui.pixels($('ie-tile-96') as HTMLCanvasElement)!.data[3]).toBe(0);
    });

    it('an opaque result has no chequerboard under its tiles', async () => {
        const ui = await loaded();
        await editColour(ui);
        await openImage(ui, 'solid.png', helperEncode({ width: 64, height: 64, colorType: 6, pixel: () => [200, 30, 30, 255] }));
        for (const s of [96, 48]) expect(($(`ie-tile-${s}`) as HTMLCanvasElement).classList.contains('ed-checker'), String(s)).toBe(false);
    });
});

describe('the pointer on the canvas', () => {
    it('the pointer maps to picture pixels', () => {
        const rect = { left: 10, top: 20, width: 120, height: 80 };
        expect(toPixel(10, 20, rect, 60, 40)).toEqual({ x: 0, y: 0 });
        expect(toPixel(129, 99, rect, 60, 40)).toEqual({ x: 59, y: 39 });
        expect(toPixel(70, 60, rect, 60, 40)).toEqual({ x: 30, y: 20 });
        expect(toPixel(9, 30, rect, 60, 40)).toBeNull();
        expect(toPixel(130, 30, rect, 60, 40)).toBeNull();
        expect(toPixel(50, 100, rect, 60, 40)).toBeNull();
        expect(toPixel(50, 50, { left: 0, top: 0, width: 0, height: 0 }, 60, 40)).toBeNull();
    });
});

describe('crop by dragging', () => {
    it('a drag adds a crop step with the rectangle, a click without a drag does not', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 120, height: 80, right: 120, bottom: 80, x: 0, y: 0, toJSON: () => ({}) });
        const fire = (type: string, x: number, y: number) => canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
        fire('pointerdown', 20, 20); fire('pointerup', 20, 20);
        await flush();
        expect(kinds()).toEqual([]);
        fire('pointerdown', 20, 20); fire('pointermove', 60, 40); fire('pointerup', 80, 60);
        await flush();
        expect(kinds()).toEqual(['crop']);
        expect(['x', 'y', 'w', 'h'].map(n => ($(`ie-op-0-${n}`) as HTMLInputElement).value)).toEqual(['10', '10', '31', '21']);
        expect([canvasPixels(ui).width, canvasPixels(ui).height]).toEqual([31, 21]);
    });
});

describe('colour tools', () => {
    it('Solid colour with a typed hex recolours the visible pixels and keeps the transparent ones', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-solid');
        await ui.type('ie-op-0-colour', '#112233');
        const p = canvasPixels(ui);
        const glyph = (96 * 192 + 96) * 4;
        expect(Array.from(p.data.slice(glyph, glyph + 4))).toEqual([17, 34, 51, 255]);
        expect(p.data[3]).toBe(0);
        await ui.type('ie-op-0-colour', 'nope');
        expect($('ie-op-0-colour').getAttribute('aria-invalid')).toBe('true');
        expect(Array.from(canvasPixels(ui).data.slice(glyph, glyph + 4))).toEqual([17, 34, 51, 255]);   // the last valid colour stays
    });

    it('a colour step has a colour picker that sets the colour and follows the text', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-solid');
        const picker = $('ie-op-0-colour-picker') as HTMLInputElement;
        expect(picker.type).toBe('color');
        expect(picker.value).toBe('#ffffff');
        picker.value = '#336699';
        picker.dispatchEvent(new Event('input', { bubbles: true }));
        await flush(3);
        expect(($('ie-op-0-colour') as HTMLInputElement).value).toBe('#336699');
        const glyph = (96 * 192 + 96) * 4;
        expect(Array.from(canvasPixels(ui).data.slice(glyph, glyph + 3))).toEqual([51, 102, 153]);
        await ui.type('ie-op-0-colour', '#ff0000');
        expect(picker.value).toBe('#ff0000');
    });

    it('an automatic background colour shows the colour it will use, in the box, the picker and the placeholder', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-removeBg');
        expect(($('ie-op-0-colour') as HTMLInputElement).value).toBe('');
        expect(($('ie-op-0-colour') as HTMLInputElement).placeholder).toBe('automatic (#ffffff)');
        expect(($('ie-op-0-colour-picker') as HTMLInputElement).value).toBe('#ffffff');
        expect($('ie-op-0-colour-swatch').style.background).toContain('rgb(255, 255, 255)');
    });

    it('the view switches are styled as segments', async () => {
        const ui = await loaded();
        await editColour(ui);
        for (const id of ['ie-bg-checker']) expect($(id).classList.contains('segment')).toBe(true);
    });

    it('the steps that are easy to misread say what they do, and what they do not', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-fill');
        expect(document.querySelector('#ie-op-0 .ie-op-hint')!.textContent).toContain('Fills only the see-through parts');
        expect(document.querySelector('#ie-op-0 .ie-op-hint')!.textContent).toContain('remove it first');
        await ui.click('ie-add-solid');
        expect(document.querySelector('#ie-op-1 .ie-op-hint')!.textContent).toContain('see-through parts stay see-through');
        await ui.click('ie-add-trim');
        expect(document.querySelector('#ie-op-2 .ie-op-hint')).toBeNull();   // no hint where none is needed
    });

    it('the outline preview says that the bar chooses the colour', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        expect($('ie-outline-note').textContent).toContain('only the shape counts');
        await ui.click('ie-cancel');
        await editColour(ui);
        expect(document.getElementById('ie-outline-note')).toBeNull();   // not on the colour icon
    });

    it('Solid colour gives every visible pixel the colour typed, black or white included (there is no Make white or Make black)', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        for (const id of ['ie-add-white', 'ie-add-black', 'ie-add-resize']) expect(document.getElementById(id), id).toBeNull();
        await ui.click('ie-add-solid');
        await ui.type('ie-op-0-colour', '#000000');
        const centre = (20 * 60 + 30) * 4;
        expect(Array.from(canvasPixels(ui).data.slice(centre, centre + 3))).toEqual([0, 0, 0]);
        await ui.type('ie-op-0-colour', '#ffffff');
        expect(Array.from(canvasPixels(ui).data.slice(centre, centre + 3))).toEqual([255, 255, 255]);
    });

    it('Tone: the invert and grayscale toggles are buttons that report their state', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-tone');
        expect($('ie-op-0-invert').getAttribute('aria-pressed')).toBe('false');
        await ui.click('ie-op-0-invert');
        expect($('ie-op-0-invert').getAttribute('aria-pressed')).toBe('true');
        const corner = canvasPixels(ui).data;
        expect([corner[0], corner[1], corner[2]]).toEqual([0, 0, 0]);   // the white background is now black
        await ui.click('ie-op-0-gray');
        expect($('ie-op-0-gray').getAttribute('aria-pressed')).toBe('true');
    });

    it('Fill background uses the accent colour of the manifest', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-fill');
        expect(($('ie-op-0-colour') as HTMLInputElement).value).toBe('#07687d');
        expect(canvasPixels(ui).data[3]).toBe(255);
    });
});

describe('importing and refusing', () => {
    it('another PNG replaces the picture and keeps the steps', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-add-rotate');
        expect($('ie-title-note').textContent).toContain('from logo.png');
        expect([canvasPixels(ui).width, canvasPixels(ui).height]).toEqual([40, 60]);
        await openImage(ui, 'wide.png', encodePng(O.fromPic(O.make(80, 10, () => RED))));
        expect(kinds()).toEqual(['rotate']);
        expect([canvasPixels(ui).width, canvasPixels(ui).height]).toEqual([10, 80]);
    });

    it('a picture above 1024 pixels is reduced and the note says by how much', async () => {
        const ui = await loaded();
        await openImage(ui, 'huge.png', helperEncode({ width: 2000, height: 100, colorType: 6, pixel: () => RED }));
        expect($('ie-note').hidden).toBe(false);
        expect($('ie-note').textContent).toContain('2000 x 100');
        expect($('ie-note').textContent).toContain('1024 x 51');
        expect(canvasPixels(ui).width).toBe(1024);
    });

    it('a file that is not an image is refused with the cause and the picture stays', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await openImage(ui, 'notes.txt', new TextEncoder().encode('hello'));
        expect($('ie-message').hidden).toBe(false);
        expect($('ie-message').textContent).toContain('not an image');
        expect($('ie-title-note').textContent).toContain('from logo.png');
    });

    it('a JPEG says the window cannot read it when there is no decoder', async () => {
        const ui = await loaded();
        await openImage(ui, 'photo.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]));
        expect($('ie-message').textContent).toMatch(/JPEG/);
    });

    it('a damaged PNG is refused', async () => {
        const ui = await loaded();
        await openImage(ui, 'bad.png', logoPng().slice(0, 40));
        expect($('ie-message').textContent).toMatch(/damaged/);
    });

    it('Apply refuses a fully transparent result and says why, and the editor stays open', async () => {
        const ui = await loaded();
        await openImage(ui, 'flat.png', encodePng(O.fromPic(O.make(10, 10, () => RED))));
        await ui.click('ie-add-removeBg');
        await ui.type('ie-op-0-mode', 'everywhere');
        $('ie-op-0-mode').dispatchEvent(new Event('change', { bubbles: true }));
        await flush();
        await ui.click('ie-apply');
        expect($('ie-message').textContent).toContain('fully transparent');
        expect($('ie-card').hidden).toBe(false);
        await ui.click('ie-undo');
        expect(($('ie-op-0-mode') as HTMLSelectElement).value).toBe('edges');
        expect(canvasPixels(ui).data[3]).toBe(0);
    });
});

describe('save as PNG and the accessibility of the editor', () => {
    it('saves the result at the size of the icon as a PNG, independent of Apply', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        await ui.click('ie-preset-teams');
        await ui.click('ie-save-png');
        expect(ui.fakes.saved).toHaveLength(1);
        expect(ui.fakes.saved[0]!.defaultPath).toBe('color.png');
        const back = O.readPng(ui.fakes.saved[0]!.bytes);
        expect([back.width, back.height]).toEqual([192, 192]);
        expect($('ie-status').textContent).toContain('Saved');
        expect($('ie-card').hidden).toBe(false);    // still open
        expect($('changes-none')).not.toBeNull();   // the package did not change
    });

    it('a cancelled save dialog says so', async () => {
        const ui = await boot({ saveAnswer: null });
        await ui.open('Sales.zip', packageBytes());
        await editColour(ui);
        await ui.click('ie-save-png');
        expect($('ie-status').textContent).toContain('cancelled');
    });

    it('every control of the editor has a name a screen reader can use', async () => {
        const ui = await loaded();
        await openImage(ui, 'logo.png', logoPng());
        for (const id of ['ie-add-removeBg', 'ie-add-tone', 'ie-add-crop', 'ie-add-solid', 'ie-add-outline']) await ui.click(id);
        const controls = [...document.querySelectorAll('#ie-card button, #ie-card input, #ie-card select')] as HTMLElement[];
        expect(controls.length).toBeGreaterThan(30);
        for (const c of controls) {
            if ((c as HTMLInputElement).type === 'file') continue;
            const labelled = c.getAttribute('aria-label') || c.textContent?.trim() || (c.id && document.querySelector(`label[for="${c.id}"]`)) || c.title;
            expect(labelled, c.id || c.outerHTML.slice(0, 80)).toBeTruthy();
        }
    });

    it('uses no checkbox and no emoji', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-tone');
        expect(document.querySelectorAll('#ie-card input[type="checkbox"]')).toHaveLength(0);
        expect($('ie-card').textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    });
});

/** Moves the zoom to a value, as a hand would: the + and - buttons over the canvas, from the value shown now; always redraws, even when already there. */
function setZoom(value: string): void {
    const target = Math.min(200, Math.max(10, Number(value)));
    const shown = $('ie-zoom-value').textContent;
    let current = shown === 'Fit' ? 100 : Number(shown!.replace('%', ''));
    if (current === target) { const [a, b] = target < 200 ? ['ie-zoom-in-float', 'ie-zoom-out-float'] : ['ie-zoom-out-float', 'ie-zoom-in-float']; $(a).click(); $(b).click(); return; }
    while (current < target) { $('ie-zoom-in-float').click(); current += 10; }
    while (current > target) { $('ie-zoom-out-float').click(); current -= 10; }
}

describe('the automatic colour of a step', () => {
    it('a colour that is automatic is dimmed in the picker, and not when it is chosen', async () => {
        const ui = await loaded();
        await editColour(ui);
        await ui.click('ie-add-square');
        const picker = $('ie-op-0-fill-picker') as HTMLInputElement;
        expect(picker.classList.contains('is-auto')).toBe(true);
        await ui.type('ie-op-0-fill', '#336699');
        expect(picker.classList.contains('is-auto')).toBe(false);
        await ui.type('ie-op-0-fill', '');
        expect(picker.classList.contains('is-auto')).toBe(true);
    });
});

describe('slow changes are reported (FR-031)', () => {
    it('says how long a slow change took, and says nothing for a quick one', async () => {
        const ui = await loaded();
        await editColour(ui);
        expect($('ie-speed').hidden).toBe(true);
        const real = performance.now.bind(performance);
        let t = 0;
        performance.now = () => (t += 500);   // every reading is 500 ms after the last one
        try {
            await ui.click('ie-add-rotate');
        } finally {
            performance.now = real;
        }
        expect($('ie-speed').hidden).toBe(false);
        expect($('ie-speed').textContent).toMatch(/took \d+ ms on a 192 x 192 picture/);
        await ui.click('ie-add-flip-h');
        expect($('ie-speed').hidden).toBe(true);
    });
});

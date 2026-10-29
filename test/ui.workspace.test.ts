// @vitest-environment jsdom
/**
 * Feature 009: the image editor as a workspace laid out like an image editor. Expected ids, texts and numbers come from
 * specs/009-image-editor-workspace/spec.md and contracts/ui-contract.md.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/** The text of every rule of a selector. */
const rule = (selector: string): string => css.split(selector + ' {').slice(1).map(part => part.slice(0, part.indexOf('}'))).join('\n');

async function loaded(): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes());
    return ui;
}

/** Moves the zoom to a value, as a hand would: the + and - buttons over the canvas, from the value shown now; always redraws, even when already there. */
const setZoom = (value: string): void => {
    const target = Math.min(200, Math.max(10, Number(value)));
    const shown = $('ie-zoom-value').textContent;
    let current = shown === 'Fit' ? 100 : Number(shown!.replace('%', ''));
    if (current === target) { const [a, b] = target < 200 ? ['ie-zoom-in-float', 'ie-zoom-out-float'] : ['ie-zoom-out-float', 'ie-zoom-in-float']; $(a).click(); $(b).click(); return; }
    while (current < target) { $('ie-zoom-in-float').click(); current += 10; }
    while (current > target) { $('ie-zoom-out-float').click(); current -= 10; }
};
const wheel = (init: WheelEventInit): WheelEvent => {
    const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
    $('ie-stage').dispatchEvent(e);
    return e;
};
const key = (k: string): void => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); };
const rectOf = (w: number, h: number) => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
const headings = (root: Element): string[] => [...root.querySelectorAll('h4.ie-sub')].map(h => h.textContent ?? '');

describe('the layout of the workspace (FR-001, FR-002, FR-016)', () => {
    it('fills the tool window over the page, as a column', () => {
        expect(rule('.ie-workspace')).toMatch(/position:\s*fixed/);
        expect(rule('.ie-workspace')).toMatch(/inset:\s*0/);
        expect(rule('.ie-workspace')).toMatch(/flex-direction:\s*column/);
    });

    it('has three columns that fill the height: a toolbox and a column of panels of fixed width around the picture', () => {
        expect(rule('.ie-main')).toMatch(/display:\s*grid/);
        expect(rule('.ie-main')).toMatch(/grid-template-columns:\s*\d+px\s+minmax\(0,\s*1fr\)\s+(\d+px|minmax\(\d+px,\s*\d+px\))/);
        expect(rule('.ie-main')).toMatch(/min-height:\s*0/);
        expect(rule('.ie-main')).toMatch(/flex:\s*1/);
    });

    it('the toolbox and the panels scroll on their own, the picture area does not scroll with them', () => {
        expect(rule('.ie-toolbox')).toMatch(/overflow-y:\s*auto/);
        expect(rule('.ie-panels')).toMatch(/overflow-y:\s*auto/);
        expect(rule('.ie-canvas-area')).not.toMatch(/overflow-y:\s*auto/);
        expect(rule('.ie-canvas-area')).toMatch(/min-height:\s*0/);
    });

    it('gives the picture the space that is left', () => {
        expect(rule('.ie-stage')).toMatch(/overflow:\s*auto/);
        expect(rule('.ie-stage')).not.toMatch(/max-height/);
        expect(rule('.ie-canvas-area')).toMatch(/display:\s*grid/);
    });

    it('is a dialog: the options bar, the notes, the main part and the status bar, in that order', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const card = $('ie-card');
        expect(card.getAttribute('role')).toBe('dialog');
        expect(card.getAttribute('aria-label')).toBe('Image editor');
        expect([...card.children].map(c => c.className.split(' ')[0])).toEqual(['ie-bar-top', 'ie-notes', 'ie-main', 'ie-statusbar', 'guide-overlay']);
        expect(card.querySelector('.ie-bar-top h3')!.textContent).toBe('Image editor');
    });

    it('the main part is the toolbox, the centre and the history, in that order (FR-018)', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const main = $('ie-card').querySelector('.ie-main')!;
        expect([...main.children].map(c => c.className)).toEqual(['ie-toolbox', 'ie-center', 'ie-panels']);
        const [toolbox, center, panels] = [...main.children] as HTMLElement[];
        expect(headings(toolbox!)).toEqual(['Quick', 'Background', 'Geometry', 'Colour', 'Outline']);
        expect(headings(panels!)).toEqual(['History']);
        expect([...center!.children].map(c => c.className.split(' ')[0])).toEqual(['ie-canvas-area', 'ie-preview']);
        const area = center!.querySelector('.ie-canvas-area')!;
        expect(area.querySelector('#ie-ruler-h')).not.toBeNull();
        expect(area.querySelector('#ie-ruler-v')).not.toBeNull();
        expect(area.querySelector('#ie-stage #ie-canvas')).not.toBeNull();
        expect(area.querySelector('#ie-stage #ie-grid-overlay')).not.toBeNull();
        expect(panels!.querySelector('#ie-ops')).not.toBeNull();
        expect(panels!.querySelector('#ie-preview')).toBeNull();            // the result is in the centre
        expect(center!.querySelector('#ie-preview')).not.toBeNull();
        expect(toolbox!.querySelectorAll('.ie-tools').length).toBe(5);
    });

    it('the options bar has the file and the view on the left and, on the right, Undo, Redo, Revert all, Cancel and Apply (FR-017)', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const ids = [...document.querySelectorAll('#ie-card .ie-bar-top button')].map(b => b.id);
        expect(ids).toEqual(['ie-open-other', 'ie-save-png', 'ie-bg-checker', 'ie-bg-white', 'ie-bg-black', 'ie-grid', 'ie-grid-low', 'ie-grid-medium', 'ie-grid-high', 'ie-original', 'ie-undo', 'ie-redo', 'ie-revert-all', 'ie-cancel', 'ie-apply']);
    });

    it('the status bar has the size and the pointer position (FR-019); the zoom floats over the canvas', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const parts = [...document.querySelectorAll('#ie-card .ie-statusbar > *')].map(e => e.id || e.getAttribute('data-group') || e.className);
        expect(parts).toEqual(['ie-size', 'ie-pos', 'ie-spacer']);
        expect(document.querySelector('#ie-card .ie-canvas-area .ie-zoom-float')).not.toBeNull();
    });
});

describe('Edit opens the editor of that icon (FR-003)', () => {
    it('the Colour icon card opens it for the colour icon, 192 x 192, with its picture', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-card').hidden).toBe(false);
        expect($('ie-title-note').textContent).toBe('colour icon, 192 x 192 pixels, from the current colour icon');
        expect(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.width).toBe(192);
    });

    it('the Outline icon card opens it for the outline icon, 32 x 32, with its picture', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        expect($('ie-title-note').textContent).toBe('outline icon, 32 x 32 pixels, from the current outline icon');
        expect(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.width).toBe(32);
        expect(document.querySelectorAll('#ie-ops li[data-kind]')).toHaveLength(0);
    });

    it('Outline from this icon, inside the editor of the outline icon, starts from the colour icon and adds its steps', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        await ui.click('ie-preset-outline');
        expect($('ie-title-note').textContent).toContain('outline icon, 32 x 32 pixels, from the current colour icon');
        expect(document.querySelectorAll('#ie-ops li[data-kind]').length).toBeGreaterThan(0);
    });

    it('Apply and Cancel close it and the page is as it was', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-cancel');
        expect($('ie-card').hidden).toBe(true);
        await ui.click('ed-img-edit-color');
        await ui.click('ie-apply');
        expect($('ie-card').hidden).toBe(true);
    });

    it('the one editor serves both icons, one at a time', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(document.querySelectorAll('#ie-card')).toHaveLength(1);
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-outline');
        expect(document.querySelectorAll('#ie-card')).toHaveLength(1);
        expect($('ie-title-note').textContent).toContain('outline icon');
    });
});

describe('Escape (FR-004)', () => {
    it('closes the editor like Cancel', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-rotate');
        key('Escape');
        await flush(2);
        expect($('ie-card').hidden).toBe(true);
        expect(ui.text('changes-none')).toBeTruthy();            // nothing was applied
    });

    it('does nothing when the editor is not open, and other keys do nothing', async () => {
        const ui = await loaded();
        key('Escape');
        await ui.click('ed-img-edit-color');
        key('Enter');
        key('a');
        await flush(2);
        expect($('ie-card').hidden).toBe(false);
    });
});

describe('the pixel reader and the eyedropper are gone (FR-005)', () => {
    it('has none of their controls, and no row for them', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-pick-x', 'ie-pick-y', 'ie-read', 'ie-zoom-100', 'ie-zoom-200', 'ie-zoom-400', 'ie-pick', 'ie-reading', 'ie-send-bg', 'ie-send-solid', 'ie-send-fill', 'ie-send-accent']) expect(document.getElementById(id), id).toBeNull();
        expect(document.querySelector('.ie-pixel')).toBeNull();
        expect($('ie-card').textContent).not.toContain('Read the pixel');
        expect($('ie-card').textContent).not.toContain('Eyedropper');
    });
});

describe('the zoom, from 10 to 200 % (FR-006, FR-007, FR-015)', () => {
    it('has Fit and the + / - buttons over the canvas, with a value; no slider and no 100 % button', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(document.getElementById('ie-zoom')).toBeNull();            // the slider is gone: Fit and the steppers cover the whole range
        expect($('ie-zoom-out-float').getAttribute('aria-label')).toBe('Zoom out');
        expect($('ie-zoom-in-float').getAttribute('aria-label')).toBe('Zoom in');
        expect($('ie-zoom-value').textContent).toBe('Fit');
        expect($('ie-zoom-fit').getAttribute('aria-pressed')).toBe('true');
    });

    it('the + and - buttons set the size of the picture, ten per cent at a time, and show the value', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        setZoom('150');
        await flush(2);
        expect($('ie-canvas').style.width).toBe('288px');
        expect($('ie-canvas').style.height).toBe('288px');
        expect($('ie-zoom-value').textContent).toBe('150%');
        expect($('ie-zoom-fit').getAttribute('aria-pressed')).toBe('false');
        setZoom('10');
        await flush(2);
        expect($('ie-canvas').style.width).toBe('19.2px');
        expect($('ie-zoom-value').textContent).toBe('10%');
    });

    it('the + button stops at 200, disabled; the - button stops at 10, disabled', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        setZoom('200');
        expect($('ie-zoom-value').textContent).toBe('200%');
        expect(($('ie-zoom-in-float') as HTMLButtonElement).disabled).toBe(true);
        setZoom('10');
        expect($('ie-zoom-value').textContent).toBe('10%');
        expect(($('ie-zoom-out-float') as HTMLButtonElement).disabled).toBe(true);
    });

    it('100 % shows the picture at its own size; Fit goes back to filling the area', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        setZoom('200');
        setZoom('100');
        await flush(2);
        expect($('ie-canvas').style.width).toBe('192px');
        expect($('ie-zoom-value').textContent).toBe('100%');
        await ui.click('ie-zoom-fit');
        expect($('ie-canvas').style.width).toBe('');
        expect($('ie-canvas').classList.contains('is-fit')).toBe(true);
        expect($('ie-zoom-value').textContent).toBe('Fit');
    });

    it('Fit is not the same as 100 %: it fills the area, up and down, with the proportions kept (CSS)', () => {
        expect(rule('.ie-canvas.is-fit')).toMatch(/width:\s*100%/);
        expect(rule('.ie-canvas.is-fit')).toMatch(/height:\s*100%/);
        expect(rule('.ie-canvas.is-fit')).toMatch(/object-fit:\s*contain/);
    });

    it('Ctrl and the wheel zoom by 10 per notch, within the limits, and keep the page from scrolling', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        setZoom('100');
        const up = wheel({ ctrlKey: true, deltaY: -100 });
        await flush(2);
        expect(up.defaultPrevented).toBe(true);
        expect($('ie-zoom-value').textContent).toBe('110%');
        const down = wheel({ ctrlKey: true, deltaY: 100 });
        wheel({ ctrlKey: true, deltaY: 100 });
        await flush(2);
        expect(down.defaultPrevented).toBe(true);
        expect($('ie-zoom-value').textContent).toBe('90%');
        setZoom('200');
        wheel({ ctrlKey: true, deltaY: -100 });
        await flush(2);
        expect($('ie-zoom-value').textContent).toBe('200%');
        setZoom('10');
        wheel({ ctrlKey: true, deltaY: 100 });
        await flush(2);
        expect($('ie-zoom-value').textContent).toBe('10%');
    });

    it('from Fit, the wheel starts from the size that is shown (100 when it cannot be measured)', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        wheel({ ctrlKey: true, deltaY: -100 });
        await flush(2);
        expect($('ie-zoom-value').textContent).toBe('110%');
    });

    it('Fit shows the size it gives the picture, rounded to a step and kept within the range, and the wheel starts from it', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => rectOf(384, 384);
        await ui.click('ie-zoom-fit');                                    // draws again with the measure
        expect($('ie-zoom-value').dataset.fitPct).toBe('200');
        canvas.getBoundingClientRect = () => rectOf(600, 288);
        await ui.click('ie-zoom-fit');
        expect($('ie-zoom-value').dataset.fitPct).toBe('150');     // the smaller side decides: the whole picture is in view
        canvas.getBoundingClientRect = () => rectOf(288, 288);
        await ui.click('ie-zoom-fit');
        wheel({ ctrlKey: true, deltaY: -100 });
        await flush(2);
        expect($('ie-zoom-value').textContent).toBe('160%');
        canvas.getBoundingClientRect = () => rectOf(4, 4);
        await ui.click('ie-zoom-fit');
        expect($('ie-zoom-value').dataset.fitPct).toBe('10');      // never under the lowest step
        canvas.getBoundingClientRect = () => rectOf(1920, 1920);
        await ui.click('ie-zoom-fit');
        expect($('ie-zoom-value').dataset.fitPct).toBe('200');     // nor above the highest
    });

    it('the wheel alone is left to the scrolling of the picture', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        setZoom('150');
        const e = wheel({ ctrlKey: false, deltaY: 100 });
        await flush(2);
        expect(e.defaultPrevented).toBe(false);
        expect($('ie-zoom-value').textContent).toBe('150%');
    });

    it('a new editing session starts at Fit', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        setZoom('150');
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-outline');
        expect($('ie-zoom-value').textContent).toBe('Fit');
        expect($('ie-canvas').style.width).toBe('');
    });

    it('is a view only: the result does not change', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const before = Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data);
        setZoom('150');
        await flush(2);
        expect(Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data)).toEqual(before);
    });

    it('the zoom floats over the canvas and holds Fit, the - button, the value and the + button, in that order', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const ids = [...document.querySelectorAll('#ie-card .ie-canvas-area .ie-zoom-float > *')].map(e => e.id);
        expect(ids).toEqual(['ie-zoom-fit', 'ie-zoom-out-float', 'ie-zoom-value', 'ie-zoom-in-float']);
    });
});

describe('the grid (FR-021)', () => {
    it('is off at first, and the button turns it on and off', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-grid').getAttribute('aria-pressed')).toBe('false');
        expect($('ie-grid-overlay').hidden).toBe(true);
        await ui.click('ie-grid');
        expect($('ie-grid').getAttribute('aria-pressed')).toBe('true');
        expect($('ie-grid-overlay').hidden).toBe(false);
        await ui.click('ie-grid');
        expect($('ie-grid-overlay').hidden).toBe(true);
    });

    it('covers the colour icon exactly, with a line every 24 pixels and the safe area of 120 x 120 in the middle', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-grid');
        setZoom('200');
        await flush(2);
        const o = $('ie-grid-overlay');
        expect([o.style.width, o.style.height]).toEqual(['384px', '384px']);
        expect(o.style.getPropertyValue('--cell')).toBe('48px');
        const safe = $('ie-safe');
        expect(safe.hidden).toBe(false);
        expect([safe.style.left, safe.style.top, safe.style.width, safe.style.height]).toEqual(['72px', '72px', '240px', '240px']);
        setZoom('100');
        await flush(2);
        expect([o.style.width, o.style.getPropertyValue('--cell'), safe.style.left, safe.style.width]).toEqual(['192px', '24px', '36px', '120px']);
    });

    it('for the outline icon: a line every 4 pixels and no safe area', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        await ui.click('ie-grid');
        setZoom('200');
        await flush(2);
        const o = $('ie-grid-overlay');
        expect([o.style.width, o.style.height]).toEqual(['64px', '64px']);
        expect(o.style.getPropertyValue('--cell')).toBe('8px');
        expect($('ie-safe').hidden).toBe(true);
    });

    it('is a view only: the result does not change, and a new session starts without it', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const before = Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data);
        await ui.click('ie-grid');
        expect(Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data)).toEqual(before);
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-color');
        expect($('ie-grid').getAttribute('aria-pressed')).toBe('false');
        expect($('ie-grid-overlay').hidden).toBe(true);
    });

    it('the lines come from a colour of the theme', () => {
        expect(css).toMatch(/--grid-line:/);
        expect(rule('.ie-grid-overlay')).toMatch(/var\(--grid-line\)/);
        expect(rule('.ie-grid-overlay')).toMatch(/pointer-events:\s*none/);
    });
});

describe('the grid precision (FR-032)', () => {
    it('is Low, Medium, High; Medium is on at first and is the same spacing as before; the buttons are off while the grid is off', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const ids = [...document.querySelectorAll('[data-group="grid-precision"] > *')].map(e => e.id);
        expect(ids).toEqual(['ie-grid-low', 'ie-grid-medium', 'ie-grid-high']);
        expect(($('ie-grid-low') as HTMLButtonElement).disabled).toBe(true);
        expect(($('ie-grid-medium') as HTMLButtonElement).disabled).toBe(true);
        expect($('ie-grid-medium').getAttribute('aria-pressed')).toBe('true');
        await ui.click('ie-grid');
        expect(($('ie-grid-low') as HTMLButtonElement).disabled).toBe(false);
        setZoom('100');
        await flush(2);
        expect($('ie-grid-overlay').style.getPropertyValue('--cell')).toBe('24px');
    });

    it('Low is 4 x 4 cells and High is 16 x 16, on the colour icon and on the outline icon alike', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-grid');
        setZoom('100');
        await ui.click('ie-grid-low');
        await flush(2);
        expect($('ie-grid-low').getAttribute('aria-pressed')).toBe('true');
        expect($('ie-grid-medium').getAttribute('aria-pressed')).toBe('false');
        expect($('ie-grid-overlay').style.getPropertyValue('--cell')).toBe('48px');
        await ui.click('ie-grid-high');
        await flush(2);
        expect($('ie-grid-overlay').style.getPropertyValue('--cell')).toBe('12px');
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-outline');
        await ui.click('ie-grid');
        setZoom('100');
        await ui.click('ie-grid-low');
        await flush(2);
        expect($('ie-grid-overlay').style.getPropertyValue('--cell')).toBe('8px');
        await ui.click('ie-grid-high');
        await flush(2);
        expect($('ie-grid-overlay').style.getPropertyValue('--cell')).toBe('2px');
    });

    it('is a view only, and a new session starts back at Medium', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-grid');
        const before = Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data);
        await ui.click('ie-grid-high');
        expect(Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data)).toEqual(before);
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-color');
        expect($('ie-grid-medium').getAttribute('aria-pressed')).toBe('true');
    });
});

describe('the status bar (FR-019, FR-022)', () => {
    it('says the size of the picture on the canvas', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-size').textContent).toBe('192 x 192 pixels');
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-outline');
        expect($('ie-size').textContent).toBe('32 x 32 pixels');
    });

    it('writes the pixel under the pointer, and a dash when the pointer is not over the picture', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => rectOf(384, 384);
        expect($('ie-pos').textContent).toBe('-');
        canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 20, bubbles: true }));
        expect($('ie-pos').textContent).toBe('50, 10');
        canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 383, clientY: 383, bubbles: true }));
        expect($('ie-pos').textContent).toBe('191, 191');
        canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 500, clientY: 20, bubbles: true }));
        expect($('ie-pos').textContent).toBe('-');
        canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 20, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }));
        expect($('ie-pos').textContent).toBe('-');
    });

    it('writes nothing while the original is shown', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => rectOf(384, 384);
        await ui.click('ie-original');
        canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 20, bubbles: true }));
        expect($('ie-pos').textContent).toBe('-');
    });

    it('is cleared when the editor opens again', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => rectOf(384, 384);
        canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 20, bubbles: true }));
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-color');
        expect($('ie-pos').textContent).toBe('-');
    });
});

describe('the rulers (FR-020)', () => {
    it('are there, hidden from screen readers, with the corner between them', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-ruler-h', 'ie-ruler-v']) expect($(id).getAttribute('aria-hidden'), id).toBe('true');
        expect(document.querySelector('.ie-ruler-corner')).not.toBeNull();
    });

    it('have marks from the pixels of the picture once the picture has a size on screen', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        Object.defineProperty($('ie-ruler-h'), 'clientWidth', { configurable: true, value: 400 });
        Object.defineProperty($('ie-ruler-v'), 'clientHeight', { configurable: true, value: 400 });
        setZoom('100');
        await flush(2);
        const labels = (id: string) => [...$(id).querySelectorAll('.ie-tick--major')].map(t => t.textContent);
        expect(labels('ie-ruler-h')).toEqual(['0', '50', '100', '150']);
        expect(labels('ie-ruler-v')).toEqual(['0', '50', '100', '150']);
        expect($('ie-ruler-h').querySelectorAll('.ie-tick').length).toBe(20);
        Object.defineProperty($('ie-ruler-h'), 'clientWidth', { configurable: true, value: 200 });
        setZoom('200');
        await flush(2);
        expect(labels('ie-ruler-h')).toEqual(['0', '50', '100']);            // at 200 % 50 pixels are 100 screen pixels: 200 screen pixels reach pixel 100
    });
});

describe('the rulers with Fit', () => {
    it('start where the picture starts, not where the area starts: Fit centres the picture', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const canvas = $('ie-canvas');
        canvas.getBoundingClientRect = () => rectOf(600, 384);          // the picture is 384 wide in it (200 %), so 108 pixels are left on each side
        Object.defineProperty($('ie-ruler-h'), 'clientWidth', { configurable: true, value: 800 });
        Object.defineProperty($('ie-ruler-v'), 'clientHeight', { configurable: true, value: 800 });
        await ui.click('ie-zoom-fit');
        const first = (id: string) => ($(id).querySelector('.ie-tick') as HTMLElement).style;
        expect(first('ie-ruler-h').left).toBe('108px');
        expect(first('ie-ruler-v').top).toBe('0px');
    });
});

describe('no redundant control (2026-10-29)', () => {
    it('the quick buttons are the ones of the icon that is edited', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(($('ie-preset-teams') as HTMLElement).hidden).toBe(false);
        expect(($('ie-preset-outline') as HTMLElement).hidden).toBe(true);
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-outline');
        expect(($('ie-preset-teams') as HTMLElement).hidden).toBe(true);
        expect(($('ie-preset-outline') as HTMLElement).hidden).toBe(false);
    });

    it('is gone: Reset, Resize, Make white, Make black and the accent background of the canvas', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-reset', 'ie-add-resize', 'ie-add-white', 'ie-add-black', 'ie-bg-accent']) expect(document.getElementById(id), id).toBeNull();
        expect([...document.querySelectorAll('#ie-card [data-group="background"] button')].map(b => b.id)).toEqual(['ie-bg-checker', 'ie-bg-white', 'ie-bg-black']);
        expect([...document.querySelectorAll('#ie-card .ie-tools .ie-tool')].map(b => b.id)).toEqual([
            'ie-preset-teams', 'ie-preset-outline',
            'ie-add-removeBg', 'ie-add-fill',
            'ie-add-trim', 'ie-add-crop', 'ie-add-square', 'ie-add-fit', 'ie-add-rotate', 'ie-add-flip-h', 'ie-add-flip-v',
            'ie-add-solid', 'ie-add-tone',
            'ie-add-outline',
        ]);
    });

    it('the CSS lets the hidden quick button go', () => {
        expect(rule('.ie-tools .btn[hidden]')).toMatch(/display:\s*none/);
    });
});

describe('the toolbox by category, with icons (FR-025)', () => {
    const groups = (): Array<{ cat: string; title: string; tools: string[] }> => [...document.querySelectorAll('#ie-card .ie-group')].map(g => ({
        cat: g.getAttribute('data-cat')!, title: g.querySelector('h4')!.textContent!, tools: [...g.querySelectorAll('.ie-tools .ie-tool')].map(b => b.id),
    }));

    it('has five groups, each with a title, in order', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(groups()).toEqual([
            { cat: 'quick', title: 'Quick', tools: ['ie-preset-teams', 'ie-preset-outline'] },
            { cat: 'background', title: 'Background', tools: ['ie-add-removeBg', 'ie-add-fill'] },
            { cat: 'geometry', title: 'Geometry', tools: ['ie-add-trim', 'ie-add-crop', 'ie-add-square', 'ie-add-fit', 'ie-add-rotate', 'ie-add-flip-h', 'ie-add-flip-v'] },
            { cat: 'colour', title: 'Colour', tools: ['ie-add-solid', 'ie-add-tone'] },
            { cat: 'outline', title: 'Outline', tools: ['ie-add-outline'] },
        ]);
    });

    it('every group title and every tool has an SVG icon of the set, and no tool shares its icon with another of its group', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const g of document.querySelectorAll('#ie-card .ie-group')) {
            expect(g.querySelector('h4 .icon'), g.getAttribute('data-cat')!).not.toBeNull();
            const used = new Set<string>();
            for (const b of g.querySelectorAll('.ie-tools .ie-tool')) {
                const ic = b.querySelector('.icon');
                expect(ic, b.id).not.toBeNull();
                const name = [...ic!.classList].find(c => c.startsWith('icon-'))!;
                if (b.id === 'ie-add-flip-h' || b.id === 'ie-add-flip-v') continue;   // the two flips differ by the direction of the arrow
                expect(used.has(name), `${b.id} repeats ${name}`).toBe(false);
                used.add(name);
            }
        }
        const flips = ['ie-add-flip-h', 'ie-add-flip-v'].map(id => [...$(id).querySelector('.icon')!.classList].find(c => c.startsWith('icon-')));
        expect(flips[0]).not.toBe(flips[1]);
    });

    it('each group has a colour of its own, from custom properties of both themes', () => {
        for (const cat of ['quick', 'background', 'geometry', 'colour', 'outline']) {
            expect(rule(`.ie-group[data-cat="${cat}"]`), cat).toContain(`--cat: var(--cat-${cat})`);
            const defs = css.match(new RegExp(`--cat-${cat}:`, 'g')) ?? [];
            expect(defs.length, `--cat-${cat} in dark and light`).toBeGreaterThanOrEqual(2);
        }
        expect(rule('.ie-tool')).toMatch(/var\(--cat\)/);
    });
});

describe('Undo, Redo and Revert all, on the right with Cancel and Apply (FR-017, FR-023, FR-024)', () => {
    const kinds = (): string[] => [...document.querySelectorAll('#ie-ops li[data-kind]')].map(li => li.getAttribute('data-kind')!);

    it('Revert all is the destructive button: red, and the other buttons are not', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-revert-all').classList.contains('btn--danger')).toBe(true);
        for (const id of ['ie-undo', 'ie-redo', 'ie-cancel', 'ie-open-other', 'ie-save-png']) expect($(id).classList.contains('btn--danger'), id).toBe(false);
        expect($('ie-apply').classList.contains('btn--primary')).toBe(true);
        expect(rule('.btn--danger')).toMatch(/--color-error/);
    });

    it('Undo, Redo and Revert all have an icon and a name', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-undo').querySelector('.icon-undo')).not.toBeNull();
        expect($('ie-redo').querySelector('.icon-redo')).not.toBeNull();
        expect($('ie-revert-all').querySelector('.icon-trash')).not.toBeNull();
        expect($('ie-revert-all').textContent!.trim()).toBe('Revert all');
    });

    it('Revert all takes away every step, can be undone, and is off while the history is empty', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(($('ie-revert-all') as HTMLButtonElement).disabled).toBe(true);
        await ui.click('ie-add-rotate');
        await ui.click('ie-add-flip-h');
        expect(($('ie-revert-all') as HTMLButtonElement).disabled).toBe(false);
        await ui.click('ie-revert-all');
        expect(kinds()).toEqual([]);
        expect(($('ie-revert-all') as HTMLButtonElement).disabled).toBe(true);
        expect(($('ie-add-rotate') as HTMLButtonElement).disabled).toBe(false);     // the tools are free again
        await ui.click('ie-undo');
        expect(kinds()).toEqual(['rotate', 'flip']);
    });

    it('Revert all leaves the picture that the steps started from', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        const before = Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data);
        await ui.click('ie-add-trim');
        expect(Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data)).not.toEqual(before);
        await ui.click('ie-revert-all');
        expect(Array.from(ui.pixels($('ie-canvas') as HTMLCanvasElement)!.data)).toEqual(before);
    });
});

describe('each effect once, and effects that clash (FR-026, FR-027)', () => {
    const off = (id: string): boolean => ($(id) as HTMLButtonElement).disabled;
    const kinds = (): string[] => [...document.querySelectorAll('#ie-ops li[data-kind]')].map(li => li.getAttribute('data-kind')!);

    it('a tool is switched off once its effect is in the history, with the reason as its title, and back on when the step is removed', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(off('ie-add-rotate')).toBe(false);
        await ui.click('ie-add-rotate');
        expect(off('ie-add-rotate')).toBe(true);
        expect($('ie-add-rotate').title).toBe('Rotate is already in the history (step 1). Remove that step to add it again.');
        await ui.click('ie-add-rotate');                                   // a click on a switched-off button does nothing
        expect(kinds()).toEqual(['rotate']);
        await ui.click('ie-op-0-remove');
        expect(off('ie-add-rotate')).toBe(false);
        expect($('ie-add-rotate').title).not.toContain('already');
    });

    it('every tool follows the rule, each flip on its own', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-add-removeBg', 'ie-add-trim', 'ie-add-crop', 'ie-add-square', 'ie-add-fit', 'ie-add-rotate', 'ie-add-flip-h']) {
            expect(off(id), id).toBe(false);
            await ui.click(id);
            expect(off(id), id).toBe(true);
        }
        expect(off('ie-add-flip-v')).toBe(false);                          // the other direction is another effect
        await ui.click('ie-add-flip-v');
        expect(off('ie-add-flip-v')).toBe(true);
        expect(kinds()).toEqual(['removeBg', 'trim', 'crop', 'square', 'fit', 'rotate', 'flip', 'flip']);
    });

    it('Undo and Redo switch the tools with the history', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-rotate');
        await ui.click('ie-undo');
        expect(off('ie-add-rotate')).toBe(false);
        await ui.click('ie-redo');
        expect(off('ie-add-rotate')).toBe(true);
    });

    for (const [first, second] of [['ie-add-outline', 'ie-add-solid'], ['ie-add-outline', 'ie-add-tone'], ['ie-add-outline', 'ie-add-fill'], ['ie-add-solid', 'ie-add-tone'], ['ie-add-solid', 'ie-add-outline'], ['ie-add-tone', 'ie-add-solid'], ['ie-add-tone', 'ie-add-outline'], ['ie-add-fill', 'ie-add-outline']] as const) {
        it(`${first} switches off ${second}, and removing the step switches it on`, async () => {
            const ui = await loaded();
            await ui.click('ed-img-edit-color');
            expect(off(second)).toBe(false);
            await ui.click(first);
            expect(off(second)).toBe(true);
            expect($(second).title).toMatch(/does not go with .+, which is step 1 of the history\. Remove that step first\.$/);
            await ui.click('ie-op-0-remove');
            expect(off(second)).toBe(false);
        });
    }

    it('effects that do not clash stay on together: a solid colour does not switch off a trim, a flip or a fill', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-solid');
        for (const id of ['ie-add-trim', 'ie-add-crop', 'ie-add-rotate', 'ie-add-flip-h', 'ie-add-fill', 'ie-add-removeBg']) expect(off(id), id).toBe(false);
        expect(off('ie-add-tone')).toBe(true);
        expect(off('ie-add-outline')).toBe(true);
    });

    it('a quick button is off when one of its steps is already there or clashes, and it adds its steps once', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect(off('ie-preset-teams')).toBe(false);
        await ui.click('ie-preset-teams');
        expect(off('ie-preset-teams')).toBe(true);
        expect($('ie-preset-teams').title).toMatch(/is already in the history \(step \d\)/);
        await ui.click('ie-preset-teams');
        expect(kinds().filter(k => k === 'trim')).toHaveLength(1);
        await ui.click('ie-cancel');
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-trim');
        expect(off('ie-preset-teams')).toBe(true);                         // one of its steps would be repeated
        expect($('ie-preset-teams').title).toContain('Trim is already in the history (step 1)');
    });

    it('the outline quick button is off when a solid colour is in the history', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-outline');
        expect(off('ie-preset-outline')).toBe(false);
        await ui.click('ie-add-solid');
        expect(off('ie-preset-outline')).toBe(true);
        expect($('ie-preset-outline').title).toContain('Outline maker does not go with Solid colour');
    });

    it('an enabled tool has a hint as its title', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-add-removeBg', 'ie-add-fill', 'ie-add-trim', 'ie-add-crop', 'ie-add-square', 'ie-add-fit', 'ie-add-rotate', 'ie-add-flip-h', 'ie-add-flip-v', 'ie-add-solid', 'ie-add-tone', 'ie-add-outline']) {
            expect($(id).title.length, id).toBeGreaterThan(10);
        }
    });
});

describe('the history and the result in the centre (FR-028, FR-029)', () => {
    it('the history lists the steps in order, each with its number, its icon and the colour of its group', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-removeBg');
        await ui.click('ie-add-rotate');
        await ui.click('ie-add-solid');
        const items = [...document.querySelectorAll('#ie-ops li[data-kind]')];
        expect(items.map(li => li.getAttribute('data-kind'))).toEqual(['removeBg', 'rotate', 'solid']);
        expect(items.map(li => li.getAttribute('data-cat'))).toEqual(['background', 'geometry', 'colour']);
        expect(items.map(li => li.querySelector('.ie-op-n')!.textContent)).toEqual(['1', '2', '3']);
        for (const li of items) expect(li.querySelector('.ie-op-head .icon'), li.id).not.toBeNull();
    });

    it('the colour sizes are 96, 48 and 32 pixels, under the picture; the picture is the 192', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        expect($('ie-preview').textContent).toContain('The result as it is, at the sizes Teams uses');
        for (const s of [96, 48, 32]) expect(document.getElementById(`ie-tile-${s}`), String(s)).not.toBeNull();
        expect(document.getElementById('ie-tile-192')).toBeNull();
        expect($('ie-preview').closest('.ie-center')).not.toBeNull();
        expect($('ie-preview').closest('.ie-panels')).toBeNull();
    });

    it('is a strip of one row (CSS)', () => {
        expect(rule('.ie-preview')).toMatch(/display:\s*flex/);
        expect(rule('.ie-center')).toMatch(/flex-direction:\s*column/);
    });
});

describe('the colour section is gone (FR-030)', () => {
    it('has no accent suggestion and no way to send an accent colour from the editor', async () => {
        const ui = await loaded();
        await ui.click('ed-img-edit-color');
        for (const id of ['ie-accent-suggest', 'ie-accent-accept', 'ie-accent-swatch', 'ie-accent-hex']) expect(document.getElementById(id), id).toBeNull();
        expect($('ie-card').textContent).not.toContain('Suggest accent colour');
        expect($('ie-card').textContent).not.toContain('Use as accent colour');
    });
});

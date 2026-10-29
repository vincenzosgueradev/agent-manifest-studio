// @vitest-environment jsdom
/**
 * Effect guides (feature 012): every toolbox entry has an info control, opening a guide with that effect's
 * name, text and a before/after picture pair, without ever touching the editor's own picture or history
 * (FR-001 to FR-008).
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const kinds = () => [...document.querySelectorAll('#ie-ops .ie-op')].map(li => li.getAttribute('data-kind'));

async function loaded(): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes());
    await ui.click('ed-img-edit-color');
    return ui;
}

/** Every info control's id and the guide title it must open. */
const ENTRIES: Array<[string, string]> = [
    ['ie-preset-teams-info', 'Teams-ready colour icon'],
    ['ie-preset-outline-info', 'Outline from this icon'],
    ['ie-add-removeBg-info', 'Remove background'],
    ['ie-add-fill-info', 'Fill background'],
    ['ie-add-trim-info', 'Trim'],
    ['ie-add-crop-info', 'Crop'],
    ['ie-add-square-info', 'Make square'],
    ['ie-add-fit-info', 'Fit'],
    ['ie-add-rotate-info', 'Rotate'],
    ['ie-add-flip-h-info', 'Flip'],
    ['ie-add-flip-v-info', 'Flip'],
    ['ie-add-solid-info', 'Solid colour'],
    ['ie-add-tone-info', 'Tone'],
    ['ie-add-outline-info', 'Outline maker'],
];

describe('every toolbox entry has an info control', () => {
    it.each(ENTRIES)('%s exists, distinct from its action button', async (infoId) => {
        const ui = await loaded();
        const info = $(infoId);
        expect(info).not.toBeNull();
        expect(info.tagName).toBe('BUTTON');
        const actionId = infoId.replace(/-info$/, '');
        expect($(actionId)).not.toBeNull();
        expect(info).not.toBe($(actionId));
        void ui;
    });
});

describe('opening a guide', () => {
    it.each(ENTRIES)('%s opens the right guide', async (infoId, title) => {
        const ui = await loaded();
        expect($('guide-overlay').hidden).toBe(true);
        await ui.click(infoId);
        expect($('guide-overlay').hidden).toBe(false);
        expect($('guide-title').textContent).toBe(title);
        expect($('guide-lead').textContent).not.toBe('');
        expect($('guide-example').textContent).not.toBe('');
    });

    it('shows a Before and an After picture that differ', async () => {
        const ui = await loaded();
        await ui.click('ie-add-removeBg-info');
        const before = ui.pixels($('guide-before-canvas') as HTMLCanvasElement)!;
        const after = ui.pixels($('guide-after-canvas') as HTMLCanvasElement)!;
        expect(before.data).not.toEqual(after.data);
    });

    it('shows the background turning see-through for Remove background, on a checker canvas', async () => {
        const ui = await loaded();
        await ui.click('ie-add-removeBg-info');
        const after = ui.pixels($('guide-after-canvas') as HTMLCanvasElement)!;
        let sawAlpha0 = false;
        for (let i = 3; i < after.data.length; i += 4) if (after.data[i] === 0) { sawAlpha0 = true; break; }
        expect(sawAlpha0).toBe(true);
        expect($('guide-after-canvas').classList.contains('icon-canvas--checker')).toBe(true);
    });

    it('only one guide is open at a time', async () => {
        const ui = await loaded();
        await ui.click('ie-add-removeBg-info');
        expect($('guide-title').textContent).toBe('Remove background');
        await ui.click('ie-add-fit-info');
        expect($('guide-title').textContent).toBe('Fit');
        expect(document.querySelectorAll('.guide-overlay').length).toBe(1);
    });
});

describe('closing a guide never touches the editor', () => {
    it('closes with its own control and leaves the history empty', async () => {
        const ui = await loaded();
        await ui.click('ie-add-rotate-info');
        expect($('guide-overlay').hidden).toBe(false);
        await ui.click('guide-close');
        expect($('guide-overlay').hidden).toBe(true);
        expect(kinds()).toEqual([]);
        expect($('ie-card').hidden).toBe(false);
    });

    it('closes with Escape, without closing the editor workspace', async () => {
        const ui = await loaded();
        await ui.click('ie-add-rotate-info');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await flush();
        expect($('guide-overlay').hidden).toBe(true);
        expect($('ie-card').hidden).toBe(false);
        void ui;
    });

    it('closes with a click on the backdrop, not on the panel', async () => {
        const ui = await loaded();
        await ui.click('ie-add-rotate-info');
        $('guide-panel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect($('guide-overlay').hidden).toBe(false);
        $('guide-overlay').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect($('guide-overlay').hidden).toBe(true);
        void ui;
    });

    it('never adds an operation just by opening and closing every guide', async () => {
        const ui = await loaded();
        for (const [infoId] of ENTRIES) {
            await ui.click(infoId);
            await ui.click('guide-close');
        }
        expect(kinds()).toEqual([]);
    });
});

describe('the Parameters section (FR-009, the technical manual)', () => {
    it('lists every parameter of Remove background, by its real label, each with its own explanation', async () => {
        const ui = await loaded();
        await ui.click('ie-add-removeBg-info');
        const names = [...document.querySelectorAll('#guide-params .guide-param-name')].map(n => n.textContent);
        expect(names).toEqual(['Where', 'Colour to remove', 'Tolerance (%)', 'Softness (%)', 'Matte (pixels)']);
        const helps = [...document.querySelectorAll('#guide-params .guide-param-help')].map(n => n.textContent ?? '');
        expect(helps.every(h => h.length > 0)).toBe(true);
        expect(new Set(helps).size).toBe(helps.length);   // each parameter's explanation is its own, not copy-pasted
    });

    it('shows the options of a select parameter and the range of a number parameter', async () => {
        const ui = await loaded();
        await ui.click('ie-add-rotate-info');
        expect($('guide-params').textContent).toContain('90 degrees clockwise');
        await ui.click('ie-add-tone-info');
        expect($('guide-params').textContent).toContain('-180 to 180');
    });

    it('has one row per toolbox entry matching that effect\'s own field count, for every operation', async () => {
        const ui = await loaded();
        const rows: Record<string, number> = {
            removeBg: 5, fill: 1, trim: 1, crop: 4, square: 1, fit: 1, rotate: 1, flip: 1, solid: 1, tone: 7, outline: 2,
        };
        for (const [infoId] of ENTRIES) {
            const base = infoId.replace(/^ie-add-/, '').replace(/-info$/, '');
            const kind = base === 'flip-h' || base === 'flip-v' ? 'flip' : base;
            if (!(kind in rows)) continue;   // the two Quick presets have none
            await ui.click(infoId);
            expect(document.querySelectorAll('#guide-params .guide-param')).toHaveLength(rows[kind]!);
        }
    });

    it('has no Parameters section for a Quick preset: it takes no settings of its own', async () => {
        const ui = await loaded();
        await ui.click('ie-preset-teams-info');
        expect($('guide-params').hidden).toBe(true);
        await ui.click('ie-preset-outline-info');
        expect($('guide-params').hidden).toBe(true);
    });
});

// @vitest-environment jsdom
/**
 * The step flow in the manner of Agent Nameplate: stepper, breadcrumb, Back and Next, suffix chips
 * (asked by hand, 2026-10-27).
 */
import { describe, expect, it } from 'vitest';
import { boot, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const IDS = ['step-package', 'step-suffix', 'step-look', 'step-preview', 'step-checks', 'step-save'];
const LABELS = ['Package', 'Details', 'Look', 'Preview', 'Checks', 'Save'];

const visible = (): string[] => IDS.filter(id => !document.getElementById(id)!.hidden);
const stepperOf = (id: string) => [...document.querySelectorAll<HTMLElement>(`#${id} .stepper-item`)];
const nav = (id: string, which: 'back' | 'next') => document.querySelector<HTMLButtonElement>(`#${id} [data-nav="${which}"]`);
const clickGoto = async (ui: Ui, n: number) => {
    document.querySelector<HTMLElement>(`#${visible()[0]} .stepper-btn[data-goto="${n}"]`)!.click();
    await new Promise(r => setTimeout(r, 0));
    void ui;
};

describe('before a package is loaded', () => {
    it('only the first step is open; the rest of the stepper is disabled; there is no breadcrumb', async () => {
        const ui = await boot();
        expect(visible()).toEqual(['step-package']);
        const buttons = [...document.querySelectorAll<HTMLButtonElement>('#step-package .stepper-btn')];
        expect(buttons.map(b => b.textContent!.replace(/^\d+/, ''))).toEqual(LABELS);
        expect(buttons.map(b => b.disabled)).toEqual([false, true, true, true, true, true]);
        expect(nav('step-package', 'next')!.disabled).toBe(true);
        expect(ui.$('breadcrumb').hidden).toBe(true);
        expect(ui.$('summary').hidden).toBe(true);
    });

    it('every step carries a stepper, with the same six steps', async () => {
        await boot();
        for (const id of IDS) expect(stepperOf(id).filter(li => li.classList.contains('stepper-item'))).toHaveLength(6);
    });
});

describe('after a package is loaded', () => {
    it('stays on the first step, which now shows the summary and allows Next', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(visible()).toEqual(['step-package']);
        expect(ui.$('summary').hidden).toBe(false);
        expect(nav('step-package', 'next')!.disabled).toBe(false);
        expect([...document.querySelectorAll<HTMLButtonElement>('#step-package .stepper-btn')].every(b => !b.disabled)).toBe(true);
    });

    it('Next and Back walk through the steps in order, one step visible at a time', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        for (let i = 1; i < IDS.length; i++) {
            nav(visible()[0]!, 'next')!.click();
            await new Promise(r => setTimeout(r, 0));
            expect(visible()).toEqual([IDS[i]]);
        }
        for (let i = IDS.length - 2; i >= 0; i--) {
            nav(visible()[0]!, 'back')!.click();
            await new Promise(r => setTimeout(r, 0));
            expect(visible()).toEqual([IDS[i]]);
        }
    });

    it('the first step has no Back and the last has no Next', async () => {
        await boot();
        expect(nav('step-package', 'back')).toBeNull();
        expect(nav('step-save', 'next')).toBeNull();
        expect(nav('step-save', 'back')).not.toBeNull();
    });

    it('the stepper marks the current step, the ones behind as done, and is clickable', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await clickGoto(ui, 4);
        expect(visible()).toEqual(['step-preview']);
        const items = stepperOf('step-preview').filter(li => li.classList.contains('stepper-item'));
        expect(items.map(li => (li.classList.contains('active') ? 'active' : li.classList.contains('done') ? 'done' : ''))).toEqual(['done', 'done', 'done', 'active', '', '']);
        expect(items[3]!.querySelector('[aria-current="step"]')).not.toBeNull();
        expect(items[0]!.querySelector('.icon-check')).not.toBeNull();     // a done step shows a tick drawn by CSS
        await clickGoto(ui, 6);
        expect(visible()).toEqual(['step-save']);
        await clickGoto(ui, 1);
        expect(visible()).toEqual(['step-package']);
    });

    it('the breadcrumb shows Package and the current step; Package leads back to the first step', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await clickGoto(ui, 5);
        const crumbs = ui.$('breadcrumb');
        expect(crumbs.hidden).toBe(false);
        expect(crumbs.textContent).toBe('Package›Checks');
        expect(crumbs.querySelector('.crumb--current')!.getAttribute('aria-current')).toBe('page');
        crumbs.querySelector<HTMLElement>('.crumb--link')!.click();
        await new Promise(r => setTimeout(r, 0));
        expect(visible()).toEqual(['step-package']);
        expect(ui.$('breadcrumb').hidden).toBe(true);
    });

    it('what was typed survives moving between steps', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await clickGoto(ui, 2);
        await ui.type('suffix-input', 'UAT');
        await clickGoto(ui, 4);
        expect(ui.text('preview-name-short')).toBe('Sales Helper [UAT]');
        await clickGoto(ui, 6);
        expect(ui.text('export-file-name')).toBe('a-UAT.zip');
        await clickGoto(ui, 2);
        expect((document.getElementById('suffix-input') as HTMLInputElement).value).toBe('UAT');
    });

    it('a refused file leaves the current step where it is', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await clickGoto(ui, 1);
        await ui.open('bad.zip', new TextEncoder().encode('nope'));
        expect(visible()).toEqual(['step-package']);
        expect(ui.$('summary').hidden).toBe(false);
    });
});

describe('suffix chips (the usual environment names)', () => {
    const chips = () => [...document.querySelectorAll<HTMLButtonElement>('.chip-btn[data-preset]')];

    it('offers DEV, TEST, UAT, STAGING, PREPROD and PROD, in that order', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(chips().map(c => c.textContent)).toEqual(['DEV', 'TEST', 'UAT', 'STAGING', 'PREPROD', 'PROD']);
    });

    it('the chip of the current suffix is marked', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(chips().filter(c => c.classList.contains('is-active')).map(c => c.textContent)).toEqual(['DEV']);
        expect(chips().find(c => c.textContent === 'DEV')!.getAttribute('aria-pressed')).toBe('true');
        await ui.type('suffix-input', 'something else');
        expect(chips().filter(c => c.classList.contains('is-active'))).toHaveLength(0);
    });

    it('a chip fills the input and changes the names', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        chips().find(c => c.textContent === 'UAT')!.click();
        await new Promise(r => setTimeout(r, 0));
        expect((document.getElementById('suffix-input') as HTMLInputElement).value).toBe('UAT');
        expect(ui.text('preview-name-short')).toBe('Sales Helper [UAT]');
        expect(chips().filter(c => c.classList.contains('is-active')).map(c => c.textContent)).toEqual(['UAT']);
    });

    it('Clear empties the input, which removes the suffix; it is disabled when already empty', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const clear = document.getElementById('clear-suffix-btn') as HTMLButtonElement;
        expect(clear.disabled).toBe(false);
        clear.click();
        await new Promise(r => setTimeout(r, 0));
        expect((document.getElementById('suffix-input') as HTMLInputElement).value).toBe('');
        expect(ui.text('preview-name-short')).toBe('Sales Helper');
        expect((document.getElementById('clear-suffix-btn') as HTMLButtonElement).disabled).toBe(true);
    });

    it('chips and Clear are off when both names are localisation keys', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: '[[A]]', nameFull: '[[B]]' } }));
        expect(chips().every(c => c.disabled)).toBe(true);
        expect((document.getElementById('clear-suffix-btn') as HTMLButtonElement).disabled).toBe(true);
    });
});

// @vitest-environment jsdom
/**
 * Moving to another step starts at the top of it: whether the move is made with Back or Next, with the stepper or with
 * the breadcrumb. Editing inside a step never moves the page. jsdom does not scroll, so the writes to `scrollTop` of the
 * two containers that scroll (the page body and the step panel) are recorded and compared with the spec.
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

/** Every value written to `scrollTop` of an element, by element id. */
function record(): Record<string, number[]> {
    const writes: Record<string, number[]> = {};
    const watch = (el: HTMLElement, name: string): void => {
        let value = 123;   // the user has scrolled down
        Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => value, set: (v: number) => { value = v; (writes[name] ??= []).push(v); } });
    };
    watch($('main-content'), 'main');
    for (const panel of document.querySelectorAll<HTMLElement>('.step-panel')) watch(panel, panel.id);
    return writes;
}

async function loaded(): Promise<{ ui: Ui; writes: Record<string, number[]> }> {
    const ui = await boot();
    await ui.open('a.zip', packageBytes());
    return { ui, writes: record() };
}

const press = async (selector: string): Promise<void> => {
    document.querySelector<HTMLElement>(selector)!.click();
    await flush(3);
};

describe('a new step starts at the top', () => {
    it('Next goes to the top of the next step and of the page', async () => {
        const { writes } = await loaded();
        await press('#step-package [data-nav="next"]');
        expect(writes.main).toEqual([0]);
        expect(writes['step-suffix']).toEqual([0]);
        expect(writes['step-package']).toBeUndefined();
    });

    it('Back goes to the top of the previous step', async () => {
        const { writes } = await loaded();
        await press('#step-package [data-nav="next"]');
        await press('#step-suffix [data-nav="next"]');
        Object.keys(writes).forEach(k => delete writes[k]);
        await press('#step-look [data-nav="back"]');
        expect(writes['step-suffix']).toEqual([0]);
        expect(writes.main).toEqual([0]);
    });

    it('the stepper goes to the top of the step it names', async () => {
        const { writes } = await loaded();
        await press('#step-package .stepper-btn[data-goto="5"]');
        expect(writes['step-checks']).toEqual([0]);
        expect(writes.main).toEqual([0]);
    });

    it('the breadcrumb goes to the top of the first step', async () => {
        const { writes } = await loaded();
        await press('#step-package .stepper-btn[data-goto="4"]');
        Object.keys(writes).forEach(k => delete writes[k]);
        await press('#breadcrumb [data-goto="1"]');
        expect(writes['step-package']).toEqual([0]);
        expect(writes.main).toEqual([0]);
    });

    it('removing the package goes back to the top of the first step', async () => {
        const { writes } = await loaded();
        await press('#step-package .stepper-btn[data-goto="3"]');
        await press('#step-look .stepper-btn[data-goto="1"]');
        Object.keys(writes).forEach(k => delete writes[k]);
        await press('#remove-btn');
        expect(writes.main).toBeUndefined();   // already on the first step: nothing moved
    });

    it('editing inside a step does not move the page', async () => {
        const { ui, writes } = await loaded();
        await press('#step-package [data-nav="next"]');
        Object.keys(writes).forEach(k => delete writes[k]);
        await ui.type('ed-name.short', 'Another name');
        await ui.type('suffix-input', 'UAT');
        expect(writes).toEqual({});
    });

    it('pressing the step that is already open does not move the page', async () => {
        const { writes } = await loaded();
        await press('#step-package [data-nav="next"]');
        Object.keys(writes).forEach(k => delete writes[k]);
        await press('#step-suffix .stepper-btn[data-goto="2"]');
        expect(writes).toEqual({});
    });
});

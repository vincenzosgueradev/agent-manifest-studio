// @vitest-environment jsdom
/** The step helper on its own: which step it shows for any number, loaded or not. */
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';

const IDS = ['step-package', 'step-suffix', 'step-look', 'step-preview', 'step-checks', 'step-save'];
const visible = () => IDS.filter(id => !document.getElementById(id)!.hidden);

describe('showStep', () => {
    it('without a package every number gives the first step', async () => {
        await boot();
        const { showStep } = await import('../src/view/steps');
        for (const n of [1, 2, 3, 5, 9, 0, -4]) {
            expect(showStep(n, false), `step ${n}`).toBe(1);
            expect(visible()).toEqual(['step-package']);
        }
    });

    it('with a package the number is kept inside 1 to 6', async () => {
        await boot();
        const { showStep } = await import('../src/view/steps');
        expect([1, 2, 3, 4, 5, 6].map(n => showStep(n, true))).toEqual([1, 2, 3, 4, 5, 6]);
        expect(showStep(9, true)).toBe(6);
        expect(visible()).toEqual(['step-save']);
        expect(showStep(0, true)).toBe(1);
        expect(showStep(-4, true)).toBe(1);
        expect(visible()).toEqual(['step-package']);
    });

    it('the stepper marks the current step as the one announced to assistive technology', async () => {
        await boot();
        const { showStep } = await import('../src/view/steps');
        showStep(4, true);
        const current = [...document.querySelectorAll('#step-preview [aria-current="step"]')];
        expect(current).toHaveLength(1);
        expect(current[0]!.getAttribute('data-step-id')).toBe('preview');
        expect(document.querySelectorAll('#step-preview [aria-current]')).toHaveLength(1);
    });

    it('the panels follow the order Package, Details, Look, Preview, Checks, Save', async () => {
        await boot();
        const { STEPS, showStep } = await import('../src/view/steps');
        expect(STEPS.map(s => s.id)).toEqual(['package', 'suffix', 'look', 'preview', 'checks', 'save']);
        STEPS.forEach((s, i) => {
            showStep(i + 1, true);
            expect(visible()).toEqual([`step-${s.id}`]);
        });
    });
});

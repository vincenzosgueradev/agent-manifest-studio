/**
 * The step flow, in the manner of Agent Nameplate: a stepper in every step header, a breadcrumb,
 * Back and Next at the foot. Steps 2 to 5 open only once a package is loaded; after that any step
 * can be reached from the stepper or the breadcrumb, because the data does not depend on the order.
 */

import { clear, el } from './dom';

export interface StepInfo {
    id: 'package' | 'suffix' | 'look' | 'preview' | 'checks' | 'save';
    label: string;
}

export const STEPS: readonly StepInfo[] = [
    { id: 'package', label: 'Package' },
    { id: 'suffix', label: 'Details' },
    { id: 'look', label: 'Look' },
    { id: 'preview', label: 'Preview' },
    { id: 'checks', label: 'Checks' },
    { id: 'save', label: 'Save' },
];

const $ = (id: string): HTMLElement => document.getElementById(id)!;

let goto: (step: number) => void = () => undefined;
let current = 1;

/** Wires the delegated clicks once: stepper items, breadcrumb links, Back and Next. */
export function initSteps(onGoto: (step: number) => void): void {
    goto = onGoto;
    document.addEventListener('click', e => {
        const target = e.target as HTMLElement | null;
        const jump = target?.closest<HTMLElement>('[data-goto]');
        if (jump && !(jump as HTMLButtonElement).disabled) { goto(Number(jump.dataset.goto)); return; }
        const nav = target?.closest<HTMLButtonElement>('[data-nav]');
        if (nav && !nav.disabled) goto(current + (nav.dataset.nav === 'next' ? 1 : -1));
    });
}

function icon(name: string): HTMLElement {
    return el('span', { class: `icon icon-${name}`, 'aria-hidden': 'true' });
}

function stepperFor(active: number, loaded: boolean): HTMLElement {
    const ol = el('ol', { class: 'stepper' });
    STEPS.forEach((s, i) => {
        const n = i + 1;
        const cls = n === active ? 'active' : n < active ? 'done' : '';
        const button = el('button', {
            type: 'button', class: 'stepper-btn', 'data-goto': String(n), 'data-step-id': s.id,
            'aria-current': n === active ? 'step' : undefined,
        }, el('span', { class: 'stepper-dot' }, n < active ? icon('check') : String(n)), el('span', { class: 'stepper-label' }, s.label));
        button.disabled = n > 1 && !loaded;
        ol.append(el('li', { class: `stepper-item ${cls}`.trim() }, button));
        if (n < STEPS.length) ol.append(el('li', { class: 'stepper-line', 'aria-hidden': 'true' }));
    });
    return ol;
}

/** Shows step `n` (1 to 6), hides the others, and redraws stepper, breadcrumb and footer buttons. */
export function showStep(n: number, loaded: boolean): number {
    const step = Math.min(Math.max(n, 1), STEPS.length);
    const before = current;
    current = loaded ? step : 1;

    STEPS.forEach((s, i) => { $(`step-${s.id}`).hidden = i + 1 !== current; });
    // A step that is opened starts at its top: the page and the panel keep the position they had when it was left.
    // Only a change of step does it: every edit draws the same step again and must not move the page.
    if (current !== before) {
        $('main-content').scrollTop = 0;
        $(`step-${STEPS[current - 1]!.id}`).scrollTop = 0;
    }
    document.querySelectorAll<HTMLElement>('.stepper-slot').forEach(slot => {
        clear(slot);
        slot.append(stepperFor(current, loaded));
    });

    const crumbs = $('breadcrumb');
    clear(crumbs);
    crumbs.hidden = current === 1;
    if (current > 1) {
        crumbs.append(
            el('button', { type: 'button', class: 'crumb crumb--link', 'data-goto': '1' }, STEPS[0]!.label),
            el('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '›'),
            el('span', { class: 'crumb crumb--current', 'aria-current': 'page' }, STEPS[current - 1]!.label),
        );
    }

    // Step 1 cannot go forward until a package is loaded.
    const next = document.querySelector<HTMLButtonElement>('#step-package [data-nav="next"]');
    if (next) {
        next.disabled = !loaded;
        next.hidden = !loaded;
        // The footer holds only that button on the first step: with no package there is nothing to show in it.
        (next.closest('.step-footer') as HTMLElement | null)?.toggleAttribute('hidden', !loaded);
    }
    return current;
}

export function currentStep(): number {
    return current;
}

/** Scrolls the page and the current step panel back to the top: call it whenever a section or a popup that covers the page closes. */
export function resetScroll(): void {
    $('main-content').scrollTop = 0;
    $(`step-${STEPS[current - 1]!.id}`).scrollTop = 0;
}

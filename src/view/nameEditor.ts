/**
 * The suffix editor (FR-018 to FR-020, FR-030): one input for both names, the usual environment
 * names as chips, and a table with the names as they are in the package and as they will be, with
 * base and suffix told apart.
 */

import { clear, el } from './dom';
import { icon } from '../icons';
import type { ManifestView } from '../types';

export const SUFFIX_INPUT_ID = 'suffix-input';
export const SUFFIX_PRESETS: readonly string[] = ['DEV', 'TEST', 'UAT', 'STAGING', 'PREPROD', 'PROD'];

const HINT_EDITABLE = 'Leave it empty to remove the existing suffix.';
const HINT_LOCKED = 'Both names are localisation keys: there is nothing to change in this manifest.';

export interface NameEditorInput {
    manifest: ManifestView;
    /** What the input holds. */
    inputValue: string;
    /** The names as they will be; `null` for keys and missing names. */
    short: string | null;
    full: string | null;
    /** Why the typed text cannot be used, if it cannot. */
    problem: string | null;
}

let handler: ((value: string) => void) | null = null;

export function onSuffixInput(fn: (value: string) => void): void {
    handler = fn;
}

/** Builds the controls once; later calls update their state and the table, never the input itself. */
export function renderNameEditor(body: HTMLElement, p: NameEditorInput): void {
    let input = document.getElementById(SUFFIX_INPUT_ID) as HTMLInputElement | null;
    if (!input) {
        clear(body);
        input = el('input', {
            id: SUFFIX_INPUT_ID, class: 'text-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
            placeholder: 'e.g. UAT', 'aria-label': 'Environment suffix', 'aria-describedby': 'suffix-hint suffix-problem',
        });
        input.addEventListener('input', () => handler?.(input!.value));

        const clearBtn = el('button', { id: 'clear-suffix-btn', type: 'button', class: 'btn btn--secondary btn--sm' }, icon('close', 'icon--xs'), 'Clear');
        clearBtn.addEventListener('click', () => handler?.(''));

        const chips = el('div', { class: 'chip-row', role: 'group', 'aria-label': 'Usual environment names' },
            ...SUFFIX_PRESETS.map(name => {
                const chip = el('button', { type: 'button', class: 'chip-btn', 'data-preset': name }, name);
                chip.addEventListener('click', () => handler?.(name));
                return chip;
            }));

        body.append(
            el('div', { class: 'suffix-row' },
                el('div', { class: 'input-row' }, input, clearBtn),
                el('span', { class: 'suffix-or' }, 'or'),
                chips),
            el('p', { class: 'field-hint', id: 'suffix-hint' }),
            el('p', { class: 'export-reason', id: 'suffix-problem', role: 'alert', hidden: true }),
        );
    }
    if (document.activeElement !== input) input.value = p.inputValue;

    const editable = p.manifest.nameShort.kind === 'literal' || p.manifest.nameFull.kind === 'literal';
    input.disabled = !editable;
    const shownValue = document.activeElement === input ? input.value : p.inputValue;
    const clearBtn = document.getElementById('clear-suffix-btn') as HTMLButtonElement;
    clearBtn.disabled = !editable || shownValue === '';
    document.querySelectorAll<HTMLButtonElement>('.chip-btn[data-preset]').forEach(chip => {
        chip.disabled = !editable;
        chip.classList.toggle('is-active', editable && chip.dataset.preset === shownValue.trim());
        chip.setAttribute('aria-pressed', String(chip.classList.contains('is-active')));
    });
    document.getElementById('suffix-hint')!.textContent = editable ? HINT_EDITABLE : HINT_LOCKED;

    const problem = document.getElementById('suffix-problem')!;
    problem.hidden = p.problem === null;
    problem.textContent = p.problem ?? '';
}

/** Forget the built controls (a new package starts from a clean editor). */
export function resetNameEditor(body: HTMLElement): void {
    clear(body);
}

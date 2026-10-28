/**
 * The checks (FR-011, FR-016, FR-017), made to be read: a strip with the three counts, then one card for each
 * subject. A row that passes is one line (status, what was checked, what was found). A row that does not pass
 * opens itself: the rule it should meet and what the check does not prove are written under it. A button shows
 * the same two lines for the rows that pass, so that nothing is hidden for good.
 */

import { chip, type Tone } from './card';
import { clear, el } from './dom';
import { icon, indicator, VERDICT_WORD, type IconName } from '../icons';
import { fixFor, STEP_NAME } from '../services/fixes';
import type { Check, Verdict } from '../types';

interface Group { prefix: string; title: string; icon: IconName; note: string }

const GROUPS: readonly Group[] = [
    { prefix: 'color.', title: 'Colour icon', icon: 'image', note: '192 x 192, square, in the safe area' },
    { prefix: 'outline.', title: 'Outline icon', icon: 'layers', note: '32 x 32, white on transparent' },
    { prefix: 'color32.', title: 'Small colour icon', icon: 'image', note: 'optional' },
    { prefix: 'name.', title: 'Names', icon: 'tag', note: 'length and difference' },
    { prefix: 'description.', title: 'Descriptions', icon: 'file-text', note: 'length' },
    { prefix: 'accent.', title: 'Accent colour', icon: 'palette', note: '#RRGGBB' },
];

const TONE: Record<Verdict, Tone> = { pass: 'success', warning: 'warning', fail: 'error' };

/** Whether the rule and the limits of the rows that pass are shown too; kept while the user moves between steps. */
let showDetails = false;

function detail(label: string, text: string): HTMLElement {
    return el('p', { class: 'chk-line' }, el('span', { class: 'chk-line-label' }, label), text);
}

/** What to do about a check that does not pass, and a button to the step where it is done. */
function fixOf(c: Check): HTMLElement | null {
    if (c.verdict === 'pass') return null;
    const fix = fixFor(c.id);
    if (!fix) return null;
    return el('div', { class: 'chk-fix', 'data-fix-for': c.id },
        el('p', { class: 'chk-line chk-line--fix' }, el('span', { class: 'chk-line-label' }, 'How to fix it'), fix.text),
        fix.step === null ? null : el('button', { type: 'button', class: 'btn btn--secondary btn--sm', 'data-goto': String(fix.step) },
            icon('arrow-right', 'icon--xs'), `Go to ${STEP_NAME[fix.step]}`));
}

function rowOf(c: Check): HTMLElement {
    const open = c.verdict !== 'pass' || showDetails;
    return el('li', { class: 'check-row', 'data-check-id': c.id, 'data-verdict': c.verdict },
        el('div', { class: 'chk-main' },
            el('span', { class: 'col-status' }, indicator(c.verdict), el('span', { class: `verdict-word verdict--${c.verdict}` }, VERDICT_WORD[c.verdict])),
            el('span', { class: 'col-check' }, c.label),
            el('span', { class: 'col-found check-found', title: c.found }, c.found)),
        el('div', { class: 'chk-more', hidden: !open },
            detail('It should be', c.expected),
            fixOf(c),
            detail('This does not prove', c.notProven)));
}

/** The worst verdict of a group, as a chip for its header. */
function groupChip(items: Check[]): HTMLElement {
    const fail = items.filter(c => c.verdict === 'fail').length;
    const warn = items.filter(c => c.verdict === 'warning').length;
    if (fail > 0) return chip(`${fail} failed`, TONE.fail);
    if (warn > 0) return chip(`${warn} with a warning`, TONE.warning);
    return chip('all pass', TONE.pass);
}

export function renderChecks(container: HTMLElement, summary: HTMLElement, checks: Check[]): void {
    clear(container);
    const count = (v: Verdict) => checks.filter(c => c.verdict === v).length;
    summary.textContent = `${count('pass')} passed, ${count('warning')} with a warning, ${count('fail')} failed.`;

    const toggle = el('button', { id: 'checks-details-btn', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-pressed': String(showDetails) },
        icon('list', 'icon--xs'), showDetails ? 'Hide the rule of every check' : 'Show the rule of every check');
    toggle.addEventListener('click', () => {
        showDetails = !showDetails;
        renderChecks(container, summary, checks);
    });
    const strip = el('div', { class: 'chk-strip' },
        chip(`${count('pass')} passed`, 'success'),
        count('warning') > 0 ? chip(`${count('warning')} with a warning`, 'warning') : null,
        count('fail') > 0 ? chip(`${count('fail')} failed`, 'error') : null,
        el('span', { class: 'chk-spacer' }),
        toggle);
    container.append(strip);

    const groups = el('div', { class: 'chk-groups' });
    for (const g of GROUPS) {
        const items = checks.filter(c => c.id.startsWith(g.prefix));
        if (items.length === 0) continue;
        groups.append(el('section', { class: 'chk-group', 'data-group': g.prefix.replace('.', '') },
            el('div', { class: 'group-row chk-head' },
                el('span', { class: 'group-title' }, icon(g.icon), g.title),
                el('span', { class: 'group-note' }, g.note),
                groupChip(items)),
            el('ul', { class: 'chk-list' }, ...items.map(rowOf))));
    }
    container.append(groups);
}

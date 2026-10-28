/**
 * The Changes table of the Save step (FR-019): one row for each manifest value that differs, with the
 * old and the new value, and one row for each icon that was replaced. The rows come from comparing the
 * two manifest texts, so the table says what is really in the file that will be saved.
 */

import { clear, el } from './dom';
import { FIELD_BY_PATH, type FieldPath } from '../services/edit/fields';
import type { Plan } from '../services/export';

const SHORT = 80;

/** A long value is cut for the table; the whole text stays in the tooltip. */
export function shorten(value: string): string {
    const flat = value.replace(/\s+/g, ' ');
    return [...flat].length > SHORT ? `${[...flat].slice(0, SHORT - 1).join('')}…` : flat;
}

const labelOf = (path: string): string => FIELD_BY_PATH[path as FieldPath]?.label ?? path;

function valueCell(value: string | null, kind: 'old' | 'new'): HTMLElement {
    if (value === null) return el('td', { class: `chg-${kind} is-none` }, kind === 'old' ? 'not in the manifest' : 'removed');
    return el('td', { class: `chg-${kind}`, title: value }, shorten(value));
}

export function renderChanges(body: HTMLElement, plan: Plan): void {
    clear(body);
    if (plan.changes.length === 0 && plan.iconChanges.length === 0) {
        body.append(el('p', { class: 'contents-note', id: 'changes-none' }, 'No change: the new package is an identical copy of the one you opened.'));
        return;
    }
    const rows: HTMLElement[] = plan.changes.map(c =>
        el('tr', { 'data-path': c.path },
            el('th', { scope: 'row', title: c.path }, labelOf(c.path), el('span', { class: 'chg-path' }, c.path)),
            valueCell(c.before, 'old'),
            valueCell(c.after, 'new')));
    for (const c of plan.iconChanges) {
        const size = (s: { width: number; height: number; bytes: number } | null): string =>
            (s ? `${s.width} x ${s.height} pixels, ${(s.bytes / 1024).toFixed(1)} KB` : null) ?? 'not in the package';
        rows.push(el('tr', { 'data-path': c.path, 'data-icon': c.slot },
            el('th', { scope: 'row', title: c.path }, `${c.slot === 'color' ? 'Colour' : 'Outline'} icon`, el('span', { class: 'chg-path' }, c.path)),
            el('td', { class: 'chg-old' }, size(c.before)),
            el('td', { class: 'chg-new' }, size(c.after))));
    }
    body.append(el('div', { class: 'table-wrap' }, el('table', { class: 'data-table', id: 'changes-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'What'), el('th', {}, 'In the package you opened'), el('th', {}, 'In the new package'))),
        el('tbody', {}, ...rows))));
}

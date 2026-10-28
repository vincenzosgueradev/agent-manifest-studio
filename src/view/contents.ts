/**
 * What the new package holds, file by file: size, and whether it is identical to the original or
 * changed. It is the evidence for "only what you edited differs" (FR-020, FR-019), shown where the user
 * saves. The changed values come from comparing the two manifest texts, not from the list of edits.
 */

import { chip } from './card';
import { clear, el } from './dom';
import { icon, type IconName } from '../icons';
import type { EditContext, Plan } from '../services/export';

const kb = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

function iconFor(path: string): IconName {
    if (/\.json$/i.test(path)) return 'file-code';
    if (/\.(png|jpe?g|gif|svg|webp)$/i.test(path)) return 'image';
    return 'file-text';
}

/** The manifest values that differ from the original, by dotted path. */
export function changedFields(plan: Plan): string[] {
    return plan.changes.map(c => c.path);
}

/** "a", "a and b", "a, b and c". */
export const joinList = (items: string[]): string =>
    items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export function renderContents(body: HTMLElement, ctx: EditContext, plan: Plan): void {
    clear(body);
    const files = ctx.pkg.entries.filter(e => !e.isDirectory);
    const added = Object.keys(plan.entries).filter(p => !files.some(e => e.path === p));
    const total = files.length + added.length;
    const newManifestSize = new TextEncoder().encode(plan.text).length;
    const fields = changedFields(plan);
    const manifestChanged = plan.text !== ctx.manifestText;
    const iconPaths = Object.keys(plan.entries);
    const noun = (n: number): string => `${n} ${n === 1 ? 'file' : 'files'}`;

    let note: string;
    if (!plan.changed) note = `${noun(total)}: nothing changes, the new package is an identical copy.`;
    else if (iconPaths.length === 0) note = `${noun(total)}: only manifest.json changes, and in it only ${joinList(fields)}.`;
    else if (!manifestChanged) note = `${noun(total)}: only ${joinList(iconPaths)} ${iconPaths.length === 1 ? 'is' : 'are'} replaced; the manifest is identical.`;
    else note = `${noun(total)}: manifest.json changes (${joinList(fields)}) and ${joinList(iconPaths)} ${iconPaths.length === 1 ? 'is' : 'are'} replaced.`;
    body.append(el('p', { class: 'contents-note', id: 'contents-note' }, note));

    const rows = files.map(e => {
        const replaced = Object.prototype.hasOwnProperty.call(plan.entries, e.path);
        const changed = (e.path === 'manifest.json' && manifestChanged) || replaced;
        const size = e.path === 'manifest.json' ? newManifestSize : replaced ? plan.entries[e.path]!.length : e.data.length;
        const detail = e.path === 'manifest.json' ? fields.join(', ') : replaced ? 'replaced image' : '';
        return el('tr', { 'data-path': e.path, 'data-state': changed ? 'changed' : 'identical' },
            el('td', { class: 'col-file', title: e.path }, icon(iconFor(e.path)), e.path),
            el('td', { class: 'col-size' }, changed ? `${kb(e.data.length)} → ${kb(size)}` : kb(e.data.length)),
            el('td', { class: 'col-state' }, changed ? chip('changed', 'info') : chip('identical')),
            el('td', { class: 'col-detail' }, changed ? detail : ''));
    });
    for (const path of added) {
        rows.push(el('tr', { 'data-path': path, 'data-state': 'added' },
            el('td', { class: 'col-file', title: path }, icon(iconFor(path)), path),
            el('td', { class: 'col-size' }, kb(plan.entries[path]!.length)),
            el('td', { class: 'col-state' }, chip('added', 'success')),
            el('td', { class: 'col-detail' }, 'new image')));
    }
    body.append(el('div', { class: 'table-wrap' }, el('table', { class: 'data-table contents-table', id: 'contents-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'File'), el('th', { class: 'col-size' }, 'Size'), el('th', { class: 'col-state' }, 'State'), el('th', {}, 'What changes'))),
        el('tbody', {}, ...rows))));
}

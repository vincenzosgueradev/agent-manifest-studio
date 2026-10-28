/** The export region (FR-021, FR-022, FR-025, FR-026). */

import { clear, el } from './dom';
import { icon } from '../icons';
import type { Check } from '../types';

export interface ExportInput {
    fileName: string;
    /** `null` when export is allowed. */
    disabledReason: string | null;
    /** Failures the new package still has (they do not block). */
    remaining: Check[];
    /** Result of the last save: the path, or `null`. */
    status: string | null;
    /** The package changed but its version did not: Teams refuses an upload that is not newer. */
    versionHint: { current: string; next: string | null } | null;
}

let onExport: (() => void) | null = null;
let onBump: (() => void) | null = null;

/** The user asked the notice about the version to raise it. */
export function onVersionBump(fn: () => void): void {
    onBump = fn;
}

export function onExportClick(fn: () => void): void {
    onExport = fn;
}

export function renderExport(body: HTMLElement, p: ExportInput): void {
    clear(body);
    const button = el('button', { id: 'export-btn', type: 'button', class: 'btn btn--primary' }, icon('download', 'icon--sm'), 'Save new package…');
    button.disabled = p.disabledReason !== null;
    button.addEventListener('click', () => onExport?.());

    body.append(
        el('div', { class: 'export-row' }, button, el('span', { class: 'export-file', id: 'export-file-name', title: p.fileName }, p.fileName)),
        el('p', { class: 'export-reason', id: 'export-reason', hidden: p.disabledReason === null }, p.disabledReason ?? ''),
    );

    if (p.versionHint) {
        const h = p.versionHint;
        const bump = h.next === null ? null : el('button', { id: 'export-bump-btn', type: 'button', class: 'btn btn--secondary btn--sm' }, icon('plus', 'icon--xs'), `Raise it to ${h.next}`);
        bump?.addEventListener('click', () => onBump?.());
        body.append(el('div', { class: 'notice', id: 'export-version-hint', role: 'status' },
            el('p', {}, `The version is still ${h.current}. Teams and the Microsoft 365 admin center refuse an upload whose version is not higher than the one already installed ("Must upload a newer version of the title than what is already present"). Raise the version if you are going to replace an app that is already there.`),
            bump));
    }
    if (p.remaining.length > 0) {
        body.append(el('div', { class: 'export-remaining', id: 'export-remaining' },
            'The new package still fails these checks (it failed them before; they do not stop you):',
            el('ul', {}, ...p.remaining.map(c => el('li', { 'data-check-id': c.id }, `${c.label}: ${c.found}`)))));
    }
    if (p.status !== null) body.append(el('p', { class: 'export-status', id: 'export-status', role: 'status' }, p.status));
    body.append(el('p', { class: 'export-privacy' }, 'Nothing is sent anywhere. The new package is saved on your computer.'));
}

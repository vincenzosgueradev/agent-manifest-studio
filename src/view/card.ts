/** The card every information block is made of: a head with icon, title and a note, and a body. */

import { el } from './dom';
import { icon, type IconName } from '../icons';

export interface CardOptions {
    icon: IconName;
    title: string;
    /** A short note on the right of the head (a chip or text). */
    note?: Node | string | null;
    id?: string;
}

export function card(o: CardOptions, ...body: Array<Node | string | null | undefined>): HTMLElement {
    return el('section', { class: 'panel', id: o.id },
        el('div', { class: 'panel-head' },
            el('h3', { class: 'panel-heading card-title' }, icon(o.icon, 'icon--head'), o.title),
            o.note ? (typeof o.note === 'string' ? el('span', { class: 'panel-sub' }, o.note) : o.note) : null),
        el('div', { class: 'panel-body' }, ...body));
}

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'code' | 'neutral';

/** A small state chip: uppercase and coloured by tone, or monospace for identifiers. */
export function chip(text: string, tone: Tone = 'neutral', title?: string): HTMLElement {
    return el('span', { class: `chip${tone === 'neutral' ? '' : ` chip--${tone}`}`, title: title ?? text }, text);
}

/** A small button that copies `text`; the click is handled by the app (`data-copy`). */
export function copyButton(text: string, label: string): HTMLButtonElement {
    return el('button', { type: 'button', class: 'icon-btn', 'data-copy': text, 'aria-label': `Copy ${label}`, title: `Copy ${label}` }, icon('copy', 'icon--sm'));
}

export interface FactOptions {
    missing?: boolean;
    wrap?: boolean;
    /** Adds a copy button to the row: what to copy and how to call it. */
    copy?: { text: string; label: string };
}

/** One label / value row of a card, with a small icon before the label and an optional copy button. */
export function fact(iconName: IconName, label: string, value: Node | string | null, o: FactOptions = {}): HTMLElement {
    const cell = value === null
        ? el('div', { class: `fact-value ${o.missing ? 'is-missing' : 'is-none'}` }, o.missing ? 'missing' : 'not declared')
        : typeof value === 'string'
            ? el('div', { class: `fact-value${o.wrap ? ' fact-value--wrap' : ''}`, title: value }, value)
            : el('div', { class: 'fact-value' }, value);
    return el('div', { class: 'fact-row' },
        el('div', { class: 'fact-label' }, icon(iconName), label),
        cell,
        el('div', { class: 'fact-action' }, value !== null && o.copy ? copyButton(o.copy.text, o.copy.label) : null));
}

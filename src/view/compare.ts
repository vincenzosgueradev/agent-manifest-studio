/**
 * The band at the top of the Look step: the package as it was opened (Original) above the package as it will be saved
 * (Now), so that the difference is on screen while the user edits (feature 007). It only draws; what changed is decided
 * from the plan the app already has.
 */

import { clear, el } from './dom';
import { paintOnBar, paintTile, type PngLike } from './draw';
import type { IconSlot } from '../services/edit/fields';
import type { IconInfo, IconSet } from '../types';

export interface CompareModel {
    originalIcons: IconSet;
    originalAccent: string | null;
    nowIcons: IconSet;
    nowAccent: string | null;
    /** The icons that the plan replaces. */
    replaced: IconSlot[];
}

type Row = 'original' | 'now';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

const png = (i: IconInfo): PngLike | null => (i.png && i.png.kind === 'ok' ? i.png : null);

function tile(row: Row, kind: string, label: string, side: number): HTMLElement {
    return el('figure', { class: 'cmp-fig' },
        el('canvas', { id: `cmp-${row}-${kind}`, class: `cmp-canvas cmp-canvas--${kind === 'color' ? 'colour' : 'bar'}`, 'aria-label': label, role: 'img', width: String(side), height: String(side) }),
        el('figcaption', {}, kind === 'color' ? 'Colour icon' : kind === 'bar-light' ? 'Light bar' : 'Dark bar'));
}

function chip(id: string, label: string): HTMLElement {
    return el('span', { class: 'cmp-chip' }, el('span', { class: 'cmp-chip-label' }, label), el('span', { id, class: 'cmp-state' }, 'Unchanged'));
}

function build(root: HTMLElement): void {
    clear(root);
    const row = (which: Row, title: string, note: string): HTMLElement => el('div', { class: `cmp-row cmp-row--${which}`, id: `cmp-${which}` },
        el('div', { class: 'cmp-head' }, el('strong', { class: 'cmp-title' }, title), el('span', { class: 'cmp-note' }, note)),
        el('div', { class: 'cmp-pics' },
            tile(which, 'color', `The colour icon, ${title.toLowerCase()}, on its accent colour`, 192),
            tile(which, 'bar-light', `The outline icon on a light app bar, ${title.toLowerCase()}`, 32),
            tile(which, 'bar-dark', `The outline icon on a dark app bar, ${title.toLowerCase()}`, 32)),
        el('div', { class: 'cmp-facts' },
            el('span', { class: 'cmp-chip' }, el('span', { class: 'cmp-chip-label' }, 'Accent colour'), el('span', { id: `cmp-${which}-accent`, class: 'cmp-hex' })),
            which === 'now' ? el('span', { class: 'cmp-states' }, chip('cmp-state-color', 'Colour icon'), chip('cmp-state-outline', 'Outline icon'), chip('cmp-state-accent', 'Accent colour')) : null));
    root.append(row('original', 'Original', 'as opened'), row('now', 'Now', 'as it will be saved'));
}

const seeThrough = (rgba: Uint8Array): boolean => { for (let i = 3; i < rgba.length; i += 4) if (rgba[i]! < 255) return true; return false; };

function draw(row: Row, icons: IconSet, accent: string | null): void {
    const colour = png(icons.color);
    const colourCanvas = $(`cmp-${row}-color`) as HTMLCanvasElement;
    // The icon is drawn as it is: a see-through one sits on a chequerboard, never on the accent colour.
    if (colour) {
        paintTile(colourCanvas, colour.rgba, colour.header.width, colour.header.height);
        colourCanvas.classList.toggle('ed-checker', seeThrough(colour.rgba));
    }
    const outline = png(icons.outline);
    for (const theme of ['light', 'dark'] as const) {
        const canvas = $(`cmp-${row}-bar-${theme}`) as HTMLCanvasElement;
        if (outline) paintOnBar(canvas, outline.rgba, outline.header.width, outline.header.height, theme);
    }
    $(`cmp-${row}-accent`).textContent = accent ?? 'not declared';
}

export function renderCompare(root: HTMLElement, m: CompareModel): void {
    if (!$('cmp-original')) build(root);
    root.hidden = false;
    draw('original', m.originalIcons, m.originalAccent);
    draw('now', m.nowIcons, m.nowAccent);
    const set = (id: string, changed: boolean): void => {
        const e = $(id);
        e.textContent = changed ? 'Changed' : 'Unchanged';
        e.classList.toggle('is-changed', changed);
    };
    set('cmp-state-color', m.replaced.includes('color'));
    set('cmp-state-outline', m.replaced.includes('outline'));
    set('cmp-state-accent', (m.originalAccent ?? '').toLowerCase() !== (m.nowAccent ?? '').toLowerCase());
}

/** Forget the drawn band (a new package starts clean). */
export function resetCompare(root: HTMLElement): void {
    clear(root);
    root.hidden = true;
}

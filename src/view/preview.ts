/**
 * The preview (FR-007 to FR-010): the colour icon on the accent colour, the outline icon on a light
 * and a dark app bar, and the names. It is an approximation and says so next to itself.
 */

import { card } from './card';
import { clear, el } from './dom';
import { icon, type IconName } from '../icons';
import { flattenOnAccent, parseAccent } from '../services/preview';
import type { IconInfo, IconSet, NameValue } from '../types';

export interface PreviewInput {
    icons: IconSet;
    accent: string | null;
    /** The names as they will be (after the suffix the user typed). */
    nameShort: string;
    nameFull: string;
    shortKind: NameValue['kind'];
    fullKind: NameValue['kind'];
}

export const NOTICE_NAME = 'This is the name of the Teams app in the manifest. It is not the name of the agent in Copilot Studio or in Dataverse.';
export const NOTICE_LIMITS = 'This preview does not reproduce exactly what Teams draws. The final check is a test in Teams.';

/** Whether the safe-area guide is drawn over the icon: kept while the user moves between steps. */
let showSafeArea = false;

// Approximation of the Teams app bar: used when the stylesheet colour cannot be read.
const FALLBACK = { light: '#424242', dark: '#ffffff' };

/**
 * A colour as a browser hands it back for a custom property: `#rrggbb`, `#rgb` (the build shortens
 * `#ffffff` to `#fff`) or `rgb(...)`. Anything else gives the fallback, never an exception.
 */
export function parseCssColor(raw: string, fallback: string): { r: number; g: number; b: number } {
    for (const text of [raw.trim(), fallback]) {
        const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(text);
        if (long) return { r: parseInt(long[1]!, 16), g: parseInt(long[2]!, 16), b: parseInt(long[3]!, 16) };
        const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
        if (short) return { r: parseInt(short[1]! + short[1]!, 16), g: parseInt(short[2]! + short[2]!, 16), b: parseInt(short[3]! + short[3]!, 16) };
        const fn = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\b/i.exec(text);
        if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) };
    }
    return { r: 0, g: 0, b: 0 };
}

function cssColor(name: string, fallback: string): { r: number; g: number; b: number } {
    const raw = typeof getComputedStyle === 'function'
        ? getComputedStyle(document.documentElement).getPropertyValue(name)
        : '';
    return parseCssColor(raw, fallback);
}

function draw(canvas: HTMLCanvasElement, rgba: Uint8Array, width: number, height: number): void {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(width, height);
    img.data.set(rgba);
    ctx.putImageData(img, 0, 0);
}

function canvas(id: string, cls: string, cssSize?: number): HTMLCanvasElement {
    const c = el('canvas', { id, class: cls });
    if (cssSize) { c.style.width = `${cssSize}px`; c.style.height = `${cssSize}px`; }
    return c;
}

/** Why an icon cannot be drawn, in words; `null` when it can. */
export function iconProblem(icon: IconInfo, label: string): string | null {
    if (icon.path === null) return `The manifest does not declare the ${label}.`;
    if (!icon.present || icon.png === null) return `The ${label} (${icon.path}) is declared but not in the package.`;
    switch (icon.png.kind) {
        case 'not-png': return `The ${label} (${icon.path}) is not a PNG file.`;
        case 'corrupt': return `The ${label} (${icon.path}) is damaged: ${icon.png.reason}`;
        case 'unsupported': return `The ${label} (${icon.path}) cannot be drawn: ${icon.png.reason}`;
        default: return null;
    }
}

/** One block of the preview: a card with an icon and a title, the drawing, and a caption under it. */
function item(iconName: IconName, title: string, caption: string | null, ...content: Array<Node | string>): HTMLElement {
    return card({ icon: iconName, title }, ...content, caption ? el('p', { class: 'preview-caption' }, caption) : null);
}

export function renderPreview(body: HTMLElement, notice: HTMLElement, p: PreviewInput): void {
    clear(body);
    clear(notice);
    const grid = body;

    // Colour icon on the accent colour.
    const color = p.icons.color;
    const colorProblem = iconProblem(color, 'colour icon');
    if (colorProblem || color.png?.kind !== 'ok') {
        grid.append(item('image', 'Colour icon', null, el('p', { class: 'readonly-reason', id: 'preview-color-problem' }, colorProblem ?? 'The colour icon cannot be drawn.')));
    } else {
        const { width, height } = color.png.header;
        const accent = p.accent === null ? null : parseAccent(p.accent);
        const cls = accent ? 'icon-canvas' : 'icon-canvas icon-canvas--checker';
        const pixels = accent ? flattenOnAccent(color.png.rgba, accent) : color.png.rgba;
        const caption = accent
            ? `Colour icon on the accent colour ${p.accent}, at the sizes Teams uses`
            : (p.accent === null
                ? 'The manifest has no accent colour: the icon is shown as it is, on a checkerboard'
                : `The accent colour "${p.accent}" is not a valid #RRGGBB colour: the icon is shown as it is, on a checkerboard`);

        const sizes = el('div', { class: 'size-row' });
        for (const side of [192, 96, 48, 32]) {
            const c = canvas(`preview-color-${side}`, cls, side === 192 ? undefined : side);
            draw(c, pixels, width, height);
            const drawn = side === 192
                ? el('div', { class: `canvas-wrap${showSafeArea ? ' is-on' : ''}`, id: 'canvas-wrap' }, c, el('div', { class: 'safe-area', id: 'safe-area-overlay', 'aria-hidden': 'true' }))
                : c;
            sizes.append(el('div', { class: 'size-item' }, drawn, el('span', { class: 'size-label' }, `${side} px`)));
        }
        const toggle = el('button', { id: 'safe-area-toggle', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-pressed': String(showSafeArea) },
            icon('crop', 'icon--sm'), 'Show safe area');
        toggle.addEventListener('click', () => {
            showSafeArea = !showSafeArea;
            toggle.setAttribute('aria-pressed', String(showSafeArea));
            document.getElementById('canvas-wrap')?.classList.toggle('is-on', showSafeArea);
        });
        grid.append(item('image', 'Colour icon', caption, sizes, el('div', { class: 'preview-tools' }, toggle)));
    }

    // Outline icon on a light and a dark app bar.
    const outline = p.icons.outline;
    const outlineProblem = iconProblem(outline, 'outline icon');
    if (outlineProblem || outline.png?.kind !== 'ok') {
        grid.append(item('layers', 'Outline icon', null, el('p', { class: 'readonly-reason', id: 'preview-outline-problem' }, outlineProblem ?? 'The outline icon cannot be drawn.')));
    } else {
        const { width, height } = outline.png.header;
        const bars = el('div', { class: 'icon-row' });
        for (const theme of ['light', 'dark'] as const) {
            const fg = cssColor(`--bar-${theme}-fg`, FALLBACK[theme]);
            const mask = new Uint8Array(outline.png.rgba.length);
            for (let i = 0; i < mask.length; i += 4) {
                mask[i] = fg.r; mask[i + 1] = fg.g; mask[i + 2] = fg.b; mask[i + 3] = outline.png.rgba[i + 3]!;
            }
            const c = canvas(`preview-outline-${theme}`, '');
            draw(c, mask, width, height);
            bars.append(el('div', { class: `app-bar app-bar--${theme}`, id: `preview-bar-${theme}`, title: `${theme} app bar` }, c));
        }
        grid.append(item('layers', 'Outline icon', 'On a light and on a dark app bar. The bar recolours it in Teams; this is an approximation.', bars));
    }

    // Names.
    const shown = (v: string, kind: NameValue['kind']) => (kind === 'missing' ? '(missing)' : v);
    grid.append(item(
        'tag', 'App name', 'The short name, then the full name.',
        el('div', { class: 'name-card' },
            el('div', { class: 'name-line name-short', id: 'preview-name-short', title: shown(p.nameShort, p.shortKind) }, shown(p.nameShort, p.shortKind)),
            el('div', { class: 'name-line', id: 'preview-name-full', title: shown(p.nameFull, p.fullKind) }, shown(p.nameFull, p.fullKind))),
    ));

    notice.append(el('p', {}, NOTICE_NAME), el('p', {}, NOTICE_LIMITS));
}

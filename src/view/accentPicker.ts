/**
 * The accent colour taken from the picture (feature 013): a popup that shows a picture, the user clicks a pixel and
 * presses "Use this colour". It is opened from the Look step (the accent colour row and the colour icon card) and from
 * the image editor, and it changes nothing but the accent colour field. The pixel work is in `services/image/pixel.ts`.
 */

import { el } from './dom';
import { paintTile } from './draw';
import { icon } from '../icons';
import { colourAt, toPixel } from '../services/image/pixel';
import type { Picture } from '../services/image/types';

export interface AccentPickerDeps {
    /** The chosen colour, as `#rrggbb`, goes into the accent colour field. */
    onUse: (hex: string) => void;
    /** The accent colour as it is now, shown beside the choice. */
    current: () => string | null;
}

export interface AccentPicker {
    /** Opens the popup on `picture`; `from` says whose picture it is ("the colour icon"). */
    open(picture: Picture, from: string): void;
    close(): void;
    isOpen(): boolean;
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

export function initAccentPicker(deps: AccentPickerDeps): AccentPicker {
    let overlay: HTMLElement | null = null;
    let pic: Picture | null = null;
    let chosen: { x: number; y: number; hex: string } | null = null;

    const $ = (id: string): HTMLElement => document.getElementById(id)!;

    const setSwatch = (id: string, hex: string | null): void => {
        const s = $(id);
        s.style.backgroundColor = hex !== null && HEX6.test(hex) ? hex : 'transparent';
    };

    function mark(x: number | null, y: number | null): void {
        const m = $('ap-mark');
        if (x === null || y === null || !pic) { m.hidden = true; return; }
        m.hidden = false;
        m.style.left = `${((x + 0.5) / pic.width) * 100}%`;
        m.style.top = `${((y + 0.5) / pic.height) * 100}%`;
    }

    function message(text: string | null): void {
        const m = $('ap-message');
        m.hidden = text === null;
        m.textContent = text ?? '';
    }

    function choose(x: number, y: number): void {
        if (!pic) return;
        const r = colourAt(pic, x, y);
        if (!r.ok) { message(r.message); return; }
        message(null);
        chosen = { x, y, hex: r.hex };
        mark(x, y);
        setSwatch('ap-chosen-swatch', r.hex);
        $('ap-chosen-hex').textContent = r.hex;
        ($('ap-use') as HTMLButtonElement).disabled = false;
    }

    function build(): HTMLElement {
        const canvas = el('canvas', { id: 'ap-canvas', class: 'ap-canvas ed-checker', role: 'img', tabindex: '0', 'aria-label': 'The picture. Click a pixel, or use the arrow keys and Enter, to choose its colour.' });
        const pointerPixel = (e: MouseEvent): { x: number; y: number } | null => (pic ? toPixel(e.clientX, e.clientY, canvas.getBoundingClientRect(), pic.width, pic.height) : null);
        canvas.addEventListener('pointermove', e => {
            const p = pointerPixel(e);
            const r = p && pic ? colourAt(pic, p.x, p.y) : null;
            $('ap-hover-hex').textContent = r && r.ok ? r.hex : '-';
            setSwatch('ap-hover-swatch', r && r.ok ? r.hex : null);
        });
        canvas.addEventListener('pointerleave', () => { $('ap-hover-hex').textContent = '-'; setSwatch('ap-hover-swatch', null); });
        canvas.addEventListener('click', e => { const p = pointerPixel(e); if (p) choose(p.x, p.y); });
        canvas.addEventListener('keydown', e => {
            if (!pic) return;
            const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            const d = step[e.key];
            if (d) {
                e.preventDefault();
                const from = chosen ?? { x: Math.floor(pic.width / 2), y: Math.floor(pic.height / 2) };
                const big = e.shiftKey ? 10 : 1;
                choose(Math.min(pic.width - 1, Math.max(0, from.x + d[0] * big)), Math.min(pic.height - 1, Math.max(0, from.y + d[1] * big)));
            } else if (e.key === 'Enter' && chosen) { e.preventDefault(); use(); }
        });

        const swatch = (id: string): HTMLElement => el('span', { class: 'swatch', id, 'aria-hidden': 'true' });
        const cancel = el('button', { id: 'ap-cancel', type: 'button', class: 'btn btn--secondary btn--sm' }, icon('close', 'icon--xs'), 'Cancel');
        cancel.addEventListener('click', () => close());
        const useBtn = el('button', { id: 'ap-use', type: 'button', class: 'btn btn--primary btn--sm', disabled: true }, icon('check', 'icon--xs'), 'Use this colour');
        useBtn.addEventListener('click', () => use());

        const panel = el('div', { id: 'ap-panel', class: 'guide-panel ap-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ap-title' },
            el('div', { class: 'guide-head' }, el('h3', { id: 'ap-title', class: 'guide-title' }, 'Accent colour from the picture')),
            el('p', { id: 'ap-lead', class: 'guide-lead' }),
            el('div', { class: 'ap-stage' }, canvas, el('span', { id: 'ap-mark', class: 'ap-mark', 'aria-hidden': 'true', hidden: true })),
            el('div', { class: 'ap-readout' },
                el('span', { class: 'ap-item' }, 'Under the pointer', swatch('ap-hover-swatch'), el('strong', { id: 'ap-hover-hex' }, '-')),
                el('span', { class: 'ap-item' }, 'Chosen', swatch('ap-chosen-swatch'), el('strong', { id: 'ap-chosen-hex' }, '-')),
                el('span', { class: 'ap-item' }, 'Accent colour now', swatch('ap-now-swatch'), el('strong', { id: 'ap-now-hex' }, '-'))),
            el('p', { class: 'export-reason ed-error', id: 'ap-message', role: 'alert', hidden: true }),
            el('div', { class: 'ap-actions' }, cancel, useBtn));
        const o = el('div', { id: 'ap-overlay', class: 'guide-overlay ap-overlay', hidden: true }, panel);
        o.addEventListener('click', e => { if (e.target === o) close(); });
        o.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
        return o;
    }

    function use(): void {
        if (!chosen) return;
        const hex = chosen.hex;
        close();
        deps.onUse(hex);
    }

    function open(picture: Picture, from: string): void {
        if (!overlay?.isConnected) { overlay = build(); document.body.append(overlay); }
        pic = picture;
        chosen = null;
        const canvas = $('ap-canvas') as HTMLCanvasElement;
        paintTile(canvas, picture.data, picture.width, picture.height);
        // Drawn as large as fits the popup, never smaller than 192 on screen so a pixel stays clickable.
        const scale = 288 / Math.max(picture.width, picture.height);
        canvas.style.width = `${Math.round(picture.width * scale)}px`;
        canvas.style.height = `${Math.round(picture.height * scale)}px`;
        $('ap-lead').textContent = `Click a pixel of ${from}. The accent colour becomes that colour when you press Use this colour. Nothing else changes.`;
        const now = deps.current();
        $('ap-now-hex').textContent = now ?? '-';
        setSwatch('ap-now-swatch', now);
        $('ap-hover-hex').textContent = '-';
        setSwatch('ap-hover-swatch', null);
        $('ap-chosen-hex').textContent = '-';
        setSwatch('ap-chosen-swatch', null);
        ($('ap-use') as HTMLButtonElement).disabled = true;
        mark(null, null);
        message(null);
        overlay.hidden = false;
        canvas.focus();
    }

    function close(): void {
        if (!overlay || overlay.hidden) return;
        overlay.hidden = true;
        pic = null;
        chosen = null;
    }

    return { open, close, isOpen: () => !!overlay && !overlay.hidden };
}

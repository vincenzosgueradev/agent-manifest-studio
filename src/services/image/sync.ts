/**
 * Keeping the colour icon and the outline icon in step (feature 010). Two small counters per slot
 * decide when a suggestion is offered (FR-001, FR-002, FR-004, FR-006, FR-007); the two picture
 * functions reuse the Outline maker (004), `fit` and `fillOn` (ops.ts) — no new pixel algorithm for
 * the shape itself, only the base-colour rule of FR-002 and the orchestration.
 */

import { fromHex, rgbToHsl, toHex } from './colour';
import { fillOn, fit } from './ops';
import { evaluate, presetOutline } from './pipeline';
import type { Picture, Rgb } from './types';
import type { IconSlot } from '../edit/fields';
import type { IconSet } from '../../types';
import { COLOR_ICON_SIDE } from '../limits';

export interface SyncState {
    /** Bumped by one every time a slot's icon changes through a direct user action. */
    directVersion: Record<IconSlot, number>;
    /** For the suggestion shown on a slot's own card, the directVersion of the OTHER slot it was last resolved against. */
    resolvedAt: Record<IconSlot, number>;
}

export const initSyncState = (): SyncState => ({
    directVersion: { color: 0, outline: 0 },
    resolvedAt: { color: 0, outline: 0 },
});

export const otherSlot = (slot: IconSlot): IconSlot => (slot === 'color' ? 'outline' : 'color');

/** Call only for a direct user action on `slot` (a new file or an applied edit in the image editor). */
export function markDirect(state: SyncState, slot: IconSlot): SyncState {
    return { ...state, directVersion: { ...state.directVersion, [slot]: state.directVersion[slot] + 1 } };
}

/** Call when the suggestion shown on `slot`'s card is accepted or dismissed. */
export function resolveSuggestion(state: SyncState, slot: IconSlot): SyncState {
    return { ...state, resolvedAt: { ...state.resolvedAt, [slot]: state.directVersion[otherSlot(slot)] } };
}

export function suggestionPending(state: SyncState, slot: IconSlot): boolean {
    return state.directVersion[otherSlot(slot)] !== state.resolvedAt[slot];
}

export interface SyncSuggestion {
    /** The card the suggestion is drawn on. */
    slot: IconSlot;
    /** What it will replace (FR-009). */
    text: string;
    acceptLabel: string;
}

/** `null` unless a suggestion is pending for `slot` and its source icon is present and a readable PNG. */
export function suggestionFor(state: SyncState, slot: IconSlot, icons: IconSet, accentHex: string | null): SyncSuggestion | null {
    if (!suggestionPending(state, slot)) return null;
    const source = icons[otherSlot(slot)];
    if (!source.present || !source.png || source.png.kind !== 'ok') return null;
    if (slot === 'outline') {
        return { slot, text: 'The colour icon changed. Regenerate the outline icon to match its shape?', acceptLabel: 'Regenerate' };
    }
    const hex = toHex(baseColourFor(accentHex));
    return { slot, text: `The outline icon changed. Build a colour icon from its shape, on ${hex}?`, acceptLabel: 'Build colour icon' };
}

/** The fallback this feature uses when there is no colour to build on: Teams blue. */
export const TEAMS_BLUE: Rgb = { r: 0x2b, g: 0x5f, b: 0xd9 };

/** The accent colour when it is not close to grey (HSL saturation at least 0.2), else Teams blue. */
export function baseColourFor(accentHex: string | null): Rgb {
    const rgb = accentHex === null ? null : fromHex(accentHex);
    if (rgb === null) return TEAMS_BLUE;
    const { s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return s >= 0.2 ? rgb : TEAMS_BLUE;
}

/** Colour icon -> outline icon: the existing Outline maker, trim, square, fit to 32 x 32. */
export function regenerateOutline(colour: Picture): Picture {
    return evaluate(colour, presetOutline(colour)).picture;
}

/** Outline icon -> colour icon: the shape enlarged to `target` and placed on an opaque tile of `colour`. */
export function buildColourFromOutline(outline: Picture, colour: Rgb, target: number = COLOR_ICON_SIDE): Picture {
    return fillOn(fit(outline, target, 100), colour);
}

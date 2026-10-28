/**
 * Accepting a PNG chosen for an icon slot (FR-010 to FR-012). Three things refuse a file, because
 * they make it unusable as that icon: it is not a PNG the tool can read, it is not the size of the
 * slot, or it is heavier than the larger of the two documented limits. Everything else (colour
 * rules, safe area, weight between the two limits) is judged by the checks of feature 001 and does
 * not refuse the file.
 */

import { decodePng } from '../png';
import { COLOR_ICON_SIDE, ICON_FAIL_BYTES, OUTLINE_ICON_SIDE } from '../limits';
import type { IconSlot } from './fields';

export type IconAccept = { ok: true } | { ok: false; message: string };

export const SLOT_LABEL: Record<IconSlot, string> = { color: 'colour icon', outline: 'outline icon' };
export const SLOT_SIDE: Record<IconSlot, number> = { color: COLOR_ICON_SIDE, outline: OUTLINE_ICON_SIDE };
/** Where the icon goes when the manifest does not declare a path. */
export const SLOT_DEFAULT_PATH: Record<IconSlot, string> = { color: 'color.png', outline: 'outline.png' };

export function checkNewIcon(slot: IconSlot, bytes: Uint8Array): IconAccept {
    const side = SLOT_SIDE[slot];
    const label = SLOT_LABEL[slot];
    const png = decodePng(bytes);
    if (png.kind === 'not-png') return { ok: false, message: `This file is not a PNG, so it cannot be the ${label}.` };
    if (png.kind === 'corrupt') return { ok: false, message: `This PNG is damaged (${png.reason}).` };
    const { width, height } = png.header;
    if (width !== side || height !== side) {
        return { ok: false, message: `The ${label} must be ${side} x ${side} pixels; this image is ${width} x ${height}.` };
    }
    if (bytes.length > ICON_FAIL_BYTES) {
        return { ok: false, message: `The image is ${(bytes.length / 1024).toFixed(1)} KB; the ${label} can be at most ${ICON_FAIL_BYTES / 1024} KB.` };
    }
    return { ok: true };
}

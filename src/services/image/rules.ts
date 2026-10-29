/**
 * What the history of the image editor may hold (feature 009, sixth amendment): each effect at most once, and some effects
 * not together. A tool whose effect is already in the history, or that clashes with one that is, is switched off, with the
 * reason, until the other step is removed.
 */

import type { Op } from './types';

/** The name of an effect for the rules: its kind, and for a flip its direction. */
export const toolKey = (op: Op): string => (op.kind === 'flip' ? `flip:${op.axis}` : op.kind);

export const TOOL_NAME: Readonly<Record<string, string>> = {
    removeBg: 'Remove background', fill: 'Fill background', trim: 'Trim', crop: 'Crop', square: 'Make square', fit: 'Fit', rotate: 'Rotate',
    'flip:h': 'Flip left-right', 'flip:v': 'Flip top-bottom', solid: 'Solid colour', tone: 'Tone', outline: 'Outline maker',
};

/**
 * Pairs of effects that do not go together. The outline maker makes a white shape on see-through, so a solid colour, a tone or a
 * filled background has nothing to act on; a solid colour makes the tone invisible.
 */
export const CLASHES: ReadonlyArray<readonly [string, string]> = [['outline', 'solid'], ['outline', 'tone'], ['outline', 'fill'], ['solid', 'tone']];

export type Block =
    | { why: 'repeat'; step: number }
    | { why: 'clash'; with: string; step: number };

/** Why the effect `key` cannot be added to `ops`, or `null` when it can. `step` is the number of the step in the way, from 1. */
export function blockOf(ops: readonly Op[], key: string): Block | null {
    const same = ops.findIndex(o => toolKey(o) === key);
    if (same >= 0) return { why: 'repeat', step: same + 1 };
    for (const [a, b] of CLASHES) {
        const other = key === a ? b : key === b ? a : null;
        if (other === null) continue;
        const i = ops.findIndex(o => toolKey(o) === other);
        if (i >= 0) return { why: 'clash', with: other, step: i + 1 };
    }
    return null;
}

const nameOf = (key: string): string => TOOL_NAME[key] ?? key;

/** The block as a sentence for the title of the switched-off button. */
export function blockText(key: string, block: Block): string {
    return block.why === 'repeat'
        ? `${nameOf(key)} is already in the history (step ${block.step}). Remove that step to add it again.`
        : `${nameOf(key)} does not go with ${nameOf(block.with)}, which is step ${block.step} of the history. Remove that step first.`;
}

/** The first block among the effects of a quick button, as a sentence, or `null` when all of them can be added. */
export function presetBlockText(ops: readonly Op[], preset: readonly Op[]): string | null {
    for (const op of preset) {
        const key = toolKey(op);
        const block = blockOf(ops, key);
        if (block) return blockText(key, block);
    }
    return null;
}

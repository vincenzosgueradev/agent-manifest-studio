/**
 * Making the background of the colour icon transparent in one go: the flat colour that touches the edges
 * of the picture goes, what the logo itself contains stays. The same step as "Remove background" with its
 * starting values; it refuses, with the reason, a picture that has nothing of the kind to remove.
 */

import { removeBackground, solid } from './ops';
import { defaultOp, hasFlatBorder } from './pipeline';
import { hasAlpha, type Picture, type RemoveBgOp } from './types';

/** Said when the shape of the outline icon is white already: not a fault. */
export const ALREADY_WHITE = 'The shape is already white, which is what the outline icon asks for.';

/** The outline icon as Teams wants it: every visible pixel pure white, alpha kept. */
export function whiteShape(p: Picture): TransparentResult {
    let other = 0;
    for (let i = 0; i < p.data.length; i += 4) {
        if (p.data[i + 3]! > 0 && (p.data[i] !== 255 || p.data[i + 1] !== 255 || p.data[i + 2] !== 255)) other++;
    }
    if (other === 0) return { ok: false, message: ALREADY_WHITE };
    return { ok: true, picture: solid(p, { r: 255, g: 255, b: 255 }) };
}

/** Said when there is nothing to take away because the background already is see-through: not a fault. */
export const ALREADY_SEE_THROUGH = 'The background is already see-through: there is no flat colour at the edges to take away.';

export type TransparentResult = { ok: true; picture: Picture } | { ok: false; message: string };

export function makeTransparent(p: Picture): TransparentResult {
    if (!hasFlatBorder(p)) {
        return {
            ok: false,
            message: hasAlpha(p)
                ? ALREADY_SEE_THROUGH
                : 'There is no flat colour along the edges of this picture, so the tool cannot tell what the background is. Open the image editor and choose the colour to remove.',
        };
    }
    const op = defaultOp('removeBg', p, 192) as RemoveBgOp;
    return { ok: true, picture: removeBackground(p, op) };
}

/**
 * What Apply does with the result (FR-026, FR-027): bring it to exactly the size of the icon, write it as
 * a PNG, and refuse only what cannot be an icon: a picture with nothing in it, or a file over the larger of
 * the two documented weights.
 */

import { ICON_FAIL_BYTES } from '../limits';
import { fit, isEmptyPicture } from './ops';
import { encodePng } from './pngWrite';
import { resizePicture } from './resample';
import type { Picture } from './types';

export type AcceptResult = { ok: true; bytes: Uint8Array; picture: Picture } | { ok: false; message: string };

/** The picture at `target` x `target`: resized when it is square, fitted (never stretched) when it is not. */
export function toTarget(p: Picture, target: number): Picture {
    return p.width === p.height ? resizePicture(p, target, target) : fit(p, target, 100);
}

export function acceptResult(p: Picture, target: number): AcceptResult {
    const picture = toTarget(p, target);
    if (isEmptyPicture(picture)) return { ok: false, message: 'The picture is fully transparent: there is nothing to use as the icon. Undo the last step or reset.' };
    const bytes = encodePng(picture);
    if (bytes.length > ICON_FAIL_BYTES) {
        return { ok: false, message: `The PNG would be ${(bytes.length / 1024).toFixed(1)} KB; the icon can be at most ${ICON_FAIL_BYTES / 1024} KB. Simplify the picture (fewer colours, flat areas).` };
    }
    return { ok: true, bytes, picture };
}

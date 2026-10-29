/**
 * The marks of the rulers of the image editor (feature 009): where, along a ruler, the pixels of the picture are, and which of
 * them carry a number. Pure arithmetic, so that it is tested without a screen.
 */

export interface Mark {
    /** Position along the ruler, in screen pixels. */
    at: number;
    /** The pixel of the picture it stands for. */
    value: number;
    /** A numbered mark (long) or a small one. */
    major: boolean;
    /** The number, or an empty text for a small mark. */
    label: string;
}

const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

/** The least space, in screen pixels, between two numbers of a ruler. */
export const MIN_LABEL_GAP = 48;

/** The distance, in pixels of the picture, between two numbered marks: the smallest round number that keeps `MIN_LABEL_GAP` on screen. */
export function rulerStep(scale: number): number {
    for (const s of STEPS) if (s * scale >= MIN_LABEL_GAP) return s;
    return STEPS[STEPS.length - 1]!;
}

/**
 * The marks of a ruler `length` screen pixels long, for a picture of `size` pixels whose pixel 0 is at `origin` on the ruler and
 * that is drawn `scale` screen pixels per pixel. A numbered mark every `rulerStep`, and from a step of 5 a small one every fifth
 * of it. Only the pixels of the picture (0 up to `size`, the end not included) and the marks that fall on the ruler.
 */
export function rulerMarks(origin: number, scale: number, size: number, length: number): Mark[] {
    if (!(scale > 0) || size <= 0 || length <= 0) return [];
    const step = rulerStep(scale);
    const every = step >= 5 ? step / 5 : step;
    const out: Mark[] = [];
    for (let value = 0; value < size; value += every) {
        const at = origin + value * scale;
        if (at < -1 || at > length + 1) continue;
        const major = value % step === 0;
        out.push({ at, value, major, label: major ? String(value) : '' });
    }
    return out;
}

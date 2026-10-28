/**
 * The picture and the ordered list of operations that make the result (FR-006, FR-007, FR-023).
 *
 * The result is a function of the picture and the list, nothing else: undo, redo, removing or editing
 * an earlier step are exact because the result is always computed again from the list. Everything here
 * is pure and returns new values.
 */

import { cornerColour, distancePercentRaw } from './colour';
import { crop, cropProblem, fillOn, fit, flip, outlineMaker, removeBackground, resize, rotate, solid, square, tone, trim } from './ops';
import { hasAlpha, HISTORY_MAX, type Op, type OpKind, type Picture } from './types';

/** The safe area of a 192 pixel colour icon as a share of its side: 120 / 192. */
export const SAFE_AREA_SHARE = 62.5;

/** Why an operation cannot be applied to this picture, or `null`. Only a crop can be refused. */
export function opProblem(p: Picture, op: Op): string | null {
    return op.kind === 'crop' ? cropProblem(p, op.x, op.y, op.w, op.h) : null;
}

/** One operation. One that cannot be applied (a crop outside the picture) leaves the picture as it is. */
export function applyOp(p: Picture, op: Op): Picture {
    if (opProblem(p, op) !== null) return p;
    switch (op.kind) {
        case 'removeBg': return removeBackground(p, op);
        case 'trim': return trim(p, op.tolerance);
        case 'crop': return crop(p, op.x, op.y, op.w, op.h);
        case 'square': return square(p, op.fill);
        case 'fit': return fit(p, op.target, op.share);
        case 'resize': return resize(p, op.w, op.h);
        case 'rotate': return rotate(p, op.quarters);
        case 'flip': return flip(p, op.axis);
        case 'fill': return fillOn(p, op.colour);
        case 'solid': return solid(p, op.colour);
        case 'tone': return tone(p, op);
        case 'outline': return outlineMaker(p, op);
    }
}

export interface Evaluated {
    picture: Picture;
    /** For each operation, why it could not be applied, or `null`. */
    problems: Array<string | null>;
    /** The picture after each operation (index 0 is the source), for a view that caches steps. */
    steps: Picture[];
}

/** The source with every operation applied in order. */
export function evaluate(source: Picture, ops: Op[]): Evaluated {
    const steps: Picture[] = [source];
    const problems: Array<string | null> = [];
    let current = source;
    for (const op of ops) {
        problems.push(opProblem(current, op));
        current = applyOp(current, op);
        steps.push(current);
    }
    return { picture: current, problems, steps };
}

// ── History ───────────────────────────────────────────────────────────────────

export interface Pipeline {
    source: Picture;
    ops: Op[];
    undoStack: Op[][];
    redoStack: Op[][];
}

export const create = (source: Picture, ops: Op[] = []): Pipeline => ({ source, ops, undoStack: [], redoStack: [] });

const record = (pl: Pipeline): Op[][] => [...pl.undoStack, pl.ops].slice(-HISTORY_MAX);

const change = (pl: Pipeline, ops: Op[]): Pipeline => ({ ...pl, ops, undoStack: record(pl), redoStack: [] });

export const add = (pl: Pipeline, op: Op): Pipeline => change(pl, [...pl.ops, op]);

export function remove(pl: Pipeline, index: number): Pipeline {
    if (index < 0 || index >= pl.ops.length) return pl;
    return change(pl, pl.ops.filter((_, i) => i !== index));
}

/** Replaces one operation. `recordStep: false` is for the many small changes of a slider: see `checkpoint`. */
export function update(pl: Pipeline, index: number, op: Op, recordStep = true): Pipeline {
    if (index < 0 || index >= pl.ops.length) return pl;
    const ops = pl.ops.map((o, i) => (i === index ? op : o));
    return recordStep ? change(pl, ops) : { ...pl, ops };
}

/** Remembers the current list as one step to go back to, without changing it (before a slider starts moving). */
export const checkpoint = (pl: Pipeline): Pipeline => ({ ...pl, undoStack: record(pl), redoStack: [] });

export function undo(pl: Pipeline): Pipeline {
    const previous = pl.undoStack[pl.undoStack.length - 1];
    if (!previous) return pl;
    return { ...pl, ops: previous, undoStack: pl.undoStack.slice(0, -1), redoStack: [...pl.redoStack, pl.ops] };
}

export function redo(pl: Pipeline): Pipeline {
    const next = pl.redoStack[pl.redoStack.length - 1];
    if (!next) return pl;
    return { ...pl, ops: next, undoStack: record(pl), redoStack: pl.redoStack.slice(0, -1) };
}

export const reset = (pl: Pipeline): Pipeline => (pl.ops.length === 0 ? pl : change(pl, []));

/** A new source (another image) keeps the operations and the history. */
export const withSource = (pl: Pipeline, source: Picture): Pipeline => ({ ...pl, source });

// ── Defaults and presets ──────────────────────────────────────────────────────

/** A new operation of `kind` with values that already do something sensible for this picture and target. */
export function defaultOp(kind: OpKind, current: Picture, target: number): Op {
    const white = { r: 255, g: 255, b: 255 };
    switch (kind) {
        case 'removeBg': return { kind, mode: 'edges', colour: null, tolerance: 12, softness: 8, matte: 0 };
        case 'trim': return { kind, tolerance: 2 };
        case 'crop': return { kind, x: 0, y: 0, w: current.width, h: current.height };
        case 'square': return { kind, fill: null };
        case 'fit': return { kind, target, share: target === 192 ? SAFE_AREA_SHARE : 100 };
        case 'resize': return { kind, w: target, h: target };
        case 'rotate': return { kind, quarters: 1 };
        case 'flip': return { kind, axis: 'h' };
        case 'fill': return { kind, colour: white };
        case 'solid': return { kind, colour: white };
        case 'tone': return { kind, hue: 0, saturation: 0, brightness: 0, contrast: 0, invert: false, gray: false, threshold: null };
        case 'outline': return { kind, mode: hasAlpha(current) ? 'alpha' : 'brightness', cutoff: 16 };
    }
}

/** Whether most of the border of the picture has the colour of the corners (a flat background). */
export function hasFlatBorder(p: Picture): boolean {
    if (hasAlpha(p) && p.data[3]! === 0) return false;
    const c = cornerColour(p);
    let total = 0, flat = 0;
    const test = (x: number, y: number): void => {
        const i = (y * p.width + x) * 4;
        total++;
        if (distancePercentRaw(p.data[i]!, p.data[i + 1]!, p.data[i + 2]!, c) <= 8) flat++;
    };
    for (let x = 0; x < p.width; x++) { test(x, 0); if (p.height > 1) test(x, p.height - 1); }
    for (let y = 1; y < p.height - 1; y++) { test(0, y); if (p.width > 1) test(p.width - 1, y); }
    return total > 0 && flat / total >= 0.5;
}

/** Remove an edge background when there is one, trim, make square, fit into the safe area at 192. */
export function presetTeamsColour(source: Picture): Op[] {
    const ops: Op[] = [];
    if (hasFlatBorder(source)) ops.push(defaultOp('removeBg', source, 192));
    ops.push(defaultOp('trim', source, 192), defaultOp('square', source, 192), defaultOp('fit', source, 192));
    return ops;
}

/** A white silhouette, trimmed, squared and fitted at 32. */
export function presetOutline(source: Picture): Op[] {
    return [
        defaultOp('outline', source, 32),
        defaultOp('trim', source, 32),
        defaultOp('square', source, 32),
        { kind: 'fit', target: 32, share: 100 },
    ];
}

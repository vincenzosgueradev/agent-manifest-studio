/**
 * The operations of the image editor. Each takes a picture and returns a new one; the input is never
 * changed. The exact definition of each is in specs/004-icon-image-editor/research.md section 1.
 */

import { clamp255, cornerColour, hslToRgb, luma, rgbToHsl } from './colour';
import { resizePicture } from './resample';
import { blank, clonePicture, type OutlineOp, type Picture, type RemoveBgOp, type Rgb, type ToneOp } from './types';

const MAX_SQ = 3 * 255 * 255;

// ── Background ────────────────────────────────────────────────────────────────

/** Squared distance of every pixel to `to`, as integers, so that a limit is compared exactly. */
function squaredDistances(p: Picture, to: Rgb): Int32Array {
    const n = p.width * p.height;
    const out = new Int32Array(n);
    for (let i = 0; i < n; i++) {
        const k = i * 4;
        out[i] = (p.data[k]! - to.r) ** 2 + (p.data[k + 1]! - to.g) ** 2 + (p.data[k + 2]! - to.b) ** 2;
    }
    return out;
}

/** `sq` is within `percent` of the colour: `100 * sqrt(sq / MAX_SQ) <= percent`, without the square root. */
/** The tiny allowance is for a limit that is itself a distance: it must count as inside, as the definition says. */
const within = (sq: number, percent: number): boolean => sq * 10000 <= percent * percent * MAX_SQ * (1 + 1e-12);

/** Four-neighbour steps: grows (`grow`) or shrinks the set `hard` by one pixel. Out of the picture counts as set. */
function step(hard: Uint8Array, w: number, h: number, grow: boolean): Uint8Array {
    const out = hard.slice();
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const near = [
                x > 0 ? hard[i - 1]! : (grow ? 0 : 1),
                x < w - 1 ? hard[i + 1]! : (grow ? 0 : 1),
                y > 0 ? hard[i - w]! : (grow ? 0 : 1),
                y < h - 1 ? hard[i + w]! : (grow ? 0 : 1),
            ];
            if (grow) { if (!hard[i] && near.some(v => v === 1)) out[i] = 1; }
            else if (hard[i] && near.some(v => v === 0)) out[i] = 0;
        }
    }
    return out;
}

export function removeBackground(p: Picture, o: RemoveBgOp): Picture {
    const { width: w, height: h } = p;
    const colour = o.colour ?? cornerColour(p);
    const sq = squaredDistances(p, colour);
    const tol = o.tolerance;
    const reachTol = o.tolerance + o.softness;
    const n = w * h;

    const reachable = new Uint8Array(n);
    if (o.mode === 'everywhere') {
        for (let i = 0; i < n; i++) reachable[i] = within(sq[i]!, reachTol) ? 1 : 0;
    } else {
        const stack: number[] = [];
        const seed = (i: number): void => { if (!reachable[i] && within(sq[i]!, reachTol)) { reachable[i] = 1; stack.push(i); } };
        for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
        for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
        while (stack.length > 0) {
            const i = stack.pop()!;
            const x = i % w, y = (i - x) / w;
            if (x > 0) seed(i - 1);
            if (x < w - 1) seed(i + 1);
            if (y > 0) seed(i - w);
            if (y < h - 1) seed(i + w);
        }
    }

    let hard: Uint8Array = new Uint8Array(n);
    for (let i = 0; i < n; i++) hard[i] = reachable[i] && within(sq[i]!, tol) ? 1 : 0;
    for (let s = 0; s < Math.abs(o.matte); s++) hard = step(hard, w, h, o.matte > 0);

    const out = clonePicture(p);
    for (let i = 0; i < n; i++) {
        const a = i * 4 + 3;
        if (hard[i]) out.data[a] = 0;
        else if (reachable[i] && o.softness > 0 && !within(sq[i]!, tol)) {
            const d = 100 * Math.sqrt(sq[i]! / MAX_SQ);
            out.data[a] = Math.floor(p.data[a]! * ((d - tol) / o.softness) + 0.5);
        }
    }
    return out;
}

/** Every pixel is laid on `colour`: the formula of the preview, so the result is fully opaque. */
export function fillOn(p: Picture, colour: Rgb): Picture {
    const out = clonePicture(p);
    for (let i = 0; i < out.data.length; i += 4) {
        const a = p.data[i + 3]!;
        out.data[i] = Math.floor((p.data[i]! * a + colour.r * (255 - a) + 127) / 255);
        out.data[i + 1] = Math.floor((p.data[i + 1]! * a + colour.g * (255 - a) + 127) / 255);
        out.data[i + 2] = Math.floor((p.data[i + 2]! * a + colour.b * (255 - a) + 127) / 255);
        out.data[i + 3] = 255;
    }
    return out;
}

// ── Framing ───────────────────────────────────────────────────────────────────

/** Why this rectangle cannot be cut from the picture, or `null`. */
export function cropProblem(p: Picture, x: number, y: number, w: number, h: number): string | null {
    if (![x, y, w, h].every(Number.isInteger)) return 'The rectangle must be whole numbers of pixels.';
    if (w < 1 || h < 1) return 'The rectangle must be at least 1 pixel wide and high.';
    if (x < 0 || y < 0) return 'The rectangle cannot start before the picture.';
    if (x + w > p.width || y + h > p.height) return `The rectangle goes outside the picture, which is ${p.width} x ${p.height} pixels.`;
    return null;
}

export function crop(p: Picture, x: number, y: number, w: number, h: number): Picture {
    const problem = cropProblem(p, x, y, w, h);
    if (problem) throw new RangeError(problem);
    const out = blank(w, h);
    for (let row = 0; row < h; row++) {
        const from = ((y + row) * p.width + x) * 4;
        out.data.set(p.data.subarray(from, from + w * 4), row * w * 4);
    }
    return out;
}

function boundingBox(p: Picture, keep: (i: number) => boolean): { x: number; y: number; w: number; h: number } | null {
    let minX = p.width, minY = p.height, maxX = -1, maxY = -1;
    for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
            if (!keep((y * p.width + x) * 4)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** The box that `trim` would keep, or `null` when there is nothing to keep. */
export function trimBox(p: Picture, tolerance: number): { x: number; y: number; w: number; h: number } | null {
    let transparent = false;
    for (let i = 3; i < p.data.length; i += 4) if (p.data[i]! < 255) { transparent = true; break; }
    if (transparent) return boundingBox(p, i => p.data[i + 3]! > 0);
    const bg: Rgb = { r: p.data[0]!, g: p.data[1]!, b: p.data[2]! };
    return boundingBox(p, i => !within((p.data[i]! - bg.r) ** 2 + (p.data[i + 1]! - bg.g) ** 2 + (p.data[i + 2]! - bg.b) ** 2, tolerance));
}

export function trim(p: Picture, tolerance: number): Picture {
    const box = trimBox(p, tolerance);
    return box ? crop(p, box.x, box.y, box.w, box.h) : clonePicture(p);
}

/** The shorter side is padded to the longer one, without stretching, with transparency or `fill`. */
export function square(p: Picture, fill: Rgb | null): Picture {
    const side = Math.max(p.width, p.height);
    const out = fill ? blank(side, side, [fill.r, fill.g, fill.b, 255]) : blank(side, side);
    return place(out, p, Math.floor((side - p.width) / 2), Math.floor((side - p.height) / 2));
}

/** `source` copied onto `target` (already allocated) at (ox, oy); `target` is changed and returned. */
function place(target: Picture, source: Picture, ox: number, oy: number): Picture {
    for (let y = 0; y < source.height; y++) {
        const ty = y + oy;
        if (ty < 0 || ty >= target.height) continue;
        for (let x = 0; x < source.width; x++) {
            const tx = x + ox;
            if (tx < 0 || tx >= target.width) continue;
            const s = (y * source.width + x) * 4, t = (ty * target.width + tx) * 4;
            target.data[t] = source.data[s]!; target.data[t + 1] = source.data[s + 1]!;
            target.data[t + 2] = source.data[s + 2]!; target.data[t + 3] = source.data[s + 3]!;
        }
    }
    return target;
}

/** Scaled without stretching so that its longer side is `share` percent of `target`, centred on a transparent square. */
export function fit(p: Picture, target: number, share: number): Picture {
    const s = (share / 100) * target / Math.max(p.width, p.height);
    const nw = Math.max(1, Math.round(p.width * s));
    const nh = Math.max(1, Math.round(p.height * s));
    const scaled = resizePicture(p, nw, nh);
    return place(blank(target, target), scaled, Math.floor((target - nw) / 2), Math.floor((target - nh) / 2));
}

export function resize(p: Picture, w: number, h: number): Picture {
    return resizePicture(p, w, h);
}

/** 90 degrees clockwise `quarters` times. */
export function rotate(p: Picture, quarters: 1 | 2 | 3): Picture {
    const w = p.width, h = p.height;
    const swap = quarters !== 2;
    const out = blank(swap ? h : w, swap ? w : h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let tx: number, ty: number;
            if (quarters === 1) { tx = h - 1 - y; ty = x; }
            else if (quarters === 2) { tx = w - 1 - x; ty = h - 1 - y; }
            else { tx = y; ty = w - 1 - x; }
            const s = (y * w + x) * 4, t = (ty * out.width + tx) * 4;
            out.data[t] = p.data[s]!; out.data[t + 1] = p.data[s + 1]!; out.data[t + 2] = p.data[s + 2]!; out.data[t + 3] = p.data[s + 3]!;
        }
    }
    return out;
}

export function flip(p: Picture, axis: 'h' | 'v'): Picture {
    const out = blank(p.width, p.height);
    for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
            const tx = axis === 'h' ? p.width - 1 - x : x;
            const ty = axis === 'v' ? p.height - 1 - y : y;
            const s = (y * p.width + x) * 4, t = (ty * p.width + tx) * 4;
            out.data[t] = p.data[s]!; out.data[t + 1] = p.data[s + 1]!; out.data[t + 2] = p.data[s + 2]!; out.data[t + 3] = p.data[s + 3]!;
        }
    }
    return out;
}

// ── Colour ────────────────────────────────────────────────────────────────────

/** Every visible pixel takes `colour` and keeps its alpha. */
export function solid(p: Picture, colour: Rgb): Picture {
    const out = clonePicture(p);
    for (let i = 0; i < out.data.length; i += 4) {
        if (out.data[i + 3]! > 0) { out.data[i] = colour.r; out.data[i + 1] = colour.g; out.data[i + 2] = colour.b; }
    }
    return out;
}

/** In this order: hue and saturation, brightness, contrast, invert, grayscale, threshold. Alpha never changes. */
export function tone(p: Picture, o: ToneOp): Picture {
    const out = clonePicture(p);
    const hsl = o.hue !== 0 || o.saturation !== 0;
    for (let i = 0; i < out.data.length; i += 4) {
        let r = out.data[i]!, g = out.data[i + 1]!, b = out.data[i + 2]!;
        if (hsl) {
            const c = rgbToHsl(r, g, b);
            const m = hslToRgb(c.h + o.hue, Math.min(1, Math.max(0, c.s * (100 + o.saturation) / 100)), c.l);
            r = m.r; g = m.g; b = m.b;
        }
        if (o.brightness !== 0) { const d = 255 * o.brightness / 100; r = clamp255(r + d); g = clamp255(g + d); b = clamp255(b + d); }
        if (o.contrast !== 0) {
            const f = (100 + o.contrast) / 100;
            r = clamp255((r - 128) * f + 128); g = clamp255((g - 128) * f + 128); b = clamp255((b - 128) * f + 128);
        }
        if (o.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
        if (o.gray) { const l = luma(r, g, b); r = g = b = l; }
        if (o.threshold !== null) { const v = luma(r, g, b) >= o.threshold ? 255 : 0; r = g = b = v; }
        out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b;
    }
    return out;
}

/** A white silhouette on transparent: the form the outline icon check asks for. */
export function outlineMaker(p: Picture, o: OutlineOp): Picture {
    const out = blank(p.width, p.height);
    for (let i = 0; i < p.data.length; i += 4) {
        const a = p.data[i + 3]!;
        const alpha = o.mode === 'alpha'
            ? (a >= o.cutoff ? a : 0)
            : Math.floor(a * (255 - luma(p.data[i]!, p.data[i + 1]!, p.data[i + 2]!)) / 255 + 0.5);
        out.data[i] = 255; out.data[i + 1] = 255; out.data[i + 2] = 255; out.data[i + 3] = alpha;
    }
    return out;
}

/** Whether every pixel is fully transparent. */
export function isEmptyPicture(p: Picture): boolean {
    for (let i = 3; i < p.data.length; i += 4) if (p.data[i]! > 0) return false;
    return true;
}

/**
 * Changing the size of a picture: area averaging when it gets smaller, bilinear when it gets larger,
 * one axis at a time, in premultiplied alpha so that a transparent pixel does not bleed its colour
 * into its neighbours. Rounded half up.
 */

import type { Picture } from './types';

interface Tap { i: number; w: number }

/** For each output index, the source indices and weights that make it. */
function taps(src: number, dst: number): Tap[][] {
    const out: Tap[][] = [];
    if (dst < src) {
        const scale = src / dst;
        for (let j = 0; j < dst; j++) {
            const start = j * scale, end = (j + 1) * scale;
            const list: Tap[] = [];
            for (let i = Math.floor(start); i < Math.ceil(end) && i < src; i++) {
                const overlap = Math.min(i + 1, end) - Math.max(i, start);
                if (overlap > 1e-12) list.push({ i, w: overlap / scale });
            }
            out.push(list);
        }
    } else if (dst > src) {
        const scale = src / dst;
        for (let j = 0; j < dst; j++) {
            const pos = (j + 0.5) * scale - 0.5;
            const i0 = Math.floor(pos);
            const t = pos - i0;
            const a = Math.min(src - 1, Math.max(0, i0));
            const b = Math.min(src - 1, Math.max(0, i0 + 1));
            out.push(a === b ? [{ i: a, w: 1 }] : [{ i: a, w: 1 - t }, { i: b, w: t }]);
        }
    } else {
        for (let j = 0; j < dst; j++) out.push([{ i: j, w: 1 }]);
    }
    return out;
}

/** Premultiplied channels in 0..255 scale, alpha kept as it is. */
function premultiply(p: Picture): Float32Array {
    const f = new Float32Array(p.data.length);
    for (let i = 0; i < p.data.length; i += 4) {
        const a = p.data[i + 3]!;
        f[i] = p.data[i]! * a / 255;
        f[i + 1] = p.data[i + 1]! * a / 255;
        f[i + 2] = p.data[i + 2]! * a / 255;
        f[i + 3] = a;
    }
    return f;
}

function horizontal(src: Float32Array, w: number, h: number, nw: number): Float32Array {
    const t = taps(w, nw);
    const out = new Float32Array(nw * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < nw; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (const { i, w: weight } of t[x]!) {
                const k = (y * w + i) * 4;
                r += src[k]! * weight; g += src[k + 1]! * weight; b += src[k + 2]! * weight; a += src[k + 3]! * weight;
            }
            const o = (y * nw + x) * 4;
            out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
        }
    }
    return out;
}

function vertical(src: Float32Array, w: number, h: number, nh: number): Float32Array {
    const t = taps(h, nh);
    const out = new Float32Array(w * nh * 4);
    for (let y = 0; y < nh; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (const { i, w: weight } of t[y]!) {
                const k = (i * w + x) * 4;
                r += src[k]! * weight; g += src[k + 1]! * weight; b += src[k + 2]! * weight; a += src[k + 3]! * weight;
            }
            const o = (y * w + x) * 4;
            out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
        }
    }
    return out;
}

/** The picture at `width` x `height` (both at least 1). The input is not changed. */
export function resizePicture(p: Picture, width: number, height: number): Picture {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
        throw new RangeError('The size must be whole numbers of at least 1.');
    }
    if (width === p.width && height === p.height) return { width, height, data: p.data.slice() };
    let f = premultiply(p);
    f = horizontal(f, p.width, p.height, width);
    f = vertical(f, width, p.height, height);
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        const alpha = f[i + 3]!;
        const A = Math.min(255, Math.floor(alpha + 0.5));
        if (A === 0) continue;
        data[i] = Math.min(255, Math.floor(f[i]! * 255 / alpha + 0.5));
        data[i + 1] = Math.min(255, Math.floor(f[i + 1]! * 255 / alpha + 0.5));
        data[i + 2] = Math.min(255, Math.floor(f[i + 2]! * 255 / alpha + 0.5));
        data[i + 3] = A;
    }
    return { width, height, data };
}

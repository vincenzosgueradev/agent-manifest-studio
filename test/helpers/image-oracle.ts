/**
 * Reference implementations for the image editor tests, written from specs/004-icon-image-editor/
 * research.md section 1 and sharing no code with `src/`. They are deliberately simple and slow:
 * pixel by pixel, with the structure that the definitions are written in.
 */
import { unzlibSync } from 'fflate';

export interface Pic { w: number; h: number; px: Array<[number, number, number, number]> }
export type Rgb3 = [number, number, number];

export const toPic = (width: number, height: number, data: Uint8Array): Pic => {
    const px: Pic['px'] = [];
    for (let i = 0; i < width * height; i++) px.push([data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!, data[i * 4 + 3]!]);
    return { w: width, h: height, px };
};

export const fromPic = (p: Pic): { width: number; height: number; data: Uint8Array } => {
    const data = new Uint8Array(p.w * p.h * 4);
    p.px.forEach((v, i) => data.set(v, i * 4));
    return { width: p.w, height: p.h, data };
};

export const make = (w: number, h: number, f: (x: number, y: number) => [number, number, number, number]): Pic => {
    const px: Pic['px'] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.push(f(x, y));
    return { w, h, px };
};

export const get = (p: Pic, x: number, y: number): Pic['px'][number] => p.px[y * p.w + x]!;

export const dist = (a: Rgb3, b: Rgb3): number => 100 * Math.sqrt(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / (3 * 255 * 255));

// ── background ────────────────────────────────────────────────────────────────

export function removeBg(p: Pic, mode: 'edges' | 'everywhere', colour: Rgb3, tol: number, soft: number, matte: number): Pic {
    const d = p.px.map(v => dist([v[0], v[1], v[2]], colour));
    const reach = tol + soft;
    const near = d.map(v => v <= reach + 1e-9);
    let reachable: boolean[];
    if (mode === 'everywhere') reachable = near;
    else {
        reachable = p.px.map(() => false);
        const queue: Array<[number, number]> = [];
        const visit = (x: number, y: number): void => {
            if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
            const i = y * p.w + x;
            if (reachable[i] || !near[i]) return;
            reachable[i] = true;
            queue.push([x, y]);
        };
        for (let x = 0; x < p.w; x++) { visit(x, 0); visit(x, p.h - 1); }
        for (let y = 0; y < p.h; y++) { visit(0, y); visit(p.w - 1, y); }
        while (queue.length) {
            const [x, y] = queue.shift()!;
            visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1);
        }
    }
    let hard = p.px.map((_, i) => reachable[i]! && d[i]! <= tol + 1e-9);
    for (let s = 0; s < Math.abs(matte); s++) {
        const next = hard.slice();
        for (let y = 0; y < p.h; y++) {
            for (let x = 0; x < p.w; x++) {
                const at = (xx: number, yy: number): boolean | undefined => (xx < 0 || yy < 0 || xx >= p.w || yy >= p.h ? undefined : hard[yy * p.w + xx]);
                const around = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
                if (matte > 0) { if (!hard[y * p.w + x] && around.some(v => v === true)) next[y * p.w + x] = true; }
                else if (hard[y * p.w + x] && around.some(v => v === false)) next[y * p.w + x] = false;
            }
        }
        hard = next;
    }
    return {
        w: p.w, h: p.h,
        px: p.px.map((v, i) => {
            if (hard[i]) return [v[0], v[1], v[2], 0];
            if (reachable[i] && soft > 0 && d[i]! > tol + 1e-9) return [v[0], v[1], v[2], Math.floor(v[3] * ((d[i]! - tol) / soft) + 0.5)];
            return v;
        }),
    };
}

export function fill(p: Pic, c: Rgb3): Pic {
    return { w: p.w, h: p.h, px: p.px.map(v => [0, 1, 2].map(k => Math.floor((v[k]! * v[3] + c[k]! * (255 - v[3]) + 127) / 255)).concat(255) as [number, number, number, number]) };
}

// ── framing ───────────────────────────────────────────────────────────────────

export function crop(p: Pic, x: number, y: number, w: number, h: number): Pic {
    return make(w, h, (cx, cy) => get(p, x + cx, y + cy));
}

export function bbox(p: Pic, tol: number): { x: number; y: number; w: number; h: number } | null {
    const transparent = p.px.some(v => v[3] < 255);
    const bg: Rgb3 = [p.px[0]![0], p.px[0]![1], p.px[0]![2]];
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < p.h; y++) {
        for (let x = 0; x < p.w; x++) {
            const v = get(p, x, y);
            const keep = transparent ? v[3] > 0 : dist([v[0], v[1], v[2]], bg) > tol;
            if (!keep) continue;
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const rotate90 = (p: Pic): Pic => make(p.h, p.w, (x, y) => get(p, y, p.h - 1 - x));   // clockwise
export const flipH = (p: Pic): Pic => make(p.w, p.h, (x, y) => get(p, p.w - 1 - x, y));
export const flipV = (p: Pic): Pic => make(p.w, p.h, (x, y) => get(p, x, p.h - 1 - y));

// ── colour ────────────────────────────────────────────────────────────────────

export const lumaOf = (r: number, g: number, b: number): number => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
const clampRound = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

export function hslOf(r: number, g: number, b: number): [number, number, number] {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const s = l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
    let h = mx === R ? (G - B) / (mx - mn) + (G < B ? 6 : 0) : mx === G ? (B - R) / (mx - mn) + 2 : (R - G) / (mx - mn) + 4;
    h *= 60;
    return [h, s, l];
}

export function rgbOf(h: number, s: number, l: number): Rgb3 {
    const hue2 = (p: number, q: number, t: number): number => {
        let tt = t; if (tt < 0) tt += 1; if (tt > 1) tt -= 1;
        return tt < 1 / 6 ? p + (q - p) * 6 * tt : tt < 1 / 2 ? q : tt < 2 / 3 ? p + (q - p) * (2 / 3 - tt) * 6 : p;
    };
    if (s === 0) return [clampRound(l * 255), clampRound(l * 255), clampRound(l * 255)];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hh = (((h % 360) + 360) % 360) / 360;
    return [clampRound(hue2(p, q, hh + 1 / 3) * 255), clampRound(hue2(p, q, hh) * 255), clampRound(hue2(p, q, hh - 1 / 3) * 255)];
}

export interface Tone { hue: number; saturation: number; brightness: number; contrast: number; invert: boolean; gray: boolean; threshold: number | null }

export function tonePx(v: [number, number, number, number], t: Tone): [number, number, number, number] {
    let [r, g, b] = [v[0], v[1], v[2]];
    if (t.hue !== 0 || t.saturation !== 0) {
        const [h, s, l] = hslOf(r, g, b);
        [r, g, b] = rgbOf(h + t.hue, Math.max(0, Math.min(1, s * (100 + t.saturation) / 100)), l);
    }
    if (t.brightness !== 0) [r, g, b] = [r, g, b].map(c => clampRound(c + 255 * t.brightness / 100)) as Rgb3;
    if (t.contrast !== 0) [r, g, b] = [r, g, b].map(c => clampRound((c - 128) * (100 + t.contrast) / 100 + 128)) as Rgb3;
    if (t.invert) [r, g, b] = [255 - r, 255 - g, 255 - b];
    if (t.gray) { const l = lumaOf(r, g, b); [r, g, b] = [l, l, l]; }
    if (t.threshold !== null) { const q = lumaOf(r, g, b) >= t.threshold ? 255 : 0; [r, g, b] = [q, q, q]; }
    return [r, g, b, v[3]];
}

export const outlinePx = (v: [number, number, number, number], mode: 'alpha' | 'brightness', cutoff: number): [number, number, number, number] =>
    [255, 255, 255, mode === 'alpha' ? (v[3] >= cutoff ? v[3] : 0) : Math.floor(v[3] * (255 - lumaOf(v[0], v[1], v[2])) / 255 + 0.5)];

// ── a reader that shares nothing with the writer ──────────────────────────────

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (bytes: Uint8Array): number => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export interface ReadPng { width: number; height: number; data: Uint8Array; chunks: string[]; header: number[] }

/** Throws a message on anything that is not a well-formed 8-bit RGBA PNG. */
export function readPng(bytes: Uint8Array): ReadPng {
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    if (sig.some((v, i) => bytes[i] !== v)) throw new Error('signature');
    const be = (o: number): number => ((bytes[o]! << 24) | (bytes[o + 1]! << 16) | (bytes[o + 2]! << 8) | bytes[o + 3]!) >>> 0;
    const chunks: string[] = [];
    const idat: Uint8Array[] = [];
    let header: number[] = [];
    let pos = 8;
    while (pos < bytes.length) {
        const len = be(pos);
        const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
        const body = bytes.subarray(pos + 8, pos + 8 + len);
        if (crc(bytes.subarray(pos + 4, pos + 8 + len)) !== be(pos + 8 + len)) throw new Error(`crc of ${type}`);
        chunks.push(type);
        if (type === 'IHDR') header = [be(pos + 8), be(pos + 12), ...body.subarray(8, 13)];
        if (type === 'IDAT') idat.push(body);
        pos += 12 + len;
    }
    const [width, height, depth, colour, , , interlace] = header as [number, number, number, number, number, number, number];
    if (depth !== 8 || colour !== 6 || interlace !== 0) throw new Error('not 8-bit RGBA non-interlaced');
    const all = new Uint8Array(idat.reduce((n, a) => n + a.length, 0));
    let at = 0; for (const a of idat) { all.set(a, at); at += a.length; }
    const raw = unzlibSync(all);
    const stride = width * 4;
    if (raw.length !== (stride + 1) * height) throw new Error('data length');
    const out = new Uint8Array(stride * height);
    for (let y = 0; y < height; y++) {
        const f = raw[y * (stride + 1)]!;
        for (let x = 0; x < stride; x++) {
            const cur = raw[y * (stride + 1) + 1 + x]!;
            const a = x >= 4 ? out[y * stride + x - 4]! : 0;
            const b = y > 0 ? out[(y - 1) * stride + x]! : 0;
            const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4]! : 0;
            let pred = 0;
            if (f === 1) pred = a; else if (f === 2) pred = b; else if (f === 3) pred = (a + b) >> 1;
            else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
            else if (f !== 0) throw new Error(`filter ${f}`);
            out[y * stride + x] = (cur + pred) & 255;
        }
    }
    return { width, height, data: out, chunks, header };
}

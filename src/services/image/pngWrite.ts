/**
 * PNG writer (FR-026): an 8-bit RGBA, non-interlaced PNG with the signature, IHDR, one IDAT, IEND and
 * the checksum of each chunk, nothing else. Rows are filtered with the usual heuristic (the filter whose
 * output has the smallest sum of absolute values) and compressed by `fflate` at level 9.
 */

import { zlibSync } from 'fflate';
import type { Picture } from './types';

const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const be32 = (v: number): Uint8Array => new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);

function chunk(type: string, data: Uint8Array): Uint8Array {
    const body = new Uint8Array(4 + data.length);
    for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
    body.set(data, 4);
    const out = new Uint8Array(12 + data.length);
    out.set(be32(data.length), 0);
    out.set(body, 4);
    out.set(be32(crc32(body)), 8 + data.length);
    return out;
}

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The filtered form of a row for each of the five filter types; the one with the smallest cost wins. */
function filterRow(row: Uint8Array, prev: Uint8Array | null): Uint8Array {
    const n = row.length;
    let best: Uint8Array | null = null;
    let bestCost = Infinity;
    for (let type = 0; type < 5; type++) {
        const out = new Uint8Array(1 + n);
        out[0] = type;
        let cost = 0;
        for (let i = 0; i < n; i++) {
            const left = i >= 4 ? row[i - 4]! : 0;
            const up = prev ? prev[i]! : 0;
            const upLeft = prev && i >= 4 ? prev[i - 4]! : 0;
            const predicted = type === 0 ? 0 : type === 1 ? left : type === 2 ? up : type === 3 ? (left + up) >> 1 : paeth(left, up, upLeft);
            const v = (row[i]! - predicted) & 255;
            out[1 + i] = v;
            cost += v < 128 ? v : 256 - v;
        }
        if (cost < bestCost) { bestCost = cost; best = out; }
    }
    return best!;
}

export function encodePng(p: Picture): Uint8Array {
    const stride = p.width * 4;
    const raw = new Uint8Array((1 + stride) * p.height);
    for (let y = 0; y < p.height; y++) {
        const row = p.data.subarray(y * stride, (y + 1) * stride);
        const prev = y > 0 ? p.data.subarray((y - 1) * stride, y * stride) : null;
        raw.set(filterRow(row, prev), y * (1 + stride));
    }
    const header = new Uint8Array(13);
    header.set(be32(p.width), 0);
    header.set(be32(p.height), 4);
    header[8] = 8;    // bit depth
    header[9] = 6;    // RGBA
    header[10] = 0;   // deflate
    header[11] = 0;   // adaptive filtering
    header[12] = 0;   // not interlaced
    const parts = [SIGNATURE, chunk('IHDR', header), chunk('IDAT', zlibSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))];
    const out = new Uint8Array(parts.reduce((n, a) => n + a.length, 0));
    let at = 0;
    for (const a of parts) { out.set(a, at); at += a.length; }
    return out;
}

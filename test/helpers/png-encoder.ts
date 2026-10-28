/**
 * Independent PNG encoder for the tests. It imports nothing from `src/` and uses `node:zlib`, so a
 * decoder test cannot pass by sharing a mistake with the code under test (Testing Standard 2).
 */
import { deflateSync } from 'node:zlib';

export type Rgba = [number, number, number, number];
export type ColorType = 0 | 2 | 3 | 4 | 6;

export interface PngSpec {
    width: number;
    height: number;
    colorType: ColorType;
    /** 8 is the supported case; 16 is written (scaled by 257) only to test the rejection. */
    bitDepth?: 8 | 16;
    /** Sets the interlace byte only; the data stays non-interlaced (the decoder must refuse first). */
    interlace?: boolean;
    /** One filter type for every row, or `mixed` to cycle 0..4 row by row. */
    filter?: 0 | 1 | 2 | 3 | 4 | 'mixed';
    pixel: (x: number, y: number) => Rgba;
}

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

export function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function u32(n: number): Uint8Array {
    return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}

function concat(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}

export function chunk(type: string, data: Uint8Array): Uint8Array {
    const t = new TextEncoder().encode(type);
    const body = concat([t, data]);
    return concat([u32(data.length), body, u32(crc32(body))]);
}

export const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const CHANNELS: Record<ColorType, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** What a correct decoder must return for `spec`, written from the PNG rules, not from `src/`. */
export function expectedRgba(spec: PngSpec): Uint8Array {
    const out = new Uint8Array(spec.width * spec.height * 4);
    for (let y = 0; y < spec.height; y++) {
        for (let x = 0; x < spec.width; x++) {
            const [r, g, b, a] = spec.pixel(x, y);
            const o = (y * spec.width + x) * 4;
            switch (spec.colorType) {
                case 0: out.set([r, r, r, 255], o); break;
                case 4: out.set([r, r, r, a], o); break;
                case 2: out.set([r, g, b, 255], o); break;
                default: out.set([r, g, b, a], o); break;   // 3 and 6 keep every channel
            }
        }
    }
    return out;
}

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
}

function filterRow(type: number, row: Uint8Array, prev: Uint8Array, bpp: number): Uint8Array {
    const out = new Uint8Array(row.length + 1);
    out[0] = type;
    for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? row[i - bpp]! : 0;
        const b = prev[i]!;
        const c = i >= bpp ? prev[i - bpp]! : 0;
        let predictor = 0;
        if (type === 1) predictor = a;
        else if (type === 2) predictor = b;
        else if (type === 3) predictor = (a + b) >> 1;
        else if (type === 4) predictor = paeth(a, b, c);
        out[i + 1] = (row[i]! - predictor) & 255;
    }
    return out;
}

export function encodePng(spec: PngSpec): Uint8Array {
    const { width, height, colorType } = spec;
    const bitDepth = spec.bitDepth ?? 8;
    const bytesPerSample = bitDepth === 16 ? 2 : 1;
    const channels = CHANNELS[colorType];

    // Palette for colour type 3: every distinct RGBA gets an index (at most 256).
    const palette: Rgba[] = [];
    const indexOf = (p: Rgba): number => {
        const k = palette.findIndex(q => q[0] === p[0] && q[1] === p[1] && q[2] === p[2] && q[3] === p[3]);
        if (k >= 0) return k;
        if (palette.length >= 256) throw new Error('palette overflow in test encoder');
        palette.push(p);
        return palette.length - 1;
    };

    const bpp = channels * bytesPerSample;
    const rowLen = width * bpp;
    const rows: Uint8Array[] = [];
    for (let y = 0; y < height; y++) {
        const row = new Uint8Array(rowLen);
        for (let x = 0; x < width; x++) {
            const p = spec.pixel(x, y);
            const samples: number[] =
                colorType === 0 ? [p[0]]
                : colorType === 2 ? [p[0], p[1], p[2]]
                : colorType === 3 ? [indexOf(p)]
                : colorType === 4 ? [p[0], p[3]]
                : [p[0], p[1], p[2], p[3]];
            samples.forEach((s, c) => {
                const o = x * bpp + c * bytesPerSample;
                if (bytesPerSample === 2) { row[o] = s; row[o + 1] = s; }   // s * 257
                else row[o] = s;
            });
        }
        rows.push(row);
    }

    const filtered: Uint8Array[] = [];
    let prev: Uint8Array = new Uint8Array(rowLen);
    rows.forEach((row, y) => {
        const type = spec.filter === undefined ? 0 : spec.filter === 'mixed' ? y % 5 : spec.filter;
        filtered.push(filterRow(type, row, prev, bpp));
        prev = row;
    });

    const ihdr = concat([u32(width), u32(height), new Uint8Array([bitDepth, colorType, 0, 0, spec.interlace ? 1 : 0])]);
    const parts: Uint8Array[] = [PNG_SIGNATURE, chunk('IHDR', ihdr)];
    if (colorType === 3) {
        parts.push(chunk('PLTE', new Uint8Array(palette.flatMap(p => [p[0], p[1], p[2]]))));
        if (palette.some(p => p[3] !== 255)) parts.push(chunk('tRNS', new Uint8Array(palette.map(p => p[3]))));
    }
    parts.push(chunk('IDAT', new Uint8Array(deflateSync(concat(filtered)))));
    parts.push(chunk('IEND', new Uint8Array(0)));
    return concat(parts);
}

/** A PNG filled with one colour; convenient for fixtures. */
export function solidPng(width: number, height: number, rgba: Rgba, colorType: ColorType = 6): Uint8Array {
    return encodePng({ width, height, colorType, pixel: () => rgba });
}

/**
 * Same image, padded so the file weighs at least `bytes` (an ancillary `tEXt` chunk is ignored by
 * decoders). Used to test the weight thresholds without needing a huge picture.
 */
export function padPngTo(png: Uint8Array, bytes: number): Uint8Array {
    if (png.length >= bytes) return png;
    const iend = png.length - 12;
    const need = bytes - png.length - 12;
    const text = chunk('tEXt', new Uint8Array(Math.max(need, 0)).fill(65));
    const out = concat([png.subarray(0, iend), text, png.subarray(iend)]);
    if (out.length !== bytes) throw new Error(`padPngTo: got ${out.length}, wanted ${bytes}`);
    return out;
}

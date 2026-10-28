/**
 * PNG decoder (Image Standards): reads the header, checks size, bit depth and colour type before
 * using the image, and returns 8-bit RGBA. A file that is not a PNG is reported, not processed.
 *
 * Supported: bit depth 8, colour types 0 (grey), 2 (RGB), 3 (palette), 4 (grey + alpha) and
 * 6 (RGBA), no interlacing. Anything valid but different (16 bits, Adam7, a side above 4096) comes
 * back as `unsupported` with its header, so the screen can say what was found. Nothing here
 * guesses: a damaged file is `corrupt`, with the reason.
 *
 * Only the zlib stream is delegated to `fflate` (`unzlibSync`), into a buffer sized from the
 * header: a few bytes of data cannot expand into gigabytes.
 */

import { unzlibSync } from 'fflate';
import { PNG_MAX_SIDE } from './limits';
import type { PngHeader, PngResult } from '../types';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes: Uint8Array, from: number, to: number): number {
    let c = 0xffffffff;
    for (let i = from; i < to; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const u32 = (b: Uint8Array, o: number): number => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const VALID_DEPTHS: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };

const corrupt = (reason: string): PngResult => ({ kind: 'corrupt', reason });

interface Chunk { type: string; start: number; length: number }

export function decodePng(bytes: Uint8Array): PngResult {
    if (bytes.length < 8 || SIGNATURE.some((v, i) => bytes[i] !== v)) return { kind: 'not-png' };

    // Chunks, each with its checksum verified.
    const chunks: Chunk[] = [];
    let pos = 8;
    while (pos < bytes.length) {
        if (pos + 12 > bytes.length) return corrupt('The file ends in the middle of a chunk.');
        const length = u32(bytes, pos);
        const end = pos + 12 + length;
        if (length > 0x7fffffff || end > bytes.length) return corrupt('The file ends in the middle of a chunk.');
        const type = String.fromCharCode(bytes[pos + 4]!, bytes[pos + 5]!, bytes[pos + 6]!, bytes[pos + 7]!);
        if (crc32(bytes, pos + 4, pos + 8 + length) !== u32(bytes, pos + 8 + length)) {
            return corrupt(`The chunk ${type} has a wrong checksum.`);
        }
        chunks.push({ type, start: pos + 8, length });
        pos = end;
        if (type === 'IEND') break;
        if (chunks.length === 1 && type !== 'IHDR') return corrupt('The first chunk is not IHDR.');
    }
    if (chunks.length === 0 || chunks[0]!.type !== 'IHDR') return corrupt('The first chunk is not IHDR.');

    // Header.
    const ih = chunks[0]!;
    if (ih.length !== 13) return corrupt('The IHDR chunk has the wrong length.');
    const header: PngHeader = {
        width: u32(bytes, ih.start),
        height: u32(bytes, ih.start + 4),
        bitDepth: bytes[ih.start + 8]!,
        colorType: bytes[ih.start + 9]!,
        interlace: bytes[ih.start + 12]!,
    };
    if (header.width === 0 || header.height === 0) return corrupt('The image has no pixels (zero width or height).');
    if (!(header.colorType in CHANNELS)) return corrupt(`Colour type ${header.colorType} does not exist in PNG.`);
    if (!VALID_DEPTHS[header.colorType]!.includes(header.bitDepth)) {
        return corrupt(`Bit depth ${header.bitDepth} is not valid for colour type ${header.colorType}.`);
    }
    if (bytes[ih.start + 10] !== 0 || bytes[ih.start + 11] !== 0) return corrupt('The compression or filter method is not the one PNG defines.');
    if (header.interlace > 1) return corrupt(`Interlace method ${header.interlace} does not exist in PNG.`);

    // Valid, but beyond what this tool draws.
    if (header.width > PNG_MAX_SIDE || header.height > PNG_MAX_SIDE) {
        return { kind: 'unsupported', header, reason: `The image is ${header.width} x ${header.height}; the tool does not open sides above ${PNG_MAX_SIDE} pixels.` };
    }
    if (header.bitDepth !== 8) {
        return { kind: 'unsupported', header, reason: `Bit depth ${header.bitDepth}: the tool draws only 8-bit images.` };
    }
    if (header.interlace === 1) {
        return { kind: 'unsupported', header, reason: 'The image is interlaced (Adam7): the tool does not draw interlaced images.' };
    }

    // Data.
    if (chunks[chunks.length - 1]!.type !== 'IEND') return corrupt('The file has no end chunk (IEND).');
    const plte = chunks.find(c => c.type === 'PLTE');
    const trns = chunks.find(c => c.type === 'tRNS');
    const idat = chunks.filter(c => c.type === 'IDAT');
    if (idat.length === 0) return corrupt('The file has no image data (IDAT).');

    const channels = CHANNELS[header.colorType]!;
    const rowBytes = header.width * channels;
    const expected = header.height * (rowBytes + 1);
    const compressed = new Uint8Array(idat.reduce((s, c) => s + c.length, 0));
    let o = 0;
    for (const c of idat) { compressed.set(bytes.subarray(c.start, c.start + c.length), o); o += c.length; }

    let raw: Uint8Array;
    try {
        // One spare byte: a stream that holds more than the header allows fills it and is caught below.
        raw = unzlibSync(compressed, { out: new Uint8Array(expected + 1) });
    } catch {
        return corrupt('The image data cannot be decompressed, or it is larger than the header says.');
    }
    if (raw.length !== expected) {
        return corrupt(raw.length > expected
            ? `The image data is larger than the ${expected} bytes the header allows.`
            : `The image data has ${raw.length} bytes; the header needs ${expected}.`);
    }

    // Palette and transparency.
    let palette: Uint8Array | null = null;
    if (header.colorType === 3) {
        if (!plte) return corrupt('A palette image has no palette (PLTE).');
        if (plte.length === 0 || plte.length % 3 !== 0 || plte.length > 768) return corrupt('The palette (PLTE) has the wrong length.');
        palette = bytes.subarray(plte.start, plte.start + plte.length);
    }
    const trnsBytes = trns ? bytes.subarray(trns.start, trns.start + trns.length) : null;

    // Unfilter.
    const pixels = new Uint8Array(header.height * rowBytes);
    for (let y = 0; y < header.height; y++) {
        const filter = raw[y * (rowBytes + 1)]!;
        if (filter > 4) return corrupt(`Row ${y} uses filter type ${filter}, which does not exist in PNG.`);
        const src = y * (rowBytes + 1) + 1;
        const dst = y * rowBytes;
        const up = dst - rowBytes;
        for (let i = 0; i < rowBytes; i++) {
            const a = i >= channels ? pixels[dst + i - channels]! : 0;
            const b = y > 0 ? pixels[up + i]! : 0;
            const c = y > 0 && i >= channels ? pixels[up + i - channels]! : 0;
            let predictor = 0;
            if (filter === 1) predictor = a;
            else if (filter === 2) predictor = b;
            else if (filter === 3) predictor = (a + b) >> 1;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            pixels[dst + i] = (raw[src + i]! + predictor) & 255;
        }
    }

    // To RGBA.
    const rgba = new Uint8Array(header.width * header.height * 4);
    const count = header.width * header.height;
    for (let p = 0; p < count; p++) {
        const s = p * channels;
        const d = p * 4;
        switch (header.colorType) {
            case 0: {
                const g = pixels[s]!;
                const keyed = trnsBytes !== null && trnsBytes.length >= 2 && trnsBytes[0] === 0 && trnsBytes[1] === g;
                rgba[d] = g; rgba[d + 1] = g; rgba[d + 2] = g; rgba[d + 3] = keyed ? 0 : 255;
                break;
            }
            case 2: {
                const r = pixels[s]!, g = pixels[s + 1]!, b = pixels[s + 2]!;
                const keyed = trnsBytes !== null && trnsBytes.length >= 6
                    && trnsBytes[0] === 0 && trnsBytes[1] === r && trnsBytes[2] === 0 && trnsBytes[3] === g && trnsBytes[4] === 0 && trnsBytes[5] === b;
                rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = keyed ? 0 : 255;
                break;
            }
            case 3: {
                const idx = pixels[s]!;
                if (idx * 3 + 2 >= palette!.length) return corrupt(`A pixel uses palette entry ${idx}, which does not exist.`);
                rgba[d] = palette![idx * 3]!; rgba[d + 1] = palette![idx * 3 + 1]!; rgba[d + 2] = palette![idx * 3 + 2]!;
                rgba[d + 3] = trnsBytes !== null && idx < trnsBytes.length ? trnsBytes[idx]! : 255;
                break;
            }
            case 4: {
                const g = pixels[s]!;
                rgba[d] = g; rgba[d + 1] = g; rgba[d + 2] = g; rgba[d + 3] = pixels[s + 1]!;
                break;
            }
            default:
                rgba[d] = pixels[s]!; rgba[d + 1] = pixels[s + 1]!; rgba[d + 2] = pixels[s + 2]!; rgba[d + 3] = pixels[s + 3]!;
        }
    }
    return { kind: 'ok', header, rgba };
}

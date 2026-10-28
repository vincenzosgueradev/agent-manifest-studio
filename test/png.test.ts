/**
 * Image Standards: a decoded image is checked for size, bit depth and colour type; a file that is
 * not a PNG is rejected with a reason. The oracle is the independent encoder in test/helpers.
 */
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { decodePng } from '../src/services/png';
import { chunk, encodePng, expectedRgba, PNG_SIGNATURE, solidPng, type ColorType, type PngSpec, type Rgba } from './helpers/png-encoder';
import { cases } from './helpers/combinatorics';

/** A varied picture; for palette images the number of distinct colours stays small. */
function pixelFor(colorType: ColorType): PngSpec['pixel'] {
    const alphas = [0, 1, 127, 128, 254, 255];
    return (x, y): Rgba => {
        if (colorType === 3) {
            const k = (x * 3 + y * 5) % 12;
            return [k * 20, 255 - k * 20, (k * 7) % 256, alphas[k % alphas.length]!];
        }
        return [(x * 37 + y * 11) & 255, (x * 5 + y * 91 + 3) & 255, (x * 13 + y * 7 + 100) & 255, alphas[(x + y) % alphas.length]!];
    };
}

describe('decodePng: matrix of colour type x filter x size', () => {
    const colorTypes: ColorType[] = [0, 2, 3, 4, 6];
    const filters = [0, 1, 2, 3, 4, 'mixed'] as const;
    const sizes: Array<[number, number]> = [[1, 1], [3, 2], [2, 7], [32, 32], [192, 192]];
    for (const [colorType, filter, [width, height]] of cases<[ColorType, (typeof filters)[number], [number, number]]>([colorTypes, [...filters], sizes])) {
        it(`type ${colorType}, filter ${filter}, ${width}x${height}`, () => {
            const spec: PngSpec = { width, height, colorType, filter, pixel: pixelFor(colorType) };
            const r = decodePng(encodePng(spec));
            expect(r.kind).toBe('ok');
            if (r.kind !== 'ok') return;
            expect(r.header).toEqual({ width, height, bitDepth: 8, colorType, interlace: 0 });
            expect(Array.from(r.rgba)).toEqual(Array.from(expectedRgba(spec)));
        });
    }
});

describe('decodePng: not a PNG', () => {
    it.each([
        ['empty', new Uint8Array(0)],
        ['text', new TextEncoder().encode('hello world, not an image')],
        ['only the signature', PNG_SIGNATURE.slice()],
        ['a JPEG header', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70])],
        ['signature with one wrong byte', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 11, 0, 0, 0, 0])],
    ])('%s', (_n, bytes) => {
        const r = decodePng(bytes);
        expect(['not-png', 'corrupt']).toContain(r.kind);
        if (_n !== 'only the signature') expect(r.kind).toBe('not-png');
    });
});

describe('decodePng: corrupt', () => {
    const good = (): Uint8Array => solidPng(8, 8, [10, 20, 30, 255]);
    const expectCorrupt = (bytes: Uint8Array) => {
        const r = decodePng(bytes);
        expect(r.kind).toBe('corrupt');
        if (r.kind === 'corrupt') expect(r.reason.length).toBeGreaterThan(5);
    };

    it('truncated file', () => {
        expectCorrupt(good().slice(0, 40));
        expectCorrupt(good().slice(0, good().length - 20));
    });

    it('a flipped byte in the compressed data is caught (checksum or stream)', () => {
        const bytes = good();
        bytes[bytes.length - 20] ^= 0xff;
        expectCorrupt(bytes);
    });

    it('a chunk with a wrong checksum', () => {
        const bytes = good();
        bytes[21] ^= 0x01;   // inside the IHDR checksum
        expectCorrupt(bytes);
    });

    it('the image data is not a zlib stream', () => {
        const ihdr = good().slice(16, 29);
        const bytes = new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', new Uint8Array([1, 2, 3, 4, 5])), ...chunk('IEND', new Uint8Array(0))]);
        expectCorrupt(bytes);
    });

    it('fewer pixel bytes than the header promises', () => {
        const ihdr = good().slice(16, 29);
        const short = new Uint8Array(deflateSync(new Uint8Array(10)));
        expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', short), ...chunk('IEND', new Uint8Array(0))]));
    });

    it('no IDAT at all', () => {
        const ihdr = good().slice(16, 29);
        expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IEND', new Uint8Array(0))]));
    });

    it('the first chunk is not IHDR', () => {
        expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IDAT', new Uint8Array(4)), ...chunk('IEND', new Uint8Array(0))]));
    });

    it('a palette image without a palette', () => {
        const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 3, 0, 0, 0]);
        const idat = new Uint8Array(deflateSync(new Uint8Array([0, 0])));
        expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array(0))]));
    });

    it('a palette index beyond the palette', () => {
        const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 3, 0, 0, 0]);
        const idat = new Uint8Array(deflateSync(new Uint8Array([0, 5])));
        expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('PLTE', new Uint8Array([1, 2, 3])), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array(0))]));
    });

    it('a filter type that does not exist', () => {
        const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
        const idat = new Uint8Array(deflateSync(new Uint8Array([9, 0, 0, 0, 0])));
        expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array(0))]));
    });

    it('zero width and zero height', () => {
        for (const dims of [[0, 4], [4, 0], [0, 0]] as const) {
            const ihdr = new Uint8Array([0, 0, 0, dims[0], 0, 0, 0, dims[1], 8, 6, 0, 0, 0]);
            expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', new Uint8Array(deflateSync(new Uint8Array(0)))), ...chunk('IEND', new Uint8Array(0))]));
        }
    });

    it('a colour type that does not exist', () => {
        for (const ct of [1, 5, 7]) {
            const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, ct, 0, 0, 0]);
            expectCorrupt(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', new Uint8Array(deflateSync(new Uint8Array(8)))), ...chunk('IEND', new Uint8Array(0))]));
        }
    });
});

describe('decodePng: valid but not supported by this tool (header still reported)', () => {
    it.each([0, 2, 4, 6] as const)('16 bits, colour type %i', colorType => {
        const r = decodePng(encodePng({ width: 4, height: 4, colorType, bitDepth: 16, pixel: () => [1, 2, 3, 4] }));
        expect(r.kind).toBe('unsupported');
        if (r.kind === 'unsupported') {
            expect(r.header).toMatchObject({ width: 4, height: 4, bitDepth: 16, colorType });
            expect(r.reason).toContain('16');
        }
    });

    it('interlaced (Adam7)', () => {
        const r = decodePng(encodePng({ width: 4, height: 4, colorType: 6, interlace: true, pixel: () => [1, 2, 3, 4] }));
        expect(r.kind).toBe('unsupported');
        if (r.kind === 'unsupported') {
            expect(r.header.interlace).toBe(1);
            expect(r.reason.toLowerCase()).toContain('interlac');
        }
    });

    it('a side above 4096 is refused before any pixel memory is requested', () => {
        const ihdr = new Uint8Array([0, 0, 16, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);   // 4097 x 1
        const r = decodePng(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', new Uint8Array(deflateSync(new Uint8Array(4)))), ...chunk('IEND', new Uint8Array(0))]));
        expect(r.kind).toBe('unsupported');
        if (r.kind === 'unsupported') expect(r.reason).toContain('4096');

        // The declared size is huge but the data is tiny: it must not allocate.
        const huge = new Uint8Array([0x7f, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 8, 6, 0, 0, 0]);
        const t0 = Date.now();
        expect(decodePng(new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', huge), ...chunk('IEND', new Uint8Array(0))])).kind).toBe('unsupported');
        expect(Date.now() - t0).toBeLessThan(500);
    });
});

describe('decodePng: ancillary chunks are ignored', () => {
    it('a text chunk before the data does not change the pixels', () => {
        const base = solidPng(4, 4, [9, 8, 7, 255]);
        const iend = base.length - 12;
        const withText = new Uint8Array([...base.subarray(0, iend), ...chunk('tEXt', new Uint8Array(100).fill(65)), ...base.subarray(iend)]);
        const a = decodePng(base), b = decodePng(withText);
        expect(a.kind).toBe('ok');
        expect(b.kind).toBe('ok');
        if (a.kind === 'ok' && b.kind === 'ok') expect(Array.from(b.rgba)).toEqual(Array.from(a.rgba));
    });
});

describe('decodePng: decompression is bounded by the header', () => {
    it('a tiny file whose image data inflates to 50 MB is refused as corrupt, quickly', () => {
        const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
        const bomb = new Uint8Array(deflateSync(new Uint8Array(50 * 1024 * 1024)));
        const bytes = new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('IDAT', bomb), ...chunk('IEND', new Uint8Array(0))]);
        const t0 = Date.now();
        expect(decodePng(bytes).kind).toBe('corrupt');
        expect(Date.now() - t0).toBeLessThan(1500);
    });
});

describe('decodePng: colour-key transparency (tRNS on grey and RGB)', () => {
    const grey = (g: number, trns: Uint8Array) => {
        const ihdr = new Uint8Array([0, 0, 0, 2, 0, 0, 0, 1, 8, 0, 0, 0, 0]);
        const idat = new Uint8Array(deflateSync(new Uint8Array([0, g, 9])));
        return new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('tRNS', trns), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array(0))]);
    };
    it('grey: the keyed value becomes transparent, the other pixel stays opaque', () => {
        const r = decodePng(grey(200, new Uint8Array([0, 200])));
        expect(r.kind).toBe('ok');
        if (r.kind === 'ok') expect(Array.from(r.rgba)).toEqual([200, 200, 200, 0, 9, 9, 9, 255]);
    });
    it('RGB: the keyed colour becomes transparent', () => {
        const ihdr = new Uint8Array([0, 0, 0, 2, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
        const idat = new Uint8Array(deflateSync(new Uint8Array([0, 1, 2, 3, 4, 5, 6])));
        const bytes = new Uint8Array([...PNG_SIGNATURE, ...chunk('IHDR', ihdr), ...chunk('tRNS', new Uint8Array([0, 1, 0, 2, 0, 3])), ...chunk('IDAT', idat), ...chunk('IEND', new Uint8Array(0))]);
        const r = decodePng(bytes);
        expect(r.kind).toBe('ok');
        if (r.kind === 'ok') expect(Array.from(r.rgba)).toEqual([1, 2, 3, 0, 4, 5, 6, 255]);
    });
});

/** Feature 004: the list of operations, history, presets, PNG writing, import and what Apply refuses. */
import { describe, expect, it } from 'vitest';
import { add, applyOp, checkpoint, create, defaultOp, evaluate, hasFlatBorder, opProblem, presetOutline, presetTeamsColour, redo, remove, reset, SAFE_AREA_SHARE, undo, update, withSource } from '../src/services/image/pipeline';
import { acceptResult, toTarget } from '../src/services/image/accept';
import { encodePng } from '../src/services/image/pngWrite';
import { fromPng, importImage, reduceTo, sniff, type HostDecoder } from '../src/services/image/import';
import { decodePng } from '../src/services/png';
import { HISTORY_MAX, type Op, type Picture } from '../src/services/image/types';
import * as O from './helpers/image-oracle';
import { encodePng as helperEncode } from './helpers/png-encoder';
import { cases, rng } from './helpers/combinatorics';

const pic = (p: O.Pic): Picture => O.fromPic(p);
const RED: [number, number, number, number] = [200, 30, 30, 255];
const eq = (a: Picture, b: Picture): boolean => a.width === b.width && a.height === b.height && a.data.every((v, i) => v === b.data[i]);

/** A red square glyph on white, not square overall: 60 x 40. */
const logoOnWhite = (): Picture => pic(O.make(60, 40, (x, y) => (x >= 15 && x < 45 && y >= 8 && y < 32 ? RED : [255, 255, 255, 255])));

const OPS: Op[] = [
    { kind: 'removeBg', mode: 'edges', colour: null, tolerance: 10, softness: 0, matte: 0 },
    { kind: 'trim', tolerance: 2 },
    { kind: 'rotate', quarters: 1 },
    { kind: 'flip', axis: 'h' },
    { kind: 'square', fill: null },
    { kind: 'solid', colour: { r: 1, g: 2, b: 3 } },
];

describe('evaluate', () => {
    it('is the source with the operations applied in order', () => {
        const source = logoOnWhite();
        const folded = OPS.reduce((p, op) => applyOp(p, op), source);
        const got = evaluate(source, OPS);
        expect(eq(got.picture, folded)).toBe(true);
        expect(got.steps).toHaveLength(OPS.length + 1);
        expect(got.steps[0]).toBe(source);
        expect(got.problems).toEqual(OPS.map(() => null));
    });

    it('with no operations the result is the source itself', () => {
        const source = logoOnWhite();
        expect(evaluate(source, []).picture).toBe(source);
    });

    it('order matters', () => {
        const source = logoOnWhite();
        expect(eq(evaluate(source, [{ kind: 'removeBg', mode: 'everywhere', colour: null, tolerance: 5, softness: 0, matte: 0 }, { kind: 'trim', tolerance: 0 }]).picture,
            evaluate(source, [{ kind: 'trim', tolerance: 0 }, { kind: 'removeBg', mode: 'everywhere', colour: null, tolerance: 5, softness: 0, matte: 0 }]).picture)).toBe(false);
    });

    it('a crop that no longer fits is skipped, said, and does not stop the others', () => {
        const source = logoOnWhite();
        const ops: Op[] = [{ kind: 'crop', x: 0, y: 0, w: 10, h: 10 }, { kind: 'crop', x: 5, y: 5, w: 20, h: 20 }, { kind: 'flip', axis: 'v' }];
        const got = evaluate(source, ops);
        expect(got.problems[0]).toBeNull();
        expect(got.problems[1]).toMatch(/outside/);
        expect(got.picture.width).toBe(10);
        expect(opProblem(source, ops[1]!)).toBeNull();   // it would fit the source, not the cropped picture
    });
});

describe('history', () => {
    it('add, undo and redo walk through the steps', () => {
        const source = logoOnWhite();
        let pl = create(source);
        const snapshots: Op[][] = [pl.ops];
        for (const op of OPS) { pl = add(pl, op); snapshots.push(pl.ops); }
        for (let i = OPS.length; i > 0; i--) {
            pl = undo(pl);
            expect(pl.ops).toEqual(snapshots[i - 1]);
            expect(eq(evaluate(source, pl.ops).picture, evaluate(source, snapshots[i - 1]!).picture)).toBe(true);
        }
        expect(undo(pl)).toBe(pl);
        for (let i = 1; i <= OPS.length; i++) { pl = redo(pl); expect(pl.ops).toEqual(snapshots[i]); }
        expect(redo(pl)).toBe(pl);
    });

    it('a new change after an undo drops the redo steps', () => {
        let pl = add(add(create(logoOnWhite()), OPS[0]!), OPS[1]!);
        pl = undo(pl);
        pl = add(pl, OPS[2]!);
        expect(pl.redoStack).toEqual([]);
        expect(pl.ops.map(o => o.kind)).toEqual(['removeBg', 'rotate']);
    });

    it('removing a step in the middle equals applying the others in order', () => {
        const source = logoOnWhite();
        let pl = create(source);
        for (const op of OPS) pl = add(pl, op);
        const removed = remove(pl, 2);
        expect(removed.ops).toEqual(OPS.filter((_, i) => i !== 2));
        expect(eq(evaluate(source, removed.ops).picture, OPS.filter((_, i) => i !== 2).reduce((p, op) => applyOp(p, op), source))).toBe(true);
        expect(undo(removed).ops).toEqual(OPS);
    });

    it('update replaces one step and can be undone', () => {
        let pl = add(add(create(logoOnWhite()), OPS[0]!), OPS[1]!);
        const next = update(pl, 0, { ...OPS[0]!, tolerance: 40 } as Op);
        expect((next.ops[0] as { tolerance: number }).tolerance).toBe(40);
        expect(undo(next).ops).toEqual(pl.ops);
        pl = next;
        expect(update(pl, 9, OPS[2]!)).toBe(pl);
        expect(remove(pl, 9)).toBe(pl);
        expect(remove(pl, -1)).toBe(pl);
    });

    it('many small changes of one slider are one step when a checkpoint came first', () => {
        let pl = add(create(logoOnWhite()), OPS[0]!);
        pl = checkpoint(pl);
        for (const t of [11, 12, 13, 14, 15]) pl = update(pl, 0, { ...OPS[0]!, tolerance: t } as Op, false);
        expect(pl.undoStack).toHaveLength(2);   // the first add, and the checkpoint
        pl = undo(pl);
        expect((pl.ops[0] as { tolerance: number }).tolerance).toBe(10);
    });

    it('keeps at most 50 steps, dropping the oldest', () => {
        let pl = create(logoOnWhite());
        for (let i = 0; i < HISTORY_MAX + 20; i++) pl = add(pl, { kind: 'flip', axis: 'h' });
        expect(pl.undoStack).toHaveLength(HISTORY_MAX);
        for (let i = 0; i < HISTORY_MAX; i++) pl = undo(pl);
        expect(pl.ops).toHaveLength(20);
        expect(undo(pl)).toBe(pl);
    });

    it('reset empties the list and can be undone; resetting an empty list does nothing', () => {
        const empty = create(logoOnWhite());
        expect(reset(empty)).toBe(empty);
        const pl = add(add(empty, OPS[0]!), OPS[1]!);
        const r = reset(pl);
        expect(r.ops).toEqual([]);
        expect(undo(r).ops).toEqual(pl.ops);
    });

    it('a new source keeps the operations', () => {
        const pl = add(create(logoOnWhite()), OPS[1]!);
        const other = pic(O.make(5, 5, () => RED));
        const moved = withSource(pl, other);
        expect(moved.source).toBe(other);
        expect(moved.ops).toEqual(pl.ops);
    });

    it('random walks always match a fresh evaluation', () => {
        const next = rng(7);
        const source = logoOnWhite();
        let pl = create(source);
        for (let n = 0; n < 60; n++) {
            const r = next();
            if (r < 0.5) pl = add(pl, OPS[Math.floor(next() * OPS.length)]!);
            else if (r < 0.65) pl = undo(pl);
            else if (r < 0.8) pl = redo(pl);
            else if (r < 0.9) pl = remove(pl, Math.floor(next() * (pl.ops.length + 1)));
            else pl = update(pl, Math.floor(next() * (pl.ops.length + 1)), OPS[Math.floor(next() * OPS.length)]!);
            const fresh = pl.ops.reduce((p, op) => applyOp(p, op), source);
            expect(eq(evaluate(source, pl.ops).picture, fresh)).toBe(true);
        }
    });
});

describe('presets', () => {
    it('Teams colour: remove the edge background, trim, square, fit in the safe area', () => {
        const ops = presetTeamsColour(logoOnWhite());
        expect(ops.map(o => o.kind)).toEqual(['removeBg', 'trim', 'square', 'fit']);
        const out = evaluate(logoOnWhite(), ops).picture;
        expect([out.width, out.height]).toEqual([192, 192]);
        // corners transparent, the glyph is inside the central 120 x 120
        expect(out.data[3]).toBe(0);
        let minX = 192, maxX = -1, minY = 192, maxY = -1;
        for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) if (out.data[(y * 192 + x) * 4 + 3]! > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        expect(minX).toBeGreaterThanOrEqual(36); expect(maxX).toBeLessThanOrEqual(155);
        expect(minY).toBeGreaterThanOrEqual(36); expect(maxY).toBeLessThanOrEqual(155);
        // the glyph keeps its colour
        expect(Array.from(out.data.slice((96 * 192 + 96) * 4, (96 * 192 + 96) * 4 + 4))).toEqual(RED);
    });

    it('Teams colour: no background removal when the picture already has transparency or no flat border', () => {
        const transparent = pic(O.make(30, 30, (x, y) => (x > 5 && x < 20 && y > 5 && y < 20 ? RED : [0, 0, 0, 0])));
        expect(presetTeamsColour(transparent).map(o => o.kind)).toEqual(['trim', 'square', 'fit']);
        const gradient = pic(O.make(20, 20, (x, y) => [x * 12, y * 12, 100, 255]));
        expect(hasFlatBorder(gradient)).toBe(false);
        expect(hasFlatBorder(logoOnWhite())).toBe(true);
    });

    it('Teams colour fits the safe area share', () => {
        const fitOp = presetTeamsColour(logoOnWhite()).find(o => o.kind === 'fit')!;
        expect(fitOp).toEqual({ kind: 'fit', target: 192, share: SAFE_AREA_SHARE });
        expect(SAFE_AREA_SHARE * 192 / 100).toBe(120);
    });

    it('Outline: a white silhouette at 32 x 32', () => {
        const source = pic(O.make(40, 30, (x, y) => (x >= 5 && x < 35 && y >= 5 && y < 25 ? RED : [0, 0, 0, 0])));
        const ops = presetOutline(source);
        expect(ops.map(o => o.kind)).toEqual(['outline', 'trim', 'square', 'fit']);
        expect(ops[0]).toMatchObject({ mode: 'alpha' });
        const out = evaluate(source, ops).picture;
        expect([out.width, out.height]).toEqual([32, 32]);
        for (let i = 0; i < out.data.length; i += 4) if (out.data[i + 3]! > 0) expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual([255, 255, 255]);
        expect(out.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    });

    it('Outline on a picture without transparency uses the brightness mode', () => {
        const ops = presetOutline(pic(O.make(10, 10, (x) => (x < 5 ? [0, 0, 0, 255] : [255, 255, 255, 255]))));
        expect(ops[0]).toMatchObject({ kind: 'outline', mode: 'brightness' });
    });

    it('defaults do something sensible for every kind', () => {
        const p = logoOnWhite();
        for (const kind of ['removeBg', 'trim', 'crop', 'square', 'fit', 'resize', 'rotate', 'flip', 'fill', 'solid', 'tone', 'outline'] as const) {
            const op = defaultOp(kind, p, 192);
            expect(op.kind).toBe(kind);
            expect(opProblem(p, op)).toBeNull();
            expect(() => applyOp(p, op)).not.toThrow();
        }
        expect(defaultOp('fit', p, 32)).toMatchObject({ share: 100 });
    });
});

// ── PNG writer ────────────────────────────────────────────────────────────────

describe('PNG writer', () => {
    const random = (w: number, h: number, seed: number, alpha: 'mixed' | 'opaque' | 'clear'): Picture => {
        const next = rng(seed);
        return pic(O.make(w, h, () => [Math.floor(next() * 256), Math.floor(next() * 256), Math.floor(next() * 256), alpha === 'opaque' ? 255 : alpha === 'clear' ? 0 : Math.floor(next() * 256)]));
    };
    const sizes: Array<[number, number]> = [[1, 1], [1, 7], [7, 1], [2, 2], [32, 32], [100, 37], [192, 192], [255, 3], [513, 2]];
    const all = cases<[[number, number], 'mixed' | 'opaque' | 'clear']>([sizes, ['mixed', 'opaque', 'clear']]);
    for (const [[w, h], alpha] of all) {
        it(`${w} x ${h} / ${alpha}: read back by the tool's reader and by an independent reader`, () => {
            const p = random(w, h, w * 1000 + h, alpha);
            const bytes = encodePng(p);
            const own = decodePng(bytes);
            expect(own.kind).toBe('ok');
            if (own.kind === 'ok') {
                expect([own.header.width, own.header.height, own.header.bitDepth, own.header.colorType, own.header.interlace]).toEqual([w, h, 8, 6, 0]);
                expect(Array.from(own.rgba)).toEqual(Array.from(p.data));
            }
            const other = O.readPng(bytes);   // also verifies the checksum of every chunk and the zlib stream
            expect(Array.from(other.data)).toEqual(Array.from(p.data));
            expect(other.chunks).toEqual(['IHDR', 'IDAT', 'IEND']);
            expect(other.header.slice(2, 7)).toEqual([8, 6, 0, 0, 0]);
        });
    }

    it('a flat picture is small, and structured pictures use the filters', () => {
        const flat = encodePng(pic(O.make(192, 192, () => RED)));
        expect(flat.length).toBeLessThan(1000);
        const ramp = encodePng(pic(O.make(192, 192, (x, y) => [x, y, x + y & 255, 255])));
        const rampRaw = 192 * 192 * 4;
        expect(ramp.length).toBeLessThan(rampRaw / 4);
    });

    it('the picture can be read by the helper encoder\'s reader: same pixels as an encoder that shares no code', () => {
        const spec = { width: 8, height: 6, colorType: 6 as const, pixel: (x: number, y: number): [number, number, number, number] => [x * 30, y * 40, 7, 255 - x * 10] };
        const theirs = helperEncode(spec);
        const p = O.readPng(theirs);
        const ours = O.readPng(encodePng({ width: 8, height: 6, data: p.data }));
        expect(Array.from(ours.data)).toEqual(Array.from(p.data));
    });
});

// ── import and accept ─────────────────────────────────────────────────────────

describe('import', () => {
    const png = (w: number, h: number): Uint8Array => encodePng(pic(O.make(w, h, (x) => [x % 256, 20, 30, 255])));

    it('sniffs the format from the bytes, not the name', () => {
        expect(sniff(png(2, 2))).toBe('png');
        expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
        expect(sniff(new TextEncoder().encode('GIF89a....'))).toBe('gif');
        expect(sniff(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
        expect(sniff(new TextEncoder().encode('  <?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe('svg');
        expect(sniff(new TextEncoder().encode('<svg width="1"/>'))).toBe('svg');
        expect(sniff(new TextEncoder().encode('hello'))).toBeNull();
        expect(sniff(new Uint8Array(0))).toBeNull();
    });

    it('reads a PNG with its own reader and does not call the window decoder', async () => {
        let called = 0;
        const decoder: HostDecoder = async () => { called++; return null; };
        const r = await importImage(png(20, 10), decoder);
        expect(r.ok).toBe(true);
        if (r.ok) { expect([r.picture.width, r.picture.height]).toEqual([20, 10]); expect(r.note).toBeNull(); }
        expect(called).toBe(0);
    });

    it('reduces a picture above 1024 pixels and says so', async () => {
        const r = await importImage(png(2000, 500), null);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect([r.picture.width, r.picture.height]).toEqual([1024, 256]);
            expect(r.note).toContain('2000 x 500');
            expect(r.note).toContain('1024 x 256');
        }
        expect(reduceTo({ width: 10, height: 10, data: new Uint8Array(400) }, 10).reduced).toBe(false);
    });

    it('refuses what it cannot read, naming the cause', async () => {
        expect((await importImage(new TextEncoder().encode('plain text'), null))).toMatchObject({ ok: false });
        const damaged = png(8, 8).slice(0, 30);
        const r = await importImage(damaged, null);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.message).toMatch(/damaged/);
        const big = await importImage(new Uint8Array(6 * 1024 * 1024).fill(0), null);
        expect(big.ok).toBe(false);
        if (!big.ok) expect(big.message).toContain('5 MB');
        const jpeg = await importImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]), null);
        expect(jpeg.ok).toBe(false);
        if (!jpeg.ok) expect(jpeg.message).toMatch(/JPEG.*cannot|cannot read JPEG/i);
    });

    it('reads other formats through the window decoder, and says when it could not', async () => {
        const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
        const good: HostDecoder = async (_b, mime) => { expect(mime).toBe('image/jpeg'); return pic(O.make(6, 4, () => RED)); };
        const r = await importImage(jpeg, good);
        expect(r.ok).toBe(true);
        if (r.ok) { expect(r.picture.width).toBe(6); expect(r.note).toContain('JPEG'); }
        for (const decoder of [async () => null, async () => { throw new Error('boom'); }] as HostDecoder[]) {
            const bad = await importImage(jpeg, decoder);
            expect(bad.ok).toBe(false);
            if (!bad.ok) expect(bad.message).toContain('JPEG');
        }
    });

    it('fromPng names an unsupported PNG so that the window decoder can try', () => {
        const sixteen = helperEncode({ width: 2, height: 2, colorType: 6, pixel: () => [1, 2, 3, 255], bitDepth: 16 } as never);
        const r = fromPng(sixteen);
        expect(r.ok === 'unsupported' || r.ok === true).toBe(true);
    });
});

describe('what Apply does', () => {
    it('brings a square picture to the exact size and a rectangle in without stretching', () => {
        const s = toTarget(pic(O.make(50, 50, () => RED)), 192);
        expect([s.width, s.height]).toEqual([192, 192]);
        const r = toTarget(pic(O.make(100, 50, () => RED)), 32);
        expect([r.width, r.height]).toEqual([32, 32]);
        expect(r.data[3]).toBe(0);                              // the padded top row is transparent
        expect(r.data[(16 * 32 + 16) * 4 + 3]).toBe(255);
    });

    it('gives a PNG that reads back as the resized picture', () => {
        const p = pic(O.make(80, 80, (x, y) => (x > 20 && y > 20 ? RED : [0, 0, 0, 0])));
        const r = acceptResult(p, 192);
        expect(r.ok).toBe(true);
        if (r.ok) {
            const back = O.readPng(r.bytes);
            expect([back.width, back.height]).toEqual([192, 192]);
            expect(Array.from(back.data)).toEqual(Array.from(r.picture.data));
        }
    });

    it('refuses a fully transparent picture, and a PNG over 100 KB, with the reason', () => {
        const empty = acceptResult(pic(O.make(10, 10, () => [9, 9, 9, 0])), 32);
        expect(empty.ok).toBe(false);
        if (!empty.ok) expect(empty.message).toContain('fully transparent');
        const next = rng(3);
        const noise = pic(O.make(192, 192, () => [Math.floor(next() * 256), Math.floor(next() * 256), Math.floor(next() * 256), 255]));
        const heavy = acceptResult(noise, 192);
        expect(heavy.ok).toBe(false);
        if (!heavy.ok) expect(heavy.message).toMatch(/KB.*at most 100 KB/);
    });
});

describe('speed (SC-006)', () => {
    it('the usual steps on a 1024 x 1024 picture are computed in under a second', () => {
        const big = pic(O.make(1024, 1024, (x, y) => (x > 200 && x < 800 && y > 250 && y < 750 ? RED : [255, 255, 255, 255])));
        const ops = presetTeamsColour(big);
        const started = performance.now();
        const out = evaluate(big, ops).picture;
        const took = performance.now() - started;
        expect([out.width, out.height]).toEqual([192, 192]);
        expect(took).toBeLessThan(1000);
    });
});

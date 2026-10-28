/**
 * The size check must happen BEFORE anything is inflated (zip bomb). The outcome alone cannot tell
 * the difference, so this test watches how the zip library is called: the first pass reads the
 * directory with a filter that accepts nothing, and a refused package never gets a second pass.
 */
import { describe, expect, it, vi } from 'vitest';

const passes: boolean[][] = [];

vi.mock('fflate', async importOriginal => {
    const real = await importOriginal<typeof import('fflate')>();
    return {
        ...real,
        unzipSync: (data: Uint8Array, opts?: { filter?: (f: { name: string; originalSize: number }) => boolean }) => {
            const answers: boolean[] = [];
            passes.push(answers);
            const filter = opts?.filter;
            return real.unzipSync(data, filter
                ? { ...opts, filter: (f: { name: string; originalSize: number }) => { const r = filter(f); answers.push(r); return r; } } as never
                : opts as never);
        },
    };
});

const { readPackage } = await import('../src/services/zip');
const { deflatedZip, declareSize } = await import('./helpers/zip-builder');
const { packageBytes } = await import('./helpers/fixture');

describe('readPackage inflates nothing until the directory has been checked', () => {
    it('a package refused for its size is read once, with a filter that accepts no entry', () => {
        passes.length = 0;
        const bomb = declareSize(deflatedZip([
            { name: 'manifest.json', data: new TextEncoder().encode('{}') },
            { name: 'big.bin', data: new Uint8Array(100) },
        ]), 'big.bin', 0xfffffff0);
        const r = readPackage(bomb, 'a.zip');
        expect(r.ok).toBe(false);
        expect(passes).toHaveLength(1);
        expect(passes[0]!.length).toBeGreaterThan(0);
        expect(passes[0]!.every(answer => answer === false)).toBe(true);
    });

    it('a valid package is read twice: the directory first, then the content', () => {
        passes.length = 0;
        expect(readPackage(packageBytes(), 'a.zip').ok).toBe(true);
        expect(passes).toHaveLength(2);
        expect(passes[0]!.every(answer => answer === false)).toBe(true);
    });
});

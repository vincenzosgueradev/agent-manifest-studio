/**
 * Matrix helpers (Testing Standard 1). By default the run uses every pair of values plus a seeded
 * random sample; `TEST_FULL=1` (npm run test:full) runs the whole cartesian product.
 */

export const FULL = process.env.TEST_FULL === '1';

/** Cartesian product of the dimensions. */
export function product<T extends unknown[]>(...dims: { [K in keyof T]: T[K][] }): T[] {
    let acc: unknown[][] = [[]];
    for (const dim of dims as unknown[][][]) acc = acc.flatMap(prefix => dim.map(v => [...prefix, v]));
    return acc as T[];
}

/** Deterministic generator (mulberry32). */
export function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The cases to run: all of them when `FULL` or when the product is at most `limit`; otherwise
 * every pair of values (greedy cover) plus `samples` seeded random cases.
 */
export function cases<T extends unknown[]>(dims: { [K in keyof T]: T[K][] }, limit = 2000, samples = 300, seed = 1): T[] {
    const all = product<T>(...dims);
    if (FULL || all.length <= limit) return all;
    const d = dims as unknown[][];
    const chosen = new Map<number, T>();
    const covered = new Set<string>();
    const key = (i: number, vi: number, j: number, vj: number) => `${i}:${vi}|${j}:${vj}`;
    for (let n = 0; n < all.length; n++) {
        const idx = all[n] as unknown as unknown[];
        const vis = idx.map((v, i) => d[i]!.indexOf(v));
        let fresh = false;
        for (let i = 0; i < vis.length && !fresh; i++) {
            for (let j = i + 1; j < vis.length; j++) {
                if (!covered.has(key(i, vis[i]!, j, vis[j]!))) { fresh = true; break; }
            }
        }
        if (!fresh) continue;
        for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) covered.add(key(i, vis[i]!, j, vis[j]!));
        chosen.set(n, all[n]!);
    }
    const next = rng(seed);
    for (let s = 0; s < samples; s++) {
        const n = Math.floor(next() * all.length);
        chosen.set(n, all[n]!);
    }
    return [...chosen.values()];
}

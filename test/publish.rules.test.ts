import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8');

describe('marketplace review rules', () => {
    it('declares that the tool needs no connection', () => {
        const pkg = JSON.parse(read('package.json'));
        expect(pkg.features).toEqual({ connections: 0, minAPI: '1.2.7' });
        expect(pkg.multiConnection).toBeUndefined();
        expect(pkg.connectionRequirement).toBeUndefined();
    });

    it('README links and images are all full URLs (the page is rendered away from the repository)', () => {
        const targets = [...read('README.md').matchAll(/\]\(([^)\s]+)/g)].map((m) => m[1]);
        expect(targets.length).toBeGreaterThan(0);
        for (const t of targets) expect(t.startsWith('https://') || t.startsWith('#'), t).toBe(true);
    });

    it('README links the security policy by its full URL', () => {
        expect(read('README.md')).toContain('](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/SECURITY.md)');
    });

    it('the newest README update entry is the package version', () => {
        const pkg = JSON.parse(read('package.json'));
        const updates = read('README.md').split(/^## Updates/m)[1] ?? '';
        const first = updates.match(/^### (\S+) - (\d{4}-\d{2}-\d{2})/m);
        expect(first?.[1]).toBe(pkg.version);
    });

    it('the icon path is relative to the dist folder, not prefixed with it (PPTB would look in dist/dist)', () => {
        const pkg = JSON.parse(read('package.json'));
        expect(pkg.icon).not.toMatch(/^(\.\/|\/|dist\/)/);
        expect(pkg.icon).toMatch(/\.svg$/);
    });

    it('the icon file is shipped at that path inside dist (Vite copies src/public into dist)', () => {
        const pkg = JSON.parse(read('package.json'));
        expect(existsSync(resolve(process.cwd(), 'src/public', pkg.icon))).toBe(true);
    });
});

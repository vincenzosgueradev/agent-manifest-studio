// @vitest-environment jsdom
/**
 * Constitution Principle II: the tool works on a Teams app package file and never on an environment. It does not
 * call the network and does not use the host's environment APIs (Dataverse, Power Platform, connections) at all.
 * Two guards:
 *   1. any network primitive called while the tool runs fails the test;
 *   2. the sources contain nothing that writes, calls the network or names an environment API.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { boot, flush } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

afterEach(() => { vi.unstubAllGlobals(); });

const click = async (id: string) => { document.getElementById(id)!.click(); await flush(6); };

/** A whole session: open a file, edit, export, report, remove. */
async function fullRun() {
    const ui = await boot();
    await ui.open('a.zip', packageBytes());
    await ui.type('suffix-input', 'UAT');
    await click('export-btn');
    await click('save-report-btn');
    await click('remove-btn');
    return ui;
}

describe('running the tool never touches the network by itself', () => {
    it('a whole session calls no network primitive', async () => {
        const calls: string[] = [];
        const trap = (name: string) => function trapped() { calls.push(name); throw new Error(`network call: ${name}`); };
        vi.stubGlobal('fetch', trap('fetch'));
        vi.stubGlobal('XMLHttpRequest', trap('XMLHttpRequest'));
        vi.stubGlobal('WebSocket', trap('WebSocket'));
        vi.stubGlobal('EventSource', trap('EventSource'));
        Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: trap('sendBeacon') });

        const ui = await fullRun();
        expect(ui.fakes.saved.length).toBeGreaterThan(0);   // the run really got to the end
        expect(calls).toEqual([]);
    });
});

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? walk(p) : [p];
    });
}

describe('the sources contain nothing that writes, calls the network or names an environment API', () => {
    const root = resolve(process.cwd(), 'src');
    const files = walk(root).filter(f => /\.(ts|html|css)$/.test(f));
    const rel = (f: string) => relative(root, f).replace(/\\/g, '/');

    it('there are source files to scan', () => {
        expect(files.length).toBeGreaterThan(15);
    });

    const forbiddenEverywhere: Array<[string, RegExp]> = [
        ['fetch', /\bfetch\s*\(/],
        ['XMLHttpRequest', /XMLHttpRequest/],
        ['WebSocket', /WebSocket/],
        ['EventSource', /EventSource/],
        ['sendBeacon', /sendBeacon/],
        ['dynamic import', /\bimport\s*\(/],
        ['a write method of the Power Platform API client', /\.(Post|Put|Patch|Delete)\s*\(/],
        ['a write method of the Dataverse client', /\.(create|update|delete|upsert|associate|disassociate|batch|execute|createMultiple|updateMultiple)\s*\(/],
        ['an HTTP method other than GET', /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i],
        ['an operation of type action', /operationType\s*:\s*['"]action['"]/],
        ['external script or style', /<(script|link)[^>]+(src|href)=["']https?:/i],
        ['remote url in markup', /(src|href)=["']https?:/i],
    ];
    it.each(forbiddenEverywhere)('no %s anywhere', (_name, pattern) => {
        for (const f of files) expect(readFileSync(f, 'utf8'), rel(f)).not.toMatch(pattern);
    });

    it.each(['dataverseAPI', 'powerplatformAPI', 'getActiveConnection', 'toolboxAPI.connections'])('%s appears nowhere', name => {
        for (const f of files) expect(readFileSync(f, 'utf8'), rel(f)).not.toContain(name);
    });
});

describe('the package declares no connection and no API of an environment (Principle II)', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    it('has no features block: it needs no connection', () => {
        expect(pkg.features).toBeUndefined();
    });
    it('has no runtime dependency except fflate, pinned', () => {
        expect(pkg.dependencies).toEqual({ fflate: '0.8.3' });
    });
    it('shows its own version, read from package.json at build time', () => {
        const vite = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
        expect(vite).toContain('__APP_VERSION__');
        expect(vite).toContain('package.json');
    });
});

describe('the README says that the tool works on a file and writes to no environment', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
    const section = readme.slice(readme.indexOf('## What this tool changes'), readme.indexOf('## What it does not cover'));
    it('has the section the marketplace asks for', () => {
        expect(readme).toContain('## What this tool changes');
    });
    it('says that nothing is read from or written to any environment', () => {
        expect(section).toContain('Nothing is read from or written to any environment');
    });
    it('says that images are edited locally and never uploaded', () => {
        expect(section).toContain('image editor');
        expect(section.toLowerCase()).toContain('never uploaded');
    });
    it('says that the package differs only in what the user edited, and not that only the names change', () => {
        expect(section).toContain('only in what you edited');
        expect(section).toContain('Changes table');
        expect(section).not.toMatch(/only the values of `name\.short`/);
        expect(section).not.toMatch(/only the two names/i);
    });
});

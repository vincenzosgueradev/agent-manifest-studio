// @vitest-environment node
/** Every check that can fail says how to put it right (the user asked: no problem without a way out). */
import { describe, expect, it } from 'vitest';
import { FIXES, fixFor, STEP_NAME } from '../src/services/fixes';
import { runChecks } from '../src/services/checks';
import { readPackage } from '../src/services/zip';
import { decodeManifest, parseManifest } from '../src/services/manifest';
import { loadIcons } from '../src/services/iconset';
import { packageBytes, colorIcon, type PackageOpts } from './helpers/fixture';
import { padPngTo, solidPng } from './helpers/png-encoder';

function ids(opts: PackageOpts): string[] {
    const read = readPackage(packageBytes(opts), 'x.zip');
    if (!read.ok) throw new Error(read.code);
    const parsed = parseManifest(decodeManifest(read.pkg.entries.find(e => e.path === 'manifest.json')!.data)!);
    if (!parsed.ok) throw new Error(parsed.code);
    return runChecks(parsed.manifest, loadIcons(read.pkg, parsed.manifest)).map(c => c.id);
}

describe('how to fix each check', () => {
    // packages chosen so that every check the tool has is produced at least once
    const variants: PackageOpts[] = [
        {},
        { manifest: { color32Path: 'c32.png' } },
        { color: null, outline: null },
        { color: new Uint8Array([1, 2, 3]) },
        { color: solidPng(100, 100, [1, 2, 3, 255]) },
        { color: padPngTo(colorIcon(), 80 * 1024), manifest: { nameShort: 'x'.repeat(31), nameFull: 'x'.repeat(31), descShort: 'x'.repeat(81) } },
        { manifest: { accent: 'red', descFull: null, descShort: null } },
    ];

    it('every id that the checks can produce has a way out', () => {
        const all = new Set(variants.flatMap(ids));
        expect(all.size).toBeGreaterThan(15);
        for (const id of all) expect(fixFor(id), id).not.toBeNull();
    });

    it('there is no answer for a check that does not exist', () => {
        const all = new Set(variants.flatMap(ids));
        for (const id of Object.keys(FIXES)) expect(all.has(id) || id.startsWith('color32.') || id === 'color.contrast', id).toBe(true);
    });

    it('each answer names a control and tells what to do, and its step is Details, Look or outside the tool', () => {
        for (const [id, fix] of Object.entries(FIXES)) {
            expect(fix.text.length, id).toBeGreaterThan(40);
            expect([2, 3, null], id).toContain(fix.step);
            if (fix.step !== null) expect(fix.text, id).toMatch(/Details|Look|card|Colour icon|Outline icon/);
        }
        expect(STEP_NAME[2]).toBe('Details');
        expect(STEP_NAME[3]).toBe('Look');
    });

    it('the name and description checks lead to Details, the icon and colour checks to Look', () => {
        for (const id of ['name.short.length', 'name.full.length', 'name.distinct', 'description.short.length', 'description.full.length']) expect(fixFor(id)!.step, id).toBe(2);
        for (const id of ['color.safe-area', 'color.size-px', 'outline.white', 'accent.hex', 'color.contrast']) expect(fixFor(id)!.step, id).toBe(3);
    });
});

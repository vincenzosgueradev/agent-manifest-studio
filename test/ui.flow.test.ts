// @vitest-environment jsdom
/**
 * The real page and the real app.ts in jsdom. Only the PPTB file API and the canvas are replaced.
 * What jsdom cannot show (real pixels, the native dialogs) is in quickstart.md as a manual check.
 */
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';
import { rawZip } from './helpers/zip-builder';
import { buildManifest } from './helpers/manifest-builder';

const enc = new TextEncoder();

describe('load: a valid package', () => {
    it('starts empty and explains what a package is', async () => {
        const ui = await boot();
        expect(ui.$('summary').hidden).toBe(true);
        expect(ui.text('drop-text')).toContain('Teams app package');
        expect(ui.$('app-version').textContent).toBe('v0.0.0-test');
    });

    it('fills the summary with every item of the manifest', async () => {
        const ui = await boot();
        await ui.open('agent.zip', packageBytes({ manifest: { permissions: ['identity'], validDomains: ['contoso.com'], botIds: ['bot-1'] } }));
        expect(ui.$('summary').hidden).toBe(false);
        expect(ui.text('file-name')).toBe('agent.zip');
        const t = ui.text('summary');
        for (const expected of [
            '1.0.0', '1.19', '11111111-2222-3333-4444-555555555555', 'bot-1', 'Answers sales questions',
            'Contoso', 'https://example.com/privacy', '#07687d', 'color.png', 'outline.png', 'identity', 'contoso.com',
        ]) expect(t, expected).toContain(expected);
        expect(ui.$('load-message').hidden).toBe(true);
    });

    it('says "not declared" and "none" in words, never a blank', async () => {
        const ui = await boot();
        await ui.open('agent.zip', packageBytes());
        const t = ui.text('summary');
        expect(t).toContain('not declared');   // small colour icon, permissions
        expect(t).toContain('Not recognised');
        expect(t).toContain('none');
    });

    it('names unknown and missing entries', async () => {
        const ui = await boot();
        await ui.open('agent.zip', packageBytes({ manifest: { unknownAfter: { zebra: 1 }, omit: ['accentColor', 'icons.outline'] }, outline: null }));
        const t = ui.text('summary');
        expect(t).toContain('zebra');
        expect(t).toContain('accentColor');
        expect(t).toContain('icons.outline');
        expect(t).toContain('missing');
    });

    it('says when a declared icon is not in the package', async () => {
        const ui = await boot();
        await ui.open('agent.zip', packageBytes({ outline: null }));
        expect(ui.text('summary')).toContain('declared, but not in the package');
    });
});

describe('load: refusals', () => {
    const refusals: Array<[string, Uint8Array, string]> = [
        ['not a zip', enc.encode('hello'), 'not a valid zip'],
        ['no manifest', rawZip([{ name: 'color.png', data: new Uint8Array(3) }]), 'no manifest.json'],
        ['manifest in a sub-folder', rawZip([{ name: 'app/manifest.json', data: enc.encode('{}') }]), 'inside the folder'],
        ['manifest not JSON', rawZip([{ name: 'manifest.json', data: enc.encode('not json') }]), 'not valid JSON'],
        ['manifest not an object', rawZip([{ name: 'manifest.json', data: enc.encode('[]') }]), 'JSON object'],
        ['manifest not UTF-8', rawZip([{ name: 'manifest.json', data: new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]) }]), 'UTF-8'],
        ['unsafe path', rawZip([{ name: 'manifest.json', data: enc.encode('{}') }, { name: '../x', data: new Uint8Array(1) }]), 'unsafe path'],
    ];
    it.each(refusals)('%s', async (_name, bytes, fragment) => {
        const ui = await boot();
        await ui.open('bad.zip', bytes);
        expect(ui.$('load-message').hidden).toBe(false);
        expect(ui.text('load-message')).toContain('bad.zip');
        expect(ui.text('load-message')).toContain(fragment);
        expect(ui.$('summary').hidden).toBe(true);   // nothing shown as if it had been read
    });

    it('a refused file keeps the previous package on screen', async () => {
        const ui = await boot();
        await ui.open('good.zip', packageBytes());
        await ui.open('bad.zip', enc.encode('nope'));
        expect(ui.$('summary').hidden).toBe(false);
        expect(ui.text('file-name')).toBe('good.zip');
        expect(ui.text('load-message')).toContain('bad.zip');
        await ui.open('good2.zip', packageBytes({ manifest: { appVersion: '2.5.0' } }));
        expect(ui.$('load-message').hidden).toBe(true);
        expect(ui.text('summary')).toContain('2.5.0');
    });

    it('loading another valid package replaces everything', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { appVersion: '1.1.1' } }));
        await ui.open('b.zip', packageBytes({ manifest: { appVersion: '9.9.9' } }));
        expect(ui.text('summary')).toContain('9.9.9');
        expect(ui.text('summary')).not.toContain('1.1.1');
        expect(ui.text('file-name')).toBe('b.zip');
    });
});

describe('the manifest text is kept as it is', () => {
    it('a manifest with a BOM and CRLF loads', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifestText: buildManifest({ layout: 'bom' }) }));
        expect(ui.$('summary').hidden).toBe(false);
    });
});

// ── Preview (US2) ─────────────────────────────────────────────────────────────

import { colorIcon, outlineIcon } from './helpers/fixture';
import { encodePng } from './helpers/png-encoder';

describe('preview: the colour icon as it is, never on the accent colour (FR-007, amended 2026-10-29)', () => {
    it('transparent areas stay see-through on a checkerboard, opaque areas are kept', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const px = ui.pixels(ui.$<HTMLCanvasElement>('preview-color-192'))!;
        expect([px.width, px.height]).toEqual([192, 192]);
        const at = (x: number, y: number) => Array.from(px.data.slice((y * 192 + x) * 4, (y * 192 + x) * 4 + 4));
        expect(at(0, 0)).toEqual([0, 0, 0, 0]);               // the corner is see-through, not #07687d
        expect(at(100, 100)).toEqual([255, 255, 255, 255]);   // the opaque glyph
        expect(ui.$('preview-color-192').className).toContain('icon-canvas--checker');
    });

    it('a half-transparent background keeps its own pixels, alpha included', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: colorIcon([200, 50, 10, 128]), manifest: { accent: '#FF8040' } }));
        const px = ui.pixels(ui.$<HTMLCanvasElement>('preview-color-192'))!;
        expect(Array.from(px.data.slice(0, 4))).toEqual([200, 50, 10, 128]);
    });

    it('the caption says that the accent colour is saved but not drawn behind the icon, and why', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const text = ui.text('preview-body');
        expect(text).toContain('The accent colour #07687d is saved in the manifest');
        expect(text).toContain('not drawn behind the icon here');
        expect(text).toContain('does not say where');
        expect(text).not.toContain('on the accent colour #07687d, at the sizes');
    });

    it('also draws the small size, from the same pixels', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const small = ui.pixels(ui.$<HTMLCanvasElement>('preview-color-48'))!;
        const big = ui.pixels(ui.$<HTMLCanvasElement>('preview-color-192'))!;
        expect(Array.from(small.data)).toEqual(Array.from(big.data));
    });

    it('no accent colour: the icon is shown as it is and the preview says so', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { omit: ['accentColor'] } }));
        const px = ui.pixels(ui.$<HTMLCanvasElement>('preview-color-192'))!;
        expect(Array.from(px.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
        expect(ui.text('preview-body')).toContain('no accent colour');
        expect(ui.$('preview-color-192').className).toContain('icon-canvas--checker');
    });

    it('an invalid accent colour is named, not replaced by a made-up one', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { accent: '#fff' } }));
        expect(ui.text('preview-body')).toContain('"#fff" is not a valid #RRGGBB colour');
        expect(Array.from(ui.pixels(ui.$<HTMLCanvasElement>('preview-color-192'))!.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    });
});

describe('preview: outline icon (FR-008)', () => {
    it('is drawn on a light and on a dark bar, using only the icon shape', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const light = ui.pixels(ui.$<HTMLCanvasElement>('preview-outline-light'))!;
        const dark = ui.pixels(ui.$<HTMLCanvasElement>('preview-outline-dark'))!;
        const at = (p: typeof light, x: number, y: number) => Array.from(p.data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4));
        expect(at(light, 12, 12)).toEqual([66, 66, 66, 255]);      // glyph on the light bar: dark
        expect(at(dark, 12, 12)).toEqual([255, 255, 255, 255]);    // glyph on the dark bar: white
        expect(at(light, 0, 0)[3]).toBe(0);
        expect(at(dark, 0, 0)[3]).toBe(0);
        expect(ui.$('preview-bar-light').className).toContain('app-bar--light');
        expect(ui.$('preview-bar-dark').className).toContain('app-bar--dark');
        expect(ui.text('preview-body')).toContain('approximation');
    });
});

describe('preview: names and notices (FR-009, FR-010, SC-007)', () => {
    it('shows the short and the full name', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(ui.text('preview-name-short')).toBe('Sales Helper [DEV]');
        expect(ui.text('preview-name-full')).toBe('Sales Helper for the field team [DEV]');
    });

    it('shows a localisation key as it is and a missing name as "(missing)"', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: '[[DA_Name]]', nameFull: null } }));
        expect(ui.text('preview-name-short')).toBe('[[DA_Name]]');
        expect(ui.text('preview-name-full')).toBe('(missing)');
    });

    it('carries the two statements, verbatim, with every loaded package', async () => {
        const ui = await boot();
        for (const opts of [{}, { outline: null }, { color: null }]) {
            await ui.open('a.zip', packageBytes(opts));
            const n = ui.text('preview-notice');
            expect(n).toContain('This is the name of the Teams app in the manifest. It is not the name of the agent in Copilot Studio or in Dataverse.');
            expect(n).toContain('This preview does not reproduce exactly what Teams draws. The final check is a test in Teams.');
        }
    });
});

describe('preview: an icon that cannot be drawn says why (never blank)', () => {
    it('declared but absent', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: null, outline: null }));
        expect(ui.text('preview-color-problem')).toContain('declared but not in the package');
        expect(ui.text('preview-outline-problem')).toContain('declared but not in the package');
    });
    it('not a PNG', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: new TextEncoder().encode('not an image') }));
        expect(ui.text('preview-color-problem')).toContain('not a PNG');
    });
    it('a PNG the tool cannot draw (16 bits)', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ color: encodePng({ width: 192, height: 192, colorType: 6, bitDepth: 16, pixel: () => [1, 2, 3, 4] }) }));
        expect(ui.text('preview-color-problem')).toContain('cannot be drawn');
        expect(ui.text('preview-color-problem')).toContain('16');
    });
    it('a damaged PNG', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ outline: outlineIcon().slice(0, 60) }));
        expect(ui.text('preview-outline-problem')).toContain('damaged');
    });
});

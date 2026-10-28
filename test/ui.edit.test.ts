// @vitest-environment jsdom
/**
 * Suffix editor and export on the real page (FR-018 to FR-022, FR-025, FR-027, FR-030).
 */
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { colorIcon, packageBytes } from './helpers/fixture';
import { unzipSync } from './helpers/zip-builder';
import { padPngTo } from './helpers/png-encoder';

const input = () => document.getElementById('suffix-input') as HTMLInputElement;
const exportBtn = () => document.getElementById('export-btn') as HTMLButtonElement;

describe('suffix editor', () => {
    it('starts with the suffix the package has, shows base and suffix apart, and changes nothing', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(input().value).toBe('DEV');
        expect((document.getElementById('ed-name.short') as HTMLInputElement).value).toBe('Sales Helper [DEV]');
        expect(ui.text('preview-name-short')).toBe('Sales Helper [DEV]');
        expect(exportBtn().disabled).toBe(false);
        expect(ui.text('export-file-name')).toBe('a-copy.zip');
    });

    it('typing updates the names, the preview and the checks on every input event', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'UAT');
        expect(ui.text('preview-name-short')).toBe('Sales Helper [UAT]');
        expect(ui.text('preview-name-full')).toBe('Sales Helper for the field team [UAT]');
        expect((document.getElementById('ed-name.short') as HTMLInputElement).value).toBe('Sales Helper [UAT]');
        expect((document.getElementById('ed-name.full') as HTMLInputElement).value).toBe('Sales Helper for the field team [UAT]');
        expect(document.getElementById('ed-row-name.short')!.getAttribute('data-changed')).toBe('true');   // the field says that it differs from the package
        expect(ui.text('export-file-name')).toBe('a-UAT.zip');
        await ui.type('suffix-input', 'PROD');
        expect(ui.text('preview-name-short')).toBe('Sales Helper [PROD]');
        expect(document.querySelector('[data-check-id="name.short.length"]')!.textContent).toContain('19 characters');
    });

    it('clearing the suffix shows the names without it', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', '');
        expect(ui.text('preview-name-short')).toBe('Sales Helper');
        expect(ui.text('preview-name-full')).toBe('Sales Helper for the field team');
        expect(ui.text('export-file-name')).toBe('a-no-suffix.zip');
        expect(exportBtn().disabled).toBe(false);
    });

    it('a suffix that makes a name too long fails the check at once and disables the export, saying why', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'A'.repeat(20));
        expect(document.querySelector('[data-check-id="name.short.length"]')!.getAttribute('data-verdict')).toBe('fail');
        expect(exportBtn().disabled).toBe(true);
        expect(ui.$('export-reason').hidden).toBe(false);
        expect(ui.text('export-reason')).toContain('Short name length');
        expect(ui.text('export-reason')).toContain('35 characters');
        await ui.click('export-btn');
        expect(ui.fakes.saved).toHaveLength(0);
        await ui.type('suffix-input', 'UAT');   // fixing it re-enables the button
        expect(exportBtn().disabled).toBe(false);
        expect(ui.$('export-reason').hidden).toBe(true);
    });

    it('a suffix that cannot be used says why and keeps the original on screen', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        for (const bad of ['[UAT]', 'x'.repeat(21)]) {
            await ui.type('suffix-input', bad);
            expect(ui.$('suffix-problem').hidden).toBe(false);
            expect(ui.text('suffix-problem').length).toBeGreaterThan(10);
            expect(exportBtn().disabled).toBe(true);
            expect(ui.text('preview-name-short')).toBe('Sales Helper [DEV]');
        }
        await ui.type('suffix-input', 'UAT');
        expect(ui.$('suffix-problem').hidden).toBe(true);
    });

    it('localisation keys are shown, read-only, with the reason (FR-030)', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: '[[DA_Name]]' } }));
        const field = document.getElementById('ed-name.short') as HTMLInputElement;
        expect(field.value).toBe('[[DA_Name]]');
        expect(field.disabled).toBe(true);
        expect(ui.text('ed-help-name.short')).toContain('language file');
        await ui.type('suffix-input', 'UAT');
        expect(field.value).toBe('[[DA_Name]]');
        expect(ui.text('ed-help-name.short')).toContain('language file');
        expect(ui.text('preview-name-short')).toBe('[[DA_Name]]');
        expect(ui.text('preview-name-full')).toBe('Sales Helper for the field team [UAT]');
        expect(input().disabled).toBe(false);

        await ui.open('b.zip', packageBytes({ manifest: { nameShort: '[[A]]', nameFull: '[[B]]' } }));
        expect(input().disabled).toBe(true);
        expect(ui.text('suffix-hint')).toContain('Both names are localisation keys');
    });

    it('loading another package drops the edit (FR-027)', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'UAT');
        await ui.open('b.zip', packageBytes({ manifest: { nameShort: 'Other [TEST]', nameFull: 'Other agent [TEST]' } }));
        expect(input().value).toBe('TEST');
        expect(ui.text('preview-name-short')).toBe('Other [TEST]');
        expect(ui.text('export-file-name')).toBe('b-copy.zip');
    });

    it('a package whose names have no suffix starts with an empty input', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: 'Sales', nameFull: 'Sales Helper' } }));
        expect(input().value).toBe('');
        await ui.type('suffix-input', 'UAT');
        expect(ui.text('preview-name-short')).toBe('Sales [UAT]');
    });
});

describe('export', () => {
    it('saves one new package through one save dialog, named after the suffix', async () => {
        const ui = await boot();
        const original = packageBytes();
        await ui.open('Sales.zip', original);
        await ui.type('suffix-input', 'UAT');
        await ui.click('export-btn');
        expect(ui.fakes.saved).toHaveLength(1);
        expect(ui.fakes.saved[0]!.defaultPath).toBe('Sales-UAT.zip');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        const orig = unzipSync(original);
        expect(Object.keys(out)).toEqual(Object.keys(orig));
        expect(Array.from(out['color.png']!)).toEqual(Array.from(orig['color.png']!));
        expect(JSON.parse(new TextDecoder().decode(out['manifest.json']!)).name.short).toBe('Sales Helper [UAT]');
        expect(ui.text('export-status')).toBe('Saved: C:\\out\\saved.zip');
        expect(ui.text('export')).toContain('Nothing is sent anywhere. The new package is saved on your computer.');
    });

    it('a cancelled save dialog says so', async () => {
        const ui = await boot({ saveAnswer: null });
        await ui.open('Sales.zip', packageBytes());
        await ui.type('suffix-input', 'UAT');
        await ui.click('export-btn');
        expect(ui.text('export-status')).toBe('Not saved: the save dialog was cancelled.');
    });

    it('without any change it still saves an identical copy', async () => {
        const ui = await boot();
        const original = packageBytes();
        await ui.open('Sales.zip', original);
        await ui.click('export-btn');
        expect(ui.fakes.saved[0]!.defaultPath).toBe('Sales-copy.zip');
        const out = unzipSync(ui.fakes.saved[0]!.bytes), orig = unzipSync(original);
        for (const k of Object.keys(orig)) expect(Array.from(out[k]!)).toEqual(Array.from(orig[k]!));
    });

    it('failures the package already had are listed and do not stop the export', async () => {
        const ui = await boot();
        await ui.open('Sales.zip', packageBytes({ color: padPngTo(colorIcon(), 110 * 1024) }));
        await ui.type('suffix-input', 'UAT');
        expect(exportBtn().disabled).toBe(false);
        expect(ui.text('export-remaining')).toContain('Colour icon weight');
        await ui.click('export-btn');
        expect(ui.fakes.saved).toHaveLength(1);
    });

    it('typing clears the status of the previous save', async () => {
        const ui = await boot();
        await ui.open('Sales.zip', packageBytes());
        await ui.click('export-btn');
        expect(document.getElementById('export-status')).not.toBeNull();
        await ui.type('suffix-input', 'UAT');
        expect(document.getElementById('export-status')).toBeNull();
    });
});

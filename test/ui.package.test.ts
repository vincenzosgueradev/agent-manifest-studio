// @vitest-environment jsdom
/**
 * Features added after the first hands-on session (2026-10-27): the bar of the loaded file with a
 * button that removes it, copy buttons, the contents table of the new package, the checks as a
 * table, the checks report, the colour icon at several sizes and its safe area.
 */
import { describe, expect, it } from 'vitest';
import { boot, flush } from './helpers/ui-harness';
import { packageBytes, packageEntries } from './helpers/fixture';
import { deflatedZip, rawZip } from './helpers/zip-builder';

const $ = (id: string) => document.getElementById(id)!;
const click = async (id: string) => { $(id).click(); await flush(3); };
const copyOf = (label: string) => document.querySelector<HTMLButtonElement>(`[data-copy][aria-label="Copy ${label}"]`);

describe('the loaded file bar', () => {
    it('replaces the empty area, with the name and a line about the content', async () => {
        const ui = await boot();
        expect($('drop-area').hidden).toBe(false);
        expect($('file-bar').hidden).toBe(true);
        await ui.open('Sales.zip', packageBytes());
        expect($('drop-area').hidden).toBe(true);
        expect($('file-bar').hidden).toBe(false);
        expect(ui.text('file-name')).toBe('Sales.zip');
        expect(ui.text('file-meta')).toMatch(/^3 files \u00B7 \d+\.\d KB \u00B7 manifest schema 1\.19$/);
    });

    it('says "1 file" for one file', async () => {
        const ui = await boot();
        await ui.open('a.zip', deflatedZip([{ name: 'manifest.json', data: new TextEncoder().encode('{}') }]));
        expect(ui.text('file-meta')).toMatch(/^1 file \u00B7 /);
        expect(ui.text('file-meta')).toMatch(/manifest schema unknown$/);
    });

    it('Replace opens another package', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { appVersion: '1.1.1' } }));
        ui.fakes.files.set('b.zip', packageBytes({ manifest: { appVersion: '2.2.2' } }));
        await click('replace-btn');
        expect(ui.text('file-name')).toBe('b.zip');
        expect(ui.text('summary')).toContain('2.2.2');
    });

    it('a file dropped on the panel is loaded, whether the bar or the empty area shows', async () => {
        const ui = await boot();
        const drop = async (name: string, bytes: Uint8Array) => {
            const file = new File([bytes as BlobPart], name);
            const event = new Event('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
            $('loader').dispatchEvent(event);
            await flush(8);
        };
        await drop('dropped.zip', packageBytes());
        expect(ui.text('file-name')).toBe('dropped.zip');
        await drop('again.zip', packageBytes());
        expect(ui.text('file-name')).toBe('again.zip');
    });
});

describe('removing the package', () => {
    it('has a clearly named button with a trash icon', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const remove = $('remove-btn');
        expect(remove.textContent).toBe('Remove');
        expect(remove.getAttribute('aria-label')).toBe('Remove the package');
        expect(remove.querySelector('.icon-trash')).not.toBeNull();
    });

    it('goes back to the empty first step and disables the others', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        document.querySelector<HTMLElement>('#step-package .stepper-btn[data-goto="4"]')!.click();
        await flush(2);
        expect($('step-preview').hidden).toBe(false);
        // the remove button lives in the first step: go back to it
        document.querySelector<HTMLElement>('#step-preview .stepper-btn[data-goto="1"]')!.click();
        await flush(2);
        await click('remove-btn');
        expect($('step-package').hidden).toBe(false);
        expect($('summary').hidden).toBe(true);
        expect($('file-bar').hidden).toBe(true);
        expect($('drop-area').hidden).toBe(false);
        expect([...document.querySelectorAll<HTMLButtonElement>('#step-package .stepper-btn')].map(b => b.disabled)).toEqual([false, true, true, true, true, true]);
        expect(document.querySelector<HTMLButtonElement>('#step-package [data-nav="next"]')!.disabled).toBe(true);
    });

    it('leaves nothing of the package in the page, hidden steps included (FR-027)', async () => {
        const ui = await boot();
        await ui.open('Zeta.zip', packageBytes({ manifest: { nameShort: 'Zeta Agent [DEV]', nameFull: 'Zeta Agent full [DEV]' } }));
        await ui.type('suffix-input', 'UAT');
        expect(document.body.textContent).toContain('Zeta Agent');
        await click('remove-btn');
        expect(document.body.textContent).not.toContain('Zeta');
        for (const id of ['summary', 'preview-body', 'preview-notice', 'name-body', 'checks-body', 'contents-body', 'export-body']) {
            expect($(id).childElementCount, id).toBe(0);
        }
        expect(ui.text('checks-summary')).toBe('');
        expect($('report-status').hidden).toBe(true);
    });

    it('a package loaded afterwards starts clean: no suffix, no status from the removed one', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'UAT');
        await click('remove-btn');
        await ui.open('b.zip', packageBytes({ manifest: { nameShort: 'Other [TEST]', nameFull: 'Other full [TEST]' } }));
        expect((document.getElementById('suffix-input') as HTMLInputElement).value).toBe('TEST');
        expect(ui.text('preview-name-short')).toBe('Other [TEST]');
    });

    it('also clears an error message that was showing', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.open('bad.zip', new TextEncoder().encode('nope'));
        expect($('load-message').hidden).toBe(false);
        await click('remove-btn');
        expect($('load-message').hidden).toBe(true);
    });
});

describe('copy buttons', () => {
    it('the App ID, the bot id, the links and the accent colour can be copied', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        for (const [label, text] of [
            ['App ID', '11111111-2222-3333-4444-555555555555'],
            ['Bot ID', 'aaaaaaaa-0000-0000-0000-000000000001'],
            ['website', 'https://example.com'],
            ['privacy policy link', 'https://example.com/privacy'],
            ['terms of use link', 'https://example.com/terms'],
            ['accent colour', '#07687d'],
        ] as const) {
            copyOf(label)!.click();
            await flush(3);
            expect(ui.fakes.copied.at(-1), label).toBe(text);
        }
    });

    it('several bot ids are copied one per line', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { botIds: ['b1', 'b2', 'b3'] } }));
        copyOf('Bot IDs')!.click();
        await flush(3);
        expect(ui.fakes.copied.at(-1)).toBe('b1\nb2\nb3');
    });

    it('a row with nothing to copy has no button', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { omit: ['developer.name'], botIds: [] } }));
        expect(copyOf('Bot ID')).toBeNull();
        expect(copyOf('Bot IDs')).toBeNull();
        expect(document.querySelectorAll('[data-copy]').length).toBe(5);   // App ID, 3 links, accent colour
    });

    it('shows a tick for a moment, then the copy icon again', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const button = copyOf('App ID')!;
        button.click();
        await flush(3);
        expect(button.querySelector('.icon-check')).not.toBeNull();
        expect(button.classList.contains('is-done')).toBe(true);
        await new Promise(r => setTimeout(r, 1600));
        expect(button.querySelector('.icon-copy')).not.toBeNull();
        expect(button.classList.contains('is-done')).toBe(false);
    });

    it('when the clipboard refuses, it says so on the button and does not show a tick', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        ui.fakes.copyFails = true;
        const button = copyOf('App ID')!;
        button.click();
        await flush(3);
        expect(button.title).toBe('Could not copy');
        expect(button.querySelector('.icon-check')).toBeNull();
    });

    it('every copy button has an accessible name', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        for (const b of document.querySelectorAll('[data-copy]')) expect(b.getAttribute('aria-label')).toMatch(/^Copy .{3,}/);
    });
});

describe('the checks screen', () => {
    const more = (id: string) => document.querySelector<HTMLElement>(`[data-check-id="${id}"] .chk-more`)!;

    it('one card per subject, one row per check, a strip with the counts, and no table', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(document.querySelectorAll('#checks-body table')).toHaveLength(0);
        expect(document.querySelectorAll('#checks-body .chk-group')).toHaveLength(5);
        expect(document.querySelectorAll('#checks-body .group-row')).toHaveLength(5);
        expect(document.querySelectorAll('#checks-body li.check-row')).toHaveLength(18);
        for (const row of document.querySelectorAll('#checks-body li.check-row')) {
            expect(row.querySelector('.col-status .icon')).not.toBeNull();
            expect(row.querySelector('.col-check')!.textContent!.length).toBeGreaterThan(3);
            expect(row.querySelector('.col-found')!.textContent!.length).toBeGreaterThan(0);
        }
        const strip = () => [...document.querySelectorAll('#checks-body .chk-strip .chip')].map(c => c.textContent);
        expect(strip()).toEqual(['18 passed']);   // nothing about warnings or failures when there are none
    });

    it('a row that passes is one line; a row that does not pass shows its rule and what it does not prove', async () => {
        const ui = await boot();
        const { padPngTo } = await import('./helpers/png-encoder');
        const { colorIcon } = await import('./helpers/fixture');
        await ui.open('a.zip', packageBytes({ color: padPngTo(colorIcon(), 80 * 1024), manifest: { nameShort: 'x'.repeat(31) } }));
        expect([...document.querySelectorAll('#checks-body .chk-strip .chip')].map(c => c.textContent)).toEqual(['16 passed', '1 with a warning', '1 failed']);
        expect(more('color.present').hidden).toBe(true);
        expect(more('color.weight').hidden).toBe(false);           // a warning
        expect(more('name.short.length').hidden).toBe(false);      // a failure
        expect(more('name.short.length').textContent).toContain('It should be');
        expect(more('name.short.length').textContent).toContain('at most 30 characters');
        expect(more('name.short.length').textContent).toContain('This does not prove');
        // and how to put it right, with a button to the step where it is done
        expect(more('name.short.length').textContent).toContain('How to fix it');
        expect(more('name.short.length').textContent).toContain('shorten "Short name"');
        expect(more('name.short.length').querySelector<HTMLElement>('[data-goto="2"]')!.textContent).toContain('Go to Details');
        expect(more('color.weight').textContent).toContain('How to fix it');
        expect(more('color.weight').querySelector<HTMLElement>('[data-goto="3"]')!.textContent).toContain('Go to Look');
        expect(more('color.present').querySelector('.chk-fix')).toBeNull();   // a check that passes has nothing to fix
    });

    it('the button of a check takes the user to the step where it is fixed', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: 'x'.repeat(31) } }));
        document.querySelector<HTMLElement>('#step-package .stepper-btn[data-goto="5"]')!.click();
        await flush(2);
        document.querySelector<HTMLElement>('[data-check-id="name.short.length"] [data-goto="2"]')!.click();
        await flush(2);
        expect($('step-suffix').hidden).toBe(false);
        expect($('step-checks').hidden).toBe(true);
    });

    it('a button shows the rule of every check, and hides it again; nothing is lost either way', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(document.querySelectorAll('details')).toHaveLength(0);
        expect(more('color.present').hidden).toBe(true);
        expect(ui.text('checks-body')).toContain('Does not prove that the file is a valid image.');   // in the page, shown on demand
        await ui.click('checks-details-btn');
        expect($('checks-details-btn').getAttribute('aria-pressed')).toBe('true');
        for (const m of document.querySelectorAll<HTMLElement>('#checks-body .chk-more')) expect(m.hidden).toBe(false);
        await ui.click('checks-details-btn');
        expect(more('color.present').hidden).toBe(true);
    });

    it('long text carries its full value in title', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        for (const cell of document.querySelectorAll('#checks-body .col-found')) {
            expect(cell.getAttribute('title')).toBe(cell.textContent);
        }
    });

    it('the summary line is for screen readers only and keeps its words', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect($('checks-summary').classList.contains('visually-hidden')).toBe(true);
        expect($('checks-summary').textContent).toBe('18 passed, 0 with a warning, 0 failed.');
    });
});

describe('the checks report', () => {
    it('is hidden until used; Copy puts the JSON on the clipboard and says so', async () => {
        const ui = await boot();
        await ui.open('Sales.zip', packageBytes());
        expect($('report-status').hidden).toBe(true);
        await click('copy-report-btn');
        const report = JSON.parse(ui.fakes.copied.at(-1)!);
        expect(report.tool).toBe('Agent Manifest Studio');
        expect(report.version).toBe('0.0.0-test');
        expect(report.package).toBe('Sales.zip');
        expect(report.checks).toHaveLength(18);
        expect(report.summary).toEqual({ pass: 18, warning: 0, fail: 0 });
        expect(ui.text('report-status')).toBe('Report copied.');
        expect($('report-status').hidden).toBe(false);
    });

    it('says so when the clipboard refuses', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        ui.fakes.copyFails = true;
        await click('copy-report-btn');
        expect(ui.text('report-status')).toBe('The report could not be copied.');
    });

    it('Save asks for one file called after the package and writes the same JSON', async () => {
        const ui = await boot();
        await ui.open('Sales.zip', packageBytes());
        await click('save-report-btn');
        expect(ui.fakes.saved).toHaveLength(1);
        expect(ui.fakes.saved[0]!.defaultPath).toBe('Sales-checks.json');
        expect(JSON.parse(ui.fakes.saved[0]!.text!).package).toBe('Sales.zip');
        expect(ui.text('report-status')).toBe('Report saved: C:\\out\\saved.zip');
    });

    it('a cancelled save dialog is reported', async () => {
        const ui = await boot({ saveAnswer: null });
        await ui.open('a.zip', packageBytes());
        await click('save-report-btn');
        expect(ui.text('report-status')).toBe('Report not saved: the save dialog was cancelled.');
    });

    it('reports the checks as they are on screen, with the suffix typed', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'A'.repeat(20));   // makes the short name too long
        await click('copy-report-btn');
        const report = JSON.parse(ui.fakes.copied.at(-1)!);
        expect(report.app.shortName).toBe(`Sales Helper [${'A'.repeat(20)}]`);
        expect(report.summary.fail).toBe(1);
        expect(report.checks.find((c: { id: string }) => c.id === 'name.short.length').verdict).toBe('fail');
    });

    it('does not write a package: saving a report is not a package export', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await click('save-report-btn');
        expect(ui.fakes.saved.every(s => s.bytes.length === 0 && typeof s.text === 'string')).toBe(true);
    });
});

describe('the contents of the new package', () => {
    const rows = () => [...document.querySelectorAll<HTMLElement>('#contents-table tbody tr')];

    it('lists every file as identical when nothing changes', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(rows().map(r => r.dataset.path)).toEqual(['manifest.json', 'color.png', 'outline.png']);
        expect(rows().every(r => r.dataset.state === 'identical')).toBe(true);
        expect(ui.text('contents-note')).toBe('3 files: nothing changes, the new package is an identical copy.');
    });

    it('marks only manifest.json as changed, with the two names and the sizes before and after', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'PRODUCTION');
        expect(rows().map(r => [r.dataset.path, r.dataset.state])).toEqual([['manifest.json', 'changed'], ['color.png', 'identical'], ['outline.png', 'identical']]);
        const manifestRow = rows()[0]!;
        expect(manifestRow.querySelector('.col-state .chip--info')?.textContent).toBe('changed');
        expect(manifestRow.querySelector('.col-detail')?.textContent).toBe('name.short, name.full');
        // a small manifest is shown in bytes: 2 names each 6 characters longer (PRODUCTION against DEV)
        const [before, after] = manifestRow.querySelector('.col-size')!.textContent!.split(' \u2192 ');
        expect(before).toMatch(/^\d+ B$/);
        expect(Number.parseInt(after!, 10) - Number.parseInt(before!, 10)).toBe(2 * ('PRODUCTION'.length - 'DEV'.length));
        expect(rows()[1]!.querySelector('.col-size')?.textContent).toMatch(/^\d+\.\d KB$|^\d+ B$/);
        expect(ui.text('contents-note')).toBe('3 files: only manifest.json changes, and in it only name.short and name.full.');
    });

    it('names only the value that really changes', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameShort: '[[DA_Name]]' } }));
        await ui.type('suffix-input', 'UAT');
        expect(rows()[0]!.querySelector('.col-detail')?.textContent).toBe('name.full');
        expect(ui.text('contents-note')).toContain('only name.full.');
    });

    it('typing the suffix the names already have changes nothing', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        await ui.type('suffix-input', 'DEV');
        expect(rows().every(r => r.dataset.state === 'identical')).toBe(true);
    });

    it('does not list folder entries, and counts the files', async () => {
        const ui = await boot();
        await ui.open('a.zip', rawZip([...packageEntries(), { name: 'assets/', data: new Uint8Array(0) }, { name: 'assets/readme.txt', data: new Uint8Array(5) }]));
        expect(rows().map(r => r.dataset.path)).toEqual(['manifest.json', 'color.png', 'outline.png', 'assets/readme.txt']);
        expect(ui.text('contents-note')).toContain('4 files');
    });
});

describe('the colour icon at several sizes and its safe area', () => {
    it('is drawn at 192, 96, 48 and 32 pixels, all from the same pixels', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const sizes = [192, 96, 48, 32];
        const canvases = sizes.map(s => $(`preview-color-${s}`) as HTMLCanvasElement);
        const reference = Array.from(ui.pixels(canvases[0]!)!.data);
        for (const c of canvases) expect(Array.from(ui.pixels(c)!.data)).toEqual(reference);
        expect([...document.querySelectorAll('.size-label')].map(l => l.textContent)).toEqual(['192 px', '96 px', '48 px', '32 px']);
        expect(canvases.slice(1).map(c => c.style.width)).toEqual(['96px', '48px', '32px']);
    });

    it('the safe-area guide is off at first, and a button turns it on and off', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const toggle = $('safe-area-toggle');
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        expect($('canvas-wrap').classList.contains('is-on')).toBe(false);
        expect($('safe-area-overlay')).not.toBeNull();
        toggle.click();
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        expect($('canvas-wrap').classList.contains('is-on')).toBe(true);
        toggle.click();
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        expect($('canvas-wrap').classList.contains('is-on')).toBe(false);
    });

    it('stays on when the suffix is typed and the preview is drawn again', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        $('safe-area-toggle').click();
        await ui.type('suffix-input', 'UAT');
        expect($('canvas-wrap').classList.contains('is-on')).toBe(true);
        expect($('safe-area-toggle').getAttribute('aria-pressed')).toBe('true');
    });
});

describe('the contents table names only the values that really change', () => {
    it('only name.short when the full name is a localisation key', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { nameFull: '[[DA_Full]]' } }));
        await ui.type('suffix-input', 'UAT');
        const row = document.querySelector<HTMLElement>('#contents-table tr[data-path="manifest.json"]')!;
        expect(row.dataset.state).toBe('changed');
        expect(row.querySelector('.col-detail')?.textContent).toBe('name.short');
        expect(ui.text('contents-note')).toContain('only name.short.');
    });
});

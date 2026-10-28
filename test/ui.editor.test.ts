// @vitest-environment jsdom
/**
 * Feature 003 on the real page: the editor cards, markers, revert, validation, icons, lists, the Changes
 * table, the read-only group and the saved package (FR-001 to FR-005, FR-010 to FR-022, FR-026).
 */
import { describe, expect, it } from 'vitest';
import { boot, flush, type Ui } from './helpers/ui-harness';
import { colorIcon, outlineIcon, packageBytes } from './helpers/fixture';
import { encodePng, padPngTo, solidPng } from './helpers/png-encoder';
import * as O from './helpers/image-oracle';
import { unzipSync } from './helpers/zip-builder';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const field = (path: string) => $(`ed-${path}`) as HTMLInputElement | HTMLTextAreaElement;
const row = (path: string) => $(`ed-row-${path}`);
const changed = (path: string) => row(path).getAttribute('data-changed') === 'true';
const err = (path: string) => $(`ed-err-${path}`);
const exportBtn = () => $('export-btn') as HTMLButtonElement;

const newColor = (): Uint8Array => encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 70 && x < 120 && y >= 70 && y < 120 ? [255, 255, 255, 255] : [0, 0, 0, 0]) });

async function loaded(opts: Parameters<typeof packageBytes>[0] = {}): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(opts));
    return ui;
}

describe('the editor cards', () => {
    it('the editing is two steps: Details holds the text fields, Look holds the colour and the icons, one card under another', async () => {
        await loaded();
        expect(document.querySelector('#step-suffix .step-title')!.textContent).toBe('Details of the package');
        expect(document.querySelector('#step-look .step-title')!.textContent).toBe('Colour and icons');
        const labels = [...document.querySelectorAll('#step-package .stepper-btn')].map(b => b.textContent!.replace(/^\d+/, ''));
        expect(labels).toEqual(['Package', 'Details', 'Look', 'Preview', 'Checks', 'Save']);
        const titles = (root: string) => [...document.querySelectorAll(`#${root} > .panel:not([hidden]) .card-title`)].map(h => h.textContent);
        expect(titles('edit-groups')).toEqual(['Identity', 'Descriptions', 'Developer', 'Version']);
        expect(titles('look-groups')).toEqual(['Look', 'Colour icon', 'Outline icon']);
        // the accent colour is not among the text fields, nor the icons
        expect(document.querySelector('#edit-groups #ed-accentColor')).toBeNull();
        expect(document.querySelector('#look-groups #ed-accentColor')).not.toBeNull();
        expect(document.querySelector('#edit-groups #ed-img-color')).toBeNull();
        // what cannot be edited is not shown here: it is in the first step
        expect(document.getElementById('ed-card-readonly')).toBeNull();
    });

    it('every field shows its current value and no field is marked as changed', async () => {
        await loaded();
        expect(field('description.short').value).toBe('Answers sales questions');
        expect(field('developer.name').value).toBe('Contoso');
        expect(field('accentColor').value).toBe('#07687d');
        expect(field('version').value).toBe('1.0.0');
        expect(field('name.short').value).toBe('Sales Helper [DEV]');
        for (const f of document.querySelectorAll('.ed-row')) expect(f.getAttribute('data-changed')).toBe('false');
        expect(($('ed-revert-all') as HTMLButtonElement).disabled).toBe(true);
    });

    it('shows the count against the limit', async () => {
        await loaded();
        expect($('ed-count-description.short').textContent).toBe('23 / 80');
        expect($('ed-count-developer.name').textContent).toBe('7 / 32');
    });

    it('marks an optional field as optional in its label', async () => {
        await loaded();
        expect(row('name.full').querySelector('label')!.textContent).toBe('Full name (optional)');
        expect(row('developer.name').querySelector('label')!.textContent).toBe('Developer name');
    });
});

describe('typing in a field', () => {
    it('marks it as changed, offers Revert, and keeps the same input element (no lost focus)', async () => {
        const ui = await loaded();
        document.querySelector<HTMLElement>('[data-goto="2"]')!.click();
        await flush();
        const before = field('description.short');
        before.focus();
        await ui.type('ed-description.short', 'A new short text');
        expect(field('description.short')).toBe(before);
        expect(document.activeElement).toBe(before);
        expect(changed('description.short')).toBe(true);
        expect(($('ed-revert-description.short') as HTMLButtonElement).hidden).toBe(false);
        expect(($('ed-revert-all') as HTMLButtonElement).disabled).toBe(false);
        expect($('ed-count-description.short').textContent).toBe('16 / 80');
    });

    it('Revert puts the original back and clears the marker', async () => {
        const ui = await loaded();
        await ui.type('ed-developer.name', 'Fabrikam');
        expect(changed('developer.name')).toBe(true);
        await ui.click('ed-revert-developer.name');
        expect(field('developer.name').value).toBe('Contoso');
        expect(changed('developer.name')).toBe(false);
    });

    it('typing the original value back clears the marker', async () => {
        const ui = await loaded();
        await ui.type('ed-version', '2.0.0');
        expect(changed('version')).toBe(true);
        await ui.type('ed-version', '1.0.0');
        expect(changed('version')).toBe(false);
    });

    it('Revert all restores every field, every list, every icon and the suffix', async () => {
        const ui = await loaded();
        await ui.type('suffix-input', 'UAT');
        await ui.type('ed-version', '3.0.0');
        await ui.click('ed-revert-all');
        expect(field('version').value).toBe('1.0.0');
        expect((document.getElementById('suffix-input') as HTMLInputElement).value).toBe('DEV');
        expect(field('name.short').value).toBe('Sales Helper [DEV]');
        expect(($('ed-revert-all') as HTMLButtonElement).disabled).toBe(true);
    });

    it('the preview and the checks follow the edit as it is typed', async () => {
        const ui = await loaded();
        await ui.type('ed-description.short', 'x'.repeat(81));
        expect(ui.text('checks-body')).toContain('80 characters'); // the original check still reads the last valid value
        await ui.type('ed-name.short', 'Renamed');
        expect(ui.text('preview-name-short')).toBe('Renamed');
        expect(document.querySelector('[data-check-id="name.short.length"]')!.textContent).toContain('7 characters');
    });
});

describe('validation says why, next to the field, and blocks the save', () => {
    const cases: Array<[string, string, string]> = [
        ['description.short', 'x'.repeat(81), 'most allowed is 80'],
        ['description.full', '', 'cannot be empty'],
        ['developer.name', 'y'.repeat(33), 'most allowed is 32'],
        ['accentColor', '#12345', 'six hexadecimal'],
        ['version', 'one', 'major.minor.patch'],
    ];
    for (const [path, value, fragment] of cases) {
        it(`${path}: ${JSON.stringify(value.slice(0, 12))}`, async () => {
            const ui = await loaded();
            await ui.type(`ed-${path}`, value);
            expect(err(path).hidden).toBe(false);
            expect(err(path).textContent).toContain(fragment);
            expect(field(path).getAttribute('aria-invalid')).toBe('true');
            expect(exportBtn().disabled).toBe(true);
            expect($('export-reason').textContent).toContain('Cannot save');
            // the other fields do not carry the error
            expect(document.querySelectorAll('.ed-error:not([hidden])').length).toBeGreaterThanOrEqual(1);
        });
    }

    it('fixing the value lifts the block', async () => {
        const ui = await loaded();
        await ui.type('ed-accentColor', 'nope');
        expect(exportBtn().disabled).toBe(true);
        await ui.type('ed-accentColor', '#112233');
        expect(err('accentColor').hidden).toBe(true);
        expect(exportBtn().disabled).toBe(false);
        expect(($('ed-pick-accentColor') as HTMLInputElement).value).toBe('#112233');
    });

    it('a Save that is pressed anyway saves nothing', async () => {
        const ui = await loaded();
        await ui.type('ed-version', 'bad');
        exportBtn().disabled = false;   // as if the user got past the disabled state
        exportBtn().click();
        await flush();
        expect(ui.fakes.saved).toHaveLength(0);
        expect(ui.text('export-status')).toContain('Not saved: App version');
    });
});

describe('the colour picker', () => {
    const picker = () => $('ed-pick-accentColor') as HTMLInputElement;

    it('shows the colour of the field, and choosing a colour sets the field', async () => {
        const ui = await loaded();
        expect(picker().type).toBe('color');
        expect(picker().value).toBe('#07687d');
        picker().value = '#ff8800';
        picker().dispatchEvent(new Event('input', { bubbles: true }));
        await flush(3);
        expect(field('accentColor').value).toBe('#ff8800');
        expect(changed('accentColor')).toBe(true);
        await ui.click('ed-revert-accentColor');
        expect(field('accentColor').value).toBe('#07687d');
        expect(picker().value).toBe('#07687d');
    });

    it('follows what is typed when it is a valid colour, and keeps the last one while it is not', async () => {
        const ui = await loaded();
        await ui.type('ed-accentColor', '#112233');
        expect(picker().value).toBe('#112233');
        await ui.type('ed-accentColor', '#11');
        expect(picker().value).toBe('#112233');
        await ui.type('ed-accentColor', '#ABCDEF');
        expect(picker().value).toBe('#abcdef');   // the picker always gives lower case
    });

    it('has a name for a screen reader', async () => {
        await loaded();
        expect(picker().getAttribute('aria-label')).toContain('accent colour');
    });
});

describe('the version helper', () => {
    it('raises the patch and the minor number', async () => {
        const ui = await loaded();
        await ui.click('ed-bump-patch');
        expect(field('version').value).toBe('1.0.1');
        await ui.click('ed-bump-minor');
        expect(field('version').value).toBe('1.1.0');
        expect(changed('version')).toBe(true);
    });

    it('is disabled, with the reason, for a version that is not three numbers', async () => {
        await loaded({ manifest: { appVersion: '2024-01' } });
        expect(($('ed-bump-patch') as HTMLButtonElement).disabled).toBe(true);
        expect($('ed-bump-patch').title).toContain('three numbers');
    });

    it('the manifest version and the app id are not in the editor: they are in the first step', async () => {
        await loaded();
        expect(document.getElementById('ed-ro-manifestVersion')).toBeNull();
        expect(document.getElementById('ed-ro-id')).toBeNull();
        expect(document.getElementById('ed-manifestVersion')).toBeNull();
        expect(document.getElementById('ed-id')).toBeNull();
        expect($('summary').textContent).toContain('11111111-2222-3333-4444-555555555555');
        expect($('summary').textContent).toContain('1.19');
    });
});

describe('lists that are never edited', () => {
    it('are shown in the first step with their values, and the editor has nothing for them', async () => {
        await loaded({ manifest: { validDomains: ['*.botframework.com', 'copilotstudio.microsoft.com'], permissions: ['identity'], devicePermissions: ['geolocation'] } });
        const text = $('summary').textContent!;
        for (const v of ['*.botframework.com', 'copilotstudio.microsoft.com', 'identity', 'geolocation']) expect(text).toContain(v);
        for (const key of ['validDomains', 'permissions', 'devicePermissions']) {
            expect(document.getElementById(`ed-card-${key}`)).toBeNull();
            expect(document.getElementById(`ed-list-${key}`)).toBeNull();
        }
        expect(document.getElementById('ed-readonly')).toBeNull();
    });

    it('they stay in the saved package exactly as they were', async () => {
        const ui = await loaded({ manifest: { validDomains: ['*.botframework.com'], permissions: ['identity'] } });
        await ui.type('ed-version', '1.0.9');
        await ui.click('export-btn');
        const m = JSON.parse(new TextDecoder().decode(unzipSync(ui.fakes.saved[0]!.bytes)['manifest.json']!));
        expect(m.validDomains).toEqual(['*.botframework.com']);
        expect(m.permissions).toEqual(['identity']);
    });
});

describe('icons', () => {
    const iconFacts = (slot: string) => $(`ed-img-facts-${slot}`).textContent!;

    it('shows the current icon with its size', async () => {
        await loaded();
        expect(iconFacts('color')).toContain('color.png - 192 x 192 pixels');
        expect(iconFacts('outline')).toContain('outline.png - 32 x 32 pixels');
    });

    it('a chosen PNG replaces the icon in the preview, the checks and the saved package', async () => {
        const ui = await loaded();
        ui.fakes.files.set('new.png', newColor());
        await ui.click('ed-img-pick-color');
        expect(iconFacts('color')).toContain('(replaced)');
        expect(($('ed-img-revert-color') as HTMLButtonElement).hidden).toBe(false);
        expect($('ed-img-color').getAttribute('data-changed')).toBe('true');
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        expect(Array.from(out['color.png']!)).toEqual(Array.from(newColor()));
        expect(Array.from(out['outline.png']!)).toEqual(Array.from(outlineIcon()));
    });

    it('refuses a file of the wrong size, says why, and keeps the current icon', async () => {
        const ui = await loaded();
        ui.fakes.files.set('small.png', solidPng(100, 100, [1, 2, 3, 255]));
        await ui.click('ed-img-pick-color');
        const msg = $('ed-img-msg-color');
        expect(msg.hidden).toBe(false);
        expect(msg.textContent).toMatch(/192 x 192.*100 x 100/);
        expect(iconFacts('color')).not.toContain('replaced');
        expect(exportBtn().disabled).toBe(false);
    });

    it('refuses a file that is not a PNG', async () => {
        const ui = await loaded();
        ui.fakes.files.set('x.png', new Uint8Array([1, 2, 3, 4]));
        await ui.click('ed-img-pick-outline');
        expect($('ed-img-msg-outline').textContent).toContain('not a PNG');
    });

    it('a heavy PNG between the two documented limits is accepted and the check warns', async () => {
        const ui = await loaded();
        const base = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 70 && x < 120 && y >= 70 && y < 120 ? [255, 255, 255, 255] : [0, 0, 0, 0]) });
        ui.fakes.files.set('heavy.png', padPngTo(base, 80 * 1024));
        await ui.click('ed-img-pick-color');
        expect($('ed-img-msg-color').hidden).toBe(true);
        expect(document.querySelector('[data-check-id="color.weight"]')!.textContent).toContain('80.0 KB');
    });

    it('Revert puts the original icon back', async () => {
        const ui = await loaded();
        ui.fakes.files.set('new.png', newColor());
        await ui.click('ed-img-pick-color');
        await ui.click('ed-img-revert-color');
        expect(iconFacts('color')).not.toContain('replaced');
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        expect(Array.from(out['color.png']!)).toEqual(Array.from(colorIcon()));
    });

    it('a refusal is cleared by the next good file', async () => {
        const ui = await loaded();
        ui.fakes.files.set('bad.png', solidPng(10, 10, [0, 0, 0, 255]));
        await ui.click('ed-img-pick-color');
        expect($('ed-img-msg-color').hidden).toBe(false);
        ui.fakes.files.set('good.png', newColor());
        await ui.click('ed-img-pick-color');
        expect($('ed-img-msg-color').hidden).toBe(true);
    });
});

describe('make the background transparent in one click', () => {
    /** A white glyph on an opaque teal background, as Copilot Studio makes it. */
    const flatIcon = (): Uint8Array => encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => (x >= 66 && x < 126 && y >= 66 && y < 126 ? [255, 255, 255, 255] : [7, 104, 125, 255]) });
    const corner = (bytes: Uint8Array): number[] => { const r = O.readPng(bytes); return Array.from(r.data.slice(0, 4)); };

    it('takes the flat colour away, keeps the logo, and puts the icon in the package', async () => {
        const ui = await loaded({ color: flatIcon() });
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-color').getAttribute('data-changed')).toBe('true');
        expect($('ed-img-facts-color').textContent).toContain('(replaced)');
        expect(document.querySelector('#changes-table tr[data-icon="color"]')).not.toBeNull();
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes)['color.png']!;
        expect(corner(out)[3]).toBe(0);                                             // the corner is see-through
        const r = O.readPng(out);
        expect(Array.from(r.data.slice((96 * 192 + 96) * 4, (96 * 192 + 96) * 4 + 4))).toEqual([255, 255, 255, 255]);   // the logo is intact
        expect($('ed-img-msg-color').hidden).toBe(true);
    });

    it('an opaque icon says that the accent colour does not show, and the caption changes once the background is taken away', async () => {
        const ui = await loaded({ color: flatIcon() });
        const caption = $('ed-img-caption-color');
        expect(caption.hidden).toBe(false);
        expect(caption.dataset.state).toBe('opaque');
        expect(caption.textContent).toContain('does not show behind it');
        // the picture is drawn on a chequerboard, never on the accent colour: transparent looks transparent
        expect($('ed-img-canvas-color').classList.contains('ed-checker')).toBe(true);
        expect($('ed-img-canvas-color').getAttribute('style') ?? '').toBe('');
        expect($('ed-img-onaccent-color').getAttribute('style') ?? '').toContain('rgb(7, 104, 125)');
        expect(caption.textContent).toContain('#07687d');
        await ui.type('ed-accentColor', '#42b03b');
        expect(caption.textContent).toContain('#42b03b');            // it follows the accent colour as it is typed
        await ui.click('ed-img-transparent-color');
        expect(caption.dataset.state).toBe('see-through');
        expect(caption.textContent).toContain('Teams puts the accent colour #42b03b behind them');
        expect($('ed-img-onaccent-color').getAttribute('style') ?? '').toContain('rgb(66, 176, 59)');   // the second picture follows the accent colour
        expect($('ed-img-onaccent-label').textContent).toBe('On the accent colour #42b03b');
        // the first picture shows the transparency: its corner pixel is see-through
        expect(ui.pixels($('ed-img-canvas-color') as HTMLCanvasElement)!.data[3]).toBe(0);
        expect(ui.pixels($('ed-img-onaccent-color') as HTMLCanvasElement)!.data[3]).toBe(0);
    });

    it('keeps the same colour where it is inside the logo (the face of the robot), and takes it away only at the edges', async () => {
        // a white square with a teal hole in it, on a teal background: the hole is part of the logo
        const withHole = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => {
            const inSquare = x >= 56 && x < 136 && y >= 56 && y < 136;
            const inHole = x >= 86 && x < 106 && y >= 86 && y < 106;
            return inSquare && !inHole ? [255, 255, 255, 255] : [7, 104, 125, 255];
        } });
        const ui = await loaded({ color: withHole });
        await ui.click('ed-img-transparent-color');
        await ui.click('export-btn');
        const r = O.readPng(unzipSync(ui.fakes.saved[0]!.bytes)['color.png']!);
        const alphaAt = (x: number, y: number) => r.data[(y * 192 + x) * 4 + 3]!;
        expect(alphaAt(2, 2)).toBe(0);          // the background at the edge is gone
        expect(alphaAt(95, 95)).toBe(255);      // the hole inside the logo stays
        expect(alphaAt(60, 60)).toBe(255);      // the logo stays
    });

    it('the accent colour then shows behind the icon: the contrast check is judged against it', async () => {
        const ui = await loaded({ color: flatIcon() });
        expect(document.querySelector('[data-check-id="color.contrast"]')).toBeNull();   // the icon brings its own background
        await ui.click('ed-img-transparent-color');
        expect(document.querySelector('[data-check-id="color.contrast"]')).not.toBeNull();
        await ui.type('ed-accentColor', '#FFFFFF');
        expect(document.querySelector('[data-check-id="color.contrast"]')!.getAttribute('data-verdict')).toBe('warning');   // white on white
        await ui.type('ed-accentColor', '#FFA575');
        expect($('preview-body').textContent).toBeDefined();
    });

    it('says why when there is nothing to take away', async () => {
        const ui = await loaded();                 // the usual icon is already see-through
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-msg-color').hidden).toBe(false);
        expect($('ed-img-msg-color').textContent).toContain('already see-through');
        expect($('ed-img-color').getAttribute('data-changed')).toBe('false');
    });

    it('pressing it again says that it is already see-through, as information and not in red, and the caption names the accent colour', async () => {
        const ui = await loaded({ color: flatIcon() });
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-caption-color').hidden).toBe(false);
        expect($('ed-img-caption-color').textContent).toContain('#07687d');
        expect($('ed-img-caption-color').textContent).toContain('not part of the file');
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-msg-color').textContent).toContain('already see-through');
        expect($('ed-img-msg-color').classList.contains('is-info')).toBe(true);
        await ui.type('ed-accentColor', '#FFA575');
        expect($('ed-img-caption-color').textContent).toContain('#FFA575');   // it follows the accent colour
    });

    it('a message that is a real problem is not styled as information', async () => {
        const gradient = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => [x, y, 100, 255] });
        const ui = await loaded({ color: gradient });
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-msg-color').classList.contains('is-info')).toBe(false);
        expect($('ed-img-caption-color').dataset.state).toBe('opaque');   // an opaque icon: the accent colour is not seen
    });

    it('says why when the edges are not one flat colour', async () => {
        const gradient = encodePng({ width: 192, height: 192, colorType: 6, pixel: (x, y) => [x, y, 100, 255] });
        const ui = await loaded({ color: gradient });
        await ui.click('ed-img-transparent-color');
        expect($('ed-img-msg-color').textContent).toContain('no flat colour along the edges');
    });

    it('can be undone with Revert', async () => {
        const ui = await loaded({ color: flatIcon() });
        await ui.click('ed-img-transparent-color');
        await ui.click('ed-img-revert-color');
        expect($('ed-img-color').getAttribute('data-changed')).toBe('false');
        await ui.click('export-btn');
        expect(corner(unzipSync(ui.fakes.saved[0]!.bytes)['color.png']!)).toEqual([7, 104, 125, 255]);
    });
});

describe('the outline icon as the left bar of Teams draws it', () => {
    const blue = (): Uint8Array => encodePng({ width: 32, height: 32, colorType: 6, pixel: (x, y) => (x >= 8 && x < 24 && y >= 8 && y < 24 ? [43, 95, 217, 255] : [0, 0, 0, 0]) });

    it('says what the icon is for: the left bar, the shape only, white on see-through', async () => {
        await loaded();
        const caption = $('ed-img-caption-outline');
        expect(caption.hidden).toBe(false);
        expect(caption.textContent).toContain('left bar of Teams');
        expect(caption.textContent).toContain('only the shape');
        expect(caption.textContent).toContain('white on see-through');
    });

    it('makes the shape white: every visible pixel pure white, alpha kept, and the outline checks pass', async () => {
        const ui = await loaded({ outline: blue() });
        expect(document.querySelector('[data-check-id="outline.white"]')!.getAttribute('data-verdict')).toBe('fail');
        await ui.click('ed-img-white-outline');
        expect(document.querySelector('[data-check-id="outline.white"]')!.getAttribute('data-verdict')).toBe('pass');
        await ui.click('export-btn');
        const r = O.readPng(unzipSync(ui.fakes.saved[0]!.bytes)['outline.png']!);
        expect(Array.from(r.data.slice((16 * 32 + 16) * 4, (16 * 32 + 16) * 4 + 4))).toEqual([255, 255, 255, 255]);
        expect(r.data[3]).toBe(0);                                                          // the corner stays see-through
    });

    it('says, as information, that the shape is white already', async () => {
        const ui = await loaded();
        await ui.click('ed-img-white-outline');
        expect($('ed-img-msg-outline').textContent).toContain('already white');
        expect($('ed-img-msg-outline').classList.contains('is-info')).toBe(true);
        expect($('ed-img-outline').getAttribute('data-changed')).toBe('false');
    });
});

describe('the Changes table and the contents', () => {
    it('says that nothing changed', async () => {
        await loaded();
        expect($('changes-none').textContent).toContain('No change');
        expect(document.getElementById('changes-table')).toBeNull();
    });

    it('lists exactly the fields that differ, with old and new values', async () => {
        const ui = await loaded();
        await ui.type('ed-version', '1.0.1');
        await ui.type('ed-developer.name', 'Fabrikam');
        const rows = [...document.querySelectorAll('#changes-table tbody tr')].map(r => [r.getAttribute('data-path'), r.children[1]!.textContent, r.children[2]!.textContent]);
        // in the order of the manifest, not the order of the edits
        expect(rows).toEqual([['version', '1.0.0', '1.0.1'], ['developer.name', 'Contoso', 'Fabrikam']]);
    });

    it('a long value is cut in the table and whole in the tooltip', async () => {
        const ui = await loaded();
        const long = 'word '.repeat(120).trim();
        await ui.type('ed-description.full', long);
        const cell = document.querySelector('#changes-table tr[data-path="description.full"] .chg-new') as HTMLElement;
        expect([...cell.textContent!].length).toBe(80);   // 79 characters and the ellipsis
        expect(cell.textContent!.endsWith('…')).toBe(true);
        expect(cell.title).toBe(long);
    });

    it('lists a replaced icon with both sizes, and the contents table marks the file', async () => {
        const ui = await loaded();
        ui.fakes.files.set('new.png', newColor());
        await ui.click('ed-img-pick-color');
        const r = document.querySelector('#changes-table tr[data-icon="color"]')!;
        expect(r.children[1]!.textContent).toContain('192 x 192 pixels');
        expect(r.children[2]!.textContent).toContain('192 x 192 pixels');
        expect(document.querySelector('#contents-table tr[data-path="color.png"]')!.getAttribute('data-state')).toBe('changed');
        expect(document.querySelector('#contents-table tr[data-path="manifest.json"]')!.getAttribute('data-state')).toBe('identical');
        expect($('contents-note').textContent).toContain('color.png is replaced; the manifest is identical');
    });

    it('a removed optional field is shown as removed', async () => {
        const ui = await loaded();
        await ui.type('ed-name.full', '');
        const cell = document.querySelector('#changes-table tr[data-path="name.full"] .chg-new') as HTMLElement;
        expect(cell.textContent).toBe('removed');
    });
});

describe('what is saved', () => {
    it('only the edited values differ, and every other file is identical', async () => {
        const ui = await loaded({ manifest: { unknownAfter: { custom: { deep: [1, 2] } } } });
        const original = unzipSync(packageBytes({ manifest: { unknownAfter: { custom: { deep: [1, 2] } } } }));
        await ui.type('ed-description.short', 'Brand new');
        await ui.type('ed-accentColor', '#00ff00');
        await ui.click('ed-bump-minor');
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        const before = JSON.parse(new TextDecoder().decode(original['manifest.json']!));
        const after = JSON.parse(new TextDecoder().decode(out['manifest.json']!));
        expect(after).toEqual({ ...before, description: { ...before.description, short: 'Brand new' }, accentColor: '#00ff00', version: '1.1.0' });
        for (const k of Object.keys(original)) if (k !== 'manifest.json') expect(Array.from(out[k]!)).toEqual(Array.from(original[k]!));
    });

    it('the suffix and an edited name work together', async () => {
        const ui = await loaded();
        await ui.type('suffix-input', 'UAT');
        await ui.type('ed-name.full', 'Custom full');
        await ui.click('export-btn');
        const out = unzipSync(ui.fakes.saved[0]!.bytes);
        expect(JSON.parse(new TextDecoder().decode(out['manifest.json']!)).name).toEqual({ short: 'Sales Helper [UAT]', full: 'Custom full' });
    });

    it('the checks report lists the edited fields', async () => {
        const ui = await loaded();
        await ui.type('ed-version', '2.0.0');
        await ui.click('save-report-btn');
        const report = JSON.parse(ui.fakes.saved[0]!.text!);
        expect(report.edited).toEqual(['version']);
    });
});

describe('the notice about the version', () => {
    const hint = () => document.getElementById('export-version-hint');

    it('is not there when nothing changed', async () => {
        await loaded();
        expect(hint()).toBeNull();
    });

    it('appears once something changed and the version did not, and raising it removes it', async () => {
        const ui = await loaded();
        await ui.type('ed-description.short', 'New text');
        expect(hint()).not.toBeNull();
        expect(hint()!.textContent).toContain('still 1.0.0');
        expect(hint()!.textContent).toContain('newer version of the title');
        await ui.click('export-bump-btn');
        expect(field('version').value).toBe('1.0.1');
        expect(hint()).toBeNull();
        expect($('export-reason').hidden).toBe(true);   // it is a notice, not a block
        await ui.click('export-btn');
        expect(ui.fakes.saved).toHaveLength(1);
    });

    it('appears for a replaced icon too, and not when the version was raised by hand', async () => {
        const ui = await loaded();
        ui.fakes.files.set('new.png', newColor());
        await ui.click('ed-img-pick-color');
        expect(hint()).not.toBeNull();
        await ui.type('ed-version', '2.0.0');
        expect(hint()).toBeNull();
    });

    it('offers no button for a version that is not three numbers', async () => {
        const ui = await loaded({ manifest: { appVersion: '2024-01' } });
        await ui.type('ed-description.short', 'x');
        expect(hint()).not.toBeNull();
        expect(document.getElementById('export-bump-btn')).toBeNull();
    });
});

describe('what the editor does not edit', () => {
    it('is listed in the first step, in the declared entries, and not in the editor', async () => {
        await loaded({ manifest: { unknownAfter: { copilotAgents: { declarativeAgents: [] }, zzz: 5 } } });
        const declared = [...document.querySelectorAll('#summary .fact-row')].find(r => r.textContent!.startsWith('Declared'))!;
        const keys = [...declared.querySelectorAll('.chip')].map(c => c.textContent);
        expect(keys).toEqual(expect.arrayContaining(['manifestVersion', 'id', 'bots', 'copilotAgents', 'zzz']));
        expect(document.getElementById('ed-readonly')).toBeNull();
        expect(document.getElementById('ed-card-readonly')).toBeNull();
    });

    it('a name that is a localisation key cannot be typed over, and says why on the field', async () => {
        await loaded({ manifest: { nameFull: '[[DA_Full]]' } });
        expect(field('name.full').disabled).toBe(true);
        expect(field('name.full').value).toBe('[[DA_Full]]');
        expect($('ed-help-name.full').textContent).toContain('language file');
        expect(field('name.short').disabled).toBe(false);
    });

    it('entries that are unknown survive the save as they were', async () => {
        const ui = await loaded({ manifest: { unknownAfter: { zzz: { keep: ['me'] } } } });
        await ui.type('ed-version', '1.0.9');
        await ui.click('export-btn');
        const m = JSON.parse(new TextDecoder().decode(unzipSync(ui.fakes.saved[0]!.bytes)['manifest.json']!));
        expect(m.zzz).toEqual({ keep: ['me'] });
    });
});

describe('Revert on a name under a typed suffix', () => {
    it('puts back the original name, not the suffixed one', async () => {
        const ui = await loaded();
        await ui.type('suffix-input', 'UAT');
        expect(field('name.short').value).toBe('Sales Helper [UAT]');
        expect(changed('name.short')).toBe(true);
        await ui.click('ed-revert-name.short');
        expect(field('name.short').value).toBe('Sales Helper [DEV]');
        expect(changed('name.short')).toBe(false);
        expect(changed('name.full')).toBe(true);   // the other name keeps the suffix
    });
});

describe('edits do not outlive the package', () => {
    it('loading another package starts clean', async () => {
        const ui = await loaded();
        await ui.type('ed-version', '5.5.5');
        ui.fakes.files.set('Other.zip', packageBytes({ manifest: { appVersion: '7.0.0' } }));
        await ui.click('replace-btn');
        expect(field('version').value).toBe('7.0.0');
        expect(changed('version')).toBe(false);
        expect($('changes-none')).not.toBeNull();
    });

    it('removing the package empties the editor', async () => {
        const ui = await loaded();
        await ui.type('ed-version', '5.5.5');
        await ui.click('remove-btn');
        expect($('edit-groups').children).toHaveLength(0);
        expect($('changes-body').children).toHaveLength(0);
    });

    it('edits stay while moving between the steps', async () => {
        const ui = await loaded();
        await ui.type('ed-version', '5.5.5');
        document.querySelector<HTMLElement>('[data-goto="4"]')!.click();
        document.querySelector<HTMLElement>('[data-goto="2"]')!.click();
        await flush();
        expect(field('version').value).toBe('5.5.5');
    });
});

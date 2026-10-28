// @vitest-environment jsdom
/**
 * Feature 006 (package drop zone). The expected texts and the matrix are written from
 * specs/006-package-drop-zone/spec.md and contracts/ui-contract.md, with no code from src/.
 */
import { describe, expect, it } from 'vitest';
import { boot, flush } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string) => document.getElementById(id)!;

function fire(target: Element | Document, type: string, init: { types?: string[]; files?: File[] } = {}): Event {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: init.types ?? ['Files'], files: init.files ?? [] } });
    target.dispatchEvent(event);
    return event;
}
const zip = (name: string) => new File([packageBytes() as BlobPart], name);
const NOT_ZIP = (name: string) => `${name}: this is not a zip. Drop the Teams app package, the .zip you download from Copilot Studio.`;
const ONE_AT_A_TIME = 'Drop one package at a time.';

describe('the drop zone (FR-001, FR-009)', () => {
    it('shows the icon, the title, the word "or", the button and the hint', async () => {
        await boot();
        const zone = $('drop-area');
        expect(zone.hidden).toBe(false);
        expect(zone.querySelector('.icon-upload')).not.toBeNull();
        expect($('drop-title').textContent).toBe('Drop the package here');
        expect(zone.textContent).toContain('or');
        expect($('open-btn').textContent).toContain('Open package');
        expect($('drop-hint').textContent).toBe('Only the .zip of the Teams app package');
        expect($('drop-text').textContent).toContain('never sent anywhere');
    });

    it('has a polite live region for the overlay, hidden at the start', async () => {
        await boot();
        expect($('drop-overlay').getAttribute('aria-live')).toBe('polite');
        expect($('drop-overlay').hidden).toBe(true);
        expect($('loader').classList.contains('is-over')).toBe(false);
    });
});

describe('feedback while dragging (FR-002, FR-003, FR-004)', () => {
    it('highlights on enter and says "open" when nothing is loaded; leave removes it', async () => {
        await boot();
        fire($('loader'), 'dragenter');
        expect($('loader').classList.contains('is-over')).toBe(true);
        expect($('drop-overlay').hidden).toBe(false);
        expect($('drop-overlay-text').textContent).toBe('Release to open this package');
        fire($('loader'), 'dragleave');
        expect($('loader').classList.contains('is-over')).toBe(false);
        expect($('drop-overlay').hidden).toBe(true);
    });

    it('says "replace" when a package is loaded', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        fire($('loader'), 'dragenter');
        expect($('drop-overlay-text').textContent).toBe('Release to replace the package');
    });

    it('does not flicker between children: enter child, leave parent, still lit; the last leave clears', async () => {
        await boot();
        fire($('loader'), 'dragenter');
        fire($('open-btn'), 'dragenter');
        fire($('loader'), 'dragleave');
        expect($('loader').classList.contains('is-over')).toBe(true);
        fire($('open-btn'), 'dragleave');
        expect($('loader').classList.contains('is-over')).toBe(false);
    });

    it('an extra leave never makes the counter negative', async () => {
        await boot();
        fire($('loader'), 'dragleave');
        fire($('loader'), 'dragleave');
        fire($('loader'), 'dragenter');
        expect($('loader').classList.contains('is-over')).toBe(true);
    });

    it('dragging text or a link (no files) does nothing', async () => {
        await boot();
        for (const type of ['dragenter', 'dragover']) fire($('loader'), type, { types: ['text/plain', 'text/uri-list'] });
        expect($('loader').classList.contains('is-over')).toBe(false);
        expect($('drop-overlay').hidden).toBe(true);
    });

    it('a drop clears the highlight', async () => {
        await boot();
        fire($('loader'), 'dragenter');
        fire($('loader'), 'drop', { files: [zip('x.zip')] });
        expect($('loader').classList.contains('is-over')).toBe(false);
        expect($('drop-overlay').hidden).toBe(true);
    });
});

describe('what is dropped (FR-005, FR-006)', () => {
    const cases: Array<[string, string[], string | null]> = [
        ['a zip', ['Sales.zip'], null],
        ['an upper case extension', ['SALES.ZIP'], null],
        ['a mixed case extension', ['Sales.Zip'], null],
        ['a png', ['icon.png'], NOT_ZIP('icon.png')],
        ['no extension', ['package'], NOT_ZIP('package')],
        ['zip in the middle', ['a.zip.txt'], NOT_ZIP('a.zip.txt')],
        ['only ".zip" in the name of a folder-like file', ['zip'], NOT_ZIP('zip')],
        ['two zips', ['a.zip', 'b.zip'], ONE_AT_A_TIME],
        ['a zip and a png', ['a.zip', 'b.png'], ONE_AT_A_TIME],
    ];
    for (const [label, names, refusal] of cases) {
        it(`${label}: ${refusal ?? 'loaded'}`, async () => {
            const ui = await boot();
            fire($('loader'), 'drop', { files: names.map(zip) });
            await flush(8);
            if (refusal === null) {
                expect(ui.text('file-name')).toBe(names[0]);
                expect($('load-message').hidden).toBe(true);
            } else {
                expect($('load-message').hidden).toBe(false);
                expect(ui.text('load-message-text')).toBe(refusal);
                expect($('file-bar').hidden).toBe(true);
                expect($('drop-area').hidden).toBe(false);
            }
        });
    }

    it('a refused drop leaves the loaded package as it was', async () => {
        const ui = await boot();
        await ui.open('keep.zip', packageBytes());
        fire($('loader'), 'drop', { files: [zip('other.png')] });
        await flush(8);
        expect(ui.text('file-name')).toBe('keep.zip');
        expect(ui.text('load-message-text')).toBe(NOT_ZIP('other.png'));
    });

    it('a drop with no files does nothing', async () => {
        const ui = await boot();
        fire($('loader'), 'drop', { files: [] });
        await flush(4);
        expect($('file-bar').hidden).toBe(true);
        expect($('load-message').hidden).toBe(true);
        expect(ui.text('file-name')).toBe('');
    });

    it('a zip that is not a Teams package keeps the refusal of the reader', async () => {
        const ui = await boot();
        fire($('loader'), 'drop', { files: [new File([new Uint8Array([1, 2, 3, 4])], 'bad.zip')] });
        await flush(8);
        expect($('load-message').hidden).toBe(false);
        expect(ui.text('load-message-text')).toMatch(/^bad\.zip: /);
        expect(ui.text('load-message-text')).not.toBe(NOT_ZIP('bad.zip'));
    });
});

describe('a drop outside the panel (FR-007)', () => {
    it('is cancelled so the window does not navigate, and loads nothing', async () => {
        const ui = await boot();
        const over = fire(document.body, 'dragover');
        const dropped = fire(document.body, 'drop', { files: [zip('x.zip')] });
        await flush(6);
        expect(over.defaultPrevented).toBe(true);
        expect(dropped.defaultPrevented).toBe(true);
        expect($('file-bar').hidden).toBe(true);
        expect(ui.text('file-name')).toBe('');
    });

    it('a drag of text outside the panel is left alone', async () => {
        await boot();
        expect(fire(document.body, 'dragover', { types: ['text/plain'] }).defaultPrevented).toBe(false);
    });
});

describe('opening with the mouse (FR-008)', () => {
    it('a click on the zone opens the dialog once', async () => {
        const ui = await boot();
        ui.fakes.files.set('z.zip', packageBytes());
        $('drop-area').click();
        await flush(6);
        expect(ui.text('file-name')).toBe('z.zip');
    });

    it('a click on the button opens the dialog once, not twice', async () => {
        const ui = await boot();
        let calls = 0;
        const host = (globalThis as unknown as { toolboxAPI: { fileSystem: { selectPath: () => Promise<string> } } }).toolboxAPI.fileSystem;
        const original = host.selectPath;
        host.selectPath = async () => { calls++; return original(); };
        ui.fakes.files.set('z.zip', packageBytes());
        $('open-btn').click();
        await flush(6);
        expect(calls).toBe(1);
    });
});

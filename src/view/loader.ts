/** The loader panel: open button, drop area, loaded file name, refusal message (FR-001, FR-002, FR-029). */

export interface LoaderHandlers {
    /** The user asked to open a file with the host's dialog (or the input fallback). */
    onOpen: () => void;
    /** A file chosen with the input or dropped on the page. */
    onFile: (file: File) => void;
    /** The user removed the loaded package. */
    onRemove: () => void;
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export function initLoader(h: LoaderHandlers): void {
    $('open-btn').addEventListener('click', h.onOpen);
    $('replace-btn').addEventListener('click', h.onOpen);
    $('remove-btn').addEventListener('click', h.onRemove);
    $('load-message-close').addEventListener('click', () => showMessage(null));

    const input = $<HTMLInputElement>('file-input');
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.value = '';
        if (file) h.onFile(file);
    });

    // The whole panel takes a dropped file, whether it shows the empty area or the loaded file.
    const area = $('loader');
    let depth = 0;   // dragenter minus dragleave: the events of the children must not clear the highlight
    const light = (on: boolean): void => {
        area.classList.toggle('is-over', on);
        $('drop-overlay').hidden = !on;
        if (on) $('drop-overlay-text').textContent = $('file-bar').hidden ? 'Release to open this package' : 'Release to replace the package';
    };
    area.addEventListener('dragenter', e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth++;
        light(true);
    });
    area.addEventListener('dragover', e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        light(true);
    });
    area.addEventListener('dragleave', () => {
        depth = Math.max(0, depth - 1);
        if (depth === 0) light(false);
    });
    area.addEventListener('drop', e => {
        e.preventDefault();
        depth = 0;
        light(false);
        const names = [...((e as DragEvent).dataTransfer?.files ?? [])];
        const verdict = checkDropped(names.map(f => f.name));
        if (!verdict.ok) { showMessage(verdict.message); return; }
        if (names[0]) h.onFile(names[0]);
    });

    // A file dropped anywhere else must not make the window navigate to it.
    for (const type of ['dragover', 'drop']) {
        document.addEventListener(type, e => { if (hasFiles(e)) e.preventDefault(); });
    }

    // The whole empty zone opens the dialog; the button inside it is the keyboard path.
    $('drop-area').addEventListener('click', e => {
        if (e.target instanceof Element && e.target.closest('button')) return;
        h.onOpen();
    });
}

const hasFiles = (e: Event): boolean => [...((e as DragEvent).dataTransfer?.types ?? [])].includes('Files');

export type Dropped = { ok: true } | { ok: false; message: string };

/** What a drop may carry: no file does nothing, one `.zip` is loaded, anything else is refused. */
export function checkDropped(names: string[]): Dropped {
    if (names.length === 0) return { ok: true };
    if (names.length > 1) return { ok: false, message: 'Drop one package at a time.' };
    const name = names[0]!;
    if (!/\.zip$/i.test(name)) return { ok: false, message: `${name}: this is not a zip. Drop the Teams app package, the .zip you download from Copilot Studio.` };
    return { ok: true };
}

/** Opens the fallback file input (outside the host, or when it has no file dialog). */
export function openFileInput(): void {
    $<HTMLInputElement>('file-input').click();
}

/** Shows the empty area, or the bar of the loaded file with a line about its content. */
export function showLoaded(fileName: string | null, meta = ''): void {
    $('drop-area').hidden = fileName !== null;
    $('file-bar').hidden = fileName === null;
    const name = $('file-name');
    name.textContent = fileName ?? '';
    name.title = fileName ?? '';
    $('file-meta').textContent = meta;
    $('summary').hidden = fileName === null;
}

export function showMessage(text: string | null): void {
    $('load-message').hidden = text === null;
    $('load-message-text').textContent = text ?? '';
}

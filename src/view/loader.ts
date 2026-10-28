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
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('is-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('is-over'));
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.classList.remove('is-over');
        const file = (e as DragEvent).dataTransfer?.files?.[0];
        if (file) h.onFile(file);
    });
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

/// <reference types="@pptb/types" />

/**
 * The only module that touches the PPTB API (files on the user's computer). Everything else is
 * pure and runs unchanged in the Node tests.
 *
 * Reading: the host's file dialog plus `readBinary`; outside the host (or when it has no file
 * system) the screen falls back to a file input and drag-and-drop, see `readFileObject`.
 *
 * Writing: `saveFile` opens one native dialog. The platform has no silent binary write (see
 * Agent Nameplate's files.ts); one package means one dialog, which is also the user's control over
 * where the copy goes.
 */

export interface PickedFile {
    name: string;
    bytes: Uint8Array;
}

type HostFs = {
    selectPath?: (o?: { type?: 'file' | 'folder'; title?: string; buttonLabel?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>;
    readBinary?: (p: string) => Promise<ArrayLike<number>>;
    saveFile?: (defaultPath: string, content: unknown, filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>;
};

function hostFs(): HostFs | undefined {
    return (globalThis as { toolboxAPI?: { fileSystem?: HostFs } }).toolboxAPI?.fileSystem;
}

/** `true` when the host can show a file dialog and read the chosen file. */
export function hasHostFiles(): boolean {
    const fs = hostFs();
    return typeof fs?.selectPath === 'function' && typeof fs?.readBinary === 'function';
}

const baseName = (path: string): string => path.split(/[\\/]/).pop() || path;

/** Asks the host for a zip and reads it; `null` when the user cancels. */
export async function pickPackage(): Promise<PickedFile | null> {
    const fs = hostFs();
    if (!fs?.selectPath || !fs.readBinary) return null;
    const path = await fs.selectPath({
        type: 'file',
        title: 'Open the Teams app package of an agent',
        buttonLabel: 'Open package',
        filters: [{ name: 'Teams app package', extensions: ['zip'] }],
    });
    if (!path) return null;
    const data = await fs.readBinary(path);
    return { name: baseName(path), bytes: Uint8Array.from(data) };
}

/** Asks the host for a PNG (an icon) and reads it; `null` when the user cancels. */
export async function pickPng(title: string): Promise<PickedFile | null> {
    const fs = hostFs();
    if (!fs?.selectPath || !fs.readBinary) return null;
    const path = await fs.selectPath({ type: 'file', title, buttonLabel: 'Use this image', filters: [{ name: 'PNG image', extensions: ['png'] }] });
    if (!path) return null;
    const data = await fs.readBinary(path);
    return { name: baseName(path), bytes: Uint8Array.from(data) };
}

/** Asks the host for an image of any kind the image editor reads; `null` when the user cancels. */
export async function pickImage(): Promise<PickedFile | null> {
    const fs = hostFs();
    if (!fs?.selectPath || !fs.readBinary) return null;
    const path = await fs.selectPath({
        type: 'file', title: 'Open an image', buttonLabel: 'Open image',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
    });
    if (!path) return null;
    const data = await fs.readBinary(path);
    return { name: baseName(path), bytes: Uint8Array.from(data) };
}

/** Saves a PNG. Same rules as `savePackage`. */
export async function savePngFile(defaultName: string, bytes: Uint8Array): Promise<string | null> {
    const fs = hostFs();
    if (typeof fs?.saveFile === 'function') return fs.saveFile(defaultName, bytes, [{ name: 'PNG image', extensions: ['png'] }]);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return defaultName;
}

/** A file chosen with the input or dropped on the page. */
export async function readFileObject(file: File): Promise<PickedFile> {
    return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

/**
 * Saves the new package. Returns the path the user chose (or the file name when the browser
 * download fallback was used), `null` when the user cancels.
 */
export async function savePackage(defaultName: string, bytes: Uint8Array): Promise<string | null> {
    const fs = hostFs();
    if (typeof fs?.saveFile === 'function') {
        return fs.saveFile(defaultName, bytes, [{ name: 'Teams app package', extensions: ['zip'] }]);
    }
    // Outside the host: an ordinary browser download.
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return defaultName;
}

/** Saves a text file (the checks report). Same rules as `savePackage`. */
export async function saveText(defaultName: string, text: string, filter: { name: string; extensions: string[] }): Promise<string | null> {
    const fs = hostFs();
    if (typeof fs?.saveFile === 'function') return fs.saveFile(defaultName, text, [filter]);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return defaultName;
}

/**
 * Puts `text` on the clipboard: the host's own call when it has one, else the browser's. `true`
 * when it worked. The text never goes anywhere else.
 */
export async function copyText(text: string): Promise<boolean> {
    const utils = (globalThis as { toolboxAPI?: { utils?: { copyToClipboard?: (t: string) => Promise<void> | void } } }).toolboxAPI?.utils;
    try {
        if (typeof utils?.copyToClipboard === 'function') { await utils.copyToClipboard(text); return true; }
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* falls through to false */ }
    return false;
}

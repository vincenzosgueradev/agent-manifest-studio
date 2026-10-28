/**
 * Loads the REAL page (`src/index.html`) and the real `src/app.ts` in jsdom, replacing only the
 * outside world: the PPTB file API and the canvas (jsdom has none). Tests drive the real DOM.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';

export interface Fakes {
    /** Bytes the next "open" returns; set by `open()`. */
    files: Map<string, Uint8Array>;
    /** What the save dialog was given: bytes for a package, `text` for a report. */
    saved: Array<{ defaultPath: string; bytes: Uint8Array; text?: string }>;
    /** What was put on the clipboard, in order. */
    copied: string[];
    /** Makes the clipboard fail. */
    copyFails: boolean;
    /** What the save dialog answers: a path, or null for "cancelled". */
    saveAnswer: string | null;
    theme: 'light' | 'dark';
    /** Fires a host event (for example `settings:updated`). */
    emit: (event: string) => void;
}

export interface Ui {
    fakes: Fakes;
    $: <T extends HTMLElement = HTMLElement>(id: string) => T;
    /** Chooses `name` (already in `fakes.files`) through the host dialog. */
    open: (name: string, bytes: Uint8Array) => Promise<void>;
    type: (id: string, value: string) => Promise<void>;
    click: (id: string) => Promise<void>;
    text: (id: string) => string;
    /** Pixels drawn on a canvas by the view (RGBA, width, height). */
    pixels: (canvas: HTMLCanvasElement) => { data: Uint8ClampedArray; width: number; height: number } | undefined;
}

export async function flush(times = 6): Promise<void> {
    for (let i = 0; i < times; i++) await new Promise(r => setTimeout(r, 0));
}

const documentListeners: Array<[string, EventListenerOrEventListenerObject]> = [];
let patched = false;

const drawn = new WeakMap<HTMLCanvasElement, { data: Uint8ClampedArray; width: number; height: number }>();

export async function boot(opts: { theme?: 'light' | 'dark'; saveAnswer?: string | null } = {}): Promise<Ui> {
    const html = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');

    // Each boot re-imports the app, which registers listeners on `document`; the document outlives
    // the boot, so the previous app's listeners are removed or they would act on the new page.
    for (const [type, listener] of documentListeners) document.removeEventListener(type, listener);
    documentListeners.length = 0;
    if (!patched) {
        const add = document.addEventListener.bind(document);
        document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            documentListeners.push([type, listener]);
            add(type, listener, options);
        }) as typeof document.addEventListener;
        patched = true;
    }
    document.body.innerHTML = body;
    document.documentElement.removeAttribute('data-theme');

    const fakes: Fakes = { files: new Map(), saved: [], copied: [], copyFails: false, saveAnswer: opts.saveAnswer === undefined ? 'C:\\out\\saved.zip' : opts.saveAnswer, theme: opts.theme ?? 'dark', emit: () => undefined };
    const handlers: Array<(e: unknown, p: { event: string }) => void> = [];
    fakes.emit = event => { for (const h of handlers) h(null, { event }); };

    // jsdom has no canvas: record what the views draw.
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
        const canvas = this;
        return {
            createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
            putImageData: (img: { data: Uint8ClampedArray; width: number; height: number }) => { drawn.set(canvas, img); },
            clearRect: () => undefined,
        };
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;

    (globalThis as Record<string, unknown>).__APP_VERSION__ = '0.0.0-test';
    (globalThis as Record<string, unknown>).toolboxAPI = {
        fileSystem: {
            selectPath: async () => 'C:\\in\\' + [...fakes.files.keys()].pop(),
            readBinary: async (p: string) => fakes.files.get(p.split('\\').pop()!)!,
            saveFile: async (defaultPath: string, content: Uint8Array | string) => {
                fakes.saved.push(typeof content === 'string' ? { defaultPath, bytes: new Uint8Array(0), text: content } : { defaultPath, bytes: content });
                return fakes.saveAnswer;
            },
        },
        utils: {
            getCurrentTheme: async () => fakes.theme,
            copyToClipboard: async (text: string) => {
                if (fakes.copyFails) throw new Error('clipboard denied');
                fakes.copied.push(text);
            },
        },
        events: { on: (cb: (e: unknown, p: { event: string }) => void) => { handlers.push(cb); } },
    };

    vi.resetModules();
    await import('../../src/app');
    await flush();

    const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
    return {
        fakes,
        $,
        async open(name, bytes) {
            fakes.files.set(name, bytes);
            $('open-btn').click();
            await flush();
        },
        async type(id, value) {
            const input = $<HTMLInputElement>(id);
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await flush(2);
        },
        async click(id) { $(id).click(); await flush(); },
        text: id => $(id).textContent ?? '',
        pixels: canvas => drawn.get(canvas),
    };
}

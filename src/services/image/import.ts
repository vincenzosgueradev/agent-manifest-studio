/**
 * Getting a picture into the editor (FR-002, FR-003). A PNG is read by the tool's own reader. JPEG,
 * WebP, GIF and SVG are read by a decoder that the host window may offer (`HostDecoder`); without one
 * they are refused with the cause. A picture over 1024 pixels on its longer side is reduced.
 */

import { decodePng } from '../png';
import { PACKAGE_MAX_BYTES } from '../limits';
import { resizePicture } from './resample';
import { IMAGE_WORKING_MAX, type Picture } from './types';

export type ImportResult =
    | { ok: true; picture: Picture; /** What the user should know: a reduction, a format read by the window. */ note: string | null }
    | { ok: false; message: string };

/** Reads the pixels of an image the window can draw; `null` when it cannot. */
export type HostDecoder = (bytes: Uint8Array, mime: string) => Promise<Picture | null>;

export type Format = 'png' | 'jpeg' | 'gif' | 'webp' | 'svg';

const MIME: Record<Format, string> = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

/** The format by what the file starts with, never by its name. */
export function sniff(bytes: Uint8Array): Format | null {
    const at = (i: number): number => bytes[i] ?? -1;
    if (at(0) === 137 && at(1) === 80 && at(2) === 78 && at(3) === 71) return 'png';
    if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
    if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) return 'gif';
    if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return 'webp';
    const head = new TextDecoder('utf-8').decode(bytes.subarray(0, 512)).replace(/^\uFEFF/, '').trimStart();
    return /^(<\?xml[\s\S]*?)?<svg[\s>]/i.test(head) ? 'svg' : null;
}

/** The picture reduced (area averaging) so that its longer side is at most `max`. */
export function reduceTo(p: Picture, max: number): { picture: Picture; reduced: boolean } {
    const longer = Math.max(p.width, p.height);
    if (longer <= max) return { picture: p, reduced: false };
    const s = max / longer;
    return { picture: resizePicture(p, Math.max(1, Math.round(p.width * s)), Math.max(1, Math.round(p.height * s))), reduced: true };
}

const reduceNote = (before: Picture, after: Picture): string =>
    `The picture was ${before.width} x ${before.height} pixels and was reduced to ${after.width} x ${after.height} to keep the editor quick.`;

function finish(picture: Picture, extra: string | null): ImportResult {
    if (picture.width < 1 || picture.height < 1) return { ok: false, message: 'The picture has no pixels.' };
    const r = reduceTo(picture, IMAGE_WORKING_MAX);
    const note = [extra, r.reduced ? reduceNote(picture, r.picture) : null].filter(Boolean).join(' ') || null;
    return { ok: true, picture: r.picture, note };
}

export function fromPng(bytes: Uint8Array): ImportResult | { ok: 'unsupported'; message: string } {
    const png = decodePng(bytes);
    switch (png.kind) {
        case 'not-png': return { ok: false, message: 'This file is not a PNG.' };
        case 'corrupt': return { ok: false, message: `This PNG is damaged (${png.reason}).` };
        case 'unsupported': return { ok: 'unsupported', message: png.reason };
        case 'ok': return finish({ width: png.header.width, height: png.header.height, data: png.rgba }, null);
    }
}

/** Reads a file of any of the formats above; the decoder is only used for what the tool cannot read itself. */
export async function importImage(bytes: Uint8Array, decoder: HostDecoder | null): Promise<ImportResult> {
    if (bytes.length > PACKAGE_MAX_BYTES) return { ok: false, message: `The file is larger than ${PACKAGE_MAX_BYTES / 1024 / 1024} MB.` };
    const format = sniff(bytes);
    if (format === null) return { ok: false, message: 'This file is not an image the editor knows (PNG, JPEG, WebP, GIF or SVG).' };

    if (format === 'png') {
        const r = fromPng(bytes);
        if (r.ok !== 'unsupported') return r;
        if (!decoder) return { ok: false, message: `This PNG cannot be read by the tool (${r.message}) and the window offers no other reader.` };
    } else if (!decoder) {
        return { ok: false, message: `The editor cannot read ${format.toUpperCase()} files in this window. Convert the image to PNG and open that.` };
    }

    try {
        const picture = await decoder!(bytes, MIME[format]);
        if (!picture) return { ok: false, message: `The window could not read this ${format.toUpperCase()} file.` };
        return finish(picture, `Read by the window as ${format.toUpperCase()}.`);
    } catch {
        return { ok: false, message: `The window could not read this ${format.toUpperCase()} file.` };
    }
}

/**
 * The decoder of the host window, or `null` when it has none. UNVERIFIED in the PPTB window
 * (specs/004-icon-image-editor/research.md section 3); tests use a fake.
 */
export function windowDecoder(): HostDecoder | null {
    const g = globalThis as { createImageBitmap?: (b: Blob) => Promise<{ width: number; height: number; close?: () => void }>; document?: Document };
    if (typeof g.createImageBitmap !== 'function' || typeof g.document?.createElement !== 'function') return null;
    return async (bytes, mime) => {
        const bitmap = await g.createImageBitmap!(new Blob([bytes as BlobPart], { type: mime }));
        try {
            const canvas = g.document!.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0);
            const img = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
            return { width: bitmap.width, height: bitmap.height, data: new Uint8Array(img.data.buffer.slice(0)) };
        } finally {
            bitmap.close?.();
        }
    };
}

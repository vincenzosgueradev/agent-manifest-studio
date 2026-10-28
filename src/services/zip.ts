/**
 * Reading and writing the package zip (FR-001 to FR-003, FR-022, FR-023).
 *
 * Reading checks sizes and paths from the zip DIRECTORY before anything is inflated: a small file
 * whose directory claims gigabytes is refused without ever being decompressed (zip bomb).
 *
 * Writing recreates every entry (never clones a source header: the original offsets would travel
 * with it and the archive would not open) with the same name and order, and a fixed entry date so
 * the same input always gives the same bytes.
 */

import { unzipSync, zipSync, type Zippable } from 'fflate';
import { ENTRY_MAX_BYTES, ENTRY_MAX_COUNT, PACKAGE_MAX_BYTES, PACKAGE_UNPACKED_MAX_BYTES } from './limits';
import type { Entry, PackageFile, ReadErrorCode, ReadResult } from '../types';

const MB = 1024 * 1024;

function refuse(code: ReadErrorCode, message: string): ReadResult {
    return { ok: false, code, message };
}

/** A path inside the package: relative, forward slashes, no `.` or `..`, no empty segment. */
export function isSafePath(path: string): boolean {
    // An empty name or a leading "/" gives an empty first segment, refused below.
    if (path.includes('\\') || /^[A-Za-z]:/.test(path)) return false;
    if (/[\u0000-\u001f\u007f]/.test(path)) return false;
    const segments = (path.endsWith('/') ? path.slice(0, -1) : path).split('/');
    return segments.every(s => s !== '' && s !== '.' && s !== '..');
}

interface DirectoryItem { name: string; size: number }

export function readPackage(bytes: Uint8Array, fileName: string): ReadResult {
    if (bytes.length > PACKAGE_MAX_BYTES) {
        return refuse('too-large', `The file is larger than ${PACKAGE_MAX_BYTES / MB} MB. A Teams app package is a few hundred KB: this is not one.`);
    }

    // Pass 1: the directory only. Returning false from the filter means nothing is inflated.
    const directory: DirectoryItem[] = [];
    try {
        unzipSync(bytes, { filter: f => { directory.push({ name: f.name, size: f.originalSize }); return false; } });
    } catch {
        return refuse('not-zip', 'This file is not a valid zip archive, or it is damaged.');
    }

    if (directory.length > ENTRY_MAX_COUNT) {
        return refuse('too-many-entries', `The package has ${directory.length} entries; more than ${ENTRY_MAX_COUNT} is not a Teams app package.`);
    }
    const seen = new Set<string>();
    let unpacked = 0;
    for (const item of directory) {
        if (!isSafePath(item.name)) {
            return refuse('unsafe-path', `The package contains an entry with an unsafe path: "${item.name}".`);
        }
        if (seen.has(item.name)) {
            return refuse('duplicate-path', `The package contains the path "${item.name}" more than once.`);
        }
        seen.add(item.name);
        if (item.size > ENTRY_MAX_BYTES) {
            return refuse('entry-too-large', `The entry "${item.name}" is larger than ${ENTRY_MAX_BYTES / MB} MB once unpacked.`);
        }
        unpacked += item.size;
    }
    if (unpacked > PACKAGE_UNPACKED_MAX_BYTES) {
        return refuse('too-large', `The package is larger than ${PACKAGE_UNPACKED_MAX_BYTES / MB} MB once unpacked.`);
    }

    // Pass 2: inflate. The sizes were checked, so this is bounded.
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(bytes);
    } catch {
        return refuse('not-zip', 'This file is not a valid zip archive, or it is damaged.');
    }

    const entries: Entry[] = [];
    for (const item of directory) {
        const isDirectory = item.name.endsWith('/');
        const data = files[item.name] ?? (isDirectory ? new Uint8Array(0) : undefined);
        if (!data) return refuse('not-zip', `The entry "${item.name}" could not be unpacked: the archive is damaged.`);
        entries.push({ path: item.name, data, isDirectory });
    }

    if (!entries.some(e => e.path === 'manifest.json')) {
        const nested = entries.find(e => e.path.endsWith('/manifest.json'));
        return nested
            ? refuse('manifest-in-subfolder', `manifest.json is inside the folder "${nested.path.slice(0, -'manifest.json'.length)}". Zip the files themselves, not the folder that contains them.`)
            : refuse('no-manifest', 'The package has no manifest.json at its root: it is not a Teams app package.');
    }

    const pkg: PackageFile = { fileName, entries, byteLength: bytes.length };
    return { ok: true, pkg };
}

/** Fixed entry date (1980-01-01, the earliest a zip can hold): the same input gives the same bytes. */
const FIXED_DATE = new Date(1980, 0, 1, 0, 0, 0);

/**
 * The package as a zip. `replaced` maps a path to its new bytes; every other entry keeps its
 * decompressed content. Names and order are those of `pkg`; a path that `pkg` does not have is
 * added after the others (an icon the manifest declared and the package lacked).
 */
export function writePackage(pkg: PackageFile, replaced: Record<string, Uint8Array> = {}): Uint8Array {
    const out: Zippable = {};
    for (const e of pkg.entries) {
        const data = Object.prototype.hasOwnProperty.call(replaced, e.path) ? replaced[e.path]! : e.data;
        out[e.path] = [data, { mtime: FIXED_DATE, level: e.isDirectory ? 0 : 6 }];
    }
    for (const [path, data] of Object.entries(replaced)) {
        if (!pkg.entries.some(e => e.path === path)) out[path] = [data, { mtime: FIXED_DATE, level: 6 }];
    }
    return zipSync(out);
}

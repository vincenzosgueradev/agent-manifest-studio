/** Finds the icons the manifest declares inside the package and decodes them. */

import { decodePng } from './png';
import type { IconInfo, IconSet, ManifestView, PackageFile } from '../types';

function info(pkg: PackageFile, path: string | null): IconInfo {
    const entry = path === null ? undefined : pkg.entries.find(e => e.path === path && !e.isDirectory);
    if (!entry) return { path, present: false, byteLength: 0, png: null };
    return { path, present: true, byteLength: entry.data.length, png: decodePng(entry.data) };
}

export function loadIcons(pkg: PackageFile, manifest: ManifestView): IconSet {
    return {
        color: info(pkg, manifest.icons.color),
        outline: info(pkg, manifest.icons.outline),
        color32x32: manifest.icons.color32x32 === null ? null : info(pkg, manifest.icons.color32x32),
    };
}

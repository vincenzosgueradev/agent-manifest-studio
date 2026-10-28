/**
 * A valid Teams package built from the helpers; one place to get a package and to break it.
 * Imports nothing from `src/`.
 */
import { encodePng, solidPng, type Rgba } from './png-encoder';
import { deflatedZip, type RawEntry } from './zip-builder';
import { buildManifest, type ManifestOpts } from './manifest-builder';

const enc = new TextEncoder();

/** 192x192 colour icon: a white glyph (square) on a transparent background. */
export function colorIcon(bg: Rgba = [0, 0, 0, 0]): Uint8Array {
    return encodePng({
        width: 192, height: 192, colorType: 6,
        pixel: (x, y) => (x >= 66 && x < 126 && y >= 66 && y < 126 ? [255, 255, 255, 255] : bg),
    });
}

/** 32x32 outline icon: white on transparent. */
export function outlineIcon(): Uint8Array {
    return encodePng({
        width: 32, height: 32, colorType: 6,
        pixel: (x, y) => (x >= 8 && x < 24 && y >= 8 && y < 24 ? [255, 255, 255, 255] : [0, 0, 0, 0]),
    });
}

export interface PackageOpts {
    manifest?: ManifestOpts;
    /** Raw manifest text instead of a built one. */
    manifestText?: string;
    color?: Uint8Array | null;
    outline?: Uint8Array | null;
    color32?: Uint8Array | null;
    /** Extra entries appended in order. */
    extra?: RawEntry[];
}

export function packageEntries(o: PackageOpts = {}): RawEntry[] {
    const m = o.manifest ?? {};
    const colorPath = m.colorPath === undefined ? 'color.png' : m.colorPath;
    const outlinePath = m.outlinePath === undefined ? 'outline.png' : m.outlinePath;
    const entries: RawEntry[] = [
        { name: 'manifest.json', data: enc.encode(o.manifestText ?? buildManifest(o.manifest)) },
    ];
    if (o.color !== null && colorPath) entries.push({ name: colorPath, data: o.color ?? colorIcon() });
    if (o.outline !== null && outlinePath) entries.push({ name: outlinePath, data: o.outline ?? outlineIcon() });
    if (m.color32Path && o.color32 !== null) entries.push({ name: m.color32Path, data: o.color32 ?? solidPng(32, 32, [10, 20, 30, 255]) });
    return [...entries, ...(o.extra ?? [])];
}

export function packageBytes(o: PackageOpts = {}): Uint8Array {
    return deflatedZip(packageEntries(o));
}

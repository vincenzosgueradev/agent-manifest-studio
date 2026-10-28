/** Shared shapes (specs/001-manifest-reader-preview/data-model.md). */

// ── Package ───────────────────────────────────────────────────────────────────

export interface Entry {
    path: string;
    /** Decompressed bytes. */
    data: Uint8Array;
    isDirectory: boolean;
}

export interface PackageFile {
    fileName: string;
    /** Order of the zip directory; kept on export. */
    entries: Entry[];
    byteLength: number;
}

export type ReadErrorCode =
    | 'not-zip' | 'too-large' | 'entry-too-large' | 'too-many-entries'
    | 'unsafe-path' | 'duplicate-path' | 'no-manifest' | 'manifest-in-subfolder';

export type ReadResult =
    | { ok: true; pkg: PackageFile }
    | { ok: false; code: ReadErrorCode; message: string };

// ── Manifest ──────────────────────────────────────────────────────────────────

export type NameKind = 'literal' | 'localisationKey' | 'missing';

export interface NameValue {
    /** The value decoded from the JSON text; empty when missing. */
    raw: string;
    kind: NameKind;
    /** `raw` without the recognised suffix. */
    base: string;
    /** Recognised suffix without brackets; empty when none. */
    suffix: string;
    /** What stood between base and the opening bracket (empty or one space). */
    separator: string;
    hasBrackets: boolean;
}

export interface DeveloperInfo {
    name: string | null;
    websiteUrl: string | null;
    privacyUrl: string | null;
    termsOfUseUrl: string | null;
}

export interface ManifestView {
    schemaUrl: string | null;
    manifestVersion: string | null;
    appVersion: string | null;
    appId: string | null;
    nameShort: NameValue;
    nameFull: NameValue;
    descriptionShort: string | null;
    descriptionFull: string | null;
    developer: DeveloperInfo;
    accentColor: string | null;
    icons: { color: string | null; outline: string | null; color32x32: string | null };
    botIds: string[];
    /** `null` when the manifest does not declare the key. */
    permissions: string[] | null;
    validDomains: string[] | null;
    devicePermissions: string[] | null;
    /** Expected keys that are absent, by dotted path. */
    missingKeys: string[];
    /** Top-level keys the tool does not know. */
    unknownKeys: string[];
    /** Every top-level entry of the manifest, in the order of the file. */
    keys: string[];
}

export type ManifestResult =
    | { ok: true; manifest: ManifestView }
    | { ok: false; code: 'not-json' | 'not-object'; message: string };

// ── PNG and icons ─────────────────────────────────────────────────────────────

export interface PngHeader {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
    interlace: number;
}

export type PngResult =
    | { kind: 'not-png' }
    | { kind: 'corrupt'; reason: string }
    | { kind: 'unsupported'; header: PngHeader; reason: string }
    | { kind: 'ok'; header: PngHeader; rgba: Uint8Array };

export interface IconInfo {
    /** Path declared by the manifest; null when the manifest does not declare one. */
    path: string | null;
    present: boolean;
    byteLength: number;
    /** null when the file is absent. */
    png: PngResult | null;
}

export interface IconSet {
    color: IconInfo;
    outline: IconInfo;
    /** null when the manifest does not declare the optional small colour icon. */
    color32x32: IconInfo | null;
}

// ── Checks and export ─────────────────────────────────────────────────────────

export type Verdict = 'pass' | 'warning' | 'fail';

export interface Check {
    id: string;
    label: string;
    verdict: Verdict;
    /** The value that was found, as text. */
    found: string;
    /** The rule, as text. */
    expected: string;
    /** What the check does not prove. */
    notProven: string;
}

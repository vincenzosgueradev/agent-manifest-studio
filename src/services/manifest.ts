/**
 * Reading `manifest.json` (FR-004 to FR-006, FR-030).
 *
 * The manifest is read, never rewritten from this view: the export edits the text itself
 * (see rename.ts), so nothing the tool does not understand can be lost.
 */

import { makeName } from './suffix';
import type { DeveloperInfo, ManifestResult, ManifestView } from '../types';

/** Top-level keys of the Microsoft 365 app manifest (schema v1.30). Everything else is "not recognised". */
export const KNOWN_KEYS: readonly string[] = [
    '$schema', 'manifestVersion', 'version', 'id', 'developer', 'name', 'description', 'icons',
    'accentColor', 'bots', 'permissions', 'validDomains', 'staticTabs', 'configurableTabs',
    'composeExtensions', 'webApplicationInfo', 'copilotAgents', 'localizationInfo',
    'supportsChannelFeatures', 'showLoadingIndicator', 'isFullScreen', 'devicePermissions',
    'activities', 'authorization', 'extensions', 'defaultInstallScope', 'defaultGroupCapability',
    'configurableProperties', 'meetingExtensionDefinition', 'mutualCertificate', 'dashboardCards',
    'scopeConstraints', 'subscriptionOffer', 'backgroundLoadedBot', 'connectors',
    'nameDescriptionOverride', 'elementRelationshipSet', 'packageName', 'supportedChannelTypes',
];

/** Entries the schema requires (and Copilot Studio always writes); reported by dotted path when absent. */
export const EXPECTED_KEYS: readonly string[] = [
    'manifestVersion', 'version', 'id', 'developer.name', 'name.short', 'description.short',
    'description.full', 'icons.color', 'icons.outline', 'accentColor',
];

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const at = (o: Json, ...path: string[]): unknown => {
    let cur: unknown = o;
    for (const p of path) {
        if (!isObject(cur)) return undefined;
        cur = cur[p];
    }
    return cur;
};
const strings = (v: unknown): string[] | null =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;

/** Text without a leading byte-order mark (parsing only: the export keeps the original bytes). */
export function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * The manifest bytes as text, byte-order mark kept (so re-encoding gives the same bytes). `null`
 * when the bytes are not valid UTF-8: decoding with replacement characters would change them.
 */
export function decodeManifest(bytes: Uint8Array): string | null {
    try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
        return null;
    }
}

export function parseManifest(text: string): ManifestResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stripBom(text));
    } catch {
        return { ok: false, code: 'not-json', message: 'manifest.json is not valid JSON.' };
    }
    if (!isObject(parsed)) {
        return { ok: false, code: 'not-object', message: 'manifest.json must contain a JSON object.' };
    }
    const m = parsed;

    const developer: DeveloperInfo = {
        name: str(at(m, 'developer', 'name')),
        websiteUrl: str(at(m, 'developer', 'websiteUrl')),
        privacyUrl: str(at(m, 'developer', 'privacyUrl')),
        termsOfUseUrl: str(at(m, 'developer', 'termsOfUseUrl')),
    };

    const bots = Array.isArray(m.bots) ? m.bots : [];
    const botIds = bots.flatMap(b => (isObject(b) && typeof b.botId === 'string' ? [b.botId] : []));

    const missingKeys = EXPECTED_KEYS.filter(path => str(at(m, ...path.split('.'))) === null);
    const unknownKeys = Object.keys(m).filter(k => !KNOWN_KEYS.includes(k));

    const view: ManifestView = {
        schemaUrl: str(m.$schema),
        manifestVersion: str(m.manifestVersion),
        appVersion: str(m.version),
        appId: str(m.id),
        nameShort: makeName(str(at(m, 'name', 'short'))),
        nameFull: makeName(str(at(m, 'name', 'full'))),
        descriptionShort: str(at(m, 'description', 'short')),
        descriptionFull: str(at(m, 'description', 'full')),
        developer,
        accentColor: str(m.accentColor),
        icons: {
            color: str(at(m, 'icons', 'color')),
            outline: str(at(m, 'icons', 'outline')),
            color32x32: str(at(m, 'icons', 'color32x32')),
        },
        botIds,
        permissions: strings(m.permissions),
        validDomains: strings(m.validDomains),
        devicePermissions: strings(m.devicePermissions),
        missingKeys: [...missingKeys],
        unknownKeys,
        keys: Object.keys(m),
    };
    return { ok: true, manifest: view };
}

// ── Where the two names are in the text ───────────────────────────────────────

/** Position of a string literal in the manifest text, quotes included. */
export interface Span { start: number; end: number }

export type LocateResult =
    | { ok: true; short: Span | null; full: Span | null }
    | { ok: false; code: 'duplicate-name-key' | 'not-json'; message: string };

class DuplicateNameKey extends Error {}

/**
 * Finds the string literals of `name.short` and `name.full` in the TOP-LEVEL `name` object by
 * walking the JSON text (strings with escapes, nesting), not by pattern matching: a `"name"` inside
 * a description, in a nested object or after an escaped quote is never mistaken for the real one.
 * A repeated key is refused, because the parser keeps the last one and a rewrite could hit the first.
 */
export function locateNames(text: string): LocateResult {
    const n = text.length;
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    const bad = (): never => { throw new SyntaxError('not JSON'); };
    const ws = (): void => { while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\r' || text[i] === '\n')) i++; };

    const str = (): Span & { value: string } => {
        if (text[i] !== '"') bad();
        const start = i++;
        for (;;) {
            if (i >= n) bad();
            const c = text[i]!;
            if (c === '\\') { i += 2; continue; }
            if (c === '"') { i++; break; }
            if (c < ' ') bad();
            i++;
        }
        return { start, end: i, value: JSON.parse(text.slice(start, i)) as string };
    };

    const literal = (): void => {
        const from = i;
        while (i < n && !',}] \t\r\n'.includes(text[i]!)) i++;
        if (i === from) bad();
    };

    /** An object; `onMember` may consume a member's value itself and answer true. */
    const object = (onMember: ((key: string) => boolean) | null): void => {
        i++;   // {
        ws();
        if (text[i] === '}') { i++; return; }
        for (;;) {
            ws();
            const key = str().value;
            ws();
            if (text[i] !== ':') bad();
            i++;
            ws();
            if (!(onMember?.(key) ?? false)) value();
            ws();
            if (text[i] === ',') { i++; continue; }
            if (text[i] === '}') { i++; return; }
            bad();
        }
    };

    const array = (): void => {
        i++;   // [
        ws();
        if (text[i] === ']') { i++; return; }
        for (;;) {
            value();
            ws();
            if (text[i] === ',') { i++; continue; }
            if (text[i] === ']') { i++; return; }
            bad();
        }
    };

    function value(): void {
        ws();
        const c = text[i];
        if (c === '"') str();
        else if (c === '{') object(null);
        else if (c === '[') array();
        else literal();
    }

    try {
        let short: Span | null = null;
        let full: Span | null = null;
        let seenName = false;

        ws();
        if (text[i] !== '{') {
            value();   // not an object: validated, nothing to find
        } else {
            object(key => {
                if (key !== 'name') return false;
                if (seenName) throw new DuplicateNameKey();
                seenName = true;
                if (text[i] !== '{') return false;
                const seen = new Set<string>();
                object(member => {
                    if (member !== 'short' && member !== 'full') return false;
                    if (seen.has(member)) throw new DuplicateNameKey();
                    seen.add(member);
                    if (text[i] !== '"') return false;
                    const s = str();
                    if (member === 'short') short = { start: s.start, end: s.end };
                    else full = { start: s.start, end: s.end };
                    return true;
                });
                return true;
            });
        }
        ws();
        if (i !== n) bad();
        return { ok: true, short, full };
    } catch (e) {
        if (e instanceof DuplicateNameKey) {
            return { ok: false, code: 'duplicate-name-key', message: 'The manifest repeats a key inside "name": the tool cannot tell which one to change.' };
        }
        return { ok: false, code: 'not-json', message: 'manifest.json is not valid JSON.' };
    }
}

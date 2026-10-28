/**
 * Manifest text fixtures. Imports nothing from `src/`.
 */

export type Layout = 'compact' | 'indent2' | 'indent4' | 'crlf' | 'bom';
export const LAYOUTS: Layout[] = ['compact', 'indent2', 'indent4', 'crlf', 'bom'];

export interface ManifestOpts {
    layout?: Layout;
    /** `null` removes the key. */
    nameShort?: string | null;
    nameFull?: string | null;
    descShort?: string | null;
    descFull?: string | null;
    accent?: string | null;
    colorPath?: string | null;
    outlinePath?: string | null;
    color32Path?: string | null;
    appVersion?: string | null;
    botIds?: string[];
    permissions?: string[] | null;
    devicePermissions?: string[] | null;
    validDomains?: string[] | null;
    /** Extra top-level keys placed before and after the known ones. */
    unknownBefore?: Record<string, unknown>;
    unknownAfter?: Record<string, unknown>;
    /** Puts `full` before `short` inside `name`. */
    fullFirst?: boolean;
    /** Adds a decoy `name` object (with `short`/`full`) inside another top-level key, before the real one. */
    decoyNested?: boolean;
    /** Escapes every non-ASCII character as \uXXXX in the text. */
    unicodeEscapes?: boolean;
    /** `manifestVersion`; `null` removes the key. */
    manifestVersion?: string | null;
    /** `$schema`; `null` removes the key. */
    schemaUrl?: string | null;
    /** Dotted paths to remove, e.g. `developer.name`. */
    omit?: string[];
}

export const DEFAULTS = {
    nameShort: 'Sales Helper [DEV]',
    nameFull: 'Sales Helper for the field team [DEV]',
    descShort: 'Answers sales questions',
    descFull: 'Answers sales questions for the field team using company documents.',
    accent: '#07687d',
    colorPath: 'color.png',
    outlinePath: 'outline.png',
    appVersion: '1.0.0',
};

export function buildManifest(o: ManifestOpts = {}): string {
    const pick = <T>(v: T | null | undefined, d: T): T | undefined => (v === null ? undefined : (v === undefined ? d : v));

    const name: Record<string, string> = {};
    const short = pick(o.nameShort, DEFAULTS.nameShort);
    const full = pick(o.nameFull, DEFAULTS.nameFull);
    if (o.fullFirst) {
        if (full !== undefined) name.full = full;
        if (short !== undefined) name.short = short;
    } else {
        if (short !== undefined) name.short = short;
        if (full !== undefined) name.full = full;
    }

    const description: Record<string, string> = {};
    const ds = pick(o.descShort, DEFAULTS.descShort);
    const df = pick(o.descFull, DEFAULTS.descFull);
    if (ds !== undefined) description.short = ds;
    if (df !== undefined) description.full = df;

    const icons: Record<string, string> = {};
    const color = pick(o.colorPath, DEFAULTS.colorPath);
    const outline = pick(o.outlinePath, DEFAULTS.outlinePath);
    const c32 = o.color32Path ?? undefined;
    if (color !== undefined) icons.color = color;
    if (outline !== undefined) icons.outline = outline;
    if (c32 !== undefined) icons.color32x32 = c32;

    const obj: Record<string, unknown> = {
        ...(o.unknownBefore ?? {}),
        $schema: pick(o.schemaUrl, 'https://developer.microsoft.com/en-us/json-schemas/teams/v1.19/MicrosoftTeams.schema.json'),
        manifestVersion: pick(o.manifestVersion, '1.19'),
        version: pick(o.appVersion, DEFAULTS.appVersion),
        id: '11111111-2222-3333-4444-555555555555',
        developer: {
            name: 'Contoso',
            websiteUrl: 'https://example.com',
            privacyUrl: 'https://example.com/privacy',
            termsOfUseUrl: 'https://example.com/terms',
        },
        ...(o.decoyNested ? { extensions: [{ name: { short: 'DECOY [DEV]', full: 'DECOY FULL [DEV]' } }] } : {}),
        name,
        description,
        icons,
        accentColor: pick(o.accent, DEFAULTS.accent),
        bots: (o.botIds ?? ['aaaaaaaa-0000-0000-0000-000000000001']).map(botId => ({ botId, scopes: ['personal'] })),
        ...(o.permissions === null || o.permissions === undefined ? {} : { permissions: o.permissions }),
        ...(o.devicePermissions === null || o.devicePermissions === undefined ? {} : { devicePermissions: o.devicePermissions }),
        ...(o.validDomains === null || o.validDomains === undefined ? {} : { validDomains: o.validDomains }),
        ...(o.unknownAfter ?? {}),
    };
    for (const path of o.omit ?? []) {
        const parts = path.split('.');
        let cur: Record<string, unknown> = obj;
        for (const p of parts.slice(0, -1)) cur = (cur[p] ?? {}) as Record<string, unknown>;
        delete cur[parts[parts.length - 1]!];
    }

    const layout = o.layout ?? 'indent2';
    let text = JSON.stringify(obj, null, layout === 'compact' ? undefined : layout === 'indent4' ? 4 : 2);
    if (o.unicodeEscapes) text = text.replace(/[\u0080-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    if (layout === 'crlf') text = text.replace(/\n/g, '\r\n');
    if (layout === 'bom') text = '﻿' + text;
    return text;
}

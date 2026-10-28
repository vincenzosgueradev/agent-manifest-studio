/**
 * The manifest fields the editor changes, and the rules each value must meet (FR-002, FR-004,
 * FR-007 to FR-009, FR-014 to FR-016). Limits come from `limits.ts`; where each comes from is in
 * specs/003-manifest-editor/research.md.
 */

import {
    DEVELOPER_NAME_MAX, DESC_FULL_MAX, DESC_SHORT_MAX, DEVICE_PERMISSIONS_MAX_ITEMS, DOMAIN_MAX, DOMAIN_MAX_ITEMS,
    NAME_FULL_MAX, NAME_SHORT_MAX, PERMISSIONS_MAX_ITEMS, URL_MAX, VERSION_MAX,
} from '../limits';

export type FieldPath =
    | 'name.short' | 'name.full' | 'description.short' | 'description.full'
    | 'developer.name' | 'developer.websiteUrl' | 'developer.privacyUrl' | 'developer.termsOfUseUrl'
    | 'accentColor' | 'version';

export type ListPath = 'validDomains' | 'permissions' | 'devicePermissions';

export type IconSlot = 'color' | 'outline';

export type FieldKind = 'text' | 'multiline' | 'url' | 'color' | 'version';
export type FieldGroup = 'identity' | 'descriptions' | 'developer' | 'look' | 'version';

export interface FieldDef {
    path: FieldPath;
    label: string;
    group: FieldGroup;
    kind: FieldKind;
    /** Longest value, in characters. */
    max: number;
    /** An optional field can be emptied: the key is then removed from the manifest. */
    required: boolean;
    placeholder?: string;
}

export const FIELDS: readonly FieldDef[] = [
    { path: 'name.short', label: 'Short name', group: 'identity', kind: 'text', max: NAME_SHORT_MAX, required: true },
    { path: 'name.full', label: 'Full name', group: 'identity', kind: 'text', max: NAME_FULL_MAX, required: false },
    { path: 'description.short', label: 'Short description', group: 'descriptions', kind: 'text', max: DESC_SHORT_MAX, required: true },
    { path: 'description.full', label: 'Full description', group: 'descriptions', kind: 'multiline', max: DESC_FULL_MAX, required: true },
    { path: 'developer.name', label: 'Developer name', group: 'developer', kind: 'text', max: DEVELOPER_NAME_MAX, required: true },
    { path: 'developer.websiteUrl', label: 'Website', group: 'developer', kind: 'url', max: URL_MAX, required: true, placeholder: 'https://' },
    { path: 'developer.privacyUrl', label: 'Privacy statement', group: 'developer', kind: 'url', max: URL_MAX, required: true, placeholder: 'https://' },
    { path: 'developer.termsOfUseUrl', label: 'Terms of use', group: 'developer', kind: 'url', max: URL_MAX, required: false, placeholder: 'https://' },
    { path: 'accentColor', label: 'Accent colour', group: 'look', kind: 'color', max: 7, required: true, placeholder: '#RRGGBB' },
    { path: 'version', label: 'App version', group: 'version', kind: 'version', max: VERSION_MAX, required: true, placeholder: '1.0.0' },
];

export const FIELD_BY_PATH: Readonly<Record<FieldPath, FieldDef>> =
    Object.fromEntries(FIELDS.map(f => [f.path, f])) as Record<FieldPath, FieldDef>;

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** An https URL with a host, no spaces. */
function urlProblem(value: string): string | null {
    if (/\s/.test(value)) return 'A link cannot contain spaces.';
    if (!/^https:\/\//i.test(value)) return 'A link must start with https://.';
    try {
        const u = new URL(value);
        if (u.hostname === '') return 'A link needs a host name after https://.';
    } catch {
        return 'This is not a valid link.';
    }
    return null;
}

/** Why the value cannot be written to the field, or `null` when it can. An empty optional field is valid. */
export function validateField(path: FieldPath, value: string): string | null {
    const f = FIELD_BY_PATH[path];
    if (value === '') return f.required ? `${f.label} cannot be empty.` : null;
    if (value.length > f.max) return `${f.label} is ${value.length} characters; the most allowed is ${f.max}.`;
    if (f.kind === 'color') return HEX_COLOUR.test(value) ? null : 'The colour must be # followed by six hexadecimal digits, for example #07687d.';
    if (f.kind === 'version') return SEMVER.test(value) ? null : 'The version must be numbers like 1.2.3 (major.minor.patch).';
    if (f.kind === 'url') return urlProblem(value);
    return null;
}

// ── Version ───────────────────────────────────────────────────────────────────

export type BumpResult = { ok: true; value: string } | { ok: false; reason: string };

/** The Office note of the schema limits each segment to five digits. */
const SEGMENT_MAX = 99999;

export function bumpVersion(version: string, part: 'patch' | 'minor'): BumpResult {
    const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!m) return { ok: false, reason: 'The version is not made of three numbers (major.minor.patch), so it cannot be raised.' };
    const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const next = part === 'patch' ? [major, minor, patch + 1] : [major, minor + 1, 0];
    if (next.some(n => n > SEGMENT_MAX)) return { ok: false, reason: 'A version number cannot go above 99999.' };
    return { ok: true, value: next.join('.') };
}

// ── Lists ─────────────────────────────────────────────────────────────────────

/** `permissions` is deprecated in the schema but still allowed: `identity`, `messageTeamMembers`. */
export const PERMISSION_VALUES: readonly string[] = ['identity', 'messageTeamMembers'];
export const DEVICE_PERMISSION_VALUES: readonly string[] = ['geolocation', 'media', 'notifications', 'midi', 'openExternal'];

export const LIST_MAX_ITEMS: Readonly<Record<ListPath, number>> = {
    validDomains: DOMAIN_MAX_ITEMS,
    permissions: PERMISSIONS_MAX_ITEMS,
    devicePermissions: DEVICE_PERMISSIONS_MAX_ITEMS,
};

export const LIST_LABEL: Readonly<Record<ListPath, string>> = {
    validDomains: 'Valid domains',
    permissions: 'Permissions (deprecated)',
    devicePermissions: 'Device permissions',
};

export const LIST_PATHS: readonly ListPath[] = ['validDomains', 'permissions', 'devicePermissions'];

const SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/**
 * Why a host name cannot be added to `validDomains`, or `null`. Teams rules: a host name, an optional
 * wildcard segment (`*.example.com`) that stands alone in its segment, with only wildcards before it,
 * and no domain outside the control of the app (`*.onmicrosoft.com`).
 */
export function validateDomain(value: string, existing: readonly string[]): string | null {
    const v = value.trim();
    if (v === '') return 'Enter a host name.';
    if (v.length > DOMAIN_MAX) return `A domain can have at most ${DOMAIN_MAX} characters.`;
    if (/\s/.test(v)) return 'A domain cannot contain spaces.';
    if (v.includes('://')) return 'Enter the host name only, without https://.';
    if (v.includes('/')) return 'Enter the host name only, without a path.';
    if (v.includes(':')) return 'Enter the host name only, without a port.';
    const parts = v.split('.');
    const wildcards = parts.findIndex(p => p !== '*');
    const fixed = wildcards < 0 ? [] : parts.slice(wildcards);
    if (fixed.includes('*')) return 'A wildcard (*) must stand alone and come first, like *.contoso.com.';
    if (fixed.length < 2) return 'A domain needs at least two fixed parts, like contoso.com.';
    const bad = fixed.find(p => !SEGMENT.test(p));
    if (bad !== undefined) return `"${bad}" is not valid in a host name: use letters, digits and hyphens.`;
    const wildcard = wildcards > 0;
    if (wildcard && /(^|\.)onmicrosoft\.com$/i.test(v)) return 'Do not add domains outside your control, such as *.onmicrosoft.com.';
    if (existing.some(e => e.toLowerCase() === v.toLowerCase())) return 'This domain is already in the list.';
    if (existing.length >= DOMAIN_MAX_ITEMS) return `A manifest can list at most ${DOMAIN_MAX_ITEMS} domains.`;
    return null;
}

/** Why a value cannot be added to a permission list, or `null`. */
export function validatePermission(list: 'permissions' | 'devicePermissions', value: string, existing: readonly string[]): string | null {
    const allowed = list === 'permissions' ? PERMISSION_VALUES : DEVICE_PERMISSION_VALUES;
    if (!allowed.includes(value)) return 'This is not a documented permission.';
    if (existing.includes(value)) return 'This permission is already in the list.';
    if (existing.length >= LIST_MAX_ITEMS[list]) return `A manifest can list at most ${LIST_MAX_ITEMS[list]} of these.`;
    return null;
}

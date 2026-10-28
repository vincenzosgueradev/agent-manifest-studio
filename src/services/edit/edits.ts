/**
 * The edits of the user as data, and what they turn into (FR-003, FR-017, FR-019, FR-021).
 *
 * `Edits` holds only what the user typed or chose. `opsFrom` turns the valid part of it into text
 * operations for `jsonPatch.ts` and reports the invalid part; `diffManifest` says, from the two
 * manifest texts alone, which values differ, so the Changes table shows what is really in the bytes.
 */

import { FIELDS, LIST_PATHS, validateDomain, validateField, validatePermission, LIST_MAX_ITEMS, LIST_LABEL, type FieldPath, type IconSlot, type ListPath } from './fields';
import type { Op } from './jsonPatch';
import type { ManifestView } from '../../types';

export interface Edits {
    /** Field values as typed; an empty value on an optional field removes the key. */
    fields: Partial<Record<FieldPath, string>>;
    /** The whole list as it should be. */
    lists: Partial<Record<ListPath, string[]>>;
    /** New bytes for an icon slot. */
    icons: Partial<Record<IconSlot, Uint8Array>>;
}

export const EMPTY: Edits = Object.freeze({ fields: {}, lists: {}, icons: {} }) as Edits;

export const isEmpty = (e: Edits): boolean =>
    Object.keys(e.fields).length === 0 && Object.keys(e.lists).length === 0 && Object.keys(e.icons).length === 0;

/** What the manifest holds now, per editable path; `null` for a key the manifest does not have. */
export interface Original {
    fields: Record<FieldPath, string | null>;
    lists: Record<ListPath, string[] | null>;
}

const isKey = (s: string | null): boolean => s !== null && /^\[\[.+\]\]$/.test(s);

export function originalOf(m: ManifestView): Original {
    const literal = (n: ManifestView['nameShort']): string | null => (n.kind === 'missing' ? null : n.raw);
    return {
        fields: {
            'name.short': literal(m.nameShort),
            'name.full': literal(m.nameFull),
            'description.short': m.descriptionShort,
            'description.full': m.descriptionFull,
            'developer.name': m.developer.name,
            accentColor: m.accentColor,
            version: m.appVersion,
        },
        lists: { validDomains: m.validDomains, permissions: m.permissions, devicePermissions: m.devicePermissions },
    };
}

/** A field whose text is a localisation key cannot be edited here: its real text is in a language file. */
export const isReadOnlyField = (path: FieldPath, o: Original): boolean => isKey(o.fields[path]);

const sameList = (a: string[], b: string[] | null): boolean => (b === null ? a.length === 0 : a.length === b.length && a.every((v, i) => v === b[i]));

/** Edits without the ones that equal the original (typing the original back clears the marker). */
export function normalise(edits: Edits, o: Original): Edits {
    const fields: Edits['fields'] = {};
    for (const f of FIELDS) {
        const v = edits.fields[f.path];
        if (v === undefined) continue;
        if (isReadOnlyField(f.path, o)) continue;
        if (v === (o.fields[f.path] ?? '')) continue;
        fields[f.path] = v;
    }
    const lists: Edits['lists'] = {};
    for (const p of LIST_PATHS) {
        const v = edits.lists[p];
        if (v !== undefined && !sameList(v, o.lists[p])) lists[p] = v;
    }
    return { fields, lists, icons: edits.icons };
}

export interface Invalid { path: string; label: string; message: string }

export interface OpsResult { ops: Op[]; invalid: Invalid[] }

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

/** The icon bytes to put in the package: a slot whose new bytes equal the old ones is not a change. */
export function effectiveIcons(edits: Edits, current: Record<IconSlot, Uint8Array | null>): Partial<Record<IconSlot, Uint8Array>> {
    const out: Partial<Record<IconSlot, Uint8Array>> = {};
    for (const slot of ['color', 'outline'] as const) {
        const bytes = edits.icons[slot];
        if (!bytes) continue;
        const old = current[slot];
        if (old && sameBytes(old, bytes)) continue;
        out[slot] = bytes;
    }
    return out;
}

/**
 * Text operations for the valid edits, and the list of the invalid ones (which are skipped, so the
 * preview keeps the last valid value). `edits` must already be normalised.
 */
export function opsFrom(edits: Edits, o: Original): OpsResult {
    const ops: Op[] = [];
    const invalid: Invalid[] = [];

    for (const f of FIELDS) {
        const v = edits.fields[f.path];
        if (v === undefined) continue;
        const path = f.path.split('.');
        if (v === '' && !f.required) {
            if (o.fields[f.path] !== null) ops.push({ path, remove: true });
            continue;
        }
        const problem = validateField(f.path, v);
        if (problem) { invalid.push({ path: f.path, label: f.label, message: problem }); continue; }
        ops.push({ path, value: v });
    }

    for (const p of LIST_PATHS) {
        const list = edits.lists[p];
        if (list === undefined) continue;
        const known = new Set(o.lists[p] ?? []);
        let bad: string | null = null;
        if (list.length > LIST_MAX_ITEMS[p]) bad = `${LIST_LABEL[p]} can have at most ${LIST_MAX_ITEMS[p]} entries.`;
        list.forEach((item, i) => {
            if (bad || known.has(item)) return;   // an entry the manifest already had is kept as it is
            const earlier = list.slice(0, i);
            bad = p === 'validDomains' ? validateDomain(item, earlier) : validatePermission(p, item, earlier);
        });
        if (bad) { invalid.push({ path: p, label: LIST_LABEL[p], message: bad }); continue; }
        ops.push(list.length === 0 ? { path: [p], remove: true } : { path: [p], value: list });
    }
    return { ops, invalid };
}

// ── What differs, from the two texts alone ────────────────────────────────────

export interface ChangeRow { path: string; before: string | null; after: string | null }

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const show = (v: unknown): string | null => (v === undefined ? null : typeof v === 'string' ? v : JSON.stringify(v));

function walk(a: unknown, b: unknown, path: string[], out: ChangeRow[]): void {
    if (isPlain(a) && isPlain(b)) {
        const keys = [...Object.keys(b), ...Object.keys(a).filter(k => !(k in b))];
        for (const k of keys) walk(a[k], b[k], [...path, k], out);
        return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: path.join('.'), before: show(a), after: show(b) });
}

const stripBom = (t: string): string => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

/** Every value that differs between the two manifest texts, by dotted path; arrays count as one value. */
export function diffManifest(before: string, after: string): ChangeRow[] {
    const out: ChangeRow[] = [];
    walk(JSON.parse(stripBom(before)), JSON.parse(stripBom(after)), [], out);
    return out;
}

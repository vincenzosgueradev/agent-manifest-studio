/**
 * From a loaded package to the new package (FR-020 to FR-025).
 *
 * `makeContext` reads everything once at load time; `planEdit` is cheap and runs on every key the
 * user types (names, checks, what blocks); `exportPackage` builds the zip.
 */

import { runChecks, blockingChecks } from './checks';
import { loadIcons } from './iconset';
import { decodeManifest, parseManifest } from './manifest';
import { applySuffix } from './rename';
import { writePackage } from './zip';
import { decodePng } from './png';
import { diffManifest, effectiveIcons, EMPTY, isEmpty, normalise, opsFrom, originalOf, type ChangeRow, type Edits, type Invalid } from './edit/edits';
import { SLOT_DEFAULT_PATH } from './edit/iconEdit';
import { patchText } from './edit/jsonPatch';
import type { IconSlot } from './edit/fields';
import type { Check, Entry, IconInfo, IconSet, ManifestView, PackageFile } from '../types';

export interface EditContext {
    pkg: PackageFile;
    manifestText: string;
    manifest: ManifestView;
    icons: IconSet;
    /** Checks of the package exactly as loaded. */
    checks: Check[];
}

export type ContextResult = { ok: true; ctx: EditContext } | { ok: false; message: string };

export function makeContext(pkg: PackageFile): ContextResult {
    const entry = pkg.entries.find(e => e.path === 'manifest.json');
    if (!entry) return { ok: false, message: 'The package has no manifest.json at its root.' };
    const manifestText = decodeManifest(entry.data);
    if (manifestText === null) return { ok: false, message: 'manifest.json is not valid UTF-8 text.' };
    const parsed = parseManifest(manifestText);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    const icons = loadIcons(pkg, parsed.manifest);
    return { ok: true, ctx: { pkg, manifestText, manifest: parsed.manifest, icons, checks: runChecks(parsed.manifest, icons, manifestText) } };
}

export interface Plan {
    /** `null` when the user has not typed anything: nothing changes. */
    suffix: string | null;
    /** The manifest text of the new package. */
    text: string;
    manifest: ManifestView;
    checks: Check[];
    /** Name checks that fail now and did not fail in the original (they stop the export). */
    blocking: Check[];
    /** Every failure that the new package still has, including those it already had. */
    remaining: Check[];
    /** The names as they will be; `null` for a name that is a localisation key or missing. */
    short: string | null;
    full: string | null;
    changed: boolean;
    /** Edits that are not valid as typed (they stop the export and are left out of the preview). */
    invalid: Invalid[];
    /** Every manifest value that differs from the original, read from the two texts. */
    changes: ChangeRow[];
    /** Replaced or added entries of the package, by path. */
    entries: Record<string, Uint8Array>;
    iconChanges: IconChange[];
    /** The icons of the new package. */
    icons: IconSet;
}

export interface IconChange {
    slot: IconSlot;
    path: string;
    before: { width: number; height: number; bytes: number } | null;
    after: { width: number; height: number; bytes: number };
}

export type PlanResult = { ok: true; plan: Plan } | { ok: false; message: string };

export function planEdit(ctx: EditContext, suffix: string | null): PlanResult {
    const literal = (n: ManifestView['nameShort']) => (n.kind === 'literal' ? n.raw : null);
    if (suffix === null) {
        return {
            ok: true,
            plan: {
                suffix, text: ctx.manifestText, manifest: ctx.manifest, checks: ctx.checks, blocking: [],
                remaining: ctx.checks.filter(c => c.verdict === 'fail'),
                short: literal(ctx.manifest.nameShort), full: literal(ctx.manifest.nameFull), changed: false,
                invalid: [], changes: [], entries: {}, iconChanges: [], icons: ctx.icons,
            },
        };
    }
    const renamed = applySuffix(ctx.manifestText, suffix);
    if (!renamed.ok) return { ok: false, message: renamed.message };
    const parsed = parseManifest(renamed.text);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    const checks = runChecks(parsed.manifest, ctx.icons, renamed.text);
    return {
        ok: true,
        plan: {
            suffix, text: renamed.text, manifest: parsed.manifest, checks,
            blocking: blockingChecks(ctx.checks, checks),
            remaining: checks.filter(c => c.verdict === 'fail'),
            short: renamed.short, full: renamed.full,
            changed: renamed.text !== ctx.manifestText,
            invalid: [], changes: diffManifest(ctx.manifestText, renamed.text), entries: {}, iconChanges: [], icons: ctx.icons,
        },
    };
}

const SLOTS: IconSlot[] = ['color', 'outline'];

const bytesOf = (pkg: PackageFile, path: string | null): Uint8Array | null =>
    (path === null ? null : pkg.entries.find(e => e.path === path && !e.isDirectory)?.data ?? null);

const headerOf = (info: IconInfo | null): IconChange['before'] => {
    const png = info?.png;
    return info && png && (png.kind === 'ok' || png.kind === 'unsupported')
        ? { width: png.header.width, height: png.header.height, bytes: info.byteLength }
        : null;
};

const INTEGRITY = 'The change could not be applied safely: the result would differ from the original in more than the edited fields. Nothing was produced.';

/**
 * The plan for the suffix typed (the old path, unchanged) with the edits of the user layered on top.
 * Edits that are not valid are reported and left out, so the preview keeps the last valid value.
 */
export function planEdits(ctx: EditContext, suffix: string | null, edits: Edits): PlanResult {
    const base = planEdit(ctx, suffix);
    if (!base.ok) return base;
    const original = originalOf(base.plan.manifest);
    const norm = normalise(edits, original);

    const current: Record<IconSlot, Uint8Array | null> = {
        color: bytesOf(ctx.pkg, ctx.manifest.icons.color), outline: bytesOf(ctx.pkg, ctx.manifest.icons.outline),
    };
    const replaced = effectiveIcons(norm, current);
    const { ops, invalid } = opsFrom(norm, original);
    for (const slot of SLOTS) {
        if (replaced[slot] && ctx.manifest.icons[slot] === null) ops.push({ path: ['icons', slot], value: SLOT_DEFAULT_PATH[slot] });
    }
    if (ops.length === 0 && Object.keys(replaced).length === 0) {
        return { ok: true, plan: { ...base.plan, invalid } };
    }

    const patched = patchText(base.plan.text, ops);
    if (!patched.ok) return { ok: false, message: patched.message };
    const parsed = parseManifest(patched.text);
    if (!parsed.ok) return { ok: false, message: parsed.message };

    const entries: Record<string, Uint8Array> = {};
    const iconChanges: IconChange[] = [];
    let pkg = ctx.pkg;
    for (const slot of SLOTS) {
        const bytes = replaced[slot];
        if (!bytes) continue;
        const path = parsed.manifest.icons[slot] ?? SLOT_DEFAULT_PATH[slot];
        entries[path] = bytes;
        const png = decodePng(bytes);
        if (png.kind === 'ok' || png.kind === 'unsupported') {
            iconChanges.push({ slot, path, before: headerOf(ctx.icons[slot]), after: { width: png.header.width, height: png.header.height, bytes: bytes.length } });
        }
    }
    if (Object.keys(entries).length > 0) {
        const kept: Entry[] = pkg.entries.map(e => (Object.prototype.hasOwnProperty.call(entries, e.path) ? { ...e, data: entries[e.path]! } : e));
        for (const [path, data] of Object.entries(entries)) if (!kept.some(e => e.path === path)) kept.push({ path, data, isDirectory: false });
        pkg = { ...pkg, entries: kept };
    }
    const icons = loadIcons(pkg, parsed.manifest);
    const checks = runChecks(parsed.manifest, icons, patched.text);

    // Nothing may differ from the original but the suffix names and the edited paths (the parent of an
    // added or removed member counts: its whole value differs).
    const changes = diffManifest(ctx.manifestText, patched.text);
    const allowed = [...ops.map(o => o.path.join('.')), 'name.short', 'name.full'];
    if (changes.some(c => !allowed.some(a => a === c.path || a.startsWith(`${c.path}.`)))) return { ok: false, message: INTEGRITY };

    return {
        ok: true,
        plan: {
            suffix, text: patched.text, manifest: parsed.manifest, checks,
            blocking: blockingChecks(ctx.checks, checks),
            remaining: checks.filter(c => c.verdict === 'fail'),
            short: parsed.manifest.nameShort.kind === 'literal' ? parsed.manifest.nameShort.raw : null,
            full: parsed.manifest.nameFull.kind === 'literal' ? parsed.manifest.nameFull.raw : null,
            changed: patched.text !== ctx.manifestText || Object.keys(entries).length > 0,
            invalid, changes, entries, iconChanges, icons,
        },
    };
}


/**
 * Original name without `.zip`, a hyphen, the suffix without brackets (characters that file names
 * cannot hold removed) and `.zip`. No suffix typed at all gives `copy`, an empty one `no-suffix`.
 */
export function suggestFileName(original: string, suffix: string | null): string {
    const base = original.replace(/\.zip$/i, '');
    const part = suffix === null
        ? 'copy'
        : (suffix.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/[. ]+$/, '') || 'no-suffix');
    return `${base}-${part}.zip`;
}

export type ExportResult =
    | { ok: true; bytes: Uint8Array; suggestedFileName: string; remaining: Check[]; plan: Plan }
    | { ok: false; reason: 'blocked'; blocking: Check[]; invalid: Invalid[] }
    | { ok: false; reason: 'failed'; message: string };

export function exportPackage(ctx: EditContext, suffix: string | null, edits: Edits = EMPTY): ExportResult {
    const planned = isEmpty(edits) ? planEdit(ctx, suffix) : planEdits(ctx, suffix, edits);
    if (!planned.ok) return { ok: false, reason: 'failed', message: planned.message };
    const { plan } = planned;
    if (plan.blocking.length > 0 || plan.invalid.length > 0) return { ok: false, reason: 'blocked', blocking: plan.blocking, invalid: plan.invalid };

    const replaced: Record<string, Uint8Array> = { ...plan.entries };
    if (plan.text !== ctx.manifestText) replaced['manifest.json'] = new TextEncoder().encode(plan.text);
    return {
        ok: true,
        bytes: writePackage(ctx.pkg, replaced),
        suggestedFileName: suggestFileName(ctx.pkg.fileName, suffix),
        remaining: plan.remaining,
        plan,
    };
}

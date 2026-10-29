/**
 * One-click fixes for the checks the tool can resolve without more information from the user
 * (specs/011-automatic-check-fixes). Everything here is pure data in, data out: it reads the
 * manifest and icon bytes the checks already compute from and returns a `FixPlan` the caller
 * applies through the exact same `edit()` / `acceptIcon()` path a manual change already uses
 * (`src/app.ts`). Nothing here touches the DOM or the network (Principle II).
 *
 * `canAutoFix` is the single source of truth for which checks get a "Fix it" control at all
 * (research.md §2); `planFix`/`planFixAll` are the single source of truth for what pressing it
 * does. A check id absent from both is, by construction, never offered a one-click fix.
 */

import type { Check, ManifestView } from '../types';
import { FIELD_BY_PATH, type FieldPath, type IconSlot } from './edit/fields';
import { averageLogoColour } from './checks';
import { acceptResult } from './image/accept';
import { contrastRatio, luminance } from './image/colour';
import { importImage, type HostDecoder } from './image/import';
import { evaluate, presetOutline, presetTeamsColour } from './image/pipeline';
import type { Op, Picture } from './image/types';
import { COLOR_ICON_SIDE, DESC_FULL_MAX, DESC_SHORT_MAX, NAME_FULL_MAX, NAME_SHORT_MAX, OUTLINE_ICON_SIDE } from './limits';
import type { Rgb } from './preview';

export interface FixPlan {
    /** One plain-language sentence for the banner (FR-009) and for "Fix everything"'s combined message. */
    summary: string;
    /** Every check id this plan is expected to turn green, for the combined message and for tests. */
    ids: string[];
    fields: Partial<Record<FieldPath, string>>;
    icons: Partial<Record<IconSlot, Uint8Array>>;
}

export interface FixInput {
    /** The manifest as it is shown now (edits already applied), the same one the checks were computed from. */
    manifest: ManifestView;
    /** The current bytes of an icon slot (replaced or original), or `null` when there is none to read. */
    iconBytes: (slot: IconSlot) => Uint8Array | null;
    /** The window's own decoder, when it has one; the same role it plays in the image editor. */
    decoder: HostDecoder | null;
}

const COLOR_IDS = ['color.size-px', 'color.square', 'color.safe-area', 'color.format', 'color.weight'] as const;
const OUTLINE_IDS = ['outline.size-px', 'outline.white'] as const;
const ACCENT_IDS = ['accent.hex', 'color.contrast'] as const;

const NAME_FIELD: Readonly<Record<string, { path: FieldPath; max: number }>> = {
    'name.short.length': { path: 'name.short', max: NAME_SHORT_MAX },
    'name.full.length': { path: 'name.full', max: NAME_FULL_MAX },
    'description.short.length': { path: 'description.short', max: DESC_SHORT_MAX },
    'description.full.length': { path: 'description.full', max: DESC_FULL_MAX },
};

/** A fixed, documented colour used only when the colour icon has no readable picture at all (research.md §4). */
const FALLBACK_ACCENT = '#000000';

/**
 * Whether `check` has a one-click fix at all. A length check only qualifies when the verdict is
 * `fail` *and* the value is not missing (it is too long): this also keeps a localisation key,
 * which fails this same check as a `warning`, out of reach (there is no real text to cut).
 */
export function canAutoFix(check: Pick<Check, 'id' | 'verdict' | 'found'>): boolean {
    if (check.id in NAME_FIELD) return check.verdict === 'fail' && check.found !== 'missing';
    if ((COLOR_IDS as readonly string[]).includes(check.id)) return check.verdict !== 'pass';
    if ((OUTLINE_IDS as readonly string[]).includes(check.id)) return check.verdict !== 'pass';
    if ((ACCENT_IDS as readonly string[]).includes(check.id)) return check.verdict !== 'pass';
    return false;
}

function currentFieldText(path: FieldPath, m: ManifestView): string | null {
    switch (path) {
        case 'name.short': return m.nameShort.kind === 'missing' ? null : m.nameShort.raw;
        case 'name.full': return m.nameFull.kind === 'missing' ? null : m.nameFull.raw;
        case 'description.short': return m.descriptionShort;
        case 'description.full': return m.descriptionFull;
        default: return null;
    }
}

/** Cuts `text` to exactly `max` Unicode code points, leaving every character that remains untouched (research.md §3). */
function planTruncate(id: string, field: { path: FieldPath; max: number }, input: FixInput): FixPlan | null {
    const current = currentFieldText(field.path, input.manifest);
    if (current === null) return null;
    const units = [...current];
    if (units.length <= field.max) return null;
    const cut = units.slice(0, field.max).join('');
    return {
        summary: `Shortened "${FIELD_BY_PATH[field.path].label}" to ${field.max} characters.`,
        ids: [id], fields: { [field.path]: cut }, icons: {},
    };
}

/** Re-runs the icon through the same, already-defined preset the image editor uses, and re-encodes it at `side` (research.md §5). */
async function planIconFix(
    slot: IconSlot, side: number, ids: readonly string[], preset: (p: Picture) => Op[], summary: string, input: FixInput,
): Promise<FixPlan | null> {
    const bytes = input.iconBytes(slot);
    if (!bytes) return null;
    const imported = await importImage(bytes, input.decoder);
    if (!imported.ok) return null;
    const evaluated = evaluate(imported.picture, preset(imported.picture));
    const result = acceptResult(evaluated.picture, side);
    if (!result.ok) return null;
    return { summary, ids: [...ids], fields: {}, icons: { [slot]: result.bytes } };
}

/** Whichever of pure black or pure white contrasts more with the logo; a fixed fallback when there is no logo to read (research.md §4). */
function pickByContrast(logo: Rgb): string {
    const lum = luminance(logo.r, logo.g, logo.b);
    const black = contrastRatio(lum, luminance(0, 0, 0));
    const white = contrastRatio(lum, luminance(255, 255, 255));
    return black >= white ? '#000000' : '#ffffff';
}

async function planAccent(input: FixInput): Promise<FixPlan | null> {
    const bytes = input.iconBytes('color');
    const imported = bytes ? await importImage(bytes, input.decoder) : null;
    const logo = imported?.ok ? averageLogoColour(imported.picture.data) : null;
    const value = logo ? pickByContrast(logo) : FALLBACK_ACCENT;
    return {
        summary: `Set the accent colour to ${value}${logo ? ', the one that stands out most against the logo' : ''}.`,
        ids: [...ACCENT_IDS], fields: { accentColor: value }, icons: {},
    };
}

/** What pressing "Fix it" on `id` does, or `null` when it cannot be resolved right now. */
export async function planFix(id: string, input: FixInput): Promise<FixPlan | null> {
    if ((COLOR_IDS as readonly string[]).includes(id)) {
        return planIconFix('color', COLOR_ICON_SIDE, COLOR_IDS, presetTeamsColour,
            'Resized, centred and re-encoded the colour icon so it passes size, shape, safe area, format and weight.', input);
    }
    if ((OUTLINE_IDS as readonly string[]).includes(id)) {
        return planIconFix('outline', OUTLINE_ICON_SIDE, OUTLINE_IDS, presetOutline,
            'Rebuilt the outline icon as a white, 32 x 32 shape.', input);
    }
    const nameField = NAME_FIELD[id];
    if (nameField) return planTruncate(id, nameField, input);
    if ((ACCENT_IDS as readonly string[]).includes(id)) return planAccent(input);
    return null;
}

/** One group per action "Fix everything" can take, in the fixed order of research.md §6. */
const GROUPS: ReadonlyArray<{ ids: readonly string[]; repId: string }> = [
    { ids: COLOR_IDS, repId: COLOR_IDS[0] },
    { ids: OUTLINE_IDS, repId: OUTLINE_IDS[0] },
    { ids: ['name.short.length'], repId: 'name.short.length' },
    { ids: ['name.full.length'], repId: 'name.full.length' },
    { ids: ['description.short.length'], repId: 'description.short.length' },
    { ids: ['description.full.length'], repId: 'description.full.length' },
    { ids: ACCENT_IDS, repId: ACCENT_IDS[0] },
];

/** Every currently available fix, applied in the fixed order above; `null` when there is nothing to do. */
export async function planFixAll(checks: readonly Check[], input: FixInput): Promise<FixPlan | null> {
    const byId = new Map(checks.map(c => [c.id, c]));
    const needed = (ids: readonly string[]): boolean => ids.some(id => {
        const c = byId.get(id);
        return c !== undefined && canAutoFix(c);
    });

    const plans: FixPlan[] = [];
    for (const group of GROUPS) {
        if (!needed(group.ids)) continue;
        const plan = await planFix(group.repId, input);
        if (plan) plans.push(plan);
    }
    if (plans.length === 0) return null;
    return {
        summary: plans.map(p => p.summary).join(' '),
        ids: plans.flatMap(p => p.ids),
        fields: Object.assign({}, ...plans.map(p => p.fields)) as Partial<Record<FieldPath, string>>,
        icons: Object.assign({}, ...plans.map(p => p.icons)) as Partial<Record<IconSlot, Uint8Array>>,
    };
}

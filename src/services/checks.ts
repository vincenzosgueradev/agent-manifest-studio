/**
 * The automatic checks (FR-011 to FR-017, FR-021).
 *
 * One `Check` per rule, in a stable order. A check that cannot be evaluated because its input is
 * missing (the dimensions of a file that is not a PNG, say) is left out rather than reported as a
 * second failure of the same cause: the check that explains the cause carries the failure.
 * Every limit comes from limits.ts. Every check says what it does NOT prove.
 */

import {
    COLOR32_ICON_SIDE, COLOR_ICON_SIDE, COLOR_SAFE_AREA_SIDE, DESC_FULL_MAX, DESC_SHORT_MAX, ICON_FAIL_BYTES, ICON_WARN_BYTES,
    NAME_FULL_MAX, NAME_SHORT_MAX, OUTLINE_ICON_SIDE,
} from './limits';
import { contrastRatio, luminance } from './image/colour';
import { parseAccent } from './preview';
import { countOutsideSafeArea } from './safeArea';
import { schemaCheck, validateManifestText } from './schema';
import type { Check, IconInfo, IconSet, ManifestView, NameValue, PngHeader, Verdict } from '../types';

function check(id: string, label: string, verdict: Verdict, found: string, expected: string, notProven: string): Check {
    return { id, label, verdict, found, expected, notProven };
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
const length = (s: string): number => [...s].length;
const COLOR_TYPES: Record<number, string> = { 0: 'grey', 2: 'RGB', 3: 'palette', 4: 'grey + alpha', 6: 'RGBA' };

type Prefix = 'color' | 'outline' | 'color32';

/** The "is it there" and "is it a PNG" part shared by the three icons. Returns the header when known. */
function presence(out: Check[], prefix: Prefix, label: string, icon: IconInfo, withPng: boolean): PngHeader | null {
    const notProven = 'Does not prove that the file is a valid image.';
    if (icon.path === null) {
        out.push(check(`${prefix}.present`, `${label} is in the package`, 'fail', 'not declared in the manifest', 'declared in the manifest and present in the package', notProven));
        return null;
    }
    if (!icon.present) {
        out.push(check(`${prefix}.present`, `${label} is in the package`, 'fail', `${icon.path} - declared, but not in the package`, 'declared in the manifest and present in the package', notProven));
        return null;
    }
    out.push(check(`${prefix}.present`, `${label} is in the package`, 'pass', icon.path, 'declared in the manifest and present in the package', notProven));

    const png = icon.png!;
    if (withPng) {
        const ok = png.kind === 'ok' || png.kind === 'unsupported';
        out.push(check(`${prefix}.png`, `${label} is a PNG`, ok ? 'pass' : 'fail',
            png.kind === 'not-png' ? 'not a PNG file' : png.kind === 'corrupt' ? png.reason : 'valid PNG structure',
            'a PNG file', 'Does not prove that Teams accepts the file.'));
    }
    return png.kind === 'ok' || png.kind === 'unsupported' ? png.header : null;
}

function colorIconChecks(out: Check[], icon: IconInfo): void {
    const header = presence(out, 'color', 'Colour icon', icon, true);
    const sized = header !== null && header.width === COLOR_ICON_SIDE && header.height === COLOR_ICON_SIDE;
    if (header) {
        const dims = `${header.width} x ${header.height}`;
        out.push(check('color.size-px', 'Colour icon is 192 x 192 pixels', sized ? 'pass' : 'fail', dims,
            `${COLOR_ICON_SIDE} x ${COLOR_ICON_SIDE} pixels`,
            'Does not prove the logo stays inside the central 120 x 120 pixel area.'));
        out.push(check('color.square', 'Colour icon is square', header.width === header.height ? 'pass' : 'fail', dims,
            'width equal to height',
            'Does not prove the corners are square or that the background is solid or fully transparent.'));
        const png = icon.png!;
        out.push(png.kind === 'ok'
            ? check('color.format', 'Colour icon can be drawn by this tool', 'pass', `${png.header.bitDepth}-bit ${COLOR_TYPES[png.header.colorType]}`, '8-bit grey, RGB, palette, grey + alpha or RGBA, not interlaced',
                'Does not prove how Teams decodes the file, only that this tool can draw it.')
            : check('color.format', 'Colour icon can be drawn by this tool', 'warning', png.kind === 'unsupported' ? png.reason : '', '8-bit grey, RGB, palette, grey + alpha or RGBA, not interlaced',
                'The tool cannot draw this file, so the preview is missing. Teams may still accept it.'));
    }
    if (icon.png?.kind === 'ok' && sized) {
        const outside = countOutsideSafeArea(icon.png.rgba, icon.png.header.width, icon.png.header.height, COLOR_SAFE_AREA_SIDE);
        out.push(check('color.safe-area', 'Logo stays in the safe area', outside === 0 ? 'pass' : 'warning',
            outside === 0 ? 'inside the central 120 x 120 pixels' : `${outside} pixels outside the central 120 x 120`,
            'the logo inside the central 120 x 120 pixels',
            'Assumes the background is transparent or the colour of the top-left pixel: anything else counts as logo. Does not prove how Teams crops or masks the icon.'));
    }
    if (icon.present && icon.png !== null) {
        const verdict: Verdict = icon.byteLength > ICON_FAIL_BYTES ? 'fail' : icon.byteLength > ICON_WARN_BYTES ? 'warning' : 'pass';
        out.push(check('color.weight', 'Colour icon weight', verdict, kb(icon.byteLength),
            `up to ${kb(ICON_WARN_BYTES)}; a warning up to ${kb(ICON_FAIL_BYTES)}, a failure above`,
            'Two Microsoft pages give different limits (72 KB and 100 KB); this check does not settle which one applies.'));
    }
}

function outlineIconChecks(out: Check[], icon: IconInfo): void {
    const header = presence(out, 'outline', 'Outline icon', icon, true);
    if (!header) return;
    out.push(check('outline.size-px', 'Outline icon is 32 x 32 pixels',
        header.width === OUTLINE_ICON_SIDE && header.height === OUTLINE_ICON_SIDE ? 'pass' : 'fail',
        `${header.width} x ${header.height}`, `${OUTLINE_ICON_SIDE} x ${OUTLINE_ICON_SIDE} pixels`,
        'Does not prove the symbol has no extra padding around it.'));
    const png = icon.png!;
    if (png.kind !== 'ok') return;
    // "white on transparent" or "transparent on white": every pixel that shows is pure white.
    let offending = 0;
    for (let i = 0; i < png.rgba.length; i += 4) {
        if (png.rgba[i + 3]! > 0 && (png.rgba[i] !== 255 || png.rgba[i + 1] !== 255 || png.rgba[i + 2] !== 255)) offending++;
    }
    out.push(check('outline.white', 'Outline icon is white on transparent', offending === 0 ? 'pass' : 'fail',
        offending === 0 ? 'every visible pixel is white' : `${offending} visible pixels are not white`,
        'every pixel that is not fully transparent is pure white',
        'Does not prove the icon looks right on the app bar or matches the colour icon.'));
}

function smallColorChecks(out: Check[], icon: IconInfo): void {
    const header = presence(out, 'color32', 'Small colour icon', icon, false);
    if (!header) return;
    out.push(check('color32.size-px', 'Small colour icon is 32 x 32 pixels',
        header.width === COLOR32_ICON_SIDE && header.height === COLOR32_ICON_SIDE ? 'pass' : 'warning',
        `${header.width} x ${header.height}`, `${COLOR32_ICON_SIDE} x ${COLOR32_ICON_SIDE} pixels (optional icon)`,
        'Does not prove the background is transparent.'));
}

function nameCheck(id: string, label: string, name: NameValue, max: number, required: boolean): Check {
    const rule = `at most ${max} characters`;
    if (name.kind === 'missing') {
        return required
            ? check(id, label, 'fail', 'missing', `required, ${rule}`, 'Does not prove the name is free or follows your naming rules.')
            : check(id, label, 'pass', 'not declared', `optional, ${rule}`, 'Does not prove the name is free or follows your naming rules.');
    }
    if (name.kind === 'localisationKey') {
        return check(id, label, 'warning', `${name.raw} (a localisation key)`, rule,
            'The real text is in a language file, which this tool does not read: its length is not checked.');
    }
    const n = length(name.raw);
    return check(id, label, n <= max ? 'pass' : 'fail', `${n} characters`, rule, 'Does not prove the name is free or follows your naming rules.');
}

function descriptionCheck(id: string, label: string, text: string | null, max: number): Check {
    const rule = `required, at most ${max} characters`;
    const notProven = 'Does not prove the text meets the wording rules of the Teams Store.';
    if (text === null) return check(id, label, 'fail', 'missing', rule, notProven);
    const n = length(text);
    return check(id, label, n <= max ? 'pass' : 'fail', `${n} characters`, rule, notProven);
}

/** The least contrast that WCAG asks of a graphic against its background. */
export const MIN_ICON_CONTRAST = 3;
/** The colour icon needs this share of see-through pixels before the accent colour is what the logo sits on. */
const SEE_THROUGH_SHARE = 0.1;

/**
 * The logo colour of a picture: the visible pixels, averaged by their alpha. `null` when every
 * pixel is fully transparent (there is no logo to average). Shared with `services/autofix.ts`,
 * which needs the same colour to pick a contrasting accent colour (specs/011-automatic-check-fixes).
 */
export function averageLogoColour(rgba: Uint8Array): { r: number; g: number; b: number } | null {
    let weight = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        const a = rgba[i + 3]!;
        if (a > 0) { weight += a; r += rgba[i]! * a; g += rgba[i + 1]! * a; b += rgba[i + 2]! * a; }
    }
    return weight === 0 ? null : { r: r / weight, g: g / weight, b: b / weight };
}

/**
 * Whether the logo can be told apart from the accent colour it is laid on. The logo is taken to be the
 * visible pixels, averaged by their alpha; it only applies when enough of the icon is see-through for the
 * accent colour to show (otherwise the icon brings its own background). `null` when it does not apply.
 */
function contrastCheck(icon: IconInfo, accent: string | null): Check | null {
    const rgb = accent === null ? null : parseAccent(accent);
    const png = icon.png;
    if (!rgb || !png || png.kind !== 'ok') return null;
    const px = png.rgba;
    let seeThrough = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i]! < 255) seeThrough++;
    const pixels = px.length / 4;
    const logo = averageLogoColour(px);
    if (!logo || seeThrough / pixels < SEE_THROUGH_SHARE) return null;
    const ratio = contrastRatio(luminance(logo.r, logo.g, logo.b), luminance(rgb.r, rgb.g, rgb.b));
    return check('color.contrast', 'Logo stands out from the accent colour', ratio >= MIN_ICON_CONTRAST ? 'pass' : 'warning',
        `${ratio.toFixed(1)} : 1`, `at least ${MIN_ICON_CONTRAST} : 1 between the logo and the accent colour behind it`,
        'Takes the logo as the average colour of the visible pixels. Does not prove how Teams or Microsoft 365 Copilot draw the tile: a light logo on a light accent colour can nearly disappear.');
}


/** `manifestText` is the manifest as it will be saved; with it the schema row is added. */
export function runChecks(manifest: ManifestView, icons: IconSet, manifestText?: string): Check[] {
    const out: Check[] = [];
    colorIconChecks(out, icons.color);
    outlineIconChecks(out, icons.outline);
    if (icons.color32x32) smallColorChecks(out, icons.color32x32);

    out.push(nameCheck('name.short.length', 'Short name length', manifest.nameShort, NAME_SHORT_MAX, true));
    out.push(nameCheck('name.full.length', 'Full name length', manifest.nameFull, NAME_FULL_MAX, false));
    const both = manifest.nameShort.kind !== 'missing' && manifest.nameFull.kind !== 'missing';
    const same = both && manifest.nameShort.raw === manifest.nameFull.raw;
    out.push(check('name.distinct', 'Short and full name differ', same ? 'warning' : 'pass',
        same ? `both are "${manifest.nameShort.raw}"` : (both ? 'different' : 'only one of them is declared'),
        'the two values should be different (Teams accepts identical ones)', 'Does not prove the names mean something to users.'));

    out.push(descriptionCheck('description.short.length', 'Short description length', manifest.descriptionShort, DESC_SHORT_MAX));
    out.push(descriptionCheck('description.full.length', 'Full description length', manifest.descriptionFull, DESC_FULL_MAX));

    const accent = manifest.accentColor;
    out.push(check('accent.hex', 'Accent colour is #RRGGBB',
        accent !== null && parseAccent(accent) !== null ? 'pass' : 'fail',
        accent === null ? 'missing' : accent, '"#" followed by exactly six hexadecimal digits',
        'Does not prove the colour matches the icon background, which the admin-centre customisation expects.'));
    const seen = contrastCheck(icons.color, accent);
    if (seen) out.push(seen);
    if (manifestText !== undefined) out.push(schemaCheck(validateManifestText(manifestText)));
    return out;
}

/**
 * Name checks that fail now and did not fail in the original package. These, and only these, stop
 * the export (FR-021): a failure the original already had must not stop the user from renaming.
 */
export function blockingChecks(before: Check[], after: Check[]): Check[] {
    const was = new Map(before.map(c => [c.id, c.verdict]));
    return after.filter(c => c.id.startsWith('name.') && c.verdict === 'fail' && was.get(c.id) !== 'fail');
}

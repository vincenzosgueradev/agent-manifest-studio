/**
 * Designs worth trying for the icons of an agent, worked out from the picture and the guidance that the tool already
 * checks: the logo inside the central 120 x 120 pixels, a see-through background that leaves the accent colour
 * behind it, a logo that stands out from that colour (at least 3 : 1, the WCAG limit for a graphic) and an outline
 * icon that is a white shape on see-through. Each design is complete: colour icon, accent colour and outline icon
 * agree with each other, and each says why it is a good one. The advice is a starting point, not a verdict on taste.
 */

import { contrastOf, darkenUntil, dominantColour, fromHex, rgbToHsl, toHex } from './colour';
import { solid } from './ops';
import { evaluate, presetOutline } from './pipeline';
import { makeTransparent } from './transparent';
import { hasAlpha, type Op, type Picture, type Rgb } from './types';

export interface Suggestion {
    id: 'brand-tile' | 'coloured-logo' | 'keep-colours';
    title: string;
    /** The guidance that this design follows, as sentences. */
    why: string[];
    /** The colour icon (192 x 192) and the accent colour it goes with. */
    icon: Picture;
    accent: string;
    /** The outline icon (32 x 32): the same logo as a white shape on see-through. */
    outline: Picture;
    /** Contrast between the logo and the accent colour behind it. */
    contrast: number;
}

export interface SuggestionSet {
    suggestions: Suggestion[];
    /** Why there is nothing to suggest, when there is nothing. */
    note: string | null;
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const INK: Rgb = { r: 31, g: 41, b: 55 };
/** The accent colour of Teams' own blue, used when the picture and the package have no colour of their own. */
const FALLBACK_BRAND: Rgb = { r: 43, g: 95, b: 217 };
/** The contrast asked of a graphic (WCAG 1.4.11) and the comfortable one for a logo that is one colour. */
const MIN_CONTRAST = 3;
const COMFORT_CONTRAST = 4.5;

const TARGET_SAFE: Op[] = [{ kind: 'trim', tolerance: 2 }, { kind: 'square', fill: null }, { kind: 'fit', target: 192, share: 62.5 }];

const saturationOf = (c: Rgb): number => rgbToHsl(c.r, c.g, c.b).s;

/** The picture with its flat background taken away, or `null` when it has neither a flat background nor see-through parts. */
function logoOf(p: Picture): Picture | null {
    if (hasAlpha(p)) {
        const made = makeTransparent(p);
        return made.ok ? made.picture : p;
    }
    const made = makeTransparent(p);
    return made.ok ? made.picture : null;
}

/** The brand colour: the main colour of the logo, or the accent colour of the package, or a blue; dark enough for white to stand on it. */
function brandColour(original: Picture, logo: Picture, accent: string | null): Rgb {
    const fromLogo = dominantColour(logo) ?? dominantColour(original);
    const fromAccent = accent ? fromHex(accent) : null;
    const pick = fromLogo && saturationOf(fromLogo) >= 0.2 ? fromLogo
        : fromAccent && saturationOf(fromAccent) >= 0.2 ? fromAccent
            : FALLBACK_BRAND;
    return darkenUntil(pick, WHITE, COMFORT_CONTRAST);
}

/** How many different colours the visible part of the picture has, counted in 5-bit groups with at least 5 percent each. */
function colourCount(p: Picture): number {
    const groups = new Map<number, number>();
    let visible = 0;
    for (let i = 0; i < p.data.length; i += 4) {
        if (p.data[i + 3]! < 200) continue;
        visible++;
        const key = ((p.data[i]! >> 3) << 10) | ((p.data[i + 1]! >> 3) << 5) | (p.data[i + 2]! >> 3);
        groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    return [...groups.values()].filter(n => n >= visible * 0.05).length;
}

function averageLogoColour(p: Picture): Rgb {
    let w = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < p.data.length; i += 4) {
        const a = p.data[i + 3]!;
        w += a; r += p.data[i]! * a; g += p.data[i + 1]! * a; b += p.data[i + 2]! * a;
    }
    return w === 0 ? WHITE : { r: Math.round(r / w), g: Math.round(g / w), b: Math.round(b / w) };
}

const outlineOf = (logo: Picture): Picture => evaluate(logo, presetOutline(logo)).picture;

const ratio = (x: number): string => x.toFixed(1);

export function recommend(picture: Picture, accent: string | null): SuggestionSet {
    const base = logoOf(picture);
    if (!base) {
        return { suggestions: [], note: 'The colour icon has its own background that is not one flat colour, so the tool cannot tell the logo from it. Open the image editor and take the background away first, then come back for advice.' };
    }
    const framed = evaluate(base, TARGET_SAFE).picture;
    const brand = brandColour(picture, base, accent);
    const out: Suggestion[] = [];

    const guidance = (tile: string, extra: string[]): string[] => [
        ...extra,
        'The logo stays inside the central 120 x 120 pixels, the safe area that Teams asks for the colour icon.',
        `The background of the picture is see-through, so Teams puts the accent colour (${tile}) behind it.`,
        'The outline icon is the same logo as a white shape on see-through, which is what Teams asks for the icon of its left bar.',
    ];

    // 1. a white logo on the brand colour
    const white = solid(framed, WHITE);
    const brandHex = toHex(brand);
    const c1 = contrastOf(WHITE, brand);
    out.push({
        id: 'brand-tile', title: 'White logo on your brand colour', icon: white, accent: brandHex, outline: outlineOf(white), contrast: c1,
        why: guidance(brandHex, [`A white logo on ${brandHex} has a contrast of ${ratio(c1)} : 1; Microsoft's guidance for graphics (WCAG) asks at least ${MIN_CONTRAST} : 1.`]),
    });

    // 2. the logo in the brand colour on white
    const tinted = solid(framed, brand);
    out.push({
        id: 'coloured-logo', title: 'Coloured logo on white', icon: tinted, accent: '#FFFFFF', outline: outlineOf(tinted), contrast: c1,
        why: guidance('#FFFFFF', [`A logo in ${brandHex} on white has a contrast of ${ratio(c1)} : 1; the guidance asks at least ${MIN_CONTRAST} : 1.`, 'A white accent colour leaves the logo alone on a light tile, as in the left bar of Teams.']),
    });

    // 3. the logo as it is, with an accent colour chosen for it
    if (colourCount(framed) >= 2) {
        const average = averageLogoColour(framed);
        const candidates: Rgb[] = [WHITE, INK];
        const best = candidates.map(c => ({ c, r: contrastOf(average, c) })).sort((a, b) => b.r - a.r)[0]!;
        if (best.r >= MIN_CONTRAST) {
            out.push({
                id: 'keep-colours', title: 'Keep the colours of your logo', icon: framed, accent: toHex(best.c), outline: outlineOf(framed), contrast: best.r,
                why: guidance(toHex(best.c), [`The logo keeps its own colours. ${toHex(best.c)} is the accent colour that stands out most from them: ${ratio(best.r)} : 1, at least ${MIN_CONTRAST} : 1 as the guidance asks.`]),
            });
        }
    }
    return { suggestions: out, note: null };
}

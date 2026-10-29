/**
 * The effect guides (feature 012): a one-at-a-time overlay, opened from an info control next to every toolbox
 * entry in the image editor, explaining what that one effect does with a before/after picture computed from the
 * fixed sample logo in `services/image/demo.ts` — never the icon currently open in the editor (FR-003). Opening
 * or closing a guide never touches the editor's own `Pipeline` (FR-005).
 */

import { el, clear } from './dom';
import { icon } from '../icons';
import { applyOp, presetOutline, presetTeamsColour } from '../services/image/pipeline';
import type { Op, OpKind, Picture } from '../services/image/types';
import { demoNearFill, demoOpaque, demoPadded, demoTransparent, demoTwoTone, demoWide, demoWideOpaque, DEMO_BLUE, DEMO_WHITE } from '../services/image/demo';
import { paintTile } from './draw';
import { FIELDS, type Field } from './opFields';

/** The 13 toolbox entries a guide can describe; `flip` covers both Flip buttons (they share one guide). */
export type GuideKey =
    | 'removeBg' | 'fill' | 'trim' | 'crop' | 'square' | 'fit' | 'rotate' | 'flip' | 'solid' | 'tone' | 'outline'
    | 'presetTeams' | 'presetOutline';

interface EffectGuide {
    title: string;
    lead: string;
    example: string;
    tip: string;
    before: () => Picture;
    after: (before: Picture) => Picture;
}

const run = (ops: Op[]) => (before: Picture): Picture => ops.reduce((p, op) => applyOp(p, op), before);

/** Which `OpKind` a guide's Parameters section reads from `FIELDS`; the two Quick presets have none (they take no
 *  settings of their own) and are left out, so their guide shows no Parameters section. */
export const GUIDE_OP: Partial<Record<GuideKey, OpKind>> = {
    removeBg: 'removeBg', fill: 'fill', trim: 'trim', crop: 'crop', square: 'square', fit: 'fit',
    rotate: 'rotate', flip: 'flip', solid: 'solid', tone: 'tone', outline: 'outline',
};

/**
 * One explanation per parameter of every operation, keyed exactly as `FIELDS` names them — the parameter's own
 * name, range and options always come straight from `FIELDS` (one source of truth, never duplicated here), so
 * only the prose below needs maintaining. `test/image.paramHelp.sync.test.ts` fails the build the day a parameter
 * is added to, renamed in, or removed from `FIELDS` without a matching update here: that is this feature's
 * "stay in sync automatically" rule (spec FR-009), for every operation this feature covers today and any added later.
 */
export const PARAM_HELP: Record<OpKind, Record<string, string>> = {
    removeBg: {
        mode: 'Where the tool is allowed to make background see-through: from the edges only (safer — a colour that also appears inside the logo is left alone), or everywhere in the picture.',
        colour: 'The colour treated as background. Leave it unset to use the colour found at the four corners automatically.',
        tolerance: 'How different a pixel can be from the background colour and still count as background. Higher removes more; too high starts eating into the logo itself.',
        softness: 'Extends the tolerance with a soft fade instead of a hard cutoff, for a smoother edge against an anti-aliased logo.',
        matte: 'Shrinks or grows the kept edge by a few pixels, to clean up a thin halo of leftover background colour.',
    },
    trim: {
        tolerance: 'How far a border pixel can be from the background colour and still count as empty margin to cut away.',
    },
    crop: {
        x: 'The left edge of the rectangle to keep, in pixels from the left of the picture.',
        y: 'The top edge of the rectangle to keep, in pixels from the top of the picture.',
        w: 'The width of the rectangle to keep, in pixels.',
        h: 'The height of the rectangle to keep, in pixels.',
    },
    square: {
        fill: 'The colour used to pad the shorter side. Leave it unset to pad with transparency instead.',
    },
    fit: {
        share: "What share of the icon's side the logo's longer side should take up once centred, as a percentage.",
    },
    rotate: {
        quarters: 'How many quarter turns to apply, and in which direction.',
    },
    flip: {
        axis: 'Which way to mirror the picture: left-to-right, or top-to-bottom.',
    },
    fill: {
        colour: 'The colour used to paint every see-through pixel.',
    },
    solid: {
        colour: 'The one colour every visible pixel is repainted with; transparency is left untouched.',
    },
    tone: {
        hue: 'Shifts every colour around the colour wheel, in degrees.',
        saturation: 'Turns colours more vivid (positive) or more muted (negative); fully negative removes colour (grayscale).',
        brightness: 'Makes the picture lighter (positive) or darker (negative).',
        contrast: 'Makes light and dark areas further apart (positive) or closer together (negative).',
        invert: 'Swaps every colour for its opposite, like a photographic negative.',
        gray: 'Removes colour, keeping only light and dark (grayscale).',
        threshold: 'Turns every pixel fully black or fully white at this brightness cutoff; 0 turns the effect off.',
    },
    outline: {
        mode: "Where the shape comes from: the picture's existing see-through parts, or its darker pixels when it has no transparency yet.",
        cutoff: 'How dark a pixel must be, in the darkness mode, to count as part of the shape.',
    },
};

/** A short technical descriptor derived only from the field's own metadata — never hand-written, so it cannot go stale. */
function paramDetail(f: Field): string {
    switch (f.type) {
        case 'number': return `Range: ${f.min} to ${f.max}`;
        case 'select': return `Options: ${f.options.map(([, label]) => label).join(', ')}`;
        case 'colour': return f.optional ? 'Pick a colour, or leave it unset' : 'Pick a colour';
        case 'toggle': return 'On or off';
    }
}

/** Static content for every guide: the same for every user, never saved, never read from the open package. */
export const GUIDES: Record<GuideKey, EffectGuide> = {
    removeBg: {
        title: 'Remove background',
        lead: 'Makes the background colour of the picture see-through, so only the logo remains. Teams needs a colour icon whose background is either one flat colour or fully transparent — this is how you get the second option.',
        example: 'A logo exported with a white square behind it: remove the white, and the icon blends into any surface Teams draws it on — the app tile, the chat avatar, the admin centre list.',
        tip: '"From the edges" only clears background that touches the border, so a logo that happens to share a colour with the background keeps its inside intact. Raise Tolerance if faint shadows survive; raise Softness for a smoother edge.',
        before: demoOpaque,
        after: run([{ kind: 'removeBg', mode: 'edges', colour: null, tolerance: 12, softness: 8, matte: 0 }]),
    },
    fill: {
        title: 'Fill background',
        lead: 'Paints every see-through pixel with one solid colour. It never touches a pixel that is already opaque — only the transparent parts change.',
        example: 'After removing a background by mistake, or after importing a logo that was already cut out, fill it with the accent colour to match the rest of the manifest, or with white for a clean, presentable tile.',
        tip: 'To replace an existing background instead of adding one, remove it first — Fill only ever adds colour to transparency, it cannot overwrite a colour that is already there.',
        before: demoTransparent,
        after: run([{ kind: 'fill', colour: DEMO_BLUE }]),
    },
    trim: {
        title: 'Trim',
        lead: 'Cuts away the empty margin around the logo — the flat background or the transparent border — down to the smallest rectangle that still contains everything visible.',
        example: 'A logo exported from a design tool often sits in the middle of a much larger, mostly empty canvas; trimming it first means every later step (Make square, Fit) works with the logo itself, not with wasted space.',
        tip: 'Raise Tolerance slightly if a faint edge or compression noise is stopping the margin from being seen as empty.',
        before: demoPadded,
        after: run([{ kind: 'trim', tolerance: 2 }]),
    },
    crop: {
        title: 'Crop',
        lead: 'Keeps one rectangle of the picture and discards the rest. Use it to cut away a part you do not want, or to isolate one mark out of a larger composition.',
        example: 'A screenshot that contains the logo alongside other text or UI: crop down to just the logo before working on it further.',
        tip: 'Drag directly on the picture to pick the rectangle, or type the four numbers for an exact pixel selection.',
        before: demoOpaque,
        after: run([{ kind: 'crop', x: 0, y: 0, w: 30, h: 30 }]),
    },
    square: {
        title: 'Make square',
        lead: "Pads the shorter side so the picture becomes a perfect square, centring the original inside it. Teams' colour icon must be square; this is how a rectangular logo gets there without stretching it.",
        example: 'A wordmark that is wider than it is tall: Make square adds even margin above and below instead of squashing the letters to fit.',
        tip: 'Choose a padding colour to match a flat background, or leave it see-through to pad with transparency instead.',
        before: demoWide,
        after: run([{ kind: 'square', fill: null }]),
    },
    fit: {
        title: 'Fit',
        lead: "Scales the logo, without stretching it, to a chosen share of the icon, and centres it inside the safe area Teams actually shows.",
        example: "A logo that fills its entire canvas edge-to-edge looks cropped once Teams applies its own rounding and masking; Fit shrinks it to the safe area inside the icon so nothing is ever clipped.",
        tip: 'Lower the share percentage for a logo with fine detail near its edges; keep it near the default for most marks.',
        before: demoNearFill,
        after: run([{ kind: 'fit', target: 48, share: 62.5 }]),
    },
    rotate: {
        title: 'Rotate',
        lead: 'Turns the whole picture by a quarter turn, as many times as needed.',
        example: 'A logo exported sideways from a source file: two 90-degree turns bring it upright again without leaving the editor.',
        tip: "Rotate changes the picture's own orientation — use Flip instead for a mirror image.",
        before: demoOpaque,
        after: run([{ kind: 'rotate', quarters: 1 }]),
    },
    flip: {
        title: 'Flip',
        lead: 'Mirrors the picture left-to-right or top-to-bottom. Both directions work the same way; only the axis differs.',
        example: "A logo that reads correctly but is a mirror image of the brand's real mark — one flip corrects it without redrawing anything.",
        tip: 'Flipping a logo that contains readable text will mirror the text too; check it still reads correctly afterwards.',
        before: demoOpaque,
        after: run([{ kind: 'flip', axis: 'h' }]),
    },
    solid: {
        title: 'Solid colour',
        lead: 'Repaints every visible pixel with one colour, keeping the shape exactly as it is — only the colour changes, not the transparency.',
        example: 'Turning a full-colour logo into a single-tone mark for a monochrome brand treatment, or matching the glyph to the accent colour.',
        tip: 'This changes colour only; shape edits (Trim, Crop, Make square) still work the same afterwards.',
        before: demoTwoTone,
        after: run([{ kind: 'solid', colour: DEMO_WHITE }]),
    },
    tone: {
        title: 'Tone',
        lead: 'Adjusts hue, saturation, brightness and contrast together, or switches the picture to grayscale, inverts it, or cuts it down to pure black-and-white with a threshold.',
        example: 'A logo that looks slightly washed out next to the rest of the manifest: raise contrast and brightness a little until it matches.',
        tip: 'Grayscale and Threshold are useful first steps before Outline maker, which reads shape from either transparency or darkness.',
        before: demoTwoTone,
        after: run([{ kind: 'tone', hue: 0, saturation: -100, brightness: 0, contrast: 0, invert: false, gray: true, threshold: null }]),
    },
    outline: {
        title: 'Outline maker',
        lead: "Turns the picture into a plain white shape on a see-through background — exactly what the outline icon needs, since Teams draws it in the colour of its own app bar, never in the logo's original colours.",
        example: 'Starting from the full colour icon, Outline maker produces the matching 32 x 32 glyph Teams shows in the app bar while the agent is open.',
        tip: '"Shape (transparency)" reads the existing see-through parts; "Darkness" is for a logo that has no transparency yet, turning its darker pixels into the shape instead.',
        before: demoTwoTone,
        after: run([{ kind: 'outline', mode: 'alpha', cutoff: 16 }]),
    },
    presetTeams: {
        title: 'Teams-ready colour icon',
        lead: 'One step that runs the whole colour-icon recipe at once: removes a flat background if there is one, trims the empty margin, makes the picture square, and fits it inside the safe area at 192 x 192.',
        example: 'The fastest way to take a logo straight from a design export to a shape Teams will show correctly everywhere, without running each step by hand.',
        tip: 'Review the result afterwards — each step it ran is still listed separately in the history, and any one of them can be adjusted or removed.',
        before: demoWideOpaque,
        after: (before) => run(presetTeamsColour(before))(before),
    },
    presetOutline: {
        title: 'Outline from this icon',
        lead: 'Builds the outline icon straight from the current colour icon: turns it into a white shape, trims it, squares it and fits it at 32 x 32.',
        example: 'Keeps the app-bar icon in step with the colour icon without opening Outline maker and the geometry tools one by one.',
        tip: 'Run it again any time the colour icon changes, so the two icons never drift apart.',
        before: demoTransparent,
        after: (before) => run(presetOutline(before))(before),
    },
};

/** The CSS pixels a guide's before/after picture is shown at, its longer side scaled to this. */
const GUIDE_PIC_SIDE = 96;

export interface EffectGuideView {
    /** Builds the overlay (once) inside `host`, hidden, ready for `open()`. */
    attach(host: HTMLElement): void;
    open(key: GuideKey): void;
    close(): void;
    isOpen(): boolean;
}

export function initEffectGuide(): EffectGuideView {
    let built = false;
    let current: GuideKey | null = null;
    let overlay: HTMLElement | null = null;

    const $ = (id: string): HTMLElement => document.getElementById(id)!;

    function paint(canvas: HTMLCanvasElement, p: Picture): void {
        paintTile(canvas, p.data, p.width, p.height);
        const scale = GUIDE_PIC_SIDE / Math.max(p.width, p.height);
        canvas.style.width = `${Math.round(p.width * scale)}px`;
        canvas.style.height = `${Math.round(p.height * scale)}px`;
    }

    function render(): void {
        if (!current) return;
        const g = GUIDES[current];
        $('guide-title').textContent = g.title;
        $('guide-lead').textContent = g.lead;
        $('guide-example').textContent = g.example;
        $('guide-tip').textContent = g.tip;
        const before = g.before();
        const after = g.after(before);
        paint($('guide-before-canvas') as HTMLCanvasElement, before);
        paint($('guide-after-canvas') as HTMLCanvasElement, after);
        renderParams(current);
    }

    /** The Parameters section (the technical manual, FR-009): one row per field of `FIELDS[opKind]`, or hidden
     *  entirely for a Quick preset, which has none. Rebuilt per guide, since the list of fields differs by effect. */
    function renderParams(key: GuideKey): void {
        const section = $('guide-params');
        clear(section);
        const opKind = GUIDE_OP[key];
        if (!opKind) { section.hidden = true; return; }
        section.hidden = false;
        section.append(
            el('h4', { class: 'guide-params-title' }, 'Parameters'),
            ...FIELDS[opKind].map(f => el('div', { class: 'guide-param' },
                el('div', { class: 'guide-param-head' },
                    el('span', { class: 'guide-param-name' }, f.label),
                    el('span', { class: 'guide-param-detail' }, paramDetail(f))),
                el('p', { class: 'guide-param-help' }, PARAM_HELP[opKind][f.name] ?? ''))));
    }

    function build(host: HTMLElement): void {
        built = true;
        const closeBtn = el('button', { id: 'guide-close', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-label': 'Close guide' }, icon('close', 'icon--xs'), 'Close');
        closeBtn.addEventListener('click', () => close());
        const panel = el('div', { id: 'guide-panel', class: 'guide-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'guide-title' },
            el('div', { class: 'guide-head' },
                el('h3', { id: 'guide-title', class: 'guide-title' }),
                closeBtn),
            el('p', { id: 'guide-lead', class: 'guide-lead' }),
            el('p', { id: 'guide-example', class: 'guide-example' }),
            el('div', { class: 'guide-before-after' },
                el('figure', { class: 'guide-figure' },
                    el('canvas', { id: 'guide-before-canvas', class: 'guide-pic icon-canvas--checker' }),
                    el('figcaption', {}, 'Before')),
                el('figure', { class: 'guide-figure' },
                    el('canvas', { id: 'guide-after-canvas', class: 'guide-pic icon-canvas--checker' }),
                    el('figcaption', {}, 'After'))),
            el('div', { id: 'guide-params', class: 'guide-params', 'aria-label': 'Parameters' }),
            el('p', { id: 'guide-tip', class: 'guide-tip' }));
        overlay = el('div', { id: 'guide-overlay', class: 'guide-overlay', hidden: true }, panel);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        host.appendChild(overlay);
    }

    function attach(host: HTMLElement): void {
        if (built && overlay?.isConnected) return;
        build(host);
    }

    function open(key: GuideKey): void {
        if (!built) return;   // attach() must run first, from the editor's own build()
        current = key;
        render();
        overlay!.hidden = false;
    }

    function close(): void {
        if (!built || current === null) return;
        current = null;
        overlay!.hidden = true;
        $('guide-panel').scrollTop = 0;   // the popup closed: the next guide must not open mid-scroll
    }

    const isOpen = (): boolean => current !== null;

    return { attach, open, close, isOpen };
}

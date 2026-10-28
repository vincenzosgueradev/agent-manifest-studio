/**
 * The image editor (feature 004): a full-width card with a canvas, the list of operations, the tools,
 * an eyedropper and the Teams-style preview. It holds its own state (the pipeline and the view settings);
 * the maths is in `services/image/`. What it needs from the app comes in through `deps`.
 */

import { card } from './card';
import { clear, el } from './dom';
import { parseCssColor } from './preview';
import { icon, type IconName } from '../icons';
import { cornerColour, dominantColour, fromHex, pixelAt, toHex } from '../services/image/colour';
import { acceptResult, toTarget } from '../services/image/accept';
import { importImage, windowDecoder } from '../services/image/import';
import { encodePng } from '../services/image/pngWrite';
import { resizePicture } from '../services/image/resample';
import { add, checkpoint, create, defaultOp, evaluate, presetOutline, presetTeamsColour, redo, remove, reset, undo, update, withSource, type Pipeline } from '../services/image/pipeline';
import type { Op, OpKind, Picture, Rgb } from '../services/image/types';
import { cropProblem } from '../services/image/ops';
import { flattenOnAccent, parseAccent } from '../services/preview';
import { decodePng } from '../services/png';
import type { IconSlot } from '../services/edit/fields';

export interface ImageEditorDeps {
    /** Where the editor card goes (after the icon cards); `null` while there is no package on screen. */
    root: () => HTMLElement | null;
    /** The current icon of a slot as bytes (replaced or original), or `null`. */
    currentIcon: (slot: IconSlot) => Uint8Array | null;
    /** The accent colour of the manifest as it is now. */
    accent: () => string | null;
    /** The result, as PNG bytes of the right size, goes into the package. */
    onApply: (slot: IconSlot, bytes: Uint8Array) => void;
    /** The user accepted a colour as the accent colour of the manifest. */
    onAccent: (hex: string) => void;
    /** Asks the host for an image file: `null` when cancelled or when the host has no dialog. */
    pickImage: () => Promise<{ name: string; bytes: Uint8Array } | null>;
    hasHostFiles: () => boolean;
    /** Saves the PNG with the host's dialog; the path, or `null` when cancelled. */
    savePng: (name: string, bytes: Uint8Array) => Promise<string | null>;
    /** The editor opened or closed (the icon cards disable their button while one is open). */
    onOpenChange: (slot: IconSlot | null) => void;
}

type Bg = 'checker' | 'accent' | 'white' | 'black';
type Zoom = 'fit' | '100' | '200' | '400';

interface State {
    slot: IconSlot;
    target: number;
    pipeline: Pipeline;
    name: string;
    note: string | null;
    message: string | null;
    showOriginal: boolean;
    picking: boolean;
    reading: { x: number; y: number; r: number; g: number; b: number; a: number } | null;
    bg: Bg;
    zoom: Zoom;
    suggestion: Rgb | null;
    status: string | null;
}

/** A change that takes longer than this is reported to the user. */
export const SLOW_MS = 200;

const SLOT_TITLE: Record<IconSlot, string> = { color: 'colour icon', outline: 'outline icon' };

/** The pixel of a picture under a pointer: the rectangle is the canvas on screen. */
export function toPixel(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, width: number, height: number): { x: number; y: number } | null {
    if (rect.width <= 0 || rect.height <= 0) return null;
    const fx = (clientX - rect.left) / rect.width, fy = (clientY - rect.top) / rect.height;
    if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) return null;
    return { x: Math.min(width - 1, Math.floor(fx * width)), y: Math.min(height - 1, Math.floor(fy * height)) };
}

// ── The fields of each operation ──────────────────────────────────────────────

type Field =
    | { name: string; label: string; type: 'number'; min: number; max: number; step: number; range?: boolean; get: (o: Op) => number; set: (o: Op, v: number) => Op }
    | { name: string; label: string; type: 'select'; options: Array<[string, string]>; get: (o: Op) => string; set: (o: Op, v: string) => Op }
    | { name: string; label: string; type: 'colour'; optional?: boolean; get: (o: Op) => Rgb | null; set: (o: Op, v: Rgb | null) => Op }
    | { name: string; label: string; type: 'toggle'; get: (o: Op) => boolean; set: (o: Op, v: boolean) => Op };

const num = (name: string, label: string, min: number, max: number, step = 1, range = false): ((key: string) => Field) =>
    key => ({ name, label, type: 'number', min, max, step, range, get: o => (o as unknown as Record<string, number>)[key]!, set: (o, v) => ({ ...o, [key]: v }) as Op });

const FIELDS: Record<OpKind, Field[]> = {
    removeBg: [
        { name: 'mode', label: 'Where', type: 'select', options: [['edges', 'From the edges'], ['everywhere', 'Everywhere']], get: o => (o as { mode: string }).mode, set: (o, v) => ({ ...o, mode: v }) as Op },
        { name: 'colour', label: 'Colour to remove', type: 'colour', optional: true, get: o => (o as { colour: Rgb | null }).colour, set: (o, v) => ({ ...o, colour: v }) as Op },
        num('tolerance', 'Tolerance (%)', 0, 100, 1, true)('tolerance'),
        num('softness', 'Softness (%)', 0, 100, 1, true)('softness'),
        num('matte', 'Matte (pixels)', -5, 5)('matte'),
    ],
    trim: [num('tolerance', 'Background tolerance (%)', 0, 100)('tolerance')],
    crop: [num('x', 'Left', 0, 100000)('x'), num('y', 'Top', 0, 100000)('y'), num('w', 'Width', 1, 100000)('w'), num('h', 'Height', 1, 100000)('h')],
    square: [{ name: 'fill', label: 'Padding colour', type: 'colour', optional: true, get: o => (o as { fill: Rgb | null }).fill, set: (o, v) => ({ ...o, fill: v }) as Op }],
    fit: [num('share', 'Share of the icon (%)', 1, 100, 0.5, true)('share')],
    resize: [num('w', 'Width', 1, 4096)('w'), num('h', 'Height', 1, 4096)('h')],
    rotate: [{ name: 'quarters', label: 'Turn', type: 'select', options: [['1', '90 degrees clockwise'], ['2', '180 degrees'], ['3', '90 degrees anticlockwise']], get: o => String((o as { quarters: number }).quarters), set: (o, v) => ({ ...o, quarters: Number(v) }) as Op }],
    flip: [{ name: 'axis', label: 'Mirror', type: 'select', options: [['h', 'Left to right'], ['v', 'Top to bottom']], get: o => (o as { axis: string }).axis, set: (o, v) => ({ ...o, axis: v }) as Op }],
    fill: [{ name: 'colour', label: 'Colour', type: 'colour', get: o => (o as { colour: Rgb }).colour, set: (o, v) => ({ ...o, colour: v ?? (o as { colour: Rgb }).colour }) as Op }],
    solid: [{ name: 'colour', label: 'Colour', type: 'colour', get: o => (o as { colour: Rgb }).colour, set: (o, v) => ({ ...o, colour: v ?? (o as { colour: Rgb }).colour }) as Op }],
    tone: [
        num('hue', 'Hue (degrees)', -180, 180, 1, true)('hue'), num('saturation', 'Saturation', -100, 100, 1, true)('saturation'),
        num('brightness', 'Brightness', -100, 100, 1, true)('brightness'), num('contrast', 'Contrast', -100, 100, 1, true)('contrast'),
        { name: 'invert', label: 'Invert', type: 'toggle', get: o => (o as { invert: boolean }).invert, set: (o, v) => ({ ...o, invert: v }) as Op },
        { name: 'gray', label: 'Grayscale', type: 'toggle', get: o => (o as { gray: boolean }).gray, set: (o, v) => ({ ...o, gray: v }) as Op },
        { name: 'threshold', label: 'Threshold (0 = off)', type: 'number', min: 0, max: 255, step: 1, range: true, get: o => (o as { threshold: number | null }).threshold ?? 0, set: (o, v) => ({ ...o, threshold: v === 0 ? null : v }) as Op },
    ],
    outline: [
        { name: 'mode', label: 'From', type: 'select', options: [['alpha', 'Shape (transparency)'], ['brightness', 'Darkness (dark logo on light)']], get: o => (o as { mode: string }).mode, set: (o, v) => ({ ...o, mode: v }) as Op },
        num('cutoff', 'Cutoff (alpha mode)', 0, 255, 1, true)('cutoff'),
    ],
};

/** One line under a step that says what it does and what it does not, for the steps that are easy to misread. */
const OP_HINT: Partial<Record<OpKind, string>> = {
    removeBg: 'Makes the chosen colour see-through. Where: from the edges keeps the same colour inside the logo.',
    fill: 'Fills only the see-through parts. To change a background that is already there, remove it first (Remove background), then fill.',
    solid: 'Gives every visible pixel this colour. The see-through parts stay see-through.',
    outline: 'Turns the picture into a white shape. For the outline icon only the shape counts: Teams draws it in the colour of its bar.',
};

const OP_TITLE: Record<OpKind, string> = {
    removeBg: 'Remove background', trim: 'Trim', crop: 'Crop', square: 'Make square', fit: 'Fit', resize: 'Resize', rotate: 'Rotate', flip: 'Flip',
    fill: 'Fill background', solid: 'Solid colour', tone: 'Tone', outline: 'Outline maker',
};

// ── The editor ────────────────────────────────────────────────────────────────

export interface ImageEditor {
    open(slot: IconSlot, preset?: 'teams' | 'outline'): void;
    close(): void;
    isOpen(): boolean;
    openSlot(): IconSlot | null;
}

export function initImageEditor(deps: ImageEditorDeps): ImageEditor {
    let state: State | null = null;
    let built = false;
    let opsSignature = '';
    /** Bumped on every change so that an import that finishes late is dropped. */
    let ticket = 0;

    const $ = (id: string): HTMLElement => document.getElementById(id)!;

    // ── state changes ─────────────────────────────────────────────────────────

    const evaluated = () => evaluate(state!.pipeline.source, state!.pipeline.ops);
    const result = (): Picture => evaluated().picture;

    function setPipeline(pl: Pipeline): void { state!.pipeline = pl; state!.message = null; state!.status = null; state!.suggestion = null; render(); }
    function addOp(op: Op): void { setPipeline(add(state!.pipeline, op)); }
    const addKind = (kind: OpKind): void => addOp(defaultOp(kind, result(), state!.target));

    function picture(bytes: Uint8Array | null): Picture | null {
        if (!bytes) return null;
        const png = decodePng(bytes);
        return png.kind === 'ok' ? { width: png.header.width, height: png.header.height, data: png.rgba } : null;
    }

    function open(slot: IconSlot, preset?: 'teams' | 'outline'): void {
        // the outline preset starts from the colour icon, as the card says
        const from = preset === 'outline' ? 'color' : slot;
        const source = picture(deps.currentIcon(from)) ?? picture(deps.currentIcon(slot));
        const empty: Picture = { width: 1, height: 1, data: new Uint8Array(4) };
        const src = source ?? empty;
        const target = slot === 'color' ? 192 : 32;
        let pipeline = create(src);
        if (preset === 'teams') pipeline = create(src, presetTeamsColour(src));
        if (preset === 'outline') pipeline = create(src, presetOutline(src));
        state = {
            slot, target, pipeline, name: source ? `the current ${SLOT_TITLE[from]}` : 'nothing yet', note: source ? null : 'There is no icon in the package yet. Open an image to start.',
            message: null, showOriginal: false, picking: false, reading: null, bg: 'checker', zoom: 'fit', suggestion: null, status: null,
        };
        ticket++;
        const host = deps.root();
        if (!host) { state = null; return; }
        if (!document.getElementById('ie-card')) built = false;   // the page was cleared (another package)
        if (!built) build(host);
        opsSignature = '\u0001';   // never equal to a real list, so the list is built once
        $('ie-card').hidden = false;
        deps.onOpenChange(slot);
        render();
        $('ie-card').scrollIntoView?.({ block: 'nearest' });
    }

    function close(): void {
        if (!state) return;
        state = null;
        ticket++;
        if (built) $('ie-card').hidden = true;
        deps.onOpenChange(null);
    }

    async function openImage(file: { name: string; bytes: Uint8Array }): Promise<void> {
        if (!state) return;
        const mine = ++ticket;
        const r = await importImage(file.bytes, windowDecoder());
        if (!state || mine !== ticket) return;
        if (!r.ok) { state.message = r.message; render(); return; }
        state.pipeline = withSource(state.pipeline, r.picture);
        state.name = file.name;
        state.note = r.note;
        state.message = null;
        state.suggestion = null;
        render();
    }

    async function apply(): Promise<void> {
        if (!state) return;
        const r = acceptResult(result(), state.target);
        if (!r.ok) { state.message = r.message; render(); return; }
        const slot = state.slot;
        close();
        deps.onApply(slot, r.bytes);
    }

    async function savePng(): Promise<void> {
        if (!state) return;
        const out = toTarget(result(), state.target);
        const bytes = encodePng(out);
        const mine = state;
        try {
            const saved = await deps.savePng(`${mine.slot === 'color' ? 'color' : 'outline'}.png`, bytes);
            if (state === mine) state.status = saved === null ? 'Not saved: the save dialog was cancelled.' : `Saved: ${saved}`;
        } catch (e) {
            if (state === mine) state.status = `Not saved: ${e instanceof Error ? e.message : String(e)}`;
        }
        render();
    }

    // ── building ──────────────────────────────────────────────────────────────

    function button(id: string, label: string, ic: IconName | null, onClick: () => void, cls = 'btn btn--secondary btn--sm', title?: string): HTMLButtonElement {
        const b = el('button', { id, type: 'button', class: cls, title }, ic ? icon(ic, 'icon--xs') : null, label);
        b.addEventListener('click', onClick);
        return b;
    }

    function build(host: HTMLElement): void {
        built = true;
        const file = el('input', { id: 'ie-file', type: 'file', accept: 'image/*', hidden: true });
        file.addEventListener('change', () => {
            const f = file.files?.[0];
            file.value = '';
            if (f) void f.arrayBuffer().then(b => openImage({ name: f.name, bytes: new Uint8Array(b) }));
        });

        const tools = el('div', { class: 'ie-tools', role: 'group', 'aria-label': 'Tools' },
            button('ie-add-removeBg', 'Remove background', 'eraser', () => addKind('removeBg')),
            button('ie-add-trim', 'Trim', 'crop', () => addKind('trim')),
            button('ie-add-crop', 'Crop', 'crop', () => addKind('crop')),
            button('ie-add-square', 'Make square', 'expand', () => addKind('square')),
            button('ie-add-fit', 'Fit', 'expand', () => addKind('fit')),
            button('ie-add-resize', 'Resize', 'expand', () => addKind('resize')),
            button('ie-add-rotate', 'Rotate', 'rotate', () => addKind('rotate')),
            button('ie-add-flip-h', 'Flip left-right', 'flip', () => addOp({ kind: 'flip', axis: 'h' })),
            button('ie-add-flip-v', 'Flip top-bottom', 'flip', () => addOp({ kind: 'flip', axis: 'v' })),
            button('ie-add-fill', 'Fill background', 'palette', () => {
                const accent = parseAccent(deps.accent() ?? '');
                addOp({ kind: 'fill', colour: accent ?? { r: 255, g: 255, b: 255 } });
            }),
            button('ie-add-solid', 'Solid colour', 'palette', () => addKind('solid')),
            button('ie-add-white', 'Make white', 'palette', () => addOp({ kind: 'solid', colour: { r: 255, g: 255, b: 255 } })),
            button('ie-add-black', 'Make black', 'palette', () => addOp({ kind: 'solid', colour: { r: 0, g: 0, b: 0 } })),
            button('ie-add-tone', 'Tone', 'sliders', () => addKind('tone')),
            button('ie-add-outline', 'Outline maker', 'wand', () => addKind('outline')));

        const presets = el('div', { class: 'ie-tools', role: 'group', 'aria-label': 'One-click presets' },
            button('ie-preset-teams', 'Teams-ready colour icon', 'wand', () => applyPreset('teams'), 'btn btn--primary btn--sm'),
            button('ie-preset-outline', 'Outline from this icon', 'wand', () => applyPreset('outline'), 'btn btn--primary btn--sm'));

        const head = el('div', { class: 'ie-head' },
            button('ie-open-other', 'Open another image', 'folder', () => {
                if (deps.hasHostFiles()) void deps.pickImage().then(f => { if (f) void openImage(f); }).catch(e => { if (state) { state.message = `The file could not be opened: ${e instanceof Error ? e.message : String(e)}`; render(); } });
                else file.click();
            }),
            button('ie-undo', 'Undo', 'undo', () => setPipeline(undo(state!.pipeline))),
            button('ie-redo', 'Redo', 'undo', () => setPipeline(redo(state!.pipeline))),
            button('ie-reset', 'Reset', 'refresh', () => setPipeline(reset(state!.pipeline))),
            button('ie-save-png', 'Save image as PNG', 'save', () => { void savePng(); }),
            el('span', { class: 'ie-spacer' }),
            button('ie-cancel', 'Cancel', 'close', () => close()),
            button('ie-apply', 'Apply', 'check', () => { void apply(); }, 'btn btn--primary btn--sm'),
            file);

        const canvas = el('canvas', { id: 'ie-canvas', class: 'ie-canvas', role: 'img', 'aria-label': 'The picture being edited', tabindex: '0' });
        const stage = el('div', { class: 'ie-stage', id: 'ie-stage' }, canvas, el('div', { class: 'ie-crop-box', id: 'ie-crop-box', hidden: true }));
        wireCanvas(canvas, stage);

        const viewBar = el('div', { class: 'ie-viewbar' },
            el('div', { class: 'segmented', role: 'group', 'aria-label': 'Background of the canvas' },
                ...(['checker', 'accent', 'white', 'black'] as const).map(bg => segBtn(`ie-bg-${bg}`, bg[0]!.toUpperCase() + bg.slice(1), () => { state!.bg = bg; render(); }))),
            el('div', { class: 'segmented', role: 'group', 'aria-label': 'Zoom' },
                ...(['fit', '100', '200', '400'] as const).map(z => segBtn(`ie-zoom-${z}`, z === 'fit' ? 'Fit' : `${z}%`, () => { state!.zoom = z; render(); }))),
            (() => {
                const b = el('button', { id: 'ie-original', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-pressed': 'false' }, icon('eye', 'icon--xs'), 'Show original');
                b.addEventListener('click', () => { state!.showOriginal = !state!.showOriginal; render(); });
                return b;
            })(),
            (() => {
                const b = el('button', { id: 'ie-pick', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-pressed': 'false' }, icon('pipette', 'icon--xs'), 'Eyedropper');
                b.addEventListener('click', () => { state!.picking = !state!.picking; render(); });
                return b;
            })());

        const reading = el('div', { class: 'ie-reading', id: 'ie-reading', hidden: true },
            el('span', { class: 'swatch', id: 'ie-reading-swatch', 'aria-hidden': 'true' }),
            el('span', { id: 'ie-reading-hex', class: 'ie-hex' }),
            el('span', { id: 'ie-reading-info', class: 'ed-help' }),
            el('button', { id: 'ie-reading-copy', type: 'button', class: 'icon-btn', 'data-copy': '', 'aria-label': 'Copy the colour', title: 'Copy the colour' }, icon('copy', 'icon--sm')),
            button('ie-send-bg', 'Colour to remove', null, () => sendColour('bg')),
            button('ie-send-solid', 'Solid colour', null, () => sendColour('solid')),
            button('ie-send-fill', 'Fill colour', null, () => sendColour('fill')),
            button('ie-send-accent', 'Accent colour', null, () => sendColour('accent')));

        const pixelRow = el('div', { class: 'ie-pixel' },
            el('label', { for: 'ie-pick-x' }, 'Read the pixel at x'),
            numberInput('ie-pick-x', 0, 100000, 1),
            el('label', { for: 'ie-pick-y' }, 'y'),
            numberInput('ie-pick-y', 0, 100000, 1),
            button('ie-read', 'Read', 'pipette', () => {
                const x = Number(($('ie-pick-x') as HTMLInputElement).value), y = Number(($('ie-pick-y') as HTMLInputElement).value);
                readPixel(x, y);
            }));

        const accent = el('div', { class: 'ie-accent' },
            button('ie-accent-suggest', 'Suggest accent colour', 'pipette', () => { state!.suggestion = dominantColour(result()); render(); }),
            el('span', { class: 'swatch', id: 'ie-accent-swatch', hidden: true, 'aria-hidden': 'true' }),
            el('span', { id: 'ie-accent-hex', class: 'ie-hex', hidden: true }),
            button('ie-accent-accept', 'Use as accent colour', 'check', () => { if (state?.suggestion) deps.onAccent(toHex(state.suggestion)); }));

        const left = el('div', { class: 'ie-left' }, viewBar, stage, reading, pixelRow);
        const right = el('div', { class: 'ie-right' },
            el('h4', { class: 'ie-sub' }, 'Quick'), presets,
            el('h4', { class: 'ie-sub' }, 'Tools'), tools,
            el('h4', { class: 'ie-sub' }, 'Steps'), el('ol', { class: 'ie-ops', id: 'ie-ops', 'aria-label': 'The steps, in order' }),
            el('h4', { class: 'ie-sub' }, 'Colour'), accent);
        const preview = el('div', { class: 'ie-preview', id: 'ie-preview' });

        const c = card({ icon: 'image', title: 'Image editor', note: el('span', { class: 'panel-sub', id: 'ie-title-note' }), id: 'ie-card' },
            head,
            el('p', { class: 'field-hint', id: 'ie-note', hidden: true }),
            el('p', { class: 'export-reason ed-error', id: 'ie-message', role: 'alert', hidden: true }),
            el('p', { class: 'report-status', id: 'ie-status', role: 'status', hidden: true }),
            el('p', { class: 'field-hint', id: 'ie-speed', role: 'status', hidden: true }),
            el('div', { class: 'ie-body' }, left, right),
            preview);
        c.hidden = true;
        host.append(c);
    }

    function segBtn(id: string, label: string, onClick: () => void): HTMLButtonElement {
        const b = el('button', { id, type: 'button', class: 'segment', 'aria-pressed': 'false' }, label);
        b.addEventListener('click', onClick);
        return b;
    }

    function numberInput(id: string, min: number, max: number, step: number): HTMLInputElement {
        return el('input', { id, class: 'text-input ie-num', type: 'number', min: String(min), max: String(max), step: String(step), value: '0' });
    }

    function applyPreset(kind: 'teams' | 'outline'): void {
        if (!state) return;
        const src = kind === 'outline' ? (picture(deps.currentIcon('color')) ?? state.pipeline.source) : state.pipeline.source;
        const ops = kind === 'teams' ? presetTeamsColour(state.pipeline.source) : presetOutline(src);
        let pl = kind === 'outline' ? withSource(state.pipeline, src) : state.pipeline;
        for (const op of ops) pl = add(pl, op);
        if (kind === 'outline') state.name = 'the current colour icon';
        setPipeline(pl);
    }

    // ── the canvas: eyedropper and crop by dragging ───────────────────────────

    function readPixel(x: number, y: number): void {
        if (!state) return;
        const px = pixelAt(picture2(), x, y);
        if (!px) { state.message = `The pixel (${x}, ${y}) is outside the picture, which is ${picture2().width} x ${picture2().height} pixels.`; render(); return; }
        state.reading = { x, y, ...px };
        state.message = null;
        render();
    }

    /** The picture on the canvas: the result, or the original while "Show original" is on. */
    const picture2 = (): Picture => (state!.showOriginal ? state!.pipeline.source : result());

    function sendColour(to: 'bg' | 'solid' | 'fill' | 'accent'): void {
        const r = state?.reading;
        if (!state || !r || r.a === 0) return;
        const colour = { r: r.r, g: r.g, b: r.b };
        if (to === 'accent') { deps.onAccent(toHex(colour)); return; }
        if (to === 'solid') { addOp({ kind: 'solid', colour }); return; }
        if (to === 'fill') { addOp({ kind: 'fill', colour }); return; }
        const ops = state.pipeline.ops;
        const last = [...ops.keys()].reverse().find(i => ops[i]!.kind === 'removeBg');
        if (last === undefined) addOp({ ...(defaultOp('removeBg', result(), state.target) as Extract<Op, { kind: 'removeBg' }>), colour });
        else setPipeline(update(state.pipeline, last, { ...(ops[last] as Extract<Op, { kind: 'removeBg' }>), colour }));
    }

    function wireCanvas(canvas: HTMLCanvasElement, stage: HTMLElement): void {
        let drag: { x0: number; y0: number; x1: number; y1: number } | null = null;
        const at = (e: MouseEvent): { x: number; y: number } | null => {
            const p = picture2();
            return toPixel(e.clientX, e.clientY, canvas.getBoundingClientRect(), p.width, p.height);
        };
        const box = (): HTMLElement => $('ie-crop-box');
        const drawBox = (): void => {
            if (!drag) { box().hidden = true; return; }
            const rect = canvas.getBoundingClientRect();
            const p = picture2();
            const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
            const w = Math.abs(drag.x1 - drag.x0) + 1, h = Math.abs(drag.y1 - drag.y0) + 1;
            const sx = rect.width / p.width, sy = rect.height / p.height;
            const stageRect = stage.getBoundingClientRect();
            Object.assign(box().style, { left: `${rect.left - stageRect.left + x * sx}px`, top: `${rect.top - stageRect.top + y * sy}px`, width: `${w * sx}px`, height: `${h * sy}px` });
            box().hidden = false;
            box().title = `${w} x ${h} pixels`;
        };
        canvas.addEventListener('pointerdown', e => {
            if (!state) return;
            const p = at(e);
            if (!p) return;
            if (state.picking) { readPixel(p.x, p.y); return; }
            drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
            canvas.setPointerCapture?.(e.pointerId);
            drawBox();
        });
        canvas.addEventListener('pointermove', e => {
            if (!drag) return;
            const p = at(e);
            if (p) { drag.x1 = p.x; drag.y1 = p.y; drawBox(); }
        });
        const finish = (e: PointerEvent): void => {
            if (!drag || !state) return;
            const p = at(e);
            if (p) { drag.x1 = p.x; drag.y1 = p.y; }
            const d = drag;
            drag = null;
            drawBox();
            const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0) + 1, h = Math.abs(d.y1 - d.y0) + 1;
            // a click without a drag is not a crop
            if (w > 1 || h > 1) {
                if (cropProblem(result(), x, y, w, h) === null) addOp({ kind: 'crop', x, y, w, h });
            }
        };
        canvas.addEventListener('pointerup', finish);
        canvas.addEventListener('pointercancel', () => { drag = null; drawBox(); });
    }

    // ── drawing ───────────────────────────────────────────────────────────────

    function drawPicture(canvas: HTMLCanvasElement, p: Picture): void {
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = ctx.createImageData(p.width, p.height);
        img.data.set(p.data);
        ctx.putImageData(img, 0, 0);
    }

    function cssColour(name: string, fallback: string): Rgb {
        const raw = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue(name) : '';
        return parseCssColor(raw, fallback);
    }

    function tile(id: string, side: number, content: Picture, background: Rgb | null, tint: Rgb | null): HTMLCanvasElement {
        const c = el('canvas', { id, class: 'ie-tile', 'aria-label': `${side} pixels` });
        let p = side === content.width ? content : resizePicture(content, side, side);
        if (tint) {
            p = { ...p, data: p.data.slice() };
            for (let i = 0; i < p.data.length; i += 4) { p.data[i] = tint.r; p.data[i + 1] = tint.g; p.data[i + 2] = tint.b; }
        }
        if (background) p = { ...p, data: flattenOnAccent(p.data, background) };
        c.style.width = `${side}px`;
        c.style.height = `${side}px`;
        drawPicture(c, p);
        return c;
    }

    function renderPreview(): void {
        const box = $('ie-preview');
        clear(box);
        const out = toTarget(result(), state!.target);
        if (state!.slot === 'color') {
            const accent = parseAccent(deps.accent() ?? '') ?? { r: 7, g: 104, b: 125 };
            box.append(
                el('p', { class: 'ie-sub' }, `The result on the accent colour ${toHex(accent)}, at the sizes Teams uses`),
                el('div', { class: 'ie-tiles' }, ...[192, 96, 48, 32].map(s => el('figure', { class: 'ie-fig' }, tile(`ie-tile-${s}`, s, out, accent, null), el('figcaption', {}, `${s} px`)))));
        } else {
            const light = cssColour('--bar-light-fg', '#424242'), dark = cssColour('--bar-dark-fg', '#ffffff');
            box.append(
                el('p', { class: 'ie-sub' }, 'The result on a light and a dark app bar'),
                el('p', { class: 'ie-note', id: 'ie-outline-note' }, 'Teams draws this icon in the colour of its bar, so only the shape counts: the colour you give it here does not show.'),
                el('div', { class: 'ie-tiles' },
                    el('figure', { class: 'ie-fig ie-bar ie-bar--light' }, tile('ie-tile-light', 32, out, null, light), el('figcaption', {}, 'light bar')),
                    el('figure', { class: 'ie-fig ie-bar ie-bar--dark' }, tile('ie-tile-dark', 32, out, null, dark), el('figcaption', {}, 'dark bar'))));
        }
        box.append(el('p', { class: 'notice' }, 'This preview does not reproduce exactly what Teams draws. The final check is a test in Teams.'));
    }

    // ── the list of steps ─────────────────────────────────────────────────────

    function fieldControl(i: number, f: Field): HTMLElement {
        const id = `ie-op-${i}-${f.name}`;
        const onChange = (next: Op, recordStep: boolean): void => {
            if (!state) return;
            state.pipeline = update(state.pipeline, i, next, recordStep);
            state.message = null; state.suggestion = null;
            render();
        };
        const begin = (): void => { state!.pipeline = checkpoint(state!.pipeline); };
        if (f.type === 'number') {
            const input = el('input', { id, class: 'text-input ie-num', type: 'number', min: String(f.min), max: String(f.max), step: String(f.step), 'aria-label': f.label });
            const clampNum = (raw: string): number | null => { const v = Number(raw); return raw.trim() === '' || Number.isNaN(v) ? null : Math.min(f.max, Math.max(f.min, v)); };
            input.addEventListener('focus', begin, { once: false });
            input.addEventListener('input', () => { const v = clampNum(input.value); if (v !== null) onChange(f.set(state!.pipeline.ops[i]!, v), false); });
            const parts: Node[] = [input];
            if (f.range) {
                const r = el('input', { id: `${id}-range`, class: 'ie-range', type: 'range', min: String(f.min), max: String(f.max), step: String(f.step), 'aria-label': `${f.label} (slider)` });
                r.addEventListener('pointerdown', begin);
                r.addEventListener('input', () => onChange(f.set(state!.pipeline.ops[i]!, Number(r.value)), false));
                parts.push(r);
            }
            return el('div', { class: 'ie-field', 'data-name': f.name }, el('label', { for: id }, f.label), ...parts);
        }
        if (f.type === 'select') {
            const sel = el('select', { id, class: 'text-input', 'aria-label': f.label }, ...f.options.map(([v, label]) => el('option', { value: v }, label)));
            sel.addEventListener('change', () => onChange(f.set(state!.pipeline.ops[i]!, sel.value), true));
            return el('div', { class: 'ie-field', 'data-name': f.name }, el('label', { for: id }, f.label), sel);
        }
        if (f.type === 'toggle') {
            const b = el('button', { id, type: 'button', class: 'chip-btn', 'aria-pressed': 'false' }, f.label);
            b.addEventListener('click', () => onChange(f.set(state!.pipeline.ops[i]!, !f.get(state!.pipeline.ops[i]!)), true));
            return el('div', { class: 'ie-field', 'data-name': f.name }, b);
        }
        // colour: a hex text, a swatch, and for an optional colour a button that goes back to the automatic one
        const text = el('input', { id, class: 'text-input ie-hex-input', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: f.optional ? 'automatic' : '#RRGGBB', 'aria-label': f.label });
        text.addEventListener('input', () => {
            const v = text.value.trim();
            if (v === '' && f.optional) { onChange(f.set(state!.pipeline.ops[i]!, null), false); return; }
            const rgb = fromHex(v);
            text.setAttribute('aria-invalid', String(rgb === null));
            if (rgb) onChange(f.set(state!.pipeline.ops[i]!, rgb), false);
        });
        text.addEventListener('focus', begin);
        const sw = el('span', { class: 'swatch', id: `${id}-swatch`, 'aria-hidden': 'true' });
        const picker = el('input', { id: `${id}-picker`, class: 'color-input', type: 'color', 'aria-label': `Pick: ${f.label}`, title: 'Pick a colour' });
        picker.addEventListener('pointerdown', begin);
        picker.addEventListener('input', () => { const rgb = fromHex(picker.value); if (rgb) onChange(f.set(state!.pipeline.ops[i]!, rgb), false); });
        return el('div', { class: 'ie-field', 'data-name': f.name }, el('label', { for: id }, f.label), el('div', { class: 'ie-colour' }, text, sw, picker));
    }

    function buildOps(): void {
        const list = $('ie-ops');
        clear(list);
        state!.pipeline.ops.forEach((op, i) => {
            const rm = el('button', { id: `ie-op-${i}-remove`, type: 'button', class: 'icon-btn', 'aria-label': `Remove step ${i + 1}, ${OP_TITLE[op.kind]}`, title: 'Remove this step' }, icon('trash', 'icon--sm'));
            rm.addEventListener('click', () => setPipeline(remove(state!.pipeline, i)));
            list.append(el('li', { class: 'ie-op', id: `ie-op-${i}`, 'data-kind': op.kind },
                el('div', { class: 'ie-op-head' }, el('span', { class: 'ie-op-n' }, String(i + 1)), el('strong', {}, OP_TITLE[op.kind]), el('span', { class: 'ie-op-problem export-reason', id: `ie-op-${i}-problem`, hidden: true }), rm),
                OP_HINT[op.kind] ? el('p', { class: 'ie-op-hint' }, OP_HINT[op.kind]!) : null,
                el('div', { class: 'ie-op-fields' }, ...FIELDS[op.kind].map(f => fieldControl(i, f)))));
        });
        if (state!.pipeline.ops.length === 0) list.append(el('li', { class: 'ie-ops-empty', id: 'ie-ops-empty' }, 'No steps yet. Press a tool or a quick button.'));
    }

    function syncOps(problems: Array<string | null>, steps: Picture[]): void {
        const signature = state!.pipeline.ops.map(o => o.kind).join(',');
        if (signature !== opsSignature) { buildOps(); opsSignature = signature; }
        state!.pipeline.ops.forEach((op, i) => {
            for (const f of FIELDS[op.kind]) {
                const input = document.getElementById(`ie-op-${i}-${f.name}`) as HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null;
                if (!input) continue;
                const focused = document.activeElement === input;
                if (f.type === 'number') {
                    const v = f.get(op);
                    if (!focused) (input as HTMLInputElement).value = String(v);
                    const r = document.getElementById(`ie-op-${i}-${f.name}-range`) as HTMLInputElement | null;
                    if (r && document.activeElement !== r) r.value = String(v);
                } else if (f.type === 'select') (input as HTMLSelectElement).value = f.get(op);
                else if (f.type === 'toggle') input.setAttribute('aria-pressed', String(f.get(op)));
                else {
                    const c = f.get(op);
                    // "automatic" for the background to remove is the colour of the corners of the picture this step receives
                    const auto = c === null && op.kind === 'removeBg' && steps[i] ? cornerColour(steps[i]!) : null;
                    const shown = c ?? auto;
                    if (!focused) (input as HTMLInputElement).value = c ? toHex(c) : '';
                    (input as HTMLInputElement).placeholder = auto ? `automatic (${toHex(auto)})` : (f.optional ? 'automatic' : '#RRGGBB');
                    const picker = document.getElementById(`${input.id}-picker`) as HTMLInputElement | null;
                    if (picker && shown && document.activeElement !== picker) picker.value = toHex(shown);
                    picker?.classList.toggle('is-auto', c === null);   // dimmed while the colour is automatic
                    const sw = document.getElementById(`${input.id}-swatch`);
                    if (sw) sw.style.background = shown ? toHex(shown) : 'transparent';
                }
            }
            const prob = document.getElementById(`ie-op-${i}-problem`);
            if (prob) { prob.hidden = problems[i] === null || problems[i] === undefined; prob.textContent = problems[i] ?? ''; }
        });
    }

    // ── render ────────────────────────────────────────────────────────────────

    function render(): void {
        if (!state || !built) return;
        const s = state;
        const started = performance.now();
        const ev = evaluated();
        const took = performance.now() - started;
        const shown = s.showOriginal ? s.pipeline.source : ev.picture;
        // The work is done on the page, so it cannot show a busy sign while it runs: it says afterwards that it was slow.
        const speed = $('ie-speed');
        speed.hidden = took <= SLOW_MS;
        speed.textContent = took > SLOW_MS ? `The last change took ${Math.round(took)} ms on a ${s.pipeline.source.width} x ${s.pipeline.source.height} picture. A smaller picture is quicker.` : '';

        $('ie-title-note').textContent = `${SLOT_TITLE[s.slot]}, ${s.target} x ${s.target} pixels, from ${s.name}`;
        const note = $('ie-note');
        note.hidden = s.note === null;
        note.textContent = s.note ?? '';
        const message = $('ie-message');
        message.hidden = s.message === null;
        message.textContent = s.message ?? '';
        const status = $('ie-status');
        status.hidden = s.status === null;
        status.textContent = s.status ?? '';

        ($('ie-undo') as HTMLButtonElement).disabled = s.pipeline.undoStack.length === 0;
        ($('ie-redo') as HTMLButtonElement).disabled = s.pipeline.redoStack.length === 0;
        ($('ie-reset') as HTMLButtonElement).disabled = s.pipeline.ops.length === 0;
        $('ie-original').setAttribute('aria-pressed', String(s.showOriginal));
        $('ie-pick').setAttribute('aria-pressed', String(s.picking));
        ($('ie-preset-outline') as HTMLButtonElement).title = 'Uses the colour icon: a white silhouette, trimmed and fitted at 32 x 32';

        const canvas = $('ie-canvas') as HTMLCanvasElement;
        drawPicture(canvas, shown);
        const stage = $('ie-stage');
        stage.dataset.bg = s.bg;
        stage.dataset.picking = String(s.picking);
        const accent = deps.accent();
        if (s.bg === 'accent' && accent && /^#[0-9a-f]{6}$/i.test(accent)) stage.style.background = accent; else stage.style.removeProperty('background');
        const scale = s.zoom === 'fit' ? null : Number(s.zoom) / 100;
        if (scale === null) { canvas.style.removeProperty('width'); canvas.style.removeProperty('height'); canvas.classList.add('is-fit'); }
        else { canvas.classList.remove('is-fit'); canvas.style.width = `${shown.width * scale}px`; canvas.style.height = `${shown.height * scale}px`; }
        for (const b of ['checker', 'accent', 'white', 'black']) $(`ie-bg-${b}`).setAttribute('aria-pressed', String(s.bg === b));
        for (const z of ['fit', '100', '200', '400']) $(`ie-zoom-${z}`).setAttribute('aria-pressed', String(s.zoom === z));

        const reading = $('ie-reading');
        reading.hidden = s.reading === null;
        if (s.reading) {
            const r = s.reading;
            const hex = toHex({ r: r.r, g: r.g, b: r.b });
            $('ie-reading-hex').textContent = r.a === 0 ? 'transparent' : hex;
            $('ie-reading-info').textContent = `at (${r.x}, ${r.y}), alpha ${r.a}${r.a === 0 ? `, underlying ${hex}` : ''}`;
            $('ie-reading-swatch').style.background = r.a === 0 ? 'transparent' : hex;
            ($('ie-reading-copy') as HTMLElement).dataset.copy = hex;
            for (const id of ['ie-send-bg', 'ie-send-solid', 'ie-send-fill', 'ie-send-accent']) ($(id) as HTMLButtonElement).disabled = r.a === 0;
        }

        const sg = s.suggestion;
        $('ie-accent-swatch').hidden = sg === null;
        $('ie-accent-hex').hidden = sg === null;
        ($('ie-accent-accept') as HTMLButtonElement).disabled = sg === null;
        if (sg) { $('ie-accent-swatch').style.background = toHex(sg); $('ie-accent-hex').textContent = toHex(sg); }
        else if (document.getElementById('ie-accent-hex')) $('ie-accent-hex').textContent = '';

        syncOps(ev.problems, ev.steps);
        renderPreview();
    }

    return { open, close, isOpen: () => state !== null, openSlot: () => state?.slot ?? null };
}

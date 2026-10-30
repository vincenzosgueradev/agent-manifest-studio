/**
 * The image editor (feature 004, workspace of feature 009): a workspace over the page with the picture large on the left and the
 * tools, the steps and the colour on the right, an eyedropper, a zoom control and the Teams-style preview. It holds its own state (the pipeline and the view settings);
 * the maths is in `services/image/`. What it needs from the app comes in through `deps`.
 */

import { clear, el } from './dom';
import { parseCssColor } from './preview';
import { resetScroll } from './steps';
import { icon, type IconName } from '../icons';
import { cornerColour, fromHex, toHex } from '../services/image/colour';
import { toPixel } from '../services/image/pixel';
import { acceptResult, toTarget } from '../services/image/accept';
import { importImage, windowDecoder } from '../services/image/import';
import { encodePng } from '../services/image/pngWrite';
import { resizePicture } from '../services/image/resample';
import { add, checkpoint, create, cropSliderMax, defaultOp, evaluate, pictureToEnlarge, presetOutline, presetTeamsColour, redo, remove, reset, undo, update, withSource, type Pipeline } from '../services/image/pipeline';
import type { Op, OpKind, Picture, Rgb } from '../services/image/types';
import { cropProblem } from '../services/image/ops';
import { rulerMarks } from './ruler';
import { blockOf, blockText, presetBlockText } from '../services/image/rules';
import { initEffectGuide, type GuideKey } from './effectGuide';
import { FIELDS, type Field } from './opFields';
import { flattenOnAccent, parseAccent } from '../services/preview';
import { decodePng } from '../services/png';
import type { IconSlot } from '../services/edit/fields';

export interface ImageEditorDeps {
    /** Where the editor workspace goes (it covers the page); `null` while there is no package on screen. */
    root: () => HTMLElement | null;
    /** The current icon of a slot as bytes (replaced or original), or `null`. */
    currentIcon: (slot: IconSlot) => Uint8Array | null;
    /** The icon of a slot as it was in the package when it was opened, or `null`. */
    originalIcon: (slot: IconSlot) => Uint8Array | null;
    /** The accent colour of the manifest as it is now. */
    accent: () => string | null;
    /** The result, as PNG bytes of the right size, goes into the package. */
    onApply: (slot: IconSlot, bytes: Uint8Array) => void;
    /** Asks the host for an image file: `null` when cancelled or when the host has no dialog. */
    pickImage: () => Promise<{ name: string; bytes: Uint8Array } | null>;
    hasHostFiles: () => boolean;
    /** Saves the PNG with the host's dialog; the path, or `null` when cancelled. */
    savePng: (name: string, bytes: Uint8Array) => Promise<string | null>;
    /** Opens the accent colour popup on the picture the editor shows (feature 013); `from` says whose it is. */
    pickAccent: (picture: Picture, from: string) => void;
    /** The editor opened or closed (the icon cards disable their button while one is open). */
    onOpenChange: (slot: IconSlot | null) => void;
}

type Bg = 'checker' | 'white' | 'black';

type Cat = 'quick' | 'background' | 'geometry' | 'colour' | 'outline';

/** The groups of the toolbox, in order: a title, an icon of the set and (in the style sheet) a colour each. */
const CATEGORIES = [
    { id: 'quick', title: 'Quick', icon: 'wand' },
    { id: 'background', title: 'Background', icon: 'eraser' },
    { id: 'geometry', title: 'Geometry', icon: 'expand' },
    { id: 'colour', title: 'Colour', icon: 'palette' },
    { id: 'outline', title: 'Outline', icon: 'shape' },
] as const satisfies ReadonlyArray<{ id: Cat; title: string; icon: IconName }>;

/** The group and the icon of each effect: they are on its button and on its line of the history. */
const OP_CAT: Record<OpKind, Cat> = {
    removeBg: 'background', fill: 'background', trim: 'geometry', crop: 'geometry', square: 'geometry', fit: 'geometry', rotate: 'geometry', flip: 'geometry',
    solid: 'colour', tone: 'colour', outline: 'outline',
};
const OP_ICON: Record<OpKind, IconName> = {
    removeBg: 'eraser', fill: 'bucket', trim: 'trim', crop: 'crop', square: 'square', fit: 'frame', rotate: 'rotate', flip: 'flip',
    solid: 'palette', tone: 'contrast', outline: 'shape',
};

const PRESET_HINT = {
    teams: 'Remove a flat background, trim, square and fit the picture at 192 x 192',
    outline: 'Uses the colour icon: a white silhouette, trimmed and fitted at 32 x 32',
};
/** `'fit'` or a number of percent, 10 to 200. */
type Zoom = 'fit' | number;
const ZOOM_MIN = 10;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
/** The grid of the picture: a square mesh over the picture, its spacing set by `GridPrecision` (the same number of cells on both icons). The safe area is 120 x 120 in 192. */
type GridPrecision = 'low' | 'medium' | 'high';
const GRID_CELLS: Record<GridPrecision, number> = { low: 4, medium: 8, high: 16 };
const COLOUR_SIDE = 192;
const SAFE_SIDE = 120;
const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

interface State {
    slot: IconSlot;
    target: number;
    pipeline: Pipeline;
    name: string;
    note: string | null;
    message: string | null;
    showOriginal: boolean;
    bg: Bg;
    zoom: Zoom;
    grid: boolean;
    gridPrecision: GridPrecision;
    status: string | null;
    /** The index of the one step shown open (its fields visible); the others are compacted to their head. `null` closes them all. */
    openOp: number | null;
}

/** A change that takes longer than this is reported to the user. */
export const SLOW_MS = 200;

const SLOT_TITLE: Record<IconSlot, string> = { color: 'colour icon', outline: 'outline icon' };

export { toPixel };

// ── The fields of each operation ──────────────────────────────────────────────

/** One line under a step that says what it does and what it does not, for the steps that are easy to misread. */
const OP_HINT: Partial<Record<OpKind, string>> = {
    removeBg: 'Makes the chosen colour see-through. Where: from the edges keeps the same colour inside the logo.',
    fill: 'Fills only the see-through parts. To change a background that is already there, remove it first (Remove background), then fill.',
    solid: 'Gives every visible pixel this colour. The see-through parts stay see-through.',
    outline: 'Turns the picture into a white shape. For the outline icon only the shape counts: Teams draws it in the colour of its bar.',
};

const OP_TITLE: Record<OpKind, string> = {
    removeBg: 'Remove background', trim: 'Trim', crop: 'Crop', square: 'Make square', fit: 'Fit', rotate: 'Rotate', flip: 'Flip',
    fill: 'Fill background', solid: 'Solid colour', tone: 'Tone', outline: 'Outline maker',
};

// ── The editor ────────────────────────────────────────────────────────────────

export interface ImageEditor {
    open(slot: IconSlot): void;
    close(): void;
    isOpen(): boolean;
    openSlot(): IconSlot | null;
}

export function initImageEditor(deps: ImageEditorDeps): ImageEditor {
    let state: State | null = null;
    let built = false;
    let opsSignature = '';
    /** Every tool button of the toolbox with the effect it adds and its hint, to be switched on and off with the history. */
    let toolDefs: Array<{ id: string; key: string; hint: string }> = [];
    /** Bumped on every change so that an import that finishes late is dropped. */
    let ticket = 0;

    const $ = (id: string): HTMLElement => document.getElementById(id)!;

    window.addEventListener('resize', () => positionGuides());

    /** The effect guides (feature 012): opened from an info control next to every toolbox entry, mounted inside the editor's own card. */
    const guide = initEffectGuide();

    // Escape closes an open guide first, then the workspace, as Cancel does.
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (guide.isOpen()) { guide.close(); return; }
        if (state) close();
    });

    // ── state changes ─────────────────────────────────────────────────────────

    const evaluated = () => evaluate(state!.pipeline.source, state!.pipeline.ops);
    const result = (): Picture => evaluated().picture;

    function setPipeline(pl: Pipeline): void {
        state!.pipeline = pl;
        if (state!.openOp !== null && state!.openOp >= pl.ops.length) state!.openOp = null;   // an undo or a revert can take away the open step
        state!.message = null; state!.status = null; render();
    }
    function addOp(op: Op): void {
        const pl = add(state!.pipeline, op);
        state!.openOp = pl.ops.length - 1;   // the new step takes the focus, the others compact
        setPipeline(pl);
    }
    const addKind = (kind: OpKind): void => addOp(defaultOp(kind, result(), state!.target));

    function picture(bytes: Uint8Array | null): Picture | null {
        if (!bytes) return null;
        const png = decodePng(bytes);
        return png.kind === 'ok' ? { width: png.header.width, height: png.header.height, data: png.rgba } : null;
    }

    function open(slot: IconSlot): void {
        const source = picture(deps.currentIcon(slot));
        const empty: Picture = { width: 1, height: 1, data: new Uint8Array(4) };
        const src = source ?? empty;
        const target = slot === 'color' ? 192 : 32;
        const pipeline = create(src);
        state = {
            slot, target, pipeline, name: source ? `the current ${SLOT_TITLE[slot]}` : 'nothing yet', note: source ? null : 'There is no icon in the package yet. Open an image to start.',
            message: null, showOriginal: false, bg: 'checker', zoom: 'fit' as Zoom, grid: false, gridPrecision: 'medium', status: null, openOp: null,
        };
        ticket++;
        const host = deps.root();
        if (!host) { state = null; return; }
        if (!document.getElementById('ie-card')) built = false;   // the page was cleared (another package)
        if (!built) build(host);
        opsSignature = '\u0001';   // never equal to a real list, so the list is built once
        $('ie-card').hidden = false;
        $('ie-pos').textContent = '-';
        deps.onOpenChange(slot);
        render();
    }

    function close(): void {
        if (!state) return;
        state = null;
        ticket++;
        if (built) $('ie-card').hidden = true;
        deps.onOpenChange(null);
        resetScroll();   // the workspace covered the page; closing it must not leave the page scrolled where it was left
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

        // The toolbox: the tools by category, each with an icon of the set and the colour of its category.
        toolDefs = [];
        /** An info control next to a tool or preset button, opening its guide (feature 012) without running the effect itself. */
        const infoBtn = (id: string, guideKey: GuideKey, label: string): HTMLButtonElement => {
            const b = el('button', { id: `${id}-info`, type: 'button', class: 'btn btn--secondary btn--sm ie-tool-info', 'aria-label': `About ${label}` }, icon('info', 'icon--xs'));
            b.addEventListener('click', e => { e.stopPropagation(); guide.open(guideKey); });
            return b;
        };
        const row = (id: string, main: HTMLElement, guideKey: GuideKey, label: string): HTMLElement => el('div', { class: 'ie-tool-row' }, main, infoBtn(id, guideKey, label));
        const tool = (id: string, key: string, label: string, ic: IconName, hint: string, run: () => void, guideKey: GuideKey): HTMLElement => {
            toolDefs.push({ id, key, hint });
            return row(id, button(id, label, ic, run, 'btn btn--secondary btn--sm ie-tool', hint), guideKey, label);
        };
        const group = (cat: (typeof CATEGORIES)[number], ...buttons: HTMLElement[]): HTMLElement => el('section', { class: 'ie-group', 'data-cat': cat.id },
            el('h4', { class: 'ie-sub ie-cat' }, icon(cat.icon, 'icon--sm'), cat.title),
            el('div', { class: 'ie-tools', role: 'group', 'aria-label': cat.title }, ...buttons));
        const [quick, background, geometry, colour, outline] = CATEGORIES as unknown as Array<(typeof CATEGORIES)[number]>;

        const toolbox = el('aside', { class: 'ie-toolbox', 'aria-label': 'Toolbox' },
            group(quick!,
                row('ie-preset-teams', button('ie-preset-teams', 'Teams-ready colour icon', 'image', () => applyPreset('teams'), 'btn btn--primary btn--sm ie-tool', PRESET_HINT.teams), 'presetTeams', 'Teams-ready colour icon'),
                row('ie-preset-outline', button('ie-preset-outline', 'Outline from this icon', 'wand', () => applyPreset('outline'), 'btn btn--primary btn--sm ie-tool', PRESET_HINT.outline), 'presetOutline', 'Outline from this icon')),
            group(background!,
                tool('ie-add-removeBg', 'removeBg', 'Remove background', 'eraser', 'Make the colour of the background see-through', () => addKind('removeBg'), 'removeBg'),
                tool('ie-add-fill', 'fill', 'Fill background', 'bucket', 'Fill the see-through parts with the accent colour', () => {
                    const accent = parseAccent(deps.accent() ?? '');
                    addOp({ kind: 'fill', colour: accent ?? { r: 255, g: 255, b: 255 } });
                }, 'fill')),
            group(geometry!,
                tool('ie-add-trim', 'trim', 'Trim', 'trim', 'Cut away the empty margin around the logo', () => addKind('trim'), 'trim'),
                tool('ie-add-crop', 'crop', 'Crop', 'crop', 'Keep a part of the picture: drag on it, or type the numbers', () => addKind('crop'), 'crop'),
                tool('ie-add-square', 'square', 'Make square', 'square', 'Make the picture square by padding its short side', () => addKind('square'), 'square'),
                tool('ie-add-fit', 'fit', 'Fit', 'frame', 'Scale the logo to its share of the icon, inside the safe area', () => addKind('fit'), 'fit'),
                tool('ie-add-rotate', 'rotate', 'Rotate', 'rotate', 'Turn the picture by quarter turns', () => addKind('rotate'), 'rotate'),
                tool('ie-add-flip-h', 'flip:h', 'Flip left-right', 'flip', 'Mirror the picture from left to right', () => addOp({ kind: 'flip', axis: 'h' }), 'flip'),
                tool('ie-add-flip-v', 'flip:v', 'Flip top-bottom', 'flip-v', 'Mirror the picture from top to bottom', () => addOp({ kind: 'flip', axis: 'v' }), 'flip')),
            group(colour!,
                tool('ie-add-solid', 'solid', 'Solid colour', 'palette', 'Give every visible pixel one colour', () => addKind('solid'), 'solid'),
                tool('ie-add-tone', 'tone', 'Tone', 'contrast', 'Change hue, saturation, brightness and contrast', () => addKind('tone'), 'tone')),
            group(outline!,
                tool('ie-add-outline', 'outline', 'Outline maker', 'shape', 'Turn the picture into a white shape on see-through', () => addKind('outline'), 'outline')));

        // The options bar: the file and the view on the left; on the right the history and the end.
        const originalBtn = el('button', { id: 'ie-original', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-pressed': 'false' }, icon('eye', 'icon--xs'), 'Show original');
        originalBtn.addEventListener('click', () => { state!.showOriginal = !state!.showOriginal; render(); });
        const gridBtn = el('button', { id: 'ie-grid', type: 'button', class: 'btn btn--secondary btn--sm', 'aria-pressed': 'false', title: 'A square mesh over the picture, and on the colour icon the 120 x 120 safe area. A view only: it is not in the result. The precision beside it sets how many cells.' }, icon('list', 'icon--xs'), 'Grid');
        gridBtn.addEventListener('click', () => { state!.grid = !state!.grid; render(); });
        const precisionGroup = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Grid precision', 'data-group': 'grid-precision' },
            ...(['low', 'medium', 'high'] as const).map(p => segBtn(`ie-grid-${p}`, p[0]!.toUpperCase() + p.slice(1), () => { state!.gridPrecision = p; render(); })));

        const head = el('div', { class: 'ie-bar-top' },
            el('div', { class: 'ie-title' }, el('h3', {}, 'Image editor'), el('span', { class: 'panel-sub', id: 'ie-title-note' })),
            button('ie-open-other', 'Open another image', 'folder', () => {
                if (deps.hasHostFiles()) void deps.pickImage().then(f => { if (f) void openImage(f); }).catch(e => { if (state) { state.message = `The file could not be opened: ${e instanceof Error ? e.message : String(e)}`; render(); } });
                else file.click();
            }),
            button('ie-save-png', 'Save image as PNG', 'save', () => { void savePng(); }),
            el('div', { class: 'segmented', role: 'group', 'aria-label': 'Background of the canvas', 'data-group': 'background' },
                ...(['checker', 'white', 'black'] as const).map(bg => segBtn(`ie-bg-${bg}`, bg[0]!.toUpperCase() + bg.slice(1), () => { state!.bg = bg; render(); }))),
            gridBtn,
            precisionGroup,
            originalBtn,
            button('ie-accent', 'Accent from picture', 'pipette', () => { if (state) deps.pickAccent(picture2(), 'the picture as it is now'); }, 'btn btn--secondary btn--sm', 'Choose the accent colour by clicking a pixel of this picture. It changes the accent colour only, not the picture.'),
            el('span', { class: 'ie-spacer' }),
            button('ie-undo', 'Undo', 'undo', () => setPipeline(undo(state!.pipeline))),
            button('ie-redo', 'Redo', 'redo', () => setPipeline(redo(state!.pipeline))),
            button('ie-revert-all', 'Revert all', 'trash', () => setPipeline(reset(state!.pipeline)), 'btn btn--secondary btn--sm btn--danger', 'Take away every step of the history (Undo brings them back)'),
            button('ie-cancel', 'Cancel', 'close', () => close()),
            button('ie-apply', 'Apply', 'check', () => { void apply(); }, 'btn btn--primary btn--sm'),
            file);

        const canvas = el('canvas', { id: 'ie-canvas', class: 'ie-canvas', role: 'img', 'aria-label': 'The picture being edited', tabindex: '0' });
        const stage = el('div', { class: 'ie-stage', id: 'ie-stage' }, canvas, el('div', { class: 'ie-crop-box', id: 'ie-crop-box', hidden: true }),
            el('div', { class: 'ie-grid-overlay', id: 'ie-grid-overlay', 'aria-hidden': 'true', hidden: true }, el('div', { class: 'ie-safe', id: 'ie-safe', hidden: true })),
            el('div', { class: 'ie-view-label', id: 'ie-view-label', role: 'status', hidden: true }));
        wireCanvas(canvas, stage);
        stage.addEventListener('scroll', () => positionGuides());
        // Ctrl and the wheel zoom the picture; the wheel alone scrolls it. Not passive, so that the page is not zoomed too.
        stage.addEventListener('wheel', e => {
            if (!e.ctrlKey || !state) return;
            e.preventDefault();
            stepZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        }, { passive: false });

        const zoomFitBtn = el('button', { id: 'ie-zoom-fit', type: 'button', class: 'btn btn--secondary ie-zoom-float-btn ie-zoom-float-fit', 'aria-label': 'Fit', 'aria-pressed': 'false' }, 'Fit');
        zoomFitBtn.addEventListener('click', () => { state!.zoom = 'fit'; render(); });
        const zoomOutBtn = el('button', { id: 'ie-zoom-out-float', type: 'button', class: 'btn btn--secondary ie-zoom-float-btn', 'aria-label': 'Zoom out' }, icon('minus', 'icon--xs'));
        zoomOutBtn.addEventListener('click', () => stepZoom(-ZOOM_STEP));
        const zoomInBtn = el('button', { id: 'ie-zoom-in-float', type: 'button', class: 'btn btn--secondary ie-zoom-float-btn', 'aria-label': 'Zoom in' }, icon('plus', 'icon--xs'));
        zoomInBtn.addEventListener('click', () => stepZoom(ZOOM_STEP));
        const zoomFloat = el('div', { class: 'ie-zoom-float', role: 'group', 'aria-label': 'Zoom' },
            zoomFitBtn, zoomOutBtn, el('span', { id: 'ie-zoom-value', class: 'ie-zoom-float-value', 'aria-live': 'polite' }, 'Fit'), zoomInBtn);

        const area = el('div', { class: 'ie-canvas-area' },
            el('div', { class: 'ie-ruler-corner', 'aria-hidden': 'true' }),
            el('div', { class: 'ie-ruler ie-ruler--h', id: 'ie-ruler-h', 'aria-hidden': 'true' }),
            el('div', { class: 'ie-ruler ie-ruler--v', id: 'ie-ruler-v', 'aria-hidden': 'true' }),
            stage, zoomFloat);
        // The centre: the picture, and under it the result at the sizes of Teams.
        const centre = el('div', { class: 'ie-center' }, area, el('div', { class: 'ie-preview', id: 'ie-preview' }));
        // The history on the right: every effect, in the order it was put.
        const panels = el('aside', { class: 'ie-panels', 'aria-label': 'History' },
            el('h4', { class: 'ie-sub' }, icon('list', 'icon--sm'), 'History'),
            el('ol', { class: 'ie-ops', id: 'ie-ops', 'aria-label': 'The steps, in order' }));
        const status = el('div', { class: 'ie-statusbar' },
            el('span', { id: 'ie-size', class: 'ie-status-item' }),
            el('span', { id: 'ie-pos', class: 'ie-status-item', title: 'The pixel under the pointer' }, '-'),
            el('span', { class: 'ie-spacer' }));

        const c = el('section', { id: 'ie-card', class: 'ie-workspace', role: 'dialog', 'aria-label': 'Image editor' },
            head,
            el('div', { class: 'ie-notes' },
                el('p', { class: 'field-hint', id: 'ie-note', hidden: true }),
                el('p', { class: 'export-reason ed-error', id: 'ie-message', role: 'alert', hidden: true }),
                el('p', { class: 'report-status', id: 'ie-status', role: 'status', hidden: true }),
                el('p', { class: 'field-hint', id: 'ie-speed', role: 'status', hidden: true })),
            el('div', { class: 'ie-main' }, toolbox, centre, panels),
            status);
        c.hidden = true;
        guide.attach(c);
        host.append(c);
    }

    function segBtn(id: string, label: string, onClick: () => void): HTMLButtonElement {
        const b = el('button', { id, type: 'button', class: 'segment', 'aria-pressed': 'false' }, label);
        b.addEventListener('click', onClick);
        return b;
    }

    /** The steps of a quick button, and the picture they start from. */
    function presetOf(kind: 'teams' | 'outline'): { ops: Op[]; src: Picture } {
        const src = kind === 'outline' ? (picture(deps.currentIcon('color')) ?? state!.pipeline.source) : state!.pipeline.source;
        return { ops: kind === 'teams' ? presetTeamsColour(state!.pipeline.source) : presetOutline(src), src };
    }

    function applyPreset(kind: 'teams' | 'outline'): void {
        if (!state) return;
        const { ops, src } = presetOf(kind);
        let pl = kind === 'outline' ? withSource(state.pipeline, src) : state.pipeline;
        for (const op of ops) pl = add(pl, op);
        if (kind === 'outline') state.name = 'the current colour icon';
        state.openOp = pl.ops.length - 1;   // the last step of the preset takes the focus
        setPipeline(pl);
    }

    /** Switches the tools on and off with the history: each effect once, and not with one that clashes; the reason is the title. */
    function syncTools(): void {
        const ops = state!.pipeline.ops;
        for (const t of toolDefs) {
            const b = $(t.id) as HTMLButtonElement;
            const block = blockOf(ops, t.key);
            b.disabled = block !== null;
            b.title = block ? blockText(t.key, block) : t.hint;
        }
        for (const kind of ['teams', 'outline'] as const) {
            const b = $(`ie-preset-${kind}`) as HTMLButtonElement;
            const why = presetBlockText(ops, presetOf(kind).ops);
            b.disabled = why !== null;
            b.title = why ?? PRESET_HINT[kind];
        }
        ($('ie-revert-all') as HTMLButtonElement).disabled = ops.length === 0;
    }

    // ── the canvas: eyedropper and crop by dragging ───────────────────────────

    /** The icon of the slot as it was in the package when it was opened; the source of the steps when the package has none. */
    const originalPicture = (): Picture => picture(deps.originalIcon(state!.slot)) ?? state!.pipeline.source;

    /** The picture on the canvas: the result, or the original while "Show original" is on. */
    const picture2 = (): Picture => (state!.showOriginal ? originalPicture() : result());

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
            Object.assign(box().style, { left: `${rect.left - stageRect.left - stage.clientLeft + x * sx}px`, top: `${rect.top - stageRect.top - stage.clientTop + y * sy}px`, width: `${w * sx}px`, height: `${h * sy}px` });
            box().hidden = false;
            box().title = `${w} x ${h} pixels`;
        };
        canvas.addEventListener('pointermove', e => {
            if (!state || state.showOriginal) return;
            const p = at(e);
            $('ie-pos').textContent = p ? `${p.x}, ${p.y}` : '-';
        });
        canvas.addEventListener('pointerleave', () => { if (built) $('ie-pos').textContent = '-'; });
        canvas.addEventListener('pointerdown', e => {
            if (!state) return;
            const p = at(e);
            if (!p) return;
            if (state.showOriginal) return;   // the crop is drawn on the result, not on the original
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
            // The result is drawn as it is: nothing documents where, if anywhere, the accent colour is drawn behind a see-through icon.
            const seeThrough = out.data.some((v, i) => i % 4 === 3 && v < 255);
            box.append(
                el('p', { class: 'ie-sub' }, 'The result as it is, at the sizes Teams uses'),
                el('div', { class: 'ie-tiles' }, ...[96, 48, 32].map(s => {
                    const c = tile(`ie-tile-${s}`, s, out, null, null);
                    c.classList.toggle('ed-checker', seeThrough);
                    return el('figure', { class: 'ie-fig' }, c, el('figcaption', {}, `${s} px`));
                })));
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
            state.message = null;
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
            // Stacked, not side-by-side: a narrow panel next to a long option (e.g. "90 degrees clockwise") would truncate the native dropdown.
            return el('div', { class: 'ie-field ie-field--select', 'data-name': f.name }, el('label', { for: id }, f.label), sel);
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
            const isOpen = i === state!.openOp;
            const bodyId = `ie-op-${i}-body`;
            const toggle = el('button', {
                type: 'button', class: 'ie-op-toggle', id: `ie-op-${i}-toggle`, 'aria-expanded': String(isOpen), 'aria-controls': bodyId,
                'aria-label': `${isOpen ? 'Collapse' : 'Expand'} step ${i + 1}, ${OP_TITLE[op.kind]}`,
            }, el('span', { class: 'ie-op-n' }, String(i + 1)), icon(OP_ICON[op.kind], 'icon--sm ie-op-icon'), el('strong', {}, OP_TITLE[op.kind]),
                el('span', { class: 'ie-op-problem export-reason', id: `ie-op-${i}-problem`, hidden: true }), icon('chevron-down', 'icon--sm ie-op-chevron'));
            toggle.addEventListener('click', () => {
                state!.openOp = isOpen ? null : i;
                buildOps();
                document.getElementById(`ie-op-${i}-toggle`)?.focus();
            });
            const rm = el('button', { id: `ie-op-${i}-remove`, type: 'button', class: 'icon-btn', 'aria-label': `Remove step ${i + 1}, ${OP_TITLE[op.kind]}`, title: 'Remove this step' }, icon('trash', 'icon--sm'));
            rm.addEventListener('click', () => {
                if (state!.openOp !== null) { if (state!.openOp === i) state!.openOp = null; else if (state!.openOp > i) state!.openOp -= 1; }
                setPipeline(remove(state!.pipeline, i));
            });
            list.append(el('li', { class: `ie-op${isOpen ? ' is-open' : ''}`, id: `ie-op-${i}`, 'data-kind': op.kind, 'data-cat': OP_CAT[op.kind] },
                el('div', { class: 'ie-op-head' }, toggle, rm),
                el('div', { class: 'ie-op-body', id: bodyId, hidden: !isOpen },
                    OP_HINT[op.kind] ? el('p', { class: 'ie-op-hint' }, OP_HINT[op.kind]!) : null,
                    el('div', { class: 'ie-op-fields' }, ...FIELDS[op.kind].map(f => fieldControl(i, f))))));
        });
        if (state!.pipeline.ops.length === 0) list.append(el('li', { class: 'ie-ops-empty', id: 'ie-ops-empty' }, 'No steps yet. Press a tool or a quick button.'));
        if (state!.openOp !== null) document.getElementById(`ie-op-${state!.openOp}`)?.scrollIntoView?.({ block: 'nearest' });
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
                    if (r && op.kind === 'crop') r.max = String(cropSliderMax(op, f.name, steps[i]!));   // a slider to 100000 would be useless: a crop lies inside the picture it receives
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

    /** The size that `Fit` gives the picture, in percent rounded to a step of ten and kept within the zoom range; 100 when it cannot be measured. */
    function fitPercent(): number {
        return clampZoom(Math.round(fitScale() * 10) * 10);
    }

    /** Changes the zoom by `delta` percent, from `Fit`'s own size when the zoom is `Fit`; used by the wheel and by the +/- buttons over the canvas. */
    function stepZoom(delta: number): void {
        if (!state) return;
        const base = typeof state.zoom === 'number' ? state.zoom : fitPercent();
        state.zoom = clampZoom(base + delta);
        render();
    }

    // ── the guides: the rulers and the grid follow the picture on screen ─────

    /** The scale at which `Fit` draws the picture; 1 when it cannot be measured. */
    function fitScale(): number {
        const canvas = document.getElementById('ie-canvas') as HTMLCanvasElement | null;
        const rect = canvas?.getBoundingClientRect();
        if (!canvas || !rect || rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) return 1;
        return Math.min(rect.width / canvas.width, rect.height / canvas.height);
    }

    /** Where the picture is on the stage, and how large: the stage is the scrolling box, so `left` and `top` also count its scroll. */
    function pictureBox(shown: Picture): { scale: number; width: number; height: number; viewLeft: number; viewTop: number } {
        const canvas = $('ie-canvas');
        const stage = $('ie-stage');
        const zoom = state!.zoom;
        const scale = zoom === 'fit' ? fitScale() : zoom / 100;
        const width = zoom === 'fit' ? shown.width * scale : shown.width * zoom / 100;
        const height = zoom === 'fit' ? shown.height * scale : shown.height * zoom / 100;
        const r = canvas.getBoundingClientRect();
        const s = stage.getBoundingClientRect();
        // with `Fit` the canvas fills the area and the picture is centred in it
        const dx = r.width > 0 ? (r.width - width) / 2 : 0;
        const dy = r.height > 0 ? (r.height - height) / 2 : 0;
        // absolute children are placed from the padding edge, so the stage border is not part of the offset
        return { scale, width, height, viewLeft: r.left - s.left - stage.clientLeft + dx, viewTop: r.top - s.top - stage.clientTop + dy };
    }

    function drawRuler(ruler: HTMLElement, horizontal: boolean, origin: number, scale: number, size: number): void {
        clear(ruler);
        const length = horizontal ? ruler.clientWidth : ruler.clientHeight;
        for (const m of rulerMarks(origin, scale, size, length)) {
            const tick = el('span', { class: `ie-tick${m.major ? ' ie-tick--major' : ''}` }, m.label);
            tick.style[horizontal ? 'left' : 'top'] = `${m.at}px`;
            ruler.append(tick);
        }
    }

    function positionGuides(): void {
        if (!state || !built) return;
        const s = state;
        const shown = s.showOriginal ? originalPicture() : result();
        const box = pictureBox(shown);
        drawRuler($('ie-ruler-h'), true, box.viewLeft, box.scale, shown.width);
        drawRuler($('ie-ruler-v'), false, box.viewTop, box.scale, shown.height);

        const stage = $('ie-stage');
        const overlay = $('ie-grid-overlay');
        overlay.hidden = !s.grid;
        if (!s.grid) return;
        const zoom = s.zoom === 'fit' ? null : s.zoom;
        const scaled = (n: number): number => (zoom === null ? n * box.scale : n * zoom / 100);
        const cell = s.target / GRID_CELLS[s.gridPrecision];
        overlay.style.left = `${box.viewLeft + stage.scrollLeft}px`;
        overlay.style.top = `${box.viewTop + stage.scrollTop}px`;
        overlay.style.width = `${box.width}px`;
        overlay.style.height = `${box.height}px`;
        overlay.style.setProperty('--cell', `${scaled(cell)}px`);
        const safe = $('ie-safe');
        safe.hidden = s.slot !== 'color';
        if (s.slot === 'color') {
            const margin = (COLOUR_SIDE - SAFE_SIDE) / 2;
            safe.style.left = `${scaled(margin)}px`;
            safe.style.top = `${scaled(margin)}px`;
            safe.style.width = `${scaled(SAFE_SIDE)}px`;
            safe.style.height = `${scaled(SAFE_SIDE)}px`;
        }
    }

    // ── render ────────────────────────────────────────────────────────────────

    function render(): void {
        if (!state || !built) return;
        const s = state;
        const started = performance.now();
        const ev = evaluated();
        const took = performance.now() - started;
        const shown = s.showOriginal ? originalPicture() : ev.picture;
        // The work is done on the page, so it cannot show a busy sign while it runs: it says afterwards that it was slow.
        const speed = $('ie-speed');
        speed.hidden = took <= SLOW_MS;
        speed.textContent = took > SLOW_MS ? `The last change took ${Math.round(took)} ms on a ${s.pipeline.source.width} x ${s.pipeline.source.height} picture. A smaller picture is quicker.` : '';

        $('ie-title-note').textContent = `${SLOT_TITLE[s.slot]}, ${s.target} x ${s.target} pixels, from ${s.name}`;
        const note = $('ie-note');
        // a picture that has to be enlarged to fill the icon is blurred by it: say so, whichever way it got here, next to any other note
        const tiny = pictureToEnlarge(ev.steps, s.pipeline.ops, s.target);
        const small = tiny ? `A picture of ${tiny.width} x ${tiny.height} pixels has to be enlarged to fill the ${s.target} x ${s.target} icon, so it may look blurred. A larger picture gives a sharper icon.` : null;
        const noteText = [s.note, small].filter(t => t !== null).join(' ') || null;
        note.hidden = noteText === null;
        note.textContent = noteText ?? '';
        const message = $('ie-message');
        message.hidden = s.message === null;
        message.textContent = s.message ?? '';
        const status = $('ie-status');
        status.hidden = s.status === null;
        status.textContent = s.status ?? '';

        ($('ie-undo') as HTMLButtonElement).disabled = s.pipeline.undoStack.length === 0;
        ($('ie-redo') as HTMLButtonElement).disabled = s.pipeline.redoStack.length === 0;
        $('ie-original').setAttribute('aria-pressed', String(s.showOriginal));
        const accentBtn = $('ie-accent') as HTMLButtonElement;
        accentBtn.disabled = s.slot !== 'color';   // the outline icon is white: it has no colour to take
        if (s.slot !== 'color') accentBtn.title = 'Only the colour icon gives an accent colour.';
        $('ie-grid').setAttribute('aria-pressed', String(s.grid));
        for (const p of ['low', 'medium', 'high'] as const) {
            const b = $(`ie-grid-${p}`) as HTMLButtonElement;
            b.setAttribute('aria-pressed', String(s.gridPrecision === p));
            b.disabled = !s.grid;
        }
        $('ie-size').textContent = `${shown.width} x ${shown.height} pixels`;
        const label = $('ie-view-label');
        label.hidden = !s.showOriginal;
        if (s.showOriginal) {
            const now = ev.picture;
            const same = now.width === shown.width && now.height === shown.height && now.data.every((v, i) => v === shown.data[i]);
            label.textContent = `Original: the ${SLOT_TITLE[s.slot]} as it was in the package${same ? ' (the same as now)' : ''}`;
        }
        // Each icon has the quick button that makes sense for it: the colour icon the Teams one, the outline icon the outline one.
        $('ie-preset-teams').hidden = s.slot !== 'color';
        $('ie-preset-outline').hidden = s.slot !== 'outline';
        syncTools();

        const canvas = $('ie-canvas') as HTMLCanvasElement;
        drawPicture(canvas, shown);
        const stage = $('ie-stage');
        stage.dataset.bg = s.bg;
        if (s.zoom === 'fit') { canvas.style.removeProperty('width'); canvas.style.removeProperty('height'); canvas.classList.add('is-fit'); }
        else { canvas.classList.remove('is-fit'); canvas.style.width = `${shown.width * s.zoom / 100}px`; canvas.style.height = `${shown.height * s.zoom / 100}px`; }
        for (const b of ['checker', 'white', 'black']) $(`ie-bg-${b}`).setAttribute('aria-pressed', String(s.bg === b));
        $('ie-zoom-fit').setAttribute('aria-pressed', String(s.zoom === 'fit'));
        const zoomPct = s.zoom === 'fit' ? fitPercent() : s.zoom;
        $('ie-zoom-value').textContent = s.zoom === 'fit' ? 'Fit' : `${zoomPct}%`;
        $('ie-zoom-value').dataset.fitPct = String(fitPercent());   // the size Fit would use now, kept for assistive tooling even while a number is shown
        ($('ie-zoom-out-float') as HTMLButtonElement).disabled = zoomPct <= ZOOM_MIN;
        ($('ie-zoom-in-float') as HTMLButtonElement).disabled = zoomPct >= ZOOM_MAX;

        syncOps(ev.problems, ev.steps);
        renderPreview();
        positionGuides();
    }

    return { open, close, isOpen: () => state !== null, openSlot: () => state?.slot ?? null };
}

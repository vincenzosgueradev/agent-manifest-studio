/**
 * The manifest editor (feature 003): one card per group, full width, one under another. The inputs are
 * built once for a package and updated in place, so typing never loses focus. Every decision (what is
 * valid, what changed, what the package will hold) is made by `services/`; this module draws it and
 * reports what the user did.
 */

import { card } from './card';
import { clear, el } from './dom';
import { icon } from '../icons';
import {
    bumpVersion, FIELDS,
    type FieldDef, type FieldGroup, type FieldPath, type IconSlot,
} from '../services/edit/fields';
import { originalOf, type Edits, type Original } from '../services/edit/edits';
import { SLOT_LABEL, SLOT_SIDE } from '../services/edit/iconEdit';
import { ALREADY_SEE_THROUGH, ALREADY_WHITE } from '../services/image/transparent';
import { flattenOnAccent, parseAccent } from '../services/preview';
import { cssRgb, paintTile, tinted } from './draw';
import type { Plan } from '../services/export';
import type { IconInfo, IconSet, ManifestView } from '../types';

export interface EditorModel {
    /** The manifest as loaded. */
    original: ManifestView;
    /** What the new package will be. */
    shown: Plan;
    /** What the user typed or chose. */
    edits: Edits;
    /** The icons as loaded. */
    originalIcons: IconSet;
    /** Why the last file chosen for a slot was refused. */
    iconMessage: Record<IconSlot, string | null>;
    /** The slot whose image editor is open, if any. */
    imageEditorSlot: IconSlot | null;
}

export interface EditorHandlers {
    onField: (path: FieldPath, value: string) => void;
    onRevertField: (path: FieldPath) => void;
    onRevertAll: () => void;
    onIconPick: (slot: IconSlot) => void;
    onIconFile: (slot: IconSlot, file: File) => void;
    onIconRevert: (slot: IconSlot) => void;
    /** Opens the image editor on a slot; the preset starts it with the usual steps. */
    onIconEdit: (slot: IconSlot, preset?: 'teams' | 'outline') => void;
    /** Takes the flat background colour away from the icon, in one go. */
    onIconTransparent: (slot: IconSlot) => void;
    /** Makes the shape of the outline icon white, as Teams asks. */
    onIconWhite: () => void;
}

let handlers: EditorHandlers | null = null;
export function initEditor(h: EditorHandlers): void { handlers = h; }

const GROUPS: Array<{ id: FieldGroup; title: string; note: string; icon: Parameters<typeof card>[0]['icon'] }> = [
    { id: 'identity', title: 'Identity', note: 'the name of the app in Teams', icon: 'tag' },
    { id: 'descriptions', title: 'Descriptions', note: 'shown in the app details', icon: 'file-text' },
    { id: 'developer', title: 'Developer', note: 'who made the app', icon: 'user' },
];

const $ = (id: string): HTMLElement | null => document.getElementById(id);

// ── Value helpers ─────────────────────────────────────────────────────────────

const valueOf = (o: Original, p: FieldPath): string => o.fields[p] ?? '';
const isKey = (v: string | null): boolean => v !== null && /^\[\[.+\]\]$/.test(v);


// ── Building ──────────────────────────────────────────────────────────────────

function fieldRow(def: FieldDef): HTMLElement {
    const id = `ed-${def.path}`;
    const input = def.kind === 'multiline'
        ? el('textarea', { id, class: 'text-input text-area', rows: '6', spellcheck: 'true', 'aria-describedby': `ed-err-${def.path} ed-count-${def.path}` })
        : el('input', { id, class: 'text-input', type: 'text', autocomplete: 'off', spellcheck: def.kind === 'text' ? 'true' : 'false', placeholder: def.placeholder, 'aria-describedby': `ed-err-${def.path} ed-count-${def.path}` });
    (input as HTMLInputElement | HTMLTextAreaElement).setAttribute('aria-label', def.label);
    input.addEventListener('input', () => handlers?.onField(def.path, (input as HTMLInputElement).value));

    const revert = el('button', { id: `ed-revert-${def.path}`, type: 'button', class: 'btn btn--secondary btn--sm', title: `Put back the original ${def.label.toLowerCase()}`, hidden: true }, icon('undo', 'icon--xs'), 'Revert');
    revert.addEventListener('click', () => handlers?.onRevertField(def.path));

    const control: Array<Node | null> = [input];
    if (def.kind === 'color') {
        // The window's own colour picker: it only ever gives #rrggbb, which is what the field wants.
        const picker = el('input', { id: `ed-pick-${def.path}`, class: 'color-input', type: 'color', 'aria-label': `Pick the ${def.label.toLowerCase()} with a colour picker`, title: 'Pick a colour' });
        picker.addEventListener('input', () => handlers?.onField(def.path, picker.value));
        control.push(picker);
    }
    if (def.kind === 'version') {
        for (const part of ['patch', 'minor'] as const) {
            const b = el('button', { id: `ed-bump-${part}`, type: 'button', class: 'btn btn--secondary btn--sm' }, icon('plus', 'icon--xs'), `Bump ${part}`);
            b.addEventListener('click', () => {
                const r = bumpVersion((document.getElementById(id) as HTMLInputElement).value, part);
                if (r.ok) handlers?.onField(def.path, r.value);
            });
            control.push(b);
        }
    }
    control.push(revert);

    const labelText = def.required ? def.label : `${def.label} (optional)`;
    return el('div', { class: 'ed-row', id: `ed-row-${def.path}` },
        el('label', { class: 'ed-label', for: id }, labelText),
        el('div', { class: `ed-control${def.kind === 'multiline' ? ' ed-control--wide' : ''}` }, ...control),
        el('div', { class: 'ed-meta' },
            el('span', { class: 'ed-count', id: `ed-count-${def.path}` }),
            el('span', { class: 'ed-help', id: `ed-help-${def.path}` }),
            el('p', { class: 'export-reason ed-error', id: `ed-err-${def.path}`, role: 'alert', hidden: true })));
}

/** One labelled row of actions: a fixed label column, then the buttons. */
function actionRow(label: string, ...buttons: Array<Node | null>): HTMLElement {
    return el('div', { class: 'ed-act-row' },
        el('span', { class: 'ed-act-label' }, label),
        el('div', { class: 'ed-act-buttons' }, ...buttons));
}

function iconCard(slot: IconSlot): HTMLElement {
    const label = SLOT_LABEL[slot];
    const side = SLOT_SIDE[slot];
    const pick = el('button', { id: `ed-img-pick-${slot}`, type: 'button', class: 'btn btn--secondary btn--sm' }, icon('upload', 'icon--xs'), `Choose a ${side} x ${side} PNG`);
    pick.addEventListener('click', () => handlers?.onIconPick(slot));
    const edit = el('button', { id: `ed-img-edit-${slot}`, type: 'button', class: 'btn btn--primary btn--sm' }, icon('wand', 'icon--xs'), 'Edit image');
    edit.addEventListener('click', () => handlers?.onIconEdit(slot));
    const transparent = slot === 'color'
        ? el('button', { id: 'ed-img-transparent-color', type: 'button', class: 'btn btn--secondary btn--sm', title: 'Take away the flat colour behind the logo, so that the accent colour shows through' }, icon('eraser', 'icon--xs'), 'Make background transparent')
        : null;
    transparent?.addEventListener('click', () => handlers?.onIconTransparent('color'));
    const whiteShape = slot === 'outline'
        ? el('button', { id: 'ed-img-white-outline', type: 'button', class: 'btn btn--secondary btn--sm', title: 'Give every visible pixel of the outline icon the colour white' }, icon('wand', 'icon--xs'), 'Make the shape white')
        : null;
    whiteShape?.addEventListener('click', () => handlers?.onIconWhite());
    const outlinePreset = slot === 'outline'
        ? el('button', { id: 'ed-img-outline-preset', type: 'button', class: 'btn btn--secondary btn--sm', title: 'Make a white silhouette of the colour icon, 32 x 32' }, icon('wand', 'icon--xs'), 'Outline from this icon')
        : null;
    outlinePreset?.addEventListener('click', () => handlers?.onIconEdit('outline', 'outline'));
    const barColour = slot === 'outline'
        ? el('input', { id: 'ed-img-bar-colour', class: 'color-input', type: 'color', value: '#5b5fc7', title: 'The colour to try on the shape: it is not saved, Teams chooses the real one', 'aria-label': 'Preview colour of the outline icon (not saved)' })
        : null;
    barColour?.addEventListener('input', () => paintBar());
    const revert = el('button', { id: `ed-img-revert-${slot}`, type: 'button', class: 'btn btn--secondary btn--sm', hidden: true }, icon('undo', 'icon--xs'), 'Revert');
    revert.addEventListener('click', () => handlers?.onIconRevert(slot));
    const file = el('input', { id: `ed-img-file-${slot}`, type: 'file', accept: 'image/png', hidden: true });
    file.addEventListener('change', () => { const f = file.files?.[0]; if (f) handlers?.onIconFile(slot, f); file.value = ''; });

    const c = card({ icon: 'image', title: label[0]!.toUpperCase() + label.slice(1), note: `${side} x ${side} pixels`, id: `ed-img-${slot}` },
        el('div', { class: 'ed-img-row' },
            el('figure', { class: 'ed-img-fig' },
                el('canvas', { id: `ed-img-canvas-${slot}`, class: 'ed-img-canvas ed-checker', width: String(side), height: String(side), 'aria-label': `Current ${label}, the chequered parts are see-through`, role: 'img' }),
                el('figcaption', {}, 'The picture')),
            slot === 'color'
                ? el('figure', { class: 'ed-img-fig' },
                    el('canvas', { id: 'ed-img-onaccent-color', class: 'ed-img-canvas', width: String(side), height: String(side), 'aria-label': 'The colour icon on the accent colour', role: 'img' }),
                    el('figcaption', { id: 'ed-img-onaccent-label' }, 'On the accent colour'))
                : null,
            slot === 'outline'
                ? el('figure', { class: 'ed-img-fig' },
                    el('canvas', { id: 'ed-img-onbar-outline', class: 'ed-img-canvas ed-bar', width: String(side), height: String(side), 'aria-label': 'The outline icon on the Teams app bar, in the preview colour', role: 'img' }),
                    el('figcaption', {},
                        el('label', { for: 'ed-img-bar-colour' }, 'Preview colour'),
                        barColour))
                : null,
            el('div', { class: 'ed-img-info' },
                el('p', { class: 'ed-img-facts', id: `ed-img-facts-${slot}` }),
                el('p', { class: 'ed-img-caption', id: `ed-img-caption-${slot}`, hidden: true }),
                el('div', { class: 'ed-actions' },
                    actionRow('Image', edit, pick, revert, file),
                    actionRow('Quick fix', transparent, outlinePreset, whiteShape)),
                el('p', { class: 'export-reason ed-error', id: `ed-img-msg-${slot}`, role: 'alert', hidden: true }))));
    // a file dropped on the card
    c.addEventListener('dragover', e => { e.preventDefault(); c.classList.add('is-over'); });
    c.addEventListener('dragleave', () => c.classList.remove('is-over'));
    c.addEventListener('drop', e => {
        e.preventDefault();
        c.classList.remove('is-over');
        const f = e.dataTransfer?.files?.[0];
        if (f) handlers?.onIconFile(slot, f);
    });
    return c;
}


const revertAll = (id: string): HTMLButtonElement => {
    const b = el('button', { id, type: 'button', class: 'btn btn--secondary btn--sm' }, icon('undo', 'icon--xs'), 'Revert all');
    b.addEventListener('click', () => handlers?.onRevertAll());
    return b;
};

/** `root` holds the text fields (step 2); the colour and the icons go to `#look-groups` (step 3). */
function build(root: HTMLElement): void {
    clear(root);
    const look = $('look-groups') ?? root;
    clear(look);
    root.append(el('div', { class: 'ed-top' },
        el('p', { class: 'field-hint', id: 'ed-intro' }, 'Change the text of the app. The preview and the checks use your changes, and the package you save differs from the one you opened only in what you changed.'),
        revertAll('ed-revert-all')));
    look.append(el('div', { class: 'ed-top' },
        el('p', { class: 'field-hint', id: 'ed-intro-look' }, 'Colour and icons. The picture is shown on a chequerboard (the chequered parts are see-through) and on the accent colour, as Teams will draw it.'),
        revertAll('ed-revert-all-look')));

    for (const g of GROUPS) {
        root.append(card({ icon: g.icon, title: g.title, note: g.note, id: `ed-card-${g.id}` },
            ...FIELDS.filter(f => f.group === g.id).map(fieldRow)));
    }
    look.append(card({ icon: 'palette', title: 'Look', note: 'accent colour', id: 'ed-card-look' },
        ...FIELDS.filter(f => f.group === 'look').map(fieldRow)));
    look.append(iconCard('color'), iconCard('outline'), el('div', { id: 'image-editor-root' }));

    root.append(card({ icon: 'tag', title: 'Version', note: 'raise it when you change an app that is already installed', id: 'ed-card-version' },
        ...FIELDS.filter(f => f.group === 'version').map(fieldRow)));
}

// ── Updating ──────────────────────────────────────────────────────────────────

function setError(id: string, message: string | null): void {
    const e = $(id);
    if (!e) return;
    e.hidden = message === null;
    e.textContent = message ?? '';
}

const kb = (b: number): string => `${(b / 1024).toFixed(1)} KB`;

function paint(canvas: HTMLCanvasElement, png: { header: { width: number; height: number }; rgba: Uint8Array }): void {
    canvas.width = png.header.width;
    canvas.height = png.header.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(png.header.width, png.header.height);
    img.data.set(png.rgba);
    ctx.putImageData(img, 0, 0);
}

/** The picture as it is on a chequerboard (the chequered parts are see-through), and, for the colour icon, on the accent colour. */
function drawIcon(slot: IconSlot, info: IconInfo, accent: string | null): void {
    const canvas = $(`ed-img-canvas-${slot}`) as HTMLCanvasElement | null;
    const onAccent = slot === 'color' ? $('ed-img-onaccent-color') as HTMLCanvasElement | null : null;
    if (onAccent) {
        // the accent colour is data from the package, the one colour that is not a theme colour
        if (accent && /^#[0-9a-f]{6}$/i.test(accent)) onAccent.style.background = accent;
        else onAccent.style.removeProperty('background');
        const label = $('ed-img-onaccent-label');
        if (label) label.textContent = accent ? `On the accent colour ${accent}` : 'On the accent colour';
    }
    const png = info.png;
    if (!png || png.kind !== 'ok') return;
    if (canvas) paint(canvas, png);
    if (onAccent) paint(onAccent, png);
}

function updateIcon(slot: IconSlot, m: EditorModel): void {
    const now = m.shown.icons[slot];
    const replaced = m.shown.iconChanges.some(c => c.slot === slot);
    const facts = $(`ed-img-facts-${slot}`);
    if (facts) {
        const png = now.png;
        facts.textContent = !now.present ? (now.path === null ? 'The manifest does not declare this icon.' : `${now.path} is declared but not in the package.`)
            : png && (png.kind === 'ok' || png.kind === 'unsupported') ? `${now.path} - ${png.header.width} x ${png.header.height} pixels, ${kb(now.byteLength)}${replaced ? ' (replaced)' : ''}`
                : `${now.path} - not a PNG the tool can read`;
    }
    $(`ed-img-${slot}`)?.setAttribute('data-changed', String(replaced));
    ($(`ed-img-revert-${slot}`) as HTMLButtonElement).hidden = !replaced;
    setError(`ed-img-msg-${slot}`, m.iconMessage[slot]);
    // "nothing to take away" is information, not a fault: it is not red
    $(`ed-img-msg-${slot}`)?.classList.toggle('is-info', m.iconMessage[slot] === ALREADY_SEE_THROUGH || m.iconMessage[slot] === ALREADY_WHITE);
    // the see-through parts of the colour icon show the accent colour: say so, because that is the colour behind them
    const caption = $(`ed-img-caption-${slot}`);
    if (caption && slot === 'outline') {
        caption.hidden = false;
        caption.textContent = 'This is the icon of the left bar of Teams, like the Copilot icon there: Teams draws only the shape, with no background and in the colour of its bar. It has to be white on see-through.';
    } else if (caption) {
        const png = now.png;
        let seeThrough = false;
        if (png && png.kind === 'ok') for (let i = 3; i < png.rgba.length; i += 4) if (png.rgba[i]! < 255) { seeThrough = true; break; }
        const accent = m.shown.manifest.accentColor;
        const readable = png !== null && png !== undefined && png.kind === 'ok';
        caption.hidden = !(slot === 'color' && readable && accent);
        caption.dataset.state = seeThrough ? 'see-through' : 'opaque';
        // With a see-through icon the accent colour is what is behind the logo; with an opaque one it is not seen at all.
        caption.textContent = seeThrough
            ? `The chequered parts of the picture are see-through. Teams puts the accent colour ${accent ?? ''} behind them: that is the second picture, not part of the file.`
            : `The picture has its own background (nothing is chequered), so the accent colour ${accent ?? ''} does not show behind it. Press "Make background transparent" to take the background away.`;
    }
    drawIcon(slot, now, m.shown.manifest.accentColor);
}

// ── The colour to try on the outline icon ────────────────────────────────────

let outlineNow: IconInfo | null = null;

/** The outline icon on the bar of Teams in the colour that the user is trying; the file is not touched. */
function paintBar(): void {
    const canvas = $('ed-img-onbar-outline') as HTMLCanvasElement | null;
    const picker = $('ed-img-bar-colour') as HTMLInputElement | null;
    const png = outlineNow?.png;
    if (!canvas || !picker || !png || png.kind !== 'ok') return;
    const pick = parseAccent(picker.value) ?? { r: 91, g: 95, b: 199 };
    const bar = cssRgb('--bar-light-bg', '#f0f0f0');
    paintTile(canvas, flattenOnAccent(tinted(png.rgba, pick), bar), png.header.width, png.header.height);
}

export function renderEditor(root: HTMLElement, m: EditorModel): void {
    if (!$('ed-intro')) build(root);

    const shownO = originalOf(m.shown.manifest);
    const loaded = originalOf(m.original);
    let any = false;

    for (const def of FIELDS) {
        const input = $(`ed-${def.path}`) as HTMLInputElement | HTMLTextAreaElement;
        const typed = m.edits.fields[def.path];
        const effective = valueOf(shownO, def.path);
        const readOnly = isKey(shownO.fields[def.path]);
        if (document.activeElement !== input) input.value = typed !== undefined ? typed : effective;
        input.disabled = readOnly;
        const shownValue = input.value;
        const invalid = m.shown.invalid.find(i => i.path === def.path);
        const changed = effective !== valueOf(loaded, def.path) || (loaded.fields[def.path] === null) !== (shownO.fields[def.path] === null);
        if (changed) any = true;
        $(`ed-row-${def.path}`)!.setAttribute('data-changed', String(changed));
        ($(`ed-revert-${def.path}`) as HTMLButtonElement).hidden = !changed && typed === undefined;
        setError(`ed-err-${def.path}`, invalid?.message ?? null);
        input.setAttribute('aria-invalid', String(invalid !== undefined));
        const count = $(`ed-count-${def.path}`)!;
        count.textContent = def.kind === 'color' ? '' : `${[...shownValue].length} / ${def.max}`;
        count.classList.toggle('is-over', [...shownValue].length > def.max);
        const help = $(`ed-help-${def.path}`)!;
        help.textContent = readOnly ? 'A localisation key: the text is in a language file.' : '';
        if (def.kind === 'color') {
            // the picker shows the colour that is valid now; while the text is not valid it keeps the last one
            const picker = $(`ed-pick-${def.path}`) as HTMLInputElement;
            if (/^#[0-9a-f]{6}$/i.test(shownValue) && document.activeElement !== picker) picker.value = shownValue.toLowerCase();
        }
        if (def.kind === 'version') {
            for (const part of ['patch', 'minor'] as const) {
                const b = $(`ed-bump-${part}`) as HTMLButtonElement;
                const r = bumpVersion(shownValue, part);
                b.disabled = !r.ok;
                b.title = r.ok ? `${shownValue} becomes ${r.value}` : r.reason;
            }
        }
    }
    for (const slot of ['color', 'outline'] as const) {
        updateIcon(slot, m);
        if (m.shown.iconChanges.some(c => c.slot === slot)) any = true;
    }
    for (const slot of ['color', 'outline'] as const) {
        const b = $(`ed-img-edit-${slot}`) as HTMLButtonElement;
        const busy = m.imageEditorSlot !== null && m.imageEditorSlot !== slot;
        b.disabled = busy;
        b.title = busy ? 'Another image editor is open: apply or cancel it first.' : `Edit the ${SLOT_LABEL[slot]} as an image`;
        const preset = $('ed-img-outline-preset') as HTMLButtonElement | null;
        if (preset && slot === 'outline') { preset.disabled = busy; }
        const clear = $('ed-img-transparent-color') as HTMLButtonElement | null;
        if (clear && slot === 'color') clear.disabled = busy;
    }
    outlineNow = m.shown.icons.outline;
    paintBar();
    const nothing = !any && Object.keys(m.edits.fields).length === 0;
    ($('ed-revert-all') as HTMLButtonElement).disabled = nothing;
    ($('ed-revert-all-look') as HTMLButtonElement).disabled = nothing;
}

/** Forget the built controls (a new package starts from a clean editor). */
export function resetEditor(root: HTMLElement): void {
    outlineNow = null;
    clear(root);
    const look = $('look-groups');
    if (look) clear(look);
}

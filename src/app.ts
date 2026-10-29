/**
 * Wiring only: load a package, keep the state, render the views. Every decision lives in
 * `services/` and is tested there.
 */

import { applyTheme, onSettingsChange } from './services/theme';
import { copyText, hasHostFiles, pickImage, pickPackage, readFileObject, savePackage, savePngFile, saveText } from './services/files';
import { readPackage } from './services/zip';
import { exportPackage, makeContext, planEdits, suggestFileName, type EditContext, type Plan } from './services/export';
import { EMPTY, originalOf, type Edits } from './services/edit/edits';
import { checkNewIcon } from './services/edit/iconEdit';
import { renderCompare, resetCompare } from './view/compare';
import { validateManifestText, type SchemaReport } from './services/schema';
import { renderSchema, resetSchema } from './view/schemaCard';
import { bumpVersion } from './services/edit/fields';
import type { FieldPath, IconSlot } from './services/edit/fields';
import { buildReport, reportFileName, reportText } from './services/report';
import { splitName, validateSuffix } from './services/suffix';
import { initLoader, openFileInput, showLoaded, showMessage } from './view/loader';
import { renderSummary } from './view/summary';
import { renderPreview } from './view/preview';
import { renderChecks } from './view/checks';
import { renderContents } from './view/contents';
import { renderChanges } from './view/changes';
import { initEditor, renderEditor, resetEditor } from './view/editor';
import { initImageEditor } from './view/imageEditor';
import { onSuffixInput, renderNameEditor, resetNameEditor } from './view/nameEditor';
import { onExportClick, onVersionBump, renderExport } from './view/exportPanel';
import { initSteps, showStep } from './view/steps';

interface State {
    ctx: EditContext;
    /** What the user typed; `null` until they type: then nothing changes. */
    typed: string | null;
    /** Result of the last save, shown under the button. */
    status: string | null;
    /** Result of the last copy or save of the checks report. */
    reportStatus: string | null;
    /** What the user changed besides the suffix (feature 003). */
    edits: Edits;
    /** Why the last file chosen for an icon slot was refused. */
    iconMessage: Record<IconSlot, string | null>;
}

/** The slot whose image editor is open, if any (the editor itself holds its work). */
let imageEditorSlot: IconSlot | null = null;

let state: State | null = null;
/** The step on screen, 1 to 5. */
let step = 1;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** The suffix the input starts with: the one the short name has, else the full name's. */
function initialSuffix(ctx: EditContext): string {
    const s = ctx.manifest.nameShort;
    const f = ctx.manifest.nameFull;
    if (s.kind === 'literal' && splitName(s.raw).hasBrackets) return s.suffix;
    if (f.kind === 'literal' && splitName(f.raw).hasBrackets) return f.suffix;
    return '';
}

/** The usable suffix for what was typed: `null` when nothing was typed or the text is not usable. */
function typedSuffix(s: State): string | null {
    if (s.typed === null) return null;
    const v = validateSuffix(s.typed);
    return v.ok ? v.value : null;
}

/** The plan to show for what is typed, and why the typed text cannot be used if it cannot. */
function currentView(s: State): { shown: Plan; problem: string | null } {
    const untouched = (planEdits(s.ctx, null, EMPTY) as { ok: true; plan: Plan }).plan;
    let suffix: string | null = null;
    let problem: string | null = null;
    if (s.typed !== null) {
        const v = validateSuffix(s.typed);
        // While the typed text is unusable no suffix is applied: the edits still are.
        if (v.ok) suffix = v.value; else problem = v.message;
    }
    const p = planEdits(s.ctx, suffix, s.edits);
    return p.ok ? { shown: p.plan, problem } : { shown: untouched, problem: problem ?? p.message };
}

/** The package changed and the version did not: an upload to replace an installed app would be refused. */
function versionHint(loaded: string | null, shown: Plan): { current: string; next: string | null } | null {
    const now = shown.manifest.appVersion;
    if (!shown.changed || now === null || now !== loaded) return null;
    const bump = bumpVersion(now, 'patch');
    return { current: now, next: bump.ok ? bump.value : null };
}

/** What stops the save, in words: the typed suffix, the fields that are not valid, the checks that now fail. */
function blockReason(shown: Plan, problem: string | null): string | null {
    if (problem) return problem;
    const parts = [
        ...shown.invalid.map(i => `${i.label}: ${i.message}`),
        ...shown.blocking.map(c => `${c.label} is ${c.found}, ${c.expected}`),
    ];
    return parts.length > 0 ? `Cannot save: ${parts.join('; ')}.` : null;
}

/** Nothing of a removed package stays in the page, hidden steps included (FR-027). */
/** The schema report of the last manifest text: the text is the same for many renders in a row. */
let schemaMemo: { text: string; report: SchemaReport } | null = null;

function schemaFor(text: string): SchemaReport {
    if (schemaMemo?.text === text) return schemaMemo.report;
    const report = validateManifestText(text);
    schemaMemo = { text, report };
    return report;
}

function clearViews(): void {
    for (const id of ['summary', 'preview-body', 'preview-notice', 'name-body', 'edit-groups', 'look-groups', 'checks-body', 'changes-body', 'contents-body', 'export-body']) {
        $(id).replaceChildren();
    }
    resetCompare($('look-compare'));
    resetSchema($('schema-body'), $('schema-chip-slot'));
    $('checks-summary').textContent = '';
    $('report-status').hidden = true;
    $('report-status').textContent = '';
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

function render(): void {
    step = showStep(step, state !== null);
    if (!state) { showLoaded(null); clearViews(); return; }
    const { ctx } = state;
    const files = ctx.pkg.entries.filter(e => !e.isDirectory).length;
    showLoaded(ctx.pkg.fileName, `${files} ${files === 1 ? 'file' : 'files'} · ${kb(ctx.pkg.byteLength)} · manifest schema ${ctx.manifest.manifestVersion ?? 'unknown'}`);
    renderSummary($('summary'), ctx.manifest, ctx.pkg);

    const { shown, problem } = currentView(state);
    const m = shown.manifest;

    renderPreview($('preview-body'), $('preview-notice'), {
        icons: shown.icons, accent: m.accentColor,
        nameShort: m.nameShort.raw, nameFull: m.nameFull.raw,
        shortKind: m.nameShort.kind, fullKind: m.nameFull.kind,
    });
    renderNameEditor($('name-body'), {
        manifest: ctx.manifest,
        inputValue: state.typed ?? initialSuffix(ctx),
        short: shown.short,
        full: shown.full,
        problem,
    });
    renderEditor($('edit-groups'), {
        original: ctx.manifest, shown, edits: state.edits, originalIcons: ctx.icons, iconMessage: state.iconMessage, imageEditorSlot,
    });
    renderCompare($('look-compare'), {
        originalIcons: ctx.icons, originalAccent: ctx.manifest.accentColor,
        nowIcons: shown.icons, nowAccent: m.accentColor,
        replaced: shown.iconChanges.map(c => c.slot),
    });
    renderSchema($('schema-body'), $('schema-chip-slot'), schemaFor(shown.text));
    renderChecks($('checks-body'), $('checks-summary'), shown.checks);
    const reportStatus = $('report-status');
    reportStatus.hidden = state.reportStatus === null;
    reportStatus.textContent = state.reportStatus ?? '';

    renderChanges($('changes-body'), shown);
    renderContents($('contents-body'), ctx, shown);

    renderExport($('export-body'), {
        fileName: suggestFileName(ctx.pkg.fileName, typedSuffix(state)),
        disabledReason: blockReason(shown, problem),
        versionHint: versionHint(ctx.manifest.appVersion, shown),
        remaining: shown.remaining,
        status: state.status,
    });
}

/** Reads, validates and shows a package. A refused file keeps the previous package on screen. */
function loadBytes(name: string, bytes: Uint8Array): boolean {
    const refuse = (why: string): false => { showMessage(`${name}: ${why}`); return false; };

    const read = readPackage(bytes, name);
    if (!read.ok) return refuse(read.message);
    const made = makeContext(read.pkg);
    if (!made.ok) return refuse(made.message);

    imageEditor.close();   // the work of an editor belongs to the package it was opened on
    state = { ctx: made.ctx, typed: null, status: null, reportStatus: null, edits: EMPTY, iconMessage: { color: null, outline: null } };
    resetNameEditor($('name-body'));   // a new package starts from a clean editor
    resetEditor($('edit-groups'));
    showMessage(null);
    render();
    return true;
}

/** Removes the package: the tool goes back to its first step with nothing loaded. */
function removePackage(): void {
    imageEditor.close();
    state = null;
    step = 1;
    showMessage(null);
    resetNameEditor($('name-body'));
    resetEditor($('edit-groups'));
    render();
}

async function onOpen(): Promise<void> {
    if (!hasHostFiles()) { openFileInput(); return; }
    try {
        const picked = await pickPackage();
        if (picked) loadBytes(picked.name, picked.bytes);
    } catch (e) {
        showMessage(`The file could not be opened: ${e instanceof Error ? e.message : String(e)}`);
    }
}

async function onExport(): Promise<void> {
    if (!state) return;
    const typed = state.typed === null ? null : validateSuffix(state.typed);
    if (typed && !typed.ok) return;
    const result = exportPackage(state.ctx, typed ? typed.value : null, state.edits);
    if (!result.ok) {
        state.status = result.reason === 'blocked'
            ? `Not saved: ${[...result.invalid.map(i => i.label), ...result.blocking.map(c => c.label)].join(', ')}.`
            : `Not saved: ${result.message}`;
        render();
        return;
    }
    try {
        const saved = await savePackage(result.suggestedFileName, result.bytes);
        state.status = saved === null ? 'Not saved: the save dialog was cancelled.' : `Saved: ${saved}`;
    } catch (e) {
        state.status = `Not saved: ${e instanceof Error ? e.message : String(e)}`;
    }
    render();
}

/** The report of the checks as they are on screen. */
function currentReport(s: State): string {
    const { shown } = currentView(s);
    return reportText(buildReport(s.ctx.pkg.fileName, shown.manifest, shown.checks, __APP_VERSION__, shown.changes.map(c => c.path), schemaFor(shown.text)));
}

async function onCopyReport(): Promise<void> {
    if (!state) return;
    const ok = await copyText(currentReport(state));
    state.reportStatus = ok ? 'Report copied.' : 'The report could not be copied.';
    render();
}

async function onSaveReport(): Promise<void> {
    if (!state) return;
    try {
        const saved = await saveText(reportFileName(state.ctx.pkg.fileName), currentReport(state), { name: 'JSON report', extensions: ['json'] });
        state.reportStatus = saved === null ? 'Report not saved: the save dialog was cancelled.' : `Report saved: ${saved}`;
    } catch (e) {
        state.reportStatus = `Report not saved: ${e instanceof Error ? e.message : String(e)}`;
    }
    render();
}

/** A copy button shows a tick for a moment, or says it failed. */
async function onCopyClick(button: HTMLElement): Promise<void> {
    const ok = await copyText(button.dataset.copy ?? '');
    const mark = button.querySelector('.icon');
    if (!ok) { button.title = 'Could not copy'; return; }
    mark?.classList.replace('icon-copy', 'icon-check');
    button.classList.add('is-done');
    setTimeout(() => {
        mark?.classList.replace('icon-check', 'icon-copy');
        button.classList.remove('is-done');
    }, 1500);
}

document.addEventListener('click', e => {
    const button = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-copy]');
    if (button) void onCopyClick(button);
});
$('copy-report-btn').addEventListener('click', () => { void onCopyReport(); });
$('save-report-btn').addEventListener('click', () => { void onSaveReport(); });

initSteps(n => {
    step = n;
    render();
});
initLoader({
    onOpen: () => { void onOpen(); },
    onFile: file => {
        void readFileObject(file)
            .then(f => loadBytes(f.name, f.bytes))
            .catch(e => showMessage(`The file could not be read: ${e instanceof Error ? e.message : String(e)}`));
    },
    onRemove: removePackage,
});
/** Changes the edits of the loaded package and draws again. */
function edit(change: (e: Edits) => Edits): void {
    if (!state) return;
    state.edits = change(state.edits);
    state.status = null;
    render();
}

/** An image chosen for an icon: kept when it is usable for the slot, else the reason is shown. */
function acceptIcon(slot: IconSlot, bytes: Uint8Array): void {
    if (!state) return;
    const r = checkNewIcon(slot, bytes);
    if (r.ok) {
        state.iconMessage = { ...state.iconMessage, [slot]: null };
        edit(e => ({ ...e, icons: { ...e.icons, [slot]: bytes } }));
    } else {
        state.iconMessage = { ...state.iconMessage, [slot]: r.message };
        render();
    }
}

/** The bytes of an icon as the new package will hold it (replaced or as loaded). */
function iconBytes(slot: IconSlot): Uint8Array | null {
    if (!state) return null;
    const { shown, ctx } = { shown: currentView(state).shown, ctx: state.ctx };
    const path = shown.manifest.icons[slot];
    if (path === null) return null;
    return shown.entries[path] ?? ctx.pkg.entries.find(e => e.path === path && !e.isDirectory)?.data ?? null;
}

const imageEditor = initImageEditor({
    root: () => document.getElementById('image-editor-root'),
    currentIcon: iconBytes,
    originalIcon: slot => {
        const path = state?.ctx.manifest.icons[slot] ?? null;
        return path === null ? null : state!.ctx.pkg.entries.find(e => e.path === path && !e.isDirectory)?.data ?? null;
    },
    accent: () => (state ? currentView(state).shown.manifest.accentColor : null),
    onApply: (slot, bytes) => acceptIcon(slot, bytes),
    pickImage,
    hasHostFiles,
    savePng: savePngFile,
    onOpenChange: slot => { imageEditorSlot = slot; if (state) render(); },
});

initEditor({
    onField: (path: FieldPath, value) => edit(e => ({ ...e, fields: { ...e.fields, [path]: value } })),
    onRevertField: (path: FieldPath) => {
        if (!state) return;
        const original = originalOf(state.ctx.manifest).fields[path];
        edit(e => {
            const fields = { ...e.fields };
            if (original === null) delete fields[path]; else fields[path] = original;
            return { ...e, fields };
        });
    },
    onRevertAll: () => {
        if (!state) return;
        state.typed = null;
        state.iconMessage = { color: null, outline: null };
        edit(() => EMPTY);
    },
    onIconEdit: slot => imageEditor.open(slot),
});
onSuffixInput(value => {
    if (!state) return;
    state.typed = value;
    state.status = null;
    render();
});
onExportClick(() => { void onExport(); });
onVersionBump(() => {
    if (!state) return;
    const now = currentView(state).shown.manifest.appVersion;
    const r = now === null ? null : bumpVersion(now, 'patch');
    if (r?.ok) edit(e => ({ ...e, fields: { ...e.fields, version: r.value } }));
});

$('app-version').textContent = `v${__APP_VERSION__}`;
applyTheme();
onSettingsChange(applyTheme);
render();

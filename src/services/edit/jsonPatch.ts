/**
 * Changing, adding and removing members of `manifest.json` AS TEXT (FR-017, FR-020, FR-023).
 *
 * Only the characters of the member that changes are touched, so spacing, key order, line endings,
 * the byte-order mark and every entry the tool does not know stay exactly as they were. Each
 * operation re-reads the text it just produced, so positions never go stale.
 *
 * An operation addresses a member of the top-level object (`['accentColor']`) or of an object that
 * is a member of it (`['developer', 'name']`). Deeper paths are not edited by this tool.
 *
 * Safety net (`verifyPatch`): the result, parsed, must equal the original, parsed, with the same
 * operations applied to a copy of the parsed object. It does not look at positions at all, so a
 * wrong splice cannot agree with it by accident.
 */

export type Op = { path: string[]; value: unknown } | { path: string[]; remove: true };

export type PatchResult = { ok: true; text: string } | { ok: false; message: string };

interface Member { key: string; keyStart: number; keyEnd: number; valueStart: number; valueEnd: number }
interface Obj { open: number; close: number; members: Member[] }
interface Doc { root: Obj; children: Map<string, Obj>; dups: Set<string> }

class NotJson extends Error {}

const stripBom = (t: string): string => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

/** Walks the text once. Records the members of the top-level object and of its object members. */
function parseDoc(text: string): Doc {
    const n = text.length;
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    const bad = (): never => { throw new NotJson('not JSON'); };
    const ws = (): void => { while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\r' || text[i] === '\n')) i++; };

    const string = (): { start: number; end: number; value: string } => {
        if (text[i] !== '"') bad();
        const start = i++;
        for (;;) {
            if (i >= n) bad();
            const c = text[i]!;
            if (c === '\\') { i += 2; continue; }
            if (c === '"') { i++; break; }
            if (c < ' ') bad();
            i++;
        }
        return { start, end: i, value: JSON.parse(text.slice(start, i)) as string };
    };

    const literal = (): void => {
        const from = i;
        while (i < n && !',}] \t\r\n'.includes(text[i]!)) i++;
        if (i === from) bad();
    };

    const children = new Map<string, Obj>();
    const dups = new Set<string>();

    /** Returns the object when `level` records members (0 = top level, 1 = its members). */
    function value(level: number, name: string): Obj | null {
        ws();
        const c = text[i];
        if (c === '"') { string(); return null; }
        if (c === '{') return object(level, name);
        if (c === '[') { array(); return null; }
        literal();
        return null;
    }

    function array(): void {
        i++;
        ws();
        if (text[i] === ']') { i++; return; }
        for (;;) {
            value(99, '');
            ws();
            if (text[i] === ',') { i++; continue; }
            if (text[i] === ']') { i++; return; }
            bad();
        }
    }

    function object(level: number, name: string): Obj {
        const obj: Obj = { open: i, close: -1, members: [] };
        const seen = new Set<string>();
        i++;
        ws();
        if (text[i] === '}') { obj.close = i++; return obj; }
        for (;;) {
            ws();
            const k = string();
            ws();
            if (text[i] !== ':') bad();
            i++;
            ws();
            const valueStart = i;
            const inner = value(level + 1, level === 0 ? k.value : '');
            const member: Member = { key: k.value, keyStart: k.start, keyEnd: k.end, valueStart, valueEnd: i };
            if (level <= 1) {
                obj.members.push(member);
                const id = level === 0 ? k.value : `${name}.${k.value}`;
                if (seen.has(k.value)) dups.add(id);
                seen.add(k.value);
                if (level === 0 && inner) children.set(k.value, inner);
            }
            ws();
            if (text[i] === ',') { i++; continue; }
            if (text[i] === '}') { obj.close = i++; return obj; }
            bad();
        }
    }

    ws();
    if (text[i] !== '{') bad();
    const root = object(0, '');
    ws();
    if (i !== n) bad();
    return { root, children, dups };
}

// ── Layout of the text around a member ────────────────────────────────────────

interface Layout { eol: string; unit: string; multiline: boolean; indent: string; colon: string }

const lineIndent = (text: string, pos: number): string => {
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const m = /^[ \t]*/.exec(text.slice(lineStart, pos));
    return m ? m[0] : '';
};

function layoutOf(text: string, obj: Obj): Layout {
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const first = obj.members[0];
    const multiline = first
        ? text.slice(obj.open + 1, first.keyStart).includes('\n')
        : text.slice(obj.open, obj.close).includes('\n') || text.includes('\n');
    const base = lineIndent(text, obj.open);
    const unit = base.includes('\t') || text.includes('\n\t') ? '\t' : '  ';
    const indent = first && multiline ? lineIndent(text, first.keyStart) : base + unit;
    // An empty object has no member to copy the style from: the first `"key":` of the document stands in.
    const colon = first ? text.slice(first.keyEnd, first.valueStart) : (/"(\s*:\s*)/.exec(text)?.[1] ?? ': ');
    return { eol, unit, multiline, indent, colon };
}

/** A JSON value in the layout of its surroundings. */
function render(value: unknown, depthIndent: string, l: Layout, multiline: boolean): string {
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        if (!multiline) return `[${value.map(v => JSON.stringify(v)).join(l.colon === ':' ? ',' : ', ')}]`;
        const inner = depthIndent + l.unit;
        return `[${l.eol}${value.map(v => inner + JSON.stringify(v)).join(`,${l.eol}`)}${l.eol}${depthIndent}]`;
    }
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) return '{}';
        if (!multiline) return `{${entries.map(([k, v]) => `${JSON.stringify(k)}${l.colon}${render(v, depthIndent, l, false)}`).join(l.colon === ':' ? ',' : ', ')}}`;
        const inner = depthIndent + l.unit;
        return `{${l.eol}${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}${l.colon}${render(v, inner, l, true)}`).join(`,${l.eol}`)}${l.eol}${depthIndent}}`;
    }
    return JSON.stringify(value);
}

function splice(text: string, start: number, end: number, replacement: string): string {
    return text.slice(0, start) + replacement + text.slice(end);
}

function insertMember(text: string, obj: Obj, key: string, value: unknown): string {
    const l = layoutOf(text, obj);
    const member = `${JSON.stringify(key)}${l.colon}${render(value, l.indent, l, l.multiline)}`;
    const last = obj.members[obj.members.length - 1];
    if (last) {
        const gap = l.multiline ? l.eol + l.indent : (l.colon === ':' ? '' : ' ');
        return splice(text, last.valueEnd, last.valueEnd, `,${gap}${member}`);
    }
    const closeIndent = l.multiline ? l.indent.slice(0, Math.max(0, l.indent.length - l.unit.length)) : '';
    return splice(text, obj.open + 1, obj.close, l.multiline ? `${l.eol}${l.indent}${member}${l.eol}${closeIndent}` : member);
}

function removeMember(text: string, obj: Obj, index: number): string {
    const m = obj.members[index]!;
    const n = obj.members.length;
    if (n === 1) {
        const l = layoutOf(text, obj);
        const closeIndent = l.multiline ? l.indent.slice(0, Math.max(0, l.indent.length - l.unit.length)) : '';
        return splice(text, obj.open + 1, obj.close, l.multiline ? l.eol + closeIndent : '');
    }
    if (index < n - 1) return splice(text, m.keyStart, obj.members[index + 1]!.keyStart, '');
    return splice(text, obj.members[index - 1]!.valueEnd, m.valueEnd, '');
}

function applyOne(text: string, op: Op): PatchResult {
    let doc: Doc;
    try {
        doc = parseDoc(text);
    } catch {
        return { ok: false, message: 'manifest.json is not valid JSON.' };
    }
    const [first, second] = op.path;
    if (first === undefined || op.path.length > 2) return { ok: false, message: 'The tool edits only the top level of the manifest and one level below it.' };
    const id = op.path.join('.');
    if (doc.dups.has(first) || (second !== undefined && doc.dups.has(id))) {
        return { ok: false, message: `The manifest repeats the key "${id}": the tool cannot tell which one to change.` };
    }
    const remove = 'remove' in op;

    if (second === undefined) {
        const idx = doc.root.members.findIndex(m => m.key === first);
        if (remove) return { ok: true, text: idx < 0 ? text : removeMember(text, doc.root, idx) };
        const value = (op as { value: unknown }).value;
        if (idx < 0) return { ok: true, text: insertMember(text, doc.root, first, value) };
        const m = doc.root.members[idx]!;
        const l = layoutOf(text, doc.root);
        const old = text.slice(m.valueStart, m.valueEnd);
        return { ok: true, text: splice(text, m.valueStart, m.valueEnd, render(value, l.indent, l, old.includes('\n'))) };
    }

    const parentIdx = doc.root.members.findIndex(m => m.key === first);
    if (parentIdx < 0) {
        if (remove) return { ok: true, text };
        return { ok: true, text: insertMember(text, doc.root, first, { [second]: (op as { value: unknown }).value }) };
    }
    const parent = doc.children.get(first);
    if (!parent) return { ok: false, message: `"${first}" is not an object in the manifest, so "${second}" cannot be edited.` };
    const idx = parent.members.findIndex(m => m.key === second);
    if (remove) return { ok: true, text: idx < 0 ? text : removeMember(text, parent, idx) };
    const value = (op as { value: unknown }).value;
    if (idx < 0) return { ok: true, text: insertMember(text, parent, second, value) };
    const m = parent.members[idx]!;
    const l = layoutOf(text, parent);
    const old = text.slice(m.valueStart, m.valueEnd);
    return { ok: true, text: splice(text, m.valueStart, m.valueEnd, render(value, l.indent, l, old.includes('\n'))) };
}

/** What the parsed manifest must be after the operations, computed on a copy of the parsed original. */
function expectedAfter(before: unknown, ops: Op[]): unknown {
    const copy = structuredClone(before) as Record<string, unknown>;
    for (const op of ops) {
        const [first, second] = op.path;
        if (first === undefined) continue;
        if (second === undefined) {
            if ('remove' in op) delete copy[first];
            else copy[first] = op.value;
            continue;
        }
        let parent = copy[first] as Record<string, unknown> | undefined;
        if ('remove' in op) { if (parent && typeof parent === 'object') delete parent[second]; continue; }
        if (parent === undefined) { parent = {}; copy[first] = parent; }
        parent[second] = op.value;
    }
    return copy;
}

/** The result, parsed, equals the original, parsed, with the operations applied to a copy. */
export function verifyPatch(before: string, after: string, ops: Op[]): boolean {
    try {
        const expected = expectedAfter(JSON.parse(stripBom(before)), ops);
        return JSON.stringify(JSON.parse(stripBom(after))) === JSON.stringify(expected);
    } catch {
        return false;
    }
}

const INTEGRITY = 'The change could not be applied safely: the result would differ from the original in more than the edited fields. Nothing was produced.';

/** `apply` can be replaced in tests to prove that the safety net catches a wrong splice. */
export function patchText(text: string, ops: Op[], apply: (text: string, op: Op) => PatchResult = applyOne): PatchResult {
    let out = text;
    for (const op of ops) {
        const r = apply(out, op);
        if (!r.ok) return r;
        out = r.text;
    }
    return verifyPatch(text, out, ops) ? { ok: true, text: out } : { ok: false, message: INTEGRITY };
}

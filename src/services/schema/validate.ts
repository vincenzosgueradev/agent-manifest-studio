/**
 * A JSON schema validator for the manifest schemas of Microsoft Teams (feature 008). It implements the draft-04 keywords
 * that those schemas use, plus `const` and `if/then`, and nothing else: a schema that uses another keyword, or a `$ref`
 * that is not a local definition, is reported in `unsupported` instead of being ignored. Every problem is written in plain
 * English, with the path of the value, what was expected, what was found, and the description the schema gives.
 */

export interface Problem {
    /** Dotted path with indexes: `developer.websiteUrl`, `bots[0].scopes[1]`; the root is `(manifest)`. */
    path: string;
    keyword: string;
    message: string;
    expected: string;
    found: string;
    /** What the schema says about the entry, or `null`. */
    description: string | null;
    /** `Did you mean "x"?` for an unknown entry that is close to a known one. */
    suggestion: string | null;
    /** The problem comes from inside `oneOf`, `anyOf`, `not`, `if` or `then`. */
    inCombinator: boolean;
}

export interface ValidateResult {
    problems: Problem[];
    /** The values of the data that were compared with a schema entry (not counting those inside a `oneOf` or `anyOf`). */
    checked: number;
    unsupported: string[];
}

type Node = Record<string, unknown>;

/** The keywords that validate. */
const VALIDATING = new Set([
    'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'pattern', 'format', 'minLength', 'maxLength',
    'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'oneOf', 'anyOf', 'not', 'if', 'then', 'dependencies', '$ref',
]);
/** The keywords that only describe, or hold definitions. */
const ANNOTATIONS = new Set(['description', 'default', 'title', '$schema', 'definitions']);

const isNode = (v: unknown): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);

const MAP_KEYWORDS = new Set(['properties', 'definitions']);
const LIST_KEYWORDS = new Set(['oneOf', 'anyOf']);
const SINGLE_KEYWORDS = new Set(['items', 'not', 'if', 'then', 'additionalProperties']);

/** The node that a local reference (`#/definitions/x`, `#/properties/a/items`) points to, or `null`. */
function pointTo(root: Node, ref: string): Node | null {
    if (!ref.startsWith('#/')) return null;
    let cur: unknown = root;
    for (const raw of ref.slice(2).split('/')) {
        const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
        if (Array.isArray(cur)) cur = cur[Number(key)];
        else if (isNode(cur)) cur = cur[key];
        else return null;
    }
    return isNode(cur) ? cur : null;
}

/** Every keyword of the schema that the validator does not implement, and every `$ref` it cannot follow, once each. */
export function unsupportedIn(schema: unknown): string[] {
    const found = new Set<string>();
    const root = isNode(schema) ? schema : {};
    const visit = (node: unknown): void => {
        if (!isNode(node)) return;
        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith('x-')) continue;
            if (!VALIDATING.has(key) && !ANNOTATIONS.has(key)) { found.add(key); continue; }
            if (key === '$ref') {
                if (pointTo(root, String(value)) === null) found.add(`$ref ${String(value)}`);
            } else if (MAP_KEYWORDS.has(key) && isNode(value)) {
                for (const child of Object.values(value)) visit(child);
            } else if (LIST_KEYWORDS.has(key) && Array.isArray(value)) {
                for (const child of value) visit(child);
            } else if (key === 'items' && Array.isArray(value)) {
                found.add('items (a list of schemas)');
            } else if (SINGLE_KEYWORDS.has(key)) {
                visit(value);
            } else if (key === 'dependencies' && isNode(value)) {
                for (const child of Object.values(value)) if (!Array.isArray(child)) visit(child);
            }
        }
    };
    visit(schema);
    return [...found];
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const typeOf = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

const article = (word: string): string => (/^[aeiou]/.test(word) ? 'an' : 'a');

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

function show(value: unknown): string {
    const text = JSON.stringify(value) ?? String(value);
    return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/** JSON equality of two parsed values, independent of the order of the keys of an object. */
function same(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
    if (isNode(a) && isNode(b)) {
        const ka = Object.keys(a), kb = Object.keys(b);
        return ka.length === kb.length && ka.every(k => k in b && same(a[k], b[k]));
    }
    return false;
}

function distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        let prev = row[0]!;
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const keep = row[j]!;
            row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = keep;
        }
    }
    return row[b.length]!;
}

/** The known entry that an unknown one most likely meant: within two edits, in any case, the closest first. */
function closest(key: string, known: string[]): string | null {
    let best: { name: string; d: number } | null = null;
    for (const name of known) {
        const d = distance(key.toLowerCase(), name.toLowerCase());
        if (d <= 2 && (best === null || d < best.d)) best = { name, d };
    }
    return best ? best.name : null;
}

const child = (path: string, key: string): string => (path === '(manifest)' ? key : `${path}.${key}`);
const index = (path: string, i: number): string => (path === '(manifest)' ? `[${i}]` : `${path}[${i}]`);

const LOOSE_URI = /^[A-Za-z][A-Za-z0-9+.-]*:.+/;

// ── The validator ─────────────────────────────────────────────────────────────

export function validate(data: unknown, schema: object): ValidateResult {
    const root = schema as Node;
    const unsupported = new Set(unsupportedIn(root));
    let checked = 0;

    const resolve = (ref: string): Node | null => pointTo(root, ref);

    function run(value: unknown, node: Node, path: string, inComb: boolean, inherited?: string): Problem[] {
        if (!inComb) checked++;
        const out: Problem[] = [];
        const own = typeof node.description === 'string' ? node.description : null;
        const description = inherited ?? own;
        const add = (keyword: string, message: string, expected: string, found: string, at = path, suggestion: string | null = null, desc: string | null = description): void => {
            out.push({ path: at, keyword, message, expected, found, description: desc, suggestion, inCombinator: inComb });
        };

        if (typeof node.$ref === 'string') {
            const target = resolve(node.$ref);
            if (target) {
                out.push(...run(value, target, path, inComb, own ?? inherited));
                if (!inComb) checked--;   // the node and its target are one value
            }
        }

        const type = typeOf(value);
        const isNumber = type === 'number';

        if (node.type !== undefined) {
            const allowed = (Array.isArray(node.type) ? node.type : [node.type]) as string[];
            const ok = allowed.some(t => t === type || (t === 'integer' && isNumber && Number.isInteger(value)));
            if (!ok) {
                const found = type;
                const list = allowed.join(' or ');
                add('type', allowed.length === 1 ? `Must be ${article(allowed[0]!)} ${allowed[0]}, not ${article(found)} ${found}.` : `Must be ${list}, not ${article(found)} ${found}.`, list, found);
            }
        }
        if (Array.isArray(node.enum) && !node.enum.some(v => same(v, value))) {
            add('enum', 'Must be one of the allowed values.', node.enum.map(v => (typeof v === 'string' ? v : show(v))).join(', '), show(value));
        }
        if ('const' in node && !same(node.const, value)) {
            add('const', `Must be exactly ${show(node.const)}.`, show(node.const), show(value));
        }

        if (typeof value === 'string') {
            const length = [...value].length;
            if (typeof node.pattern === 'string' && !new RegExp(node.pattern).test(value)) {
                add('pattern', 'Does not have the required form.', `the pattern /${node.pattern}/`, show(value));
            }
            if (node.format === 'uri' && !LOOSE_URI.test(value)) {
                add('format', 'Must be a web address (a URL).', 'a URL such as https://example.com', show(value));
            }
            if (typeof node.maxLength === 'number' && length > node.maxLength) {
                add('maxLength', `Is ${plural(length, 'character', 'characters')} long; the limit is ${node.maxLength}.`, `at most ${node.maxLength} characters`, plural(length, 'character', 'characters'));
            }
            if (typeof node.minLength === 'number' && length < node.minLength) {
                add('minLength', `Is ${plural(length, 'character', 'characters')} long; at least ${node.minLength} are needed.`, `at least ${node.minLength} characters`, plural(length, 'character', 'characters'));
            }
        }

        if (isNumber) {
            const n = value as number;
            if (typeof node.maximum === 'number' && n > node.maximum) add('maximum', `Is ${n}; the largest allowed is ${node.maximum}.`, `at most ${node.maximum}`, String(n));
            if (typeof node.minimum === 'number' && n < node.minimum) add('minimum', `Is ${n}; the smallest allowed is ${node.minimum}.`, `at least ${node.minimum}`, String(n));
        }

        if (Array.isArray(value)) {
            if (typeof node.maxItems === 'number' && value.length > node.maxItems) {
                add('maxItems', `Has ${plural(value.length, 'item', 'items')}; at most ${node.maxItems} are allowed.`, `at most ${node.maxItems} items`, plural(value.length, 'item', 'items'));
            }
            if (typeof node.minItems === 'number' && value.length < node.minItems) {
                add('minItems', `Has ${plural(value.length, 'item', 'items')}; at least ${node.minItems} are needed.`, `at least ${node.minItems} items`, plural(value.length, 'item', 'items'));
            }
            if (node.uniqueItems === true && value.some((x, i) => value.findIndex(y => same(x, y)) !== i)) {
                add('uniqueItems', 'The same item appears more than once.', 'different items', 'a repeated item');
            }
            if (isNode(node.items)) value.forEach((item, i) => out.push(...run(item, node.items as Node, index(path, i), inComb)));
        }

        if (isNode(value)) {
            const keys = Object.keys(value);
            const props = isNode(node.properties) ? node.properties : {};
            if (Array.isArray(node.required)) {
                for (const key of node.required as string[]) {
                    if (!(key in value)) {
                        const spec = props[key];
                        add('required', `Missing the required entry "${key}".`, `an entry "${key}"`, 'not there', child(path, key), null, isNode(spec) ? describe(spec) : null);
                    }
                }
            }
            if (typeof node.minProperties === 'number' && keys.length < node.minProperties) {
                add('minProperties', `Needs at least ${plural(node.minProperties, 'entry', 'entries')}.`, `at least ${plural(node.minProperties, 'entry', 'entries')}`, plural(keys.length, 'entry', 'entries'));
            }
            for (const key of keys) {
                const spec = props[key];
                if (isNode(spec)) out.push(...run(value[key], spec, child(path, key), inComb));
                else if (node.additionalProperties === false) {
                    const known = Object.keys(props).sort();
                    const near = closest(key, known);
                    add('additionalProperties', `"${key}" is not an entry of this schema here.`, `one of: ${known.join(', ')}`, `"${key}"`, child(path, key), near === null ? null : `Did you mean "${near}"?`);
                } else if (isNode(node.additionalProperties)) {
                    out.push(...run(value[key], node.additionalProperties, child(path, key), inComb));
                }
            }
            if (isNode(node.dependencies)) {
                for (const [key, dep] of Object.entries(node.dependencies)) {
                    if (!(key in value)) continue;
                    if (Array.isArray(dep)) {
                        for (const need of dep as string[]) {
                            if (!(need in value)) add('dependencies', `"${key}" needs "${need}" to be present too.`, `an entry "${need}"`, 'not there', child(path, need));
                        }
                    } else if (isNode(dep)) {
                        out.push(...run(value, dep, path, true));
                    }
                }
            }
        }

        if (isNode(node.not) && run(value, node.not, path, true).length === 0) {
            add('not', 'This value is not allowed here.', 'a different value', show(value));
        }
        if (isNode(node.if) && run(value, node.if, path, true).length === 0 && isNode(node.then)) {
            out.push(...run(value, node.then, path, true).map(p => ({ ...p, inCombinator: true })));
        }

        for (const keyword of ['anyOf', 'oneOf'] as const) {
            const branches = node[keyword];
            if (!Array.isArray(branches)) continue;
            const results = branches.map(b => (isNode(b) ? run(value, b, path, true) : []));
            const passing = results.filter(r => r.length === 0).length;
            if (keyword === 'anyOf' ? passing > 0 : passing === 1) continue;
            if (passing > 1) {
                add('oneOf', 'Matches more than one of the allowed shapes; it must match exactly one.', 'exactly one of the allowed shapes', 'several');
                continue;
            }
            const summary = `Does not match any of the ${branches.length} allowed shapes.`;
            const compatible = branches.map((b, i) => ({ i, types: typesOf(b) })).filter(x => x.types === null || x.types.includes(type) || (isNumber && Number.isInteger(value) && x.types.includes('integer')));
            if (compatible.length === 0) {
                const all = [...new Set(branches.flatMap(b => typesOf(b) ?? []))];
                add(keyword, summary, all.join(' or '), type);
                continue;
            }
            add(keyword, summary, 'one of the allowed shapes', type);
            const best = compatible.reduce((a, b) => (results[b.i]!.length < results[a.i]!.length ? b : a));
            out.push(...results[best.i]!);
        }
        return out;
    }

    /** The description of an entry: its own, else the one of its `$ref` target. */
    function describe(spec: Node): string | null {
        if (typeof spec.description === 'string') return spec.description;
        const target = typeof spec.$ref === 'string' ? resolve(spec.$ref) : null;
        return target && typeof target.description === 'string' ? target.description : null;
    }

    /** The types a branch accepts, or `null` when it does not say. */
    function typesOf(branch: unknown): string[] | null {
        if (!isNode(branch)) return null;
        if (branch.type !== undefined) return (Array.isArray(branch.type) ? branch.type : [branch.type]) as string[];
        if (typeof branch.$ref === 'string') { const t = resolve(branch.$ref); return t ? typesOf(t) : null; }
        return null;
    }

    const problems = run(data, root, '(manifest)', false);
    return { problems, checked, unsupported: [...unsupported] };
}

/**
 * Feature 008: the validator against an independent one. `ajv` (a development dependency, never in src/) is the oracle:
 * for every bundled schema and every mutation of a manifest, the tool and `ajv` must agree on valid or invalid and on the
 * places that are blamed for the leaf keywords. The mutations are made here, from the spec, with no code of src/.
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { SCHEMAS } from '../src/schemas';
import { unsupportedIn, validate } from '../src/services/schema/validate';

const VERSIONS = [...Array.from({ length: 8 }, (_, i) => `1.${10 + i}`), ...Array.from({ length: 12 }, (_, i) => `1.${19 + i}`)];
const FULL = process.env.TEST_FULL === '1';
const GUID = '11111111-2222-3333-4444-555555555555';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const baseManifest = (version: string): Record<string, Json> => ({
    manifestVersion: version,
    version: '1.0.0',
    id: GUID,
    developer: { name: 'Contoso', websiteUrl: 'https://example.com', privacyUrl: 'https://example.com/privacy', termsOfUseUrl: 'https://example.com/terms' },
    name: { short: 'Sales Helper', full: 'Sales Helper for the field team' },
    description: { short: 'Answers sales questions', full: 'Answers sales questions for the field team.' },
    icons: { color: 'color.png', outline: 'outline.png' },
    accentColor: '#FFFFFF',
});

const FRAGMENTS: Array<Record<string, Json>> = [
    { bots: [{ botId: GUID, scopes: ['personal', 'team'], supportsFiles: false, isNotificationOnly: false }] },
    { staticTabs: [{ entityId: 'a', name: 'Tab', contentUrl: 'https://example.com', scopes: ['personal'] }] },
    { configurableTabs: [{ configurationUrl: 'https://example.com', scopes: ['team'], canUpdateConfiguration: true }] },
    { composeExtensions: [{ botId: GUID, commands: [{ id: 'c', title: 'T', type: 'query', context: ['compose'], parameters: [{ name: 'p', title: 'P' }] }] }] },
    { permissions: ['identity', 'messageTeamMembers'], validDomains: ['example.com'], devicePermissions: ['media'] },
    { webApplicationInfo: { id: GUID, resource: `api://example.com/${GUID}` } },
    { localizationInfo: { defaultLanguageTag: 'en-us', additionalLanguages: [{ languageTag: 'it-it', file: 'it.json' }] } },
    { copilotAgents: { declarativeAgents: [{ id: 'agent', file: 'agent.json' }] } },
    { supportedChannelTypes: ['sharedChannels'], defaultInstallScope: 'personal', defaultGroupCapability: { team: 'tab' } },
    { activities: { activityTypes: [{ type: 't', description: 'd', templateText: 'x' }] } },
    { authorization: { permissions: { resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }] } } },
    { extensions: [{ requirements: { scopes: ['mail'] }, runtimes: [{ requirements: { capabilities: [{ name: 'Mailbox', minVersion: '1.1' }] }, id: 'r', type: 'general', code: { page: 'https://example.com/x.html' }, lifetime: 'short', actions: [{ id: 'a', type: 'executeFunction', displayName: 'A' }] }] }] },
    { meetingExtensionDefinition: { scenes: [{ id: GUID, name: 'Scene', file: 's.json', preview: 's.png', maxAudience: 10, seatsReservedForOrganizersOrPresenters: 1 }] } },
];

const POOL: Json[] = [
    null, true, false, 0, 1, -1, 1.5, 300, '', 'x', 'x'.repeat(40), 'x'.repeat(300), 'x'.repeat(5000), 'https://example.com', 'nope',
    '#FFFFFF', '#GGGGGG', GUID, 'not-a-guid', [], [1], ['a', 'a'], {}, { a: 1 }, ['personal'], ['personal', 'personal'], ['bogus'], '1.0.0', '1.0', 'a'.repeat(129),
];

function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const clone = <T extends Json>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Every path of a value, as arrays of keys and indexes, objects and arrays included. */
function paths(v: Json, at: Array<string | number> = [], out: Array<Array<string | number>> = []): Array<Array<string | number>> {
    out.push(at);
    if (Array.isArray(v)) v.forEach((x, i) => paths(x, [...at, i], out));
    else if (v !== null && typeof v === 'object') for (const k of Object.keys(v)) paths(v[k]!, [...at, k], out);
    return out;
}

function get(root: Json, at: Array<string | number>): Json | undefined {
    let cur: Json | undefined = root;
    for (const k of at) { if (cur === null || typeof cur !== 'object') return undefined; cur = (cur as Record<string, Json>)[k as string]; }
    return cur;
}

function mutate(base: Record<string, Json>, random: () => number): Record<string, Json> {
    const out = clone(base);
    const pick = <T>(xs: T[]): T => xs[Math.floor(random() * xs.length)]!;
    const steps = 1 + Math.floor(random() * 3);
    for (let s = 0; s < steps; s++) {
        const target = pick(paths(out).filter(p => p.length > 0));
        const parent = get(out, target.slice(0, -1)) as Record<string, Json> | Json[];
        const key = target[target.length - 1]!;
        const op = Math.floor(random() * 6);
        if (op <= 2) (parent as Record<string, Json>)[key as string] = clone(pick(POOL));
        else if (op === 3) { if (Array.isArray(parent)) parent.splice(key as number, 1); else delete (parent as Record<string, Json>)[key as string]; }
        else if (op === 4) { const here = get(out, target); if (here !== null && typeof here === 'object' && !Array.isArray(here)) here[`zz${Math.floor(random() * 3)}`] = 1; else if (Array.isArray(here)) here.push(clone(pick(POOL))); }
        else { const here = get(out, target); if (Array.isArray(here) && here.length > 0) here.push(clone(here[0]!)); else (parent as Record<string, Json>)[key as string] = clone(pick(POOL)); }
    }
    return out;
}

// ── The oracle ────────────────────────────────────────────────────────────────

const ajv = new Ajv({ allErrors: true, strict: false, unicodeRegExp: false });
addFormats(ajv);
const compiled = new Map<string, ReturnType<typeof ajv.compile>>();
function oracleFor(version: string) {
    let fn = compiled.get(version);
    if (!fn) {
        const schema = { ...(SCHEMAS[version] as Record<string, unknown>) };
        delete schema.$schema;
        fn = ajv.compile(schema);
        compiled.set(version, fn);
    }
    return fn;
}

const LEAF = new Set(['required', 'additionalProperties', 'type', 'enum', 'const', 'pattern', 'format', 'maxLength', 'minLength', 'maximum', 'minimum', 'maxItems', 'minItems', 'uniqueItems', 'minProperties']);
const COMBINED = /\/(anyOf|oneOf|not|if|then|dependencies)\//;

function dotted(data: Json, pointer: string): string {
    let path = '(manifest)';
    let cur: Json | undefined = data;
    for (const raw of pointer.split('/').slice(1)) {
        const seg = raw.replace(/~1/g, '/').replace(/~0/g, '~');
        if (Array.isArray(cur)) { path = path === '(manifest)' ? `[${seg}]` : `${path}[${seg}]`; cur = cur[Number(seg)]; }
        else { path = path === '(manifest)' ? seg : `${path}.${seg}`; cur = (cur as Record<string, Json> | undefined)?.[seg]; }
    }
    return path;
}

function oracle(version: string, data: Json): { valid: boolean; leaves: Set<string> } {
    const run = oracleFor(version);
    const valid = run(data) as boolean;
    const leaves = new Set<string>();
    for (const e of run.errors ?? []) {
        if (!LEAF.has(e.keyword) || COMBINED.test(`/${e.schemaPath.replace(/^#/, '')}/`)) continue;
        let path = dotted(data, e.instancePath);
        if (e.keyword === 'required') path = path === '(manifest)' ? String(e.params.missingProperty) : `${path}.${String(e.params.missingProperty)}`;
        if (e.keyword === 'additionalProperties') path = path === '(manifest)' ? String(e.params.additionalProperty) : `${path}.${String(e.params.additionalProperty)}`;
        leaves.add(`${path}|${e.keyword}`);
    }
    return { valid, leaves };
}

function ours(version: string, data: Json): { valid: boolean; leaves: Set<string> } {
    const r = validate(data, SCHEMAS[version]!);
    return { valid: r.problems.length === 0, leaves: new Set(r.problems.filter(p => !p.inCombinator && LEAF.has(p.keyword)).map(p => `${p.path}|${p.keyword}`)) };
}

function agree(version: string, data: Json, label: string): void {
    const a = ours(version, data);
    const b = oracle(version, data);
    expect(a.valid, `${version} ${label}: valid`).toBe(b.valid);
    expect([...a.leaves].sort(), `${version} ${label}: blamed`).toEqual([...b.leaves].sort());
}

// ── The bundle ────────────────────────────────────────────────────────────────

describe('the bundled schemas', () => {
    it('are the versions that Microsoft publishes: 1.10 to 1.17 and 1.19 to 1.30, and no 1.18', () => {
        expect(Object.keys(SCHEMAS).sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]))).toEqual(VERSIONS);
        expect(Object.keys(SCHEMAS)).not.toContain('1.18');
    });

    it.each(VERSIONS)('%s names its own version, its source and the day it was read, and uses only keywords the validator implements', version => {
        const schema = SCHEMAS[version] as Record<string, unknown> & { properties: { manifestVersion: { const: string } } };
        expect(schema.properties.manifestVersion.const).toBe(version);
        expect(schema['x-source']).toBe(`https://developer.microsoft.com/en-us/json-schemas/teams/v${version}/MicrosoftTeams.schema.json`);
        expect(schema['x-read']).toBe('2026-10-28');
        expect(unsupportedIn(schema)).toEqual([]);
    });

    it.each(VERSIONS)('%s: the base manifest is valid for both validators', version => {
        const base = baseManifest(version);
        expect(oracle(version, base).valid, 'the oracle').toBe(true);
        const r = validate(base, SCHEMAS[version]!);
        expect(r.problems).toEqual([]);
        expect(r.unsupported).toEqual([]);
        expect(r.checked).toBeGreaterThan(15);
    });
});

describe('the tool and ajv agree', () => {
    it.each(VERSIONS)('%s: the base, every entry removed, every entry replaced by every value, every entry given an unknown neighbour', version => {
        const base = baseManifest(version);
        agree(version, base, 'base');
        for (const key of Object.keys(base)) {
            const gone = clone(base); delete gone[key];
            agree(version, gone, `without ${key}`);
            for (const value of POOL) {
                const changed = clone(base); changed[key] = clone(value);
                agree(version, changed, `${key} = ${JSON.stringify(value).slice(0, 30)}`);
            }
            const holder = base[key];
            if (holder !== null && typeof holder === 'object' && !Array.isArray(holder)) {
                const extra = clone(base); (extra[key] as Record<string, Json>).unknownEntry = 1;
                agree(version, extra, `${key} with an unknown entry`);
                for (const inner of Object.keys(holder)) {
                    const less = clone(base); delete (less[key] as Record<string, Json>)[inner];
                    agree(version, less, `without ${key}.${inner}`);
                    for (const value of POOL) {
                        const changed = clone(base); (changed[key] as Record<string, Json>)[inner] = clone(value);
                        agree(version, changed, `${key}.${inner} = ${JSON.stringify(value).slice(0, 30)}`);
                    }
                }
            }
        }
        agree(version, { ...base, unknownEntry: 1 }, 'an unknown top-level entry');
    });

    it.each(VERSIONS)('%s: every fragment of a bigger manifest, plain and mutated', version => {
        const random = rng(Number(version.split('.')[1]) * 7919);
        for (const [i, fragment] of FRAGMENTS.entries()) {
            const whole: Record<string, Json> = { ...baseManifest(version), ...clone(fragment) };
            agree(version, whole, `fragment ${i}`);
            for (let n = 0; n < (FULL ? 400 : 40); n++) agree(version, mutate(whole, random), `fragment ${i} mutation ${n}`);
        }
    });

    it.each(VERSIONS)('%s: random mutations of the base', version => {
        const random = rng(Number(version.split('.')[1]) * 104729);
        const base = baseManifest(version);
        for (let n = 0; n < (FULL ? 4000 : 200); n++) agree(version, mutate(base, random), `random ${n}`);
    });
});

/**
 * The manifest against the JSON schema of its own `manifestVersion` (feature 008). The schemas are bundled data, generated
 * by scripts/gen-schemas.mjs: nothing is read from the network. A version with no bundled schema is not validated, and
 * the report says so instead of guessing.
 */

import { SCHEMAS } from '../../schemas';
import type { Check } from '../../types';
import { validate, type Problem } from './validate';
import { plural } from '../plural';

export type { Problem } from './validate';

const order = (a: string, b: string): number => { const [a1, a2] = a.split('.').map(Number); const [b1, b2] = b.split('.').map(Number); return a1! - b1! || a2! - b2!; };

/** The versions that have a bundled schema, oldest first. */
export const BUNDLED: readonly string[] = Object.keys(SCHEMAS).sort(order);

/** Said for the card and the notes: the bundled versions as ranges (1.18 was never published). */
export const BUNDLED_TEXT = '1.10 to 1.17 and 1.19 to 1.30';

const LATEST = BUNDLED[BUNDLED.length - 1]!;

export const schemaUrl = (version: string): string => `https://developer.microsoft.com/en-us/json-schemas/teams/v${version}/MicrosoftTeams.schema.json`;

export interface SchemaReport {
    state: 'valid' | 'invalid' | 'no-schema';
    /** The version of the schema that was used; `null` when none was. */
    version: string | null;
    url: string | null;
    problems: Problem[];
    /** How many values of the manifest were compared with the schema. */
    checked: number;
    notes: string[];
}

const NONE = (notes: string[]): SchemaReport => ({ state: 'no-schema', version: null, url: null, problems: [], checked: 0, notes });

/** The text of `manifest.json` (a byte order mark is allowed) against the schema of its `manifestVersion`. */
export function validateManifestText(text: string): SchemaReport {
    let data: unknown;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { return NONE(['The manifest is not valid JSON, so it was not validated.']); }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return NONE(['The manifest is not a JSON object, so it was not validated.']);

    const notes: string[] = [];
    const declared = (data as Record<string, unknown>).manifestVersion;
    let version: string;
    if (declared === undefined) {
        version = LATEST;
        notes.push(`The manifest does not say its manifestVersion, so it was checked against the newest schema that the tool has (v${LATEST}).`);
    } else if (typeof declared === 'string' && declared in SCHEMAS) {
        version = declared;
    } else {
        const shown = typeof declared === 'string' ? `"${declared}"` : JSON.stringify(declared);
        notes.push(`The manifestVersion ${shown} has no schema in this tool, so the manifest was not validated. The tool has the schemas ${BUNDLED_TEXT}.`);
        if (declared === '1.18') notes.push('Microsoft does not publish a schema 1.18.');
        return NONE(notes);
    }

    const pointed = typeof (data as Record<string, unknown>).$schema === 'string' ? /\/teams\/v(\d+\.\d+)\/MicrosoftTeams\.schema\.json/.exec((data as Record<string, string>).$schema) : null;
    if (pointed && pointed[1] !== version) notes.push(`$schema points to v${pointed[1]} but manifestVersion is ${version}; the manifest was checked against v${version}.`);

    const result = validate(data, SCHEMAS[version]!);
    if (result.unsupported.length > 0) return NONE([...notes, `The schema v${version} uses ${result.unsupported.join(', ')}, which this tool cannot check, so the manifest was not validated.`]);
    return { state: result.problems.length === 0 ? 'valid' : 'invalid', version, url: schemaUrl(version), problems: result.problems, checked: result.checked, notes };
}

/** The one row of the automatic checks that stands for the whole schema: a warning at most, it never stops the save. */
export function schemaCheck(r: SchemaReport): Check {
    const found = r.state === 'valid' ? `follows v${r.version}, ${r.checked} entries compared`
        : r.state === 'invalid' ? `${plural(r.problems.length, 'problem', 'problems')} against v${r.version}`
            : 'not validated: the tool has no schema for this manifestVersion';
    return {
        id: 'schema.valid', label: 'Manifest follows its JSON schema', verdict: r.state === 'valid' ? 'pass' : 'warning', found,
        expected: 'no problem against the schema of its manifestVersion',
        notProven: 'Does not prove that Teams accepts the package: Teams also checks the icons, the domains and its store rules.',
    };
}

/** The problems as plain text, one block each, to paste into a message or an issue. */
export function problemsText(r: SchemaReport): string {
    return r.problems.map(p => [`${p.path}: ${p.message}`, `  Expected: ${p.expected}`, `  Found: ${p.found}`, p.suggestion ? `  ${p.suggestion}` : null, p.description ? `  Schema says: ${p.description}` : null].filter(Boolean).join('\n')).join('\n\n');
}

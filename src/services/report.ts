/**
 * The checks report: what the tool found, as data a person or a script can keep (constitution VI:
 * structured output where it is useful). No date and no machine information: the same package gives
 * the same report. It holds what is in the package (names, ids) because that is what was checked, so
 * it is a file for the user, never something the tool sends.
 */

import type { Check, ManifestView } from '../types';
import type { SchemaReport } from './schema';

export interface Report {
    tool: string;
    version: string;
    package: string;
    app: { id: string | null; version: string | null; shortName: string; fullName: string };
    summary: { pass: number; warning: number; fail: number };
    /** Manifest values the user edited (only present when something was edited). */
    edited?: string[];
    /** The manifest against its JSON schema (feature 008); absent when the report was made without it. */
    schema?: Pick<SchemaReport, 'state' | 'version' | 'url' | 'checked' | 'notes'> & { problems: Array<{ path: string; keyword: string; message: string; expected: string; found: string; description: string | null; suggestion: string | null }> };
    checks: Array<Pick<Check, 'id' | 'label' | 'verdict' | 'found' | 'expected' | 'notProven'>>;
}

export function buildReport(fileName: string, manifest: ManifestView, checks: Check[], version: string, edited: string[] = [], schema?: SchemaReport): Report {
    const count = (v: Check['verdict']) => checks.filter(c => c.verdict === v).length;
    return {
        tool: 'Agent Manifest Studio',
        version,
        package: fileName,
        app: { id: manifest.appId, version: manifest.appVersion, shortName: manifest.nameShort.raw, fullName: manifest.nameFull.raw },
        summary: { pass: count('pass'), warning: count('warning'), fail: count('fail') },
        ...(edited.length > 0 ? { edited } : {}),
        ...(schema ? { schema: { state: schema.state, version: schema.version, url: schema.url, checked: schema.checked, notes: schema.notes, problems: schema.problems.map(({ path, keyword, message, expected, found, description, suggestion }) => ({ path, keyword, message, expected, found, description, suggestion })) } } : {}),
        checks: checks.map(({ id, label, verdict, found, expected, notProven }) => ({ id, label, verdict, found, expected, notProven })),
    };
}

export const reportText = (r: Report): string => `${JSON.stringify(r, null, 2)}\n`;

/** `Sales.zip` gives `Sales-checks.json`. */
export function reportFileName(packageName: string): string {
    return `${packageName.replace(/\.zip$/i, '')}-checks.json`;
}

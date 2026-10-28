/**
 * The environment suffix of a name (FR-018, FR-019).
 *
 * Recognised suffix: ONE final group in square brackets, optionally preceded by one space, of 1 to
 * 20 characters without square brackets (`[DEV]`, `[UAT]`, `[Test 2]`). Anything else - `(DEV)`,
 * `- DEV`, two groups, a trailing space after the bracket - is not a suffix: the name has none.
 */

import { SUFFIX_MAX } from './limits';
import type { NameValue } from '../types';

const SUFFIX_RE = new RegExp(`^(.*?)( ?)\\[([^\\[\\]]{1,${SUFFIX_MAX}})\\]$`, 's');
const KEY_RE = /^\[\[.*\]\]$/s;

export interface NameParts {
    base: string;
    separator: string;
    suffix: string;
    hasBrackets: boolean;
}

export function splitName(raw: string): NameParts {
    const m = SUFFIX_RE.exec(raw);
    if (!m) return { base: raw, separator: '', suffix: '', hasBrackets: false };
    return { base: m[1]!, separator: m[2]!, suffix: m[3]!, hasBrackets: true };
}

/** A name as the manifest holds it; `null` stands for an absent or unusable value. */
export function makeName(raw: string | null): NameValue {
    if (raw === null) return { raw: '', kind: 'missing', base: '', suffix: '', separator: '', hasBrackets: false };
    if (KEY_RE.test(raw)) return { raw, kind: 'localisationKey', base: raw, suffix: '', separator: '', hasBrackets: false };
    return { raw, kind: 'literal', ...splitName(raw) };
}

/**
 * The name with `suffix` in place of the recognised one. An empty suffix gives the base alone; a
 * name that had no suffix gets ` [suffix]` appended (no leading space when the base is empty).
 */
export function composeName(parts: NameParts, suffix: string): string {
    if (suffix === '') return parts.base;
    if (parts.hasBrackets) return `${parts.base}${parts.separator}[${suffix}]`;
    return parts.base === '' ? `[${suffix}]` : `${parts.base} [${suffix}]`;
}

export type SuffixCheck = { ok: true; value: string } | { ok: false; message: string };

/** What the user types: trimmed, 0 to 20 characters, no square brackets, no control characters. */
export function validateSuffix(input: string): SuffixCheck {
    const value = input.trim();
    if ([...value].length > SUFFIX_MAX) return { ok: false, message: `The suffix can have at most ${SUFFIX_MAX} characters.` };
    if (/[\[\]]/.test(value)) return { ok: false, message: 'Type the suffix without square brackets: they are added for you.' };
    if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false, message: 'The suffix cannot contain control characters.' };
    return { ok: true, value };
}

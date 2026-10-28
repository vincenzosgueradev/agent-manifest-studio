/**
 * Changing the suffix of the two names (FR-018, FR-023).
 *
 * The manifest is edited AS TEXT: only the two string literals of `name.short` and `name.full`
 * are replaced, so spacing, key order, line endings, the byte-order mark and every entry the tool
 * does not know stay exactly as they were. Re-serializing the parsed object would lose that.
 *
 * Safety net: after the replacement the new text is parsed and compared with the old parse; the
 * only differences allowed are the two new values. If the comparison fails nothing is produced.
 */

import { locateNames, parseManifest, stripBom, type LocateResult, type Span } from './manifest';
import { composeName } from './suffix';

export type RenameResult =
    | { ok: true; text: string; short: string | null; full: string | null }
    | { ok: false; code: 'duplicate-name-key' | 'not-json' | 'integrity'; message: string };

const integrity = (): RenameResult => ({
    ok: false,
    code: 'integrity',
    message: 'The change could not be applied safely: the result would differ from the original in more than the two names. Nothing was produced.',
});

/** `locate` can be replaced in tests to prove that the safety net catches a wrong position. */
export function applySuffix(text: string, suffix: string, locate: (t: string) => LocateResult = locateNames): RenameResult {
    const parsed = parseManifest(text);
    if (!parsed.ok) return { ok: false, code: 'not-json', message: parsed.message };
    const { nameShort, nameFull } = parsed.manifest;

    // Only literal names change: a localisation key or a missing name is left as it is.
    const short = nameShort.kind === 'literal' ? composeName(nameShort, suffix) : null;
    const full = nameFull.kind === 'literal' ? composeName(nameFull, suffix) : null;

    const spans = locate(text);
    if (!spans.ok) return spans;

    const edits: Array<{ span: Span; value: string }> = [];
    if (short !== null && short !== nameShort.raw) {
        if (!spans.short) return integrity();
        edits.push({ span: spans.short, value: short });
    }
    if (full !== null && full !== nameFull.raw) {
        if (!spans.full) return integrity();
        edits.push({ span: spans.full, value: full });
    }

    // From the end to the start, so that earlier positions stay valid.
    let out = text;
    for (const { span, value } of [...edits].sort((a, b) => b.span.start - a.span.start)) {
        out = out.slice(0, span.start) + JSON.stringify(value) + out.slice(span.end);
    }

    // Safety net.
    try {
        const expected = JSON.parse(stripBom(text)) as { name?: { short?: string; full?: string } };
        if (short !== null) expected.name!.short = short;
        if (full !== null) expected.name!.full = full;
        const actual = JSON.parse(stripBom(out));
        if (JSON.stringify(actual) !== JSON.stringify(expected)) return integrity();
    } catch {
        return integrity();
    }
    return { ok: true, text: out, short, full };
}

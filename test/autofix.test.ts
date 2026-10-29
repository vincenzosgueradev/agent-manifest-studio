/**
 * specs/011-automatic-check-fixes: `canAutoFix`, `planFix`, `planFixAll`.
 *
 * Icon fixes are proven against `runChecks` (`src/services/checks.ts`), an oracle this module does
 * not share any pixel logic with (Testing Standard): the fixture pictures are built independently
 * with the test's own PNG encoder, and the assertion is "the check now passes", not a pixel diff.
 * Truncation and the accent-colour choice are deterministic rules written in research.md and are
 * checked directly against hand-computed expectations.
 */
import { describe, expect, it } from 'vitest';
import { canAutoFix, planFix, planFixAll, type FixInput } from '../src/services/autofix';
import { runChecks } from '../src/services/checks';
import { decodePng } from '../src/services/png';
import type { Check, IconInfo, IconSet, ManifestView, NameValue, Verdict } from '../src/types';
import { colorIcon, outlineIcon } from './helpers/fixture';
import { encodePng } from './helpers/png-encoder';

function nameValue(raw: string, kind: NameValue['kind'] = 'literal'): NameValue {
    return { raw, kind, base: raw, suffix: '', separator: '', hasBrackets: false };
}

function manifest(overrides: Partial<ManifestView> = {}): ManifestView {
    return {
        schemaUrl: null, manifestVersion: '1.19', appVersion: '1.0.0', appId: 'x',
        nameShort: nameValue('Sales Helper [DEV]'), nameFull: nameValue('Sales Helper for the field team [DEV]'),
        descriptionShort: 'Answers sales questions', descriptionFull: 'Answers sales questions for the field team.',
        developer: { name: 'Contoso', websiteUrl: null, privacyUrl: null, termsOfUseUrl: null },
        accentColor: '#07687d',
        icons: { color: 'color.png', outline: 'outline.png', color32x32: null },
        botIds: [], permissions: null, validDomains: null, devicePermissions: null,
        missingKeys: [], unknownKeys: [], keys: [],
        ...overrides,
    };
}

function iconInfo(bytes: Uint8Array | null, path: string): IconInfo {
    if (bytes === null) return { path: null, present: false, byteLength: 0, png: null };
    return { path, present: true, byteLength: bytes.length, png: decodePng(bytes) };
}

interface Icons { color: Uint8Array | null; outline: Uint8Array | null }

function fixInput(m: ManifestView, icons: Icons): FixInput {
    return { manifest: m, iconBytes: slot => icons[slot], decoder: null };
}

function checksFor(m: ManifestView, icons: Icons): Check[] {
    const set: IconSet = { color: iconInfo(icons.color, 'color.png'), outline: iconInfo(icons.outline, 'outline.png'), color32x32: null };
    return runChecks(m, set);
}

const verdictOf = (cs: Check[], id: string): Verdict => cs.find(c => c.id === id)!.verdict;

const GOOD: Icons = { color: colorIcon(), outline: outlineIcon() };

/** A colour icon whose glyph fills almost the whole canvas: well outside the central 120 x 120 safe area. */
function badSafeAreaColorIcon(): Uint8Array {
    return encodePng({
        width: 192, height: 192, colorType: 6,
        pixel: (x, y) => (x < 10 || x >= 182 || y < 10 || y >= 182 ? [0, 0, 0, 0] : [255, 255, 255, 255]),
    });
}

describe('canAutoFix', () => {
    it('is true for every icon-group id when it does not pass, false once it passes', () => {
        for (const id of ['color.size-px', 'color.square', 'color.safe-area', 'color.format', 'color.weight', 'outline.size-px', 'outline.white']) {
            expect(canAutoFix({ id, verdict: 'fail', found: 'x' })).toBe(true);
            expect(canAutoFix({ id, verdict: 'warning', found: 'x' })).toBe(true);
            expect(canAutoFix({ id, verdict: 'pass', found: 'x' })).toBe(false);
        }
    });

    it('is false for ids the tool has no fix for', () => {
        for (const id of ['color.present', 'color.png', 'outline.present', 'outline.png', 'color32.present', 'color32.size-px', 'name.distinct', 'schema.valid']) {
            expect(canAutoFix({ id, verdict: 'fail', found: 'x' })).toBe(false);
        }
    });

    it('is true for a too-long name/description, false when it is missing or already short', () => {
        for (const id of ['name.short.length', 'name.full.length', 'description.short.length', 'description.full.length']) {
            expect(canAutoFix({ id, verdict: 'fail', found: '40 characters' })).toBe(true);
            expect(canAutoFix({ id, verdict: 'fail', found: 'missing' })).toBe(false);
            expect(canAutoFix({ id, verdict: 'pass', found: '10 characters' })).toBe(false);
        }
    });

    it('is true for the accent colour ids whenever they do not pass', () => {
        expect(canAutoFix({ id: 'accent.hex', verdict: 'fail', found: 'missing' })).toBe(true);
        expect(canAutoFix({ id: 'color.contrast', verdict: 'warning', found: '1.2 : 1' })).toBe(true);
        expect(canAutoFix({ id: 'accent.hex', verdict: 'pass', found: '#000000' })).toBe(false);
    });
});

describe('planFix: name and description truncation (research.md §3)', () => {
    it('cuts to exactly the limit by Unicode code point, leaving the rest untouched', async () => {
        const text = 'x'.repeat(29) + '\u{1F600}' + 'y'.repeat(10);    // 29 + 1 emoji + 10 = 40 code points, the cut lands right on it
        const m = manifest({ nameShort: nameValue(text) });
        const plan = await planFix('name.short.length', fixInput(m, GOOD));
        expect(plan).not.toBeNull();
        const cut = plan!.fields['name.short']!;
        expect([...cut]).toHaveLength(30);
        expect(cut).toBe([...text].slice(0, 30).join(''));
        expect(plan!.ids).toEqual(['name.short.length']);
    });

    it('returns null when the name is missing', async () => {
        const m = manifest({ nameShort: nameValue('', 'missing') });
        expect(await planFix('name.short.length', fixInput(m, GOOD))).toBeNull();
    });

    it('returns null when the text already fits', async () => {
        expect(await planFix('name.short.length', fixInput(manifest(), GOOD))).toBeNull();
    });

    it('applies the same rule to descriptions', async () => {
        const text = 'z'.repeat(85);
        const m = manifest({ descriptionShort: text });
        const plan = await planFix('description.short.length', fixInput(m, GOOD));
        expect(plan!.fields['description.short']).toBe(text.slice(0, 80));
        expect([...plan!.fields['description.short']!]).toHaveLength(80);
    });
});

describe('planFix: colour icon group (research.md §5)', () => {
    it('resizes, centres and re-encodes the colour icon so it passes size, shape, safe area, format and weight', async () => {
        const bad = badSafeAreaColorIcon();
        const before = checksFor(manifest(), { color: bad, outline: outlineIcon() });
        expect(verdictOf(before, 'color.safe-area')).not.toBe('pass');

        const plan = await planFix('color.safe-area', fixInput(manifest(), { color: bad, outline: outlineIcon() }));
        expect(plan).not.toBeNull();
        expect(plan!.ids).toEqual(['color.size-px', 'color.square', 'color.safe-area', 'color.format', 'color.weight']);
        expect(plan!.fields).toEqual({});

        const after = checksFor(manifest(), { color: plan!.icons.color!, outline: outlineIcon() });
        for (const id of plan!.ids) expect(verdictOf(after, id), id).toBe('pass');
    });

    it('returns null when the colour icon has no readable picture at all', async () => {
        const plan = await planFix('color.safe-area', fixInput(manifest(), { color: new Uint8Array([1, 2, 3]), outline: outlineIcon() }));
        expect(plan).toBeNull();
    });
});

describe('planFix: outline icon group', () => {
    it('rebuilds the outline icon as a white, 32 x 32 shape', async () => {
        const bad = encodePng({
            width: 40, height: 20, colorType: 6,
            pixel: (x, y) => (x >= 5 && x < 35 && y >= 2 && y < 18 ? [10, 120, 200, 255] : [0, 0, 0, 0]),
        });
        const plan = await planFix('outline.white', fixInput(manifest(), { color: colorIcon(), outline: bad }));
        expect(plan).not.toBeNull();
        expect(plan!.ids).toEqual(['outline.size-px', 'outline.white']);

        const after = checksFor(manifest(), { color: colorIcon(), outline: plan!.icons.outline! });
        expect(verdictOf(after, 'outline.size-px')).toBe('pass');
        expect(verdictOf(after, 'outline.white')).toBe('pass');
    });
});

describe('planFix: accent colour (research.md §4)', () => {
    it('picks the colour that contrasts more with the logo', async () => {
        const darkLogo = encodePng({
            width: 192, height: 192, colorType: 6,
            pixel: (x, y) => (x >= 66 && x < 126 && y >= 66 && y < 126 ? [0, 0, 0, 255] : [0, 0, 0, 0]),
        });
        const m = manifest({ accentColor: null });
        const plan = await planFix('accent.hex', fixInput(m, { color: darkLogo, outline: outlineIcon() }));
        expect(plan).not.toBeNull();
        expect(plan!.fields.accentColor).toBe('#ffffff');
        expect(plan!.ids).toEqual(['accent.hex', 'color.contrast']);
    });

    it('falls back to #000000 when the colour icon has no readable picture', async () => {
        const m = manifest({ accentColor: null });
        const plan = await planFix('accent.hex', fixInput(m, { color: null, outline: outlineIcon() }));
        expect(plan!.fields.accentColor).toBe('#000000');
    });

    it('turns color.contrast green too, not only accent.hex', async () => {
        const m = manifest({ accentColor: '#808080' });    // mid-grey: close to most logos
        const before = checksFor(m, GOOD);
        const plan = await planFix('color.contrast', fixInput(m, GOOD));
        expect(plan).not.toBeNull();
        const nextManifest = manifest({ accentColor: plan!.fields.accentColor });
        const after = checksFor(nextManifest, GOOD);
        expect(verdictOf(after, 'accent.hex')).toBe('pass');
        if (before.some(c => c.id === 'color.contrast')) expect(verdictOf(after, 'color.contrast')).toBe('pass');
    });
});

describe('planFixAll (research.md §6, fixed order)', () => {
    it('applies every currently fixable plan, in order, and skips what already passes', async () => {
        const bad = badSafeAreaColorIcon();
        const longName = 'n'.repeat(40);
        const m = manifest({
            nameShort: nameValue(longName),
            accentColor: null,
        });
        const icons: Icons = { color: bad, outline: outlineIcon() };    // outline already passes: skipped
        const checks = checksFor(m, icons);
        const plan = await planFixAll(checks, fixInput(m, icons));
        expect(plan).not.toBeNull();
        expect(plan!.ids).toEqual(['color.size-px', 'color.square', 'color.safe-area', 'color.format', 'color.weight', 'name.short.length', 'accent.hex', 'color.contrast']);
        expect(plan!.fields['name.short']).toBe(longName.slice(0, 30));
        expect(plan!.fields.accentColor).toMatch(/^#[0-9a-f]{6}$/);
        expect(plan!.icons.color).toBeDefined();
        expect(plan!.icons.outline).toBeUndefined();
    });

    it('is a no-op when every fixable check already passes', async () => {
        const checks = checksFor(manifest(), GOOD);
        expect(await planFixAll(checks, fixInput(manifest(), GOOD))).toBeNull();
    });
});

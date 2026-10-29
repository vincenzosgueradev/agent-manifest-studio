/**
 * Feature 009 (sixth amendment): what the history may hold. The table is written by hand from
 * specs/009-image-editor-workspace/spec.md, FR-026 and FR-027.
 */
import { describe, expect, it } from 'vitest';
import { blockOf, blockText, CLASHES, presetBlockText, toolKey, TOOL_NAME } from '../src/services/image/rules';
import type { Op } from '../src/services/image/types';

const op = (kind: Op['kind'], extra: Record<string, unknown> = {}): Op => ({ kind, ...extra }) as unknown as Op;
const KEYS = Object.keys(TOOL_NAME);
const single = (key: string): Op => (key === 'flip:h' ? op('flip', { axis: 'h' }) : key === 'flip:v' ? op('flip', { axis: 'v' }) : op(key as Op['kind']));

describe('toolKey', () => {
    it('is the kind, and for a flip the kind and the direction', () => {
        expect(toolKey(op('trim'))).toBe('trim');
        expect(toolKey(op('flip', { axis: 'h' }))).toBe('flip:h');
        expect(toolKey(op('flip', { axis: 'v' }))).toBe('flip:v');
    });
});

describe('each effect once', () => {
    it('an empty history blocks nothing', () => {
        for (const key of KEYS) expect(blockOf([], key), key).toBeNull();
    });

    it('an effect that is in the history is blocked, with the number of its step', () => {
        for (const key of KEYS) {
            const ops = [op('rotate'), single(key)];
            const here = key === 'rotate' ? 1 : 2;
            expect(blockOf(ops, key), key).toEqual({ why: 'repeat', step: here });
        }
    });

    it('the two flips are two effects', () => {
        const ops = [op('flip', { axis: 'h' })];
        expect(blockOf(ops, 'flip:h')).toEqual({ why: 'repeat', step: 1 });
        expect(blockOf(ops, 'flip:v')).toBeNull();
    });

    it('an effect that is not in the history is free', () => {
        const ops = [op('trim'), op('square'), op('fit')];
        for (const key of ['removeBg', 'crop', 'rotate', 'flip:h', 'flip:v']) expect(blockOf(ops, key), key).toBeNull();
    });
});

describe('effects that do not go together', () => {
    it('the pairs are the outline maker with a solid colour, a tone and a filled background, and a solid colour with a tone', () => {
        expect(CLASHES.map(p => [...p].sort().join('+')).sort()).toEqual(['fill+outline', 'outline+solid', 'outline+tone', 'solid+tone']);
    });

    for (const [a, b] of [['outline', 'solid'], ['outline', 'tone'], ['outline', 'fill'], ['solid', 'tone']] as const) {
        it(`${a} and ${b} block each other, in either order`, () => {
            expect(blockOf([op(a)], b)).toEqual({ why: 'clash', with: a, step: 1 });
            expect(blockOf([op(b)], a)).toEqual({ why: 'clash', with: b, step: 1 });
        });
    }

    it('everything else goes together: no other pair is blocked', () => {
        const pairs = new Set(CLASHES.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
        for (const a of KEYS) for (const b of KEYS) {
            if (a === b) continue;
            const block = blockOf([single(a)], b);
            expect(block !== null, `${a} then ${b}`).toBe(pairs.has(`${a}|${b}`));
        }
    });

    it('the number of the step in the way is the first one that is in the way', () => {
        expect(blockOf([op('trim'), op('solid'), op('rotate'), op('tone')], 'outline')).toEqual({ why: 'clash', with: 'solid', step: 2 });
    });

    it('a repeat is reported before a clash', () => {
        expect(blockOf([op('outline'), op('solid')], 'solid')).toEqual({ why: 'repeat', step: 2 });
    });
});

describe('the sentences', () => {
    it('say which effect, which step and what to do', () => {
        expect(blockText('rotate', { why: 'repeat', step: 3 })).toBe('Rotate is already in the history (step 3). Remove that step to add it again.');
        expect(blockText('solid', { why: 'clash', with: 'outline', step: 2 })).toBe('Solid colour does not go with Outline maker, which is step 2 of the history. Remove that step first.');
        expect(blockText('flip:v', { why: 'repeat', step: 1 })).toContain('Flip top-bottom');
    });

    it('a quick button is blocked by the first of its effects that cannot be added', () => {
        const preset = [op('trim'), op('square'), op('fit')];
        expect(presetBlockText([], preset)).toBeNull();
        expect(presetBlockText([op('rotate')], preset)).toBeNull();
        expect(presetBlockText([op('square')], preset)).toBe('Make square is already in the history (step 1). Remove that step to add it again.');
        expect(presetBlockText([op('trim'), op('fit')], preset)).toContain('Trim is already in the history (step 1)');
        expect(presetBlockText([op('solid')], [op('outline'), op('trim')])).toContain('Outline maker does not go with Solid colour');
    });
});

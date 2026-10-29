/**
 * The standing rule this feature adds (spec FR-009): every parameter `FIELDS` exposes for an operation (the
 * single source of truth the editor's own step controls already read from) must have a matching explanation in
 * the effect guide's `PARAM_HELP`, and `GUIDE_OP` must reach every operation through exactly one guide. A
 * parameter added, renamed or removed in `FIELDS` — today or for any operation added later — fails this test
 * until the guide's documentation is updated to match: that is what keeps the two in sync automatically, rather
 * than by habit.
 */
import { describe, expect, it } from 'vitest';
import { FIELDS } from '../src/view/opFields';
import { GUIDE_OP, GUIDES, PARAM_HELP, type GuideKey } from '../src/view/effectGuide';
import type { OpKind } from '../src/services/image/types';

const OP_KINDS = Object.keys(FIELDS) as OpKind[];

describe('every operation is reachable through exactly one guide', () => {
    it('GUIDE_OP covers every OpKind in FIELDS, once each', () => {
        const mapped = Object.values(GUIDE_OP) as OpKind[];
        expect(new Set(mapped)).toEqual(new Set(OP_KINDS));
        expect(mapped).toHaveLength(OP_KINDS.length);   // no OpKind is mapped twice
    });

    it('every GUIDE_OP target has a guide in GUIDES', () => {
        for (const key of Object.keys(GUIDE_OP) as GuideKey[]) expect(GUIDES[key]).toBeDefined();
    });
});

describe('PARAM_HELP documents exactly the parameters FIELDS declares', () => {
    it.each(OP_KINDS)('%s: every field has an explanation, and PARAM_HELP has no stale extra one', (kind) => {
        const fieldNames = FIELDS[kind].map(f => f.name).sort();
        const helpNames = Object.keys(PARAM_HELP[kind]).sort();
        expect(helpNames).toEqual(fieldNames);
        for (const name of fieldNames) expect(PARAM_HELP[kind][name]!.length).toBeGreaterThan(0);
    });
});

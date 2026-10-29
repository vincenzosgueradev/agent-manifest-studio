/** Feature 010: the sync counters, the base-colour rule and the two picture functions, with no code shared with `src/`. */
import { describe, expect, it } from 'vitest';
import {
    baseColourFor, buildColourFromOutline, initSyncState, markDirect, otherSlot, regenerateOutline,
    resolveSuggestion, suggestionFor, suggestionPending, TEAMS_BLUE, type SyncState,
} from '../src/services/image/sync';
import type { IconSet, IconInfo } from '../src/types';
import type { Picture } from '../src/services/image/types';
import * as O from './helpers/image-oracle';

const pic = (p: O.Pic): Picture => O.fromPic(p);
const RED: [number, number, number, number] = [200, 30, 30, 255];

const okPng = (w: number, h: number): IconInfo['png'] => ({ kind: 'ok', header: { width: w, height: h, bitDepth: 8, colorType: 6, interlace: 0 }, rgba: new Uint8Array(w * h * 4) });
const info = (present: boolean, png: IconInfo['png'] = null): IconInfo => ({ path: present ? 'x.png' : null, present, byteLength: 0, png });
const icons = (color: IconInfo, outline: IconInfo): IconSet => ({ color, outline, color32x32: null });

describe('otherSlot', () => {
    it('is the other one', () => {
        expect(otherSlot('color')).toBe('outline');
        expect(otherSlot('outline')).toBe('color');
    });
});

describe('SyncState counters', () => {
    it('a fresh package has no pending suggestion either way', () => {
        const s = initSyncState();
        expect(suggestionPending(s, 'color')).toBe(false);
        expect(suggestionPending(s, 'outline')).toBe(false);
    });

    it('a direct change to the colour icon makes the outline suggestion pending, not the colour one', () => {
        let s = initSyncState();
        s = markDirect(s, 'color');
        expect(suggestionPending(s, 'outline')).toBe(true);
        expect(suggestionPending(s, 'color')).toBe(false);
    });

    it('resolving (accept or dismiss) clears it until the source changes again', () => {
        let s = markDirect(initSyncState(), 'color');
        s = resolveSuggestion(s, 'outline');
        expect(suggestionPending(s, 'outline')).toBe(false);
        s = markDirect(s, 'color');
        expect(suggestionPending(s, 'outline')).toBe(true);
    });

    it('accepting a suggestion (resolve, never markDirect on the written slot) cannot trigger the opposite one', () => {
        let s = markDirect(initSyncState(), 'color');
        // accepting the outline suggestion: resolve outline, and crucially do NOT markDirect('outline')
        s = resolveSuggestion(s, 'outline');
        expect(suggestionPending(s, 'color')).toBe(false);
        expect(suggestionPending(s, 'outline')).toBe(false);
    });

    it('a direct edit to the slot that was just regenerated behaves like any other direct edit', () => {
        let s: SyncState = resolveSuggestion(markDirect(initSyncState(), 'color'), 'outline');
        s = markDirect(s, 'outline');
        expect(suggestionPending(s, 'color')).toBe(true);
        expect(suggestionPending(s, 'outline')).toBe(false);
    });
});

describe('suggestionFor', () => {
    it('is null on a fresh package', () => {
        const is = icons(info(true, okPng(192, 192)), info(true, okPng(32, 32)));
        expect(suggestionFor(initSyncState(), 'color', is, '#07687d')).toBeNull();
        expect(suggestionFor(initSyncState(), 'outline', is, '#07687d')).toBeNull();
    });

    it('names the outline icon after a direct colour-icon change', () => {
        const s = markDirect(initSyncState(), 'color');
        const is = icons(info(true, okPng(192, 192)), info(true, okPng(32, 32)));
        const sug = suggestionFor(s, 'outline', is, '#07687d');
        expect(sug).toEqual({ slot: 'outline', text: 'The colour icon changed. Regenerate the outline icon to match its shape?', acceptLabel: 'Regenerate' });
    });

    it('names the colour it will use after a direct outline-icon change', () => {
        const s = markDirect(initSyncState(), 'outline');
        const is = icons(info(true, okPng(192, 192)), info(true, okPng(32, 32)));
        const sug = suggestionFor(s, 'color', is, '#07687d');
        expect(sug).toEqual({ slot: 'color', text: 'The outline icon changed. Build a colour icon from its shape, on #07687d?', acceptLabel: 'Build colour icon' });
    });

    it('is null when the source icon is missing or not a readable PNG', () => {
        const s = markDirect(initSyncState(), 'color');
        expect(suggestionFor(s, 'outline', icons(info(false), info(true, okPng(32, 32))), null)).toBeNull();
        expect(suggestionFor(s, 'outline', icons(info(true, { kind: 'not-png' }), info(true, okPng(32, 32))), null)).toBeNull();
    });
});

describe('baseColourFor', () => {
    it('uses the accent colour when it is not close to grey', () => {
        expect(baseColourFor('#07687d')).toEqual({ r: 0x07, g: 0x68, b: 0x7d });
    });

    it('falls back to Teams blue when the accent is missing, unreadable, or close to grey', () => {
        expect(baseColourFor(null)).toEqual(TEAMS_BLUE);
        expect(baseColourFor('not a colour')).toEqual(TEAMS_BLUE);
        expect(baseColourFor('#808080')).toEqual(TEAMS_BLUE);
    });
});

describe('regenerateOutline', () => {
    it('is the outline pipeline applied to the colour icon: a white silhouette at 32 x 32', () => {
        const source = pic(O.make(40, 30, (x, y) => (x >= 5 && x < 35 && y >= 5 && y < 25 ? RED : [0, 0, 0, 0])));
        const out = regenerateOutline(source);
        expect([out.width, out.height]).toEqual([32, 32]);
        for (let i = 0; i < out.data.length; i += 4) if (out.data[i + 3]! > 0) expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual([255, 255, 255]);
        expect(out.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    });
});

describe('buildColourFromOutline', () => {
    it('enlarges the shape to the target size, white on a tile of the given colour', () => {
        const outline = pic(O.make(32, 32, (x, y) => (x >= 8 && x < 24 && y >= 8 && y < 24 ? [255, 255, 255, 255] : [0, 0, 0, 0])));
        const colour = { r: 10, g: 20, b: 30 };
        const out = buildColourFromOutline(outline, colour, 192);
        expect([out.width, out.height]).toEqual([192, 192]);
        // every pixel is fully opaque (a tile, nothing left see-through)
        for (let i = 3; i < out.data.length; i += 4) expect(out.data[i]).toBe(255);
        // a corner (outside the enlarged shape) is the tile colour
        expect(Array.from(out.data.slice(0, 3))).toEqual([10, 20, 30]);
        // the centre (inside the enlarged shape) is white
        const c = (96 * 192 + 96) * 4;
        expect(Array.from(out.data.slice(c, c + 3))).toEqual([255, 255, 255]);
    });

    it('defaults its target to the colour icon side, 192', () => {
        const outline = pic(O.make(32, 32, () => [255, 255, 255, 255]));
        const out = buildColourFromOutline(outline, { r: 1, g: 2, b: 3 });
        expect([out.width, out.height]).toEqual([192, 192]);
    });
});

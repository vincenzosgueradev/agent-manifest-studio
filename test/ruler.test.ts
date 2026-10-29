/**
 * Feature 009 (fifth amendment): the marks of the rulers. The expected values are worked out by hand from
 * specs/009-image-editor-workspace/spec.md, FR-020.
 */
import { describe, expect, it } from 'vitest';
import { rulerMarks, rulerStep } from '../src/view/ruler';

describe('rulerStep: the smallest round number of pixels that leaves 48 screen pixels between two numbers', () => {
    const table: Array<[number, number]> = [
        [2, 50], [1.5, 50], [1, 50], [0.95, 100], [0.5, 100], [0.4, 200], [0.2, 500], [0.1, 500], [5, 10], [10, 5], [24, 2], [48, 1], [100, 1],
        [4.9, 10], [4.7, 20], [2.5, 20],
    ];
    for (const [scale, step] of table) it(`at ${scale} screen pixels per pixel the step is ${step}`, () => expect(rulerStep(scale)).toBe(step));

    it('is never smaller than the spacing asked for, unless the largest step is reached', () => {
        for (let scale = 0.1; scale <= 2; scale += 0.05) {
            const step = rulerStep(scale);
            expect(step * scale >= 48 || step === 500, String(scale)).toBe(true);
        }
    });
});

describe('rulerMarks', () => {
    it('at 100 %, a picture of 192 pixels from the corner: numbered every 50, small every 10, none after the picture', () => {
        const marks = rulerMarks(0, 1, 192, 400);
        expect(marks.filter(m => m.major).map(m => [m.at, m.value])).toEqual([[0, 0], [50, 50], [100, 100], [150, 150]]);
        expect(marks.map(m => m.value)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190]);
    });

    it('the positions are the origin plus the value times the scale', () => {
        const marks = rulerMarks(30, 2, 100, 1000);                // step 50, minor 10
        expect(marks.map(m => [m.value, m.at])).toEqual([[0, 30], [10, 50], [20, 70], [30, 90], [40, 110], [50, 130], [60, 150], [70, 170], [80, 190], [90, 210]]);
        expect(marks.filter(m => m.major).map(m => m.value)).toEqual([0, 50]);
    });

    it('at 200 % of a picture of 32 pixels: numbered every 50 (20 would be too close), small every 10', () => {
        const marks = rulerMarks(0, 2, 32, 1000);
        expect(rulerStep(2)).toBe(50);                              // 20 pixels would be only 40 screen pixels apart
        expect(marks.map(m => m.value)).toEqual([0, 10, 20, 30]);
        expect(marks.filter(m => m.major).map(m => m.value)).toEqual([0]);
    });

    it('where the step is 1 or 2 there are only numbered marks', () => {
        const marks = rulerMarks(0, 48, 4, 1000);
        expect(marks.map(m => [m.value, m.major])).toEqual([[0, true], [1, true], [2, true], [3, true]]);
        const two = rulerMarks(0, 30, 6, 1000);                     // step 2
        expect(two.map(m => [m.value, m.major])).toEqual([[0, true], [2, true], [4, true]]);
    });

    it('keeps only the marks that are on the ruler', () => {
        const marks = rulerMarks(-120, 2, 200, 100);                // the picture starts left of the ruler
        for (const m of marks) expect(m.at >= -1 && m.at <= 101, String(m.at)).toBe(true);
        expect(marks.map(m => m.value)).toEqual([60, 70, 80, 90, 100, 110]);
    });

    it('has no mark for a picture of no size or a ruler of no length', () => {
        expect(rulerMarks(0, 1, 0, 400)).toEqual([]);
        expect(rulerMarks(0, 1, 192, 0)).toEqual([]);
        expect(rulerMarks(0, 0, 192, 400)).toEqual([]);
    });

    it('labels the major marks with their value and the small ones with nothing', () => {
        const marks = rulerMarks(0, 1, 100, 400);
        for (const m of marks) expect(m.label).toBe(m.major ? String(m.value) : '');
    });
});

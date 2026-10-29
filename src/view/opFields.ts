/**
 * The editable parameters of each image-editor operation (feature 004): one static, typed description per
 * `OpKind`, shared by the editor's own step controls (`imageEditor.ts`) and the effect guides (`effectGuide.ts`,
 * feature 012) so a parameter's name, range and options are read from one place and can never drift between the
 * two — adding or changing a parameter here is the only edit needed for both to see it.
 */

import type { Op, OpKind, Rgb } from '../services/image/types';

export type Field =
    | { name: string; label: string; type: 'number'; min: number; max: number; step: number; range?: boolean; get: (o: Op) => number; set: (o: Op, v: number) => Op }
    | { name: string; label: string; type: 'select'; options: Array<[string, string]>; get: (o: Op) => string; set: (o: Op, v: string) => Op }
    | { name: string; label: string; type: 'colour'; optional?: boolean; get: (o: Op) => Rgb | null; set: (o: Op, v: Rgb | null) => Op }
    | { name: string; label: string; type: 'toggle'; get: (o: Op) => boolean; set: (o: Op, v: boolean) => Op };

export const num = (name: string, label: string, min: number, max: number, step = 1, range = false): ((key: string) => Field) =>
    key => ({ name, label, type: 'number', min, max, step, range, get: o => (o as unknown as Record<string, number>)[key]!, set: (o, v) => ({ ...o, [key]: v }) as Op });

export const FIELDS: Record<OpKind, Field[]> = {
    removeBg: [
        { name: 'mode', label: 'Where', type: 'select', options: [['edges', 'From the edges'], ['everywhere', 'Everywhere']], get: o => (o as { mode: string }).mode, set: (o, v) => ({ ...o, mode: v }) as Op },
        { name: 'colour', label: 'Colour to remove', type: 'colour', optional: true, get: o => (o as { colour: Rgb | null }).colour, set: (o, v) => ({ ...o, colour: v }) as Op },
        num('tolerance', 'Tolerance (%)', 0, 100, 1, true)('tolerance'),
        num('softness', 'Softness (%)', 0, 100, 1, true)('softness'),
        num('matte', 'Matte (pixels)', -5, 5)('matte'),
    ],
    trim: [num('tolerance', 'Background tolerance (%)', 0, 100)('tolerance')],
    crop: [num('x', 'Left', 0, 100000)('x'), num('y', 'Top', 0, 100000)('y'), num('w', 'Width', 1, 100000)('w'), num('h', 'Height', 1, 100000)('h')],
    square: [{ name: 'fill', label: 'Padding colour', type: 'colour', optional: true, get: o => (o as { fill: Rgb | null }).fill, set: (o, v) => ({ ...o, fill: v }) as Op }],
    fit: [num('share', 'Share of the icon (%)', 1, 100, 0.5, true)('share')],
    rotate: [{ name: 'quarters', label: 'Turn', type: 'select', options: [['1', '90 degrees clockwise'], ['2', '180 degrees'], ['3', '90 degrees anticlockwise']], get: o => String((o as { quarters: number }).quarters), set: (o, v) => ({ ...o, quarters: Number(v) }) as Op }],
    flip: [{ name: 'axis', label: 'Mirror', type: 'select', options: [['h', 'Left to right'], ['v', 'Top to bottom']], get: o => (o as { axis: string }).axis, set: (o, v) => ({ ...o, axis: v }) as Op }],
    fill: [{ name: 'colour', label: 'Colour', type: 'colour', get: o => (o as { colour: Rgb }).colour, set: (o, v) => ({ ...o, colour: v ?? (o as { colour: Rgb }).colour }) as Op }],
    solid: [{ name: 'colour', label: 'Colour', type: 'colour', get: o => (o as { colour: Rgb }).colour, set: (o, v) => ({ ...o, colour: v ?? (o as { colour: Rgb }).colour }) as Op }],
    tone: [
        num('hue', 'Hue (degrees)', -180, 180, 1, true)('hue'), num('saturation', 'Saturation', -100, 100, 1, true)('saturation'),
        num('brightness', 'Brightness', -100, 100, 1, true)('brightness'), num('contrast', 'Contrast', -100, 100, 1, true)('contrast'),
        { name: 'invert', label: 'Invert', type: 'toggle', get: o => (o as { invert: boolean }).invert, set: (o, v) => ({ ...o, invert: v }) as Op },
        { name: 'gray', label: 'Grayscale', type: 'toggle', get: o => (o as { gray: boolean }).gray, set: (o, v) => ({ ...o, gray: v }) as Op },
        { name: 'threshold', label: 'Threshold (0 = off)', type: 'number', min: 0, max: 255, step: 1, range: true, get: o => (o as { threshold: number | null }).threshold ?? 0, set: (o, v) => ({ ...o, threshold: v === 0 ? null : v }) as Op },
    ],
    outline: [
        { name: 'mode', label: 'From', type: 'select', options: [['alpha', 'Shape (transparency)'], ['brightness', 'Darkness (dark logo on light)']], get: o => (o as { mode: string }).mode, set: (o, v) => ({ ...o, mode: v }) as Op },
        num('cutoff', 'Cutoff (alpha mode)', 0, 255, 1, true)('cutoff'),
    ],
};

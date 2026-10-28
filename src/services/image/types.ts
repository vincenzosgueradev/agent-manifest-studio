/** Shapes of the image editor (feature 004). Pure data: nothing here touches a canvas or the page. */

import type { Rgb } from '../preview';

export type { Rgb };

/** 8-bit RGBA, not premultiplied, row by row from the top left; `data.length === width * height * 4`. */
export interface Picture {
    width: number;
    height: number;
    data: Uint8Array;
}

/** Longest side the editor works at; a larger picture is reduced on import. */
export const IMAGE_WORKING_MAX = 1024;
/** Steps that Undo can go back. */
export const HISTORY_MAX = 50;

export interface RemoveBgOp {
    kind: 'removeBg';
    mode: 'edges' | 'everywhere';
    /** `null` takes the most common colour of the four corners. */
    colour: Rgb | null;
    /** 0 to 100, percent of the distance from black to white. */
    tolerance: number;
    /** 0 to 100, percent added beyond the tolerance over which the alpha fades. */
    softness: number;
    /** -5 to 5 pixels. */
    matte: number;
}

export interface ToneOp {
    kind: 'tone';
    /** -180 to 180 degrees. */
    hue: number;
    /** -100 to 100. */
    saturation: number;
    brightness: number;
    contrast: number;
    invert: boolean;
    gray: boolean;
    /** 0 to 255, or `null` for no threshold. */
    threshold: number | null;
}

export interface OutlineOp {
    kind: 'outline';
    mode: 'alpha' | 'brightness';
    /** 0 to 255, for the alpha mode. */
    cutoff: number;
}

export type Op =
    | RemoveBgOp
    | { kind: 'trim'; tolerance: number }
    | { kind: 'crop'; x: number; y: number; w: number; h: number }
    | { kind: 'square'; fill: Rgb | null }
    | { kind: 'fit'; target: number; share: number }
    | { kind: 'resize'; w: number; h: number }
    | { kind: 'rotate'; quarters: 1 | 2 | 3 }
    | { kind: 'flip'; axis: 'h' | 'v' }
    | { kind: 'fill'; colour: Rgb }
    | { kind: 'solid'; colour: Rgb }
    | ToneOp
    | OutlineOp;

export type OpKind = Op['kind'];

export function blank(width: number, height: number, rgba: [number, number, number, number] = [0, 0, 0, 0]): Picture {
    const data = new Uint8Array(width * height * 4);
    if (rgba[0] || rgba[1] || rgba[2] || rgba[3]) {
        for (let i = 0; i < data.length; i += 4) { data[i] = rgba[0]; data[i + 1] = rgba[1]; data[i + 2] = rgba[2]; data[i + 3] = rgba[3]; }
    }
    return { width, height, data };
}

export const clonePicture = (p: Picture): Picture => ({ width: p.width, height: p.height, data: p.data.slice() });

export const hasAlpha = (p: Picture): boolean => {
    for (let i = 3; i < p.data.length; i += 4) if (p.data[i]! < 255) return true;
    return false;
};

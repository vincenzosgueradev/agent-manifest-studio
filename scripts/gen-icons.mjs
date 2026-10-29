/**
 * Icon set of the tool: one place for the shapes, generated into styles.css.
 *
 *   node scripts/gen-icons.mjs
 *
 * Style: 16 x 16 grid, 1.5 stroke, round caps and joins, one colour (the shape is a CSS mask, the
 * colour is `currentColor`), as in Agent Nameplate. The host does not draw inline SVG, so an icon
 * is `<span class="icon icon-NAME">` and its shape comes from `mask-image` (see src/icons.ts).
 *
 * To add an icon: add its inner markup here, add its name to `ICON_NAMES` in src/icons.ts and run
 * this script. A test checks that the two lists and the stylesheet agree.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles.css');

/** name -> inner SVG markup (16 x 16, stroke only). */
const ICONS = {
    package: "<path d='M8 1.75 14 5v6l-6 3.25L2 11V5z'/><path d='M2 5l6 3.25L14 5M8 8.25V14.5'/>",
    tag: "<path d='M7.4 2.3H3a.8.8 0 0 0-.8.8v4.3a1 1 0 0 0 .3.8l5.9 5.9a1 1 0 0 0 1.4 0l4-4a1 1 0 0 0 0-1.4l-5.9-5.9a1 1 0 0 0-.7-.3z'/><circle cx='5.2' cy='5.2' r='.7'/>",
    bot: "<rect x='2.75' y='5.75' width='10.5' height='7.5' rx='2'/><path d='M8 5.75V3.5'/><circle cx='8' cy='2.5' r='1.1'/><path d='M5.9 9.2v.9M10.1 9.2v.9'/>",
    check: "<path d='M3.5 8.5 6.5 11.5 12.5 4.5'/>",
    download: "<path d='M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11'/>",
    'arrow-left': "<path d='M13 8H3M6.5 4.5 3 8l3.5 3.5'/>",
    'arrow-right': "<path d='M3 8h10M9.5 4.5 13 8l-3.5 3.5'/>",
    close: "<path d='M4 4l8 8M12 4l-8 8'/>",
    folder: "<path d='M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6l1.4 1.6h5A1.5 1.5 0 0 1 14 6.1v5.4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z'/>",
    archive: "<rect x='2' y='2.5' width='12' height='3' rx='1'/><path d='M3 5.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7M6.5 8.5h3'/>",
    user: "<circle cx='8' cy='5.5' r='2.5'/><path d='M3 13.5c.4-2.4 2.4-4 5-4s4.6 1.6 5 4'/>",
    globe: "<circle cx='8' cy='8' r='6'/><path d='M2 8h12M8 2c1.8 1.8 2.7 3.8 2.7 6S9.8 12.2 8 14c-1.8-1.8-2.7-3.8-2.7-6S6.2 3.8 8 2z'/>",
    shield: "<path d='M8 1.8l5 1.8v4c0 3-2.1 5.2-5 6.6-2.9-1.4-5-3.6-5-6.6v-4z'/>",
    'file-text': "<path d='M4 2h5.5L13 5.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z'/><path d='M9.5 2v3.5H13M5.5 8.5h5M5.5 11h5'/>",
    'file-code': "<path d='M4 2h5.5L13 5.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z'/><path d='M9.5 2v3.5H13M6.6 8.2 5.2 9.6l1.4 1.4M9.4 8.2l1.4 1.4-1.4 1.4'/>",
    palette: "<path d='M8 2a6 6 0 1 0 0 12c.9 0 1.3-.6 1.1-1.3-.2-.6.1-1.2.8-1.2h1.3A2.8 2.8 0 0 0 14 8.7C14 5 11.3 2 8 2z'/><circle cx='5' cy='7.2' r='.6'/><circle cx='7' cy='4.8' r='.6'/><circle cx='10.2' cy='5.3' r='.6'/>",
    image: "<rect x='2' y='3' width='12' height='10' rx='1.5'/><circle cx='5.8' cy='6.6' r='1.1'/><path d='M2.5 12l3.6-3.6 2.6 2.6 2-2 3.3 3'/>",
    layers: "<path d='M8 2l6 3-6 3-6-3z'/><path d='M2 8l6 3 6-3M2 11l6 3 6-3'/>",
    key: "<circle cx='5.5' cy='10.5' r='2.5'/><path d='M7.3 8.7 13 3M11 5l1.7 1.7M9.3 6.7l1.4 1.4'/>",
    lock: "<rect x='3' y='7' width='10' height='6.5' rx='1.5'/><path d='M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2'/>",
    braces: "<path d='M6 2.5C4.5 2.5 4.5 4 4.5 5.5S4 8 2.5 8c1.5 0 2 .5 2 2.5s0 3 1.5 3M10 2.5c1.5 0 1.5 1.5 1.5 3S12 8 13.5 8c-1.5 0-2 .5-2 2.5s0 3-1.5 3'/>",
    info: "<circle cx='8' cy='8' r='6'/><path d='M8 7.2v3.6M8 5.1v.1'/>",
    'help-circle': "<circle cx='8' cy='8' r='6'/><path d='M6.3 6.3a1.8 1.8 0 0 1 3.4.7c0 1.2-1.7 1.4-1.7 2.6M8 11.4v.1'/>",
    'check-circle': "<circle cx='8' cy='8' r='6'/><path d='M5.3 8.2l1.8 1.8 3.6-3.8'/>",
    'alert-triangle': "<path d='M8 2.2l6 10.6H2z'/><path d='M8 6.5v3M8 11.2v.1'/>",
    'x-circle': "<circle cx='8' cy='8' r='6'/><path d='M6 6l4 4M10 6l-4 4'/>",
    eye: "<path d='M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z'/><circle cx='8' cy='8' r='2'/>",
    search: "<circle cx='7' cy='7' r='4.5'/><path d='M10.4 10.4 14 14'/>",
    undo: "<path d='M3 6.5h6.5a3.5 3.5 0 0 1 0 7H6'/><path d='M5.5 3.5 2.5 6.5l3 3'/>",
    plus: "<path d='M8 3v10M3 8h10'/>",
    minus: "<path d='M3 8h10'/>",
    upload: "<path d='M8 10V2M4.5 5 8 1.5 11.5 5M2.5 13.5h11'/>",
    pipette: "<path d='M10.5 2.5a1.8 1.8 0 0 1 2.9 2L11 7l1 1-1 1-4-4 1-1 1 1z'/><path d='M7.5 7.5 3 12v1h1l4.5-4.5'/>",
    eraser: "<path d='M9 3l4 4-5.5 5.5H4.5L3 11a1 1 0 0 1 0-1.4z'/><path d='M7 5 11 9M8.5 12.5h5'/>",
    wand: "<path d='M3 13 11.5 4.5'/><path d='M10 3.5l1.5 1.5M12.5 2v2M14 3.5h-2M5 3v2M6 4H4M13 10v2M14 11h-2'/>",
    sliders: "<path d='M3 4.5h10M3 8h10M3 11.5h10'/><circle cx='6' cy='4.5' r='1.3'/><circle cx='10.5' cy='8' r='1.3'/><circle cx='5' cy='11.5' r='1.3'/>",
    expand: "<path d='M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10'/>",
    rotate: "<path d='M13 8a5 5 0 1 1-1.6-3.7'/><path d='M13.3 2.5v3h-3'/>",
    flip: "<path d='M8 2v12'/><path d='M6 4 2 8l4 4zM10 4l4 4-4 4z'/>",
    refresh: "<path d='M13.5 8a5.5 5.5 0 1 1-1.7-3.95'/><path d='M13.6 2.2v3.1h-3.1'/>",
    trash: "<path d='M3 4.5h10M6.2 4.5V3a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8.2a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.2M6.8 7v4M9.2 7v4'/>",
    copy: "<rect x='5.5' y='5.5' width='8' height='8' rx='1.5'/><path d='M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5'/>",
    crop: "<path d='M5.5 2v8.5H14M2 5.5h8.5V14'/>",
    list: "<path d='M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01'/>",
    save: "<path d='M3.5 2.5h7l2.5 2.5v7.5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z'/><path d='M5.5 2.5v3h4v-3M5 13.5v-4h6v4'/>",
    redo: "<path d='M13 6.5H6.5a3.5 3.5 0 0 0 0 7H10'/><path d='M10.5 3.5l3 3-3 3'/>",
    bucket: "<path d='M3.5 8.5 7.5 4.5l4.5 4.5-4 4a1.4 1.4 0 0 1-2 0L3.5 10.5a1.4 1.4 0 0 1 0-2z'/><path d='M7.5 4.5 6 3a1.4 1.4 0 0 1 2-2l2 2M12.8 11c.8 1 1.3 1.8 1.3 2.5a1.3 1.3 0 0 1-2.6 0c0-.7.5-1.5 1.3-2.5z'/>",
    trim: "<rect x='2.5' y='2.5' width='11' height='11' rx='1' stroke-dasharray='2 2'/><rect x='5.5' y='5.5' width='5' height='5'/>",
    square: "<rect x='3' y='3' width='10' height='10' rx='1'/><path d='M5.5 8h5M8 5.5v5'/>",
    frame: "<rect x='2' y='2' width='12' height='12' rx='1'/><rect x='5' y='5' width='6' height='6'/>",
    'flip-v': "<path d='M2 8h12'/><path d='M4 6 8 2l4 4zM4 10l4 4 4-4z'/>",
    contrast: "<circle cx='8' cy='8' r='5.5'/><path d='M8 2.5v11a5.5 5.5 0 0 0 0-11z'/>",
    shape: "<path d='M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.7l-3.6 1.9.7-4L2.2 6.5l4-.6z'/>",
    'chevron-down': "<path d='M3.5 6 8 10.5 12.5 6'/>",
};

const mask = inner => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;
    const url = `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
    return `-webkit-mask-image: ${url}; mask-image: ${url};`;
};

const BEGIN = '/* ICONS:BEGIN (generated by scripts/gen-icons.mjs: do not edit by hand) */';
const END = '/* ICONS:END */';

const block = [BEGIN, ...Object.entries(ICONS).map(([name, inner]) => `.icon-${name} { ${mask(inner)} }`), END].join('\n');

let text = readFileSync(css, 'utf8');
if (text.includes(BEGIN)) {
    text = text.replace(new RegExp(`${BEGIN.replace(/[()*/.]/g, '\\$&')}[\\s\\S]*?${END.replace(/[*/]/g, '\\$&')}`), () => block);
} else {
    // First run: replace the hand-copied icon rules by the generated block.
    const lines = text.split('\n');
    const first = lines.findIndex(l => /^\.icon-[a-z-]+ \{ -webkit-mask-image/.test(l));
    const kept = lines.filter(l => !/^\.icon-[a-z-]+ \{ -webkit-mask-image/.test(l));
    kept.splice(first, 0, block);
    text = kept.join('\n');
}
writeFileSync(css, text);
console.log(`${Object.keys(ICONS).length} icons written to src/styles.css`);

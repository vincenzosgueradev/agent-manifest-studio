/**
 * Expected values written from the spec, with no code from `src/` (Testing Standard 2).
 */

/** FR-019: `[raw, base, separator, suffix, hasBrackets]`. Only one final group of 1-20 characters. */
export const SPLIT_TABLE: Array<[string, string, string, string, boolean]> = [
    ['', '', '', '', false],
    ['Sales Helper', 'Sales Helper', '', '', false],
    ['Sales Helper [DEV]', 'Sales Helper', ' ', 'DEV', true],
    ['Sales Helper[DEV]', 'Sales Helper', '', 'DEV', true],
    ['Sales Helper  [DEV]', 'Sales Helper ', ' ', 'DEV', true],
    ['Sales Helper [A][B]', 'Sales Helper [A]', '', 'B', true],
    ['Sales Helper [A] [B]', 'Sales Helper [A]', ' ', 'B', true],
    ['Sales Helper []', 'Sales Helper []', '', '', false],
    ['Sales Helper [DEV] ', 'Sales Helper [DEV] ', '', '', false],
    ['Sales Helper [a[b]]', 'Sales Helper [a[b]]', '', '', false],
    ['Sales Helper [12345678901234567890]', 'Sales Helper', ' ', '12345678901234567890', true],
    ['Sales Helper [123456789012345678901]', 'Sales Helper [123456789012345678901]', '', '', false],
    ['[DEV]', '', '', 'DEV', true],
    [' [DEV]', '', ' ', 'DEV', true],
    ['Caffè Assistente [UAT]', 'Caffè Assistente', ' ', 'UAT', true],
    ['مساعد المبيعات [PROD]', 'مساعد المبيعات', ' ', 'PROD', true],
    ['Sales [Test 2]', 'Sales', ' ', 'Test 2', true],
    ['Sales (DEV)', 'Sales (DEV)', '', '', false],
    ['Sales - DEV', 'Sales - DEV', '', '', false],
];

/**
 * Teams composes a pixel over the accent: out = round-half-up((src*a + bg*(255-a)) / 255).
 * Written as a rounding of an exact fraction, not as the integer formula used in `src/`.
 */
export function flattenOracle(src: number, a: number, bg: number): number {
    const numerator = src * a + bg * (255 - a);
    return Math.floor((2 * numerator + 255) / 510);
}

/** A few values computed by hand, so the function above is itself checked. */
export const FLATTEN_HAND_TABLE: Array<{ src: number; a: number; bg: number; out: number }> = [
    { src: 255, a: 0, bg: 7, out: 7 },        // fully transparent: the accent
    { src: 255, a: 255, bg: 7, out: 255 },    // opaque: the pixel
    { src: 0, a: 128, bg: 255, out: 127 },    // (0*128 + 255*127)/255 = 127
    { src: 255, a: 1, bg: 0, out: 1 },        // 255/255 = 1
    { src: 0, a: 254, bg: 255, out: 1 },      // 255*1/255 = 1
    { src: 127, a: 127, bg: 128, out: 128 },  // (127*127 + 128*128)/255 = 127.50 -> 128
    { src: 1, a: 128, bg: 0, out: 1 },        // 128/255 = 0.50196 -> 1
    { src: 0, a: 127, bg: 1, out: 1 },        // 128/255 = 0.50196 -> 1
];

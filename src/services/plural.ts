/** `1 file`, `2 files`: the count with the word that agrees with it. */
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

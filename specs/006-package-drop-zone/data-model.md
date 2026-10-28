# Data model: Package Drop Zone

No stored data. Transient UI state in `loader.ts`: `depth` (dragenter minus dragleave, never below 0).
Input of `checkDropped`: the list of file names. Output: `{ ok: true } | { ok: false, message: string }`.

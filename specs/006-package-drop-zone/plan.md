# Plan: Package Drop Zone

Files: `src/index.html` (zone and overlay), `src/styles.css` (zone, overlay, `is-over`), `src/view/loader.ts`
(enter/leave counter, validation, window guard, click on zone). `src/app.ts` is unchanged: `onFile` still
receives one `File`. The validation is a pure function in `loader.ts`, `checkDropped(names)`, returning
`{ ok } | { ok: false, message }`, so the matrix test can call it with names.

Constitution check: I (a visible step removes a doubt), II (local, no network), III (the quickstart lists what is not covered),
V (README "What this tool changes" unchanged: still nothing leaves the machine), VII (no emoji, tokens only, both themes),
VIII (one small increment). GitHub description: no change needed.

# UI contract

Ids: `loader` (panel, class `is-over` while dragging), `drop-area` (zone), `drop-title`, `drop-hint`, `open-btn`,
`drop-overlay` (`aria-live="polite"`, hidden unless dragging), `drop-overlay-text`.

Messages:
- not a zip: `NAME: this is not a zip. Drop the Teams app package, the .zip you download from Copilot Studio.`
- several files: `Drop one package at a time.`

Overlay texts: `Release to open this package` (nothing loaded) / `Release to replace the package` (loaded).

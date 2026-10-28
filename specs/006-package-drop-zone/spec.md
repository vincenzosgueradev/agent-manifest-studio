# Feature Specification: Package Drop Zone

**Feature Branch**: `006-package-drop-zone`
**Created**: 2026-10-28
**Status**: Draft
**Input**: "Is upload or drag and drop possible too, with a nice look? Does it work?"

## Context

The loader already takes a dropped file (the whole panel listens for `drop`, `src/view/loader.ts`) and
the file dialog of the host opens a zip. What is missing is that the empty step looks like a text
box with a button: nothing says that a file can be dropped, nothing reacts while a file is over the
page, a wrong file gives an unclear refusal, and a file dropped outside the panel can make the host
window navigate to that file. This feature makes the drop visible, safe and tested. It adds no network
call, no environment access and no dependency (Principle II); the file is read in the window.

## Clarifications

- Q: Does drag and drop work in PPTB? -> A: A dropped `File` is read with `arrayBuffer()` in the window,
  the same call the input fallback uses. The tests prove the code path in jsdom; whether the host
  webview delivers the drop is a manual check (quickstart 1).
- Q: One zone for the empty and the loaded state? -> A: Yes. The empty step shows the large zone; the
  loaded bar keeps Replace and Remove and takes a drop too, with an overlay that says "replace".
- Q: Several files at once? -> A: Refused with a message; the first file is not guessed.

## User Scenarios & Testing

### User Story 1 - See that a package can be dropped (P1)
The empty first step shows a large dashed zone with an upload icon, "Drop the package here", the
word "or", the Open package button, and a hint "Only the .zip of the Teams app package".
**Test**: the real page has the zone, the title, the hint and the button (ui.dropzone).

### User Story 2 - Feedback while dragging (P1)
While a file is dragged over the panel the zone is highlighted and an overlay says "Release to open
this package" (empty) or "Release to replace the package" (loaded). Leaving, or dropping, removes
it. Moving over the children of the zone does not make it flicker. Dragging text or a link (not
files) does nothing.
**Test**: dragenter/dragover/dragleave/drop sequences, with and without children, with `Files` and `text/plain` types.

### User Story 3 - Wrong drops are refused clearly (P1)
- A file that is not a `.zip` (any case of the extension) is refused with
  "NAME: this is not a zip. Drop the Teams app package, the .zip you download from Copilot Studio."
  and nothing is loaded; a loaded package stays.
- More than one file: "Drop one package at a time." Nothing is loaded.
- A zip that is not a Teams package keeps the existing refusal of the reader.
**Test**: a matrix of names and counts with an oracle written from this list.

### User Story 4 - A drop outside the panel does nothing (P2)
A file dropped anywhere else on the page is ignored and the window does not navigate to it.
**Test**: a `drop` on `document.body` is default-prevented and loads nothing.

### User Story 5 - Mouse and keyboard (P2)
Clicking the empty zone (not only the button) opens the file dialog; the Open package button is the
keyboard path and opens it once, not twice. The overlay is announced (`aria-live`).

## Requirements

- **FR-001** The empty step shows a drop zone: upload icon, title "Drop the package here", "or", the
  Open package button, the hint, and the text that the file is read on this computer and never sent.
- **FR-002** While files are dragged over the panel it has the class `is-over` and the overlay is visible with
  the text for the empty or loaded state; it goes away on leave and on drop.
- **FR-003** Only drags that carry files react (`dataTransfer.types` contains `Files`).
- **FR-004** Moving between children does not clear the highlight (enter/leave are counted).
- **FR-005** A name not ending in `.zip` (case-insensitive) is refused with the message above; the state is unchanged.
- **FR-006** Several files are refused with "Drop one package at a time."; zero files do nothing.
- **FR-007** A drop outside the panel is default-prevented and ignored (no navigation).
- **FR-008** A click on the empty zone opens the file dialog once; a click on the button opens it once.
- **FR-009** The overlay text is in an `aria-live="polite"` region.
- **FR-010** No network call and no environment API (Principle II); colours only from CSS custom properties,
  readable in both themes, no emoji, no default checkbox.

## Success Criteria

- SC-001 Every FR has a test in the traceability table of `tasks.md`.
- SC-002 `npm run test:mutation` kills the mutants of the new lines of `loader.ts`.
- SC-003 Not covered: how the zone looks in PPTB pixels, and the real OS drag from Explorer into the host webview (manual checks).

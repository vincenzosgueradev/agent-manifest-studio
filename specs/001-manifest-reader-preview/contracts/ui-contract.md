# Contract: the screen

One screen, no deeper flow, therefore no breadcrumb (constitution VII). The root fills 100% of the
width and height; scrolling belongs to the inner panel. All colours are CSS custom properties.

## Regions (top to bottom)

| Region | Id | Content |
|--------|----|---------|
| Header | `app-header` | Name of the tool, version from `__APP_VERSION__`, no connection badge (the tool has no connection) |
| Loader | `loader` | Button "Open package…", drop area, name of the loaded file, "Load another" when loaded. Empty state: says what a package is and where to get it |
| Message | `load-message` | Refusal text with the cause (FR-002, FR-003); role `alert` |
| Summary | `summary` | Definition list of every item of FR-004/FR-005; "not declared" and "not recognised" shown as words, not blanks |
| Preview | `preview` | Colour icon as it is, never on the accent colour (192 px and 48 px; amended 2026-10-29), outline icon on a light and a dark bar, short and full name. Fixed notice `preview-notice` with the two statements of FR-010 |
| Name editor | `name-editor` | One input `suffix-input` labelled "Environment suffix"; separate display of base and suffix for each name; localisation keys shown as read-only with the reason (FR-030) |
| Checks | `checks` | One row per check: round verdict indicator (CSS shape, never emoji), name, found value, rule; `notProven` in the row's details |
| Export | `export` | Button `export-btn`, suggested file name, the list `export-remaining` of failures that stay, the reason when the button is disabled |

## Behaviour

- Typing in `suffix-input` updates preview, names and checks on every input event; no debounce
  longer than one frame.
- `export-btn` is disabled only for blocking checks (FR-021) or when nothing is loaded; it says why
  next to the button.
- The first load shows the result in under 30 seconds of user time (SC-001): one action after
  choosing the file.
- Loading a second package replaces everything; a refused file keeps the previous package visible
  and shows the message above it.
- Long values truncate with an ellipsis and carry the full text in `title`.
- Verdict indicators: pass, warning and fail differ by shape and by word as well as by colour.
- Light and dark theme follow PPTB's (`data-theme` on the root, the same mechanism as Agent
  Nameplate); text contrast at least 4.5:1 in both.
- Narrow pane: regions stack, no horizontal page scroll.

## Texts that must appear verbatim

- `preview-notice`: "This is the name of the Teams app in the manifest. It is not the name of the
  agent in Copilot Studio or in Dataverse." and "This preview does not reproduce exactly what Teams
  draws. The final check is a test in Teams."
- Beside the export button: "Nothing is sent anywhere. The new package is saved on your computer."

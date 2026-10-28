# Implementation Plan: Icon Look Assistant

**Branch**: `005-icon-look-assistant` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

## Summary

One-click shortcuts and advice on the icon cards of step 3 (Look), a way out for every failing check, and a notice in the Save step. Pure
functions in `services/image` compute the pictures; `app.ts` reads the icon from the new package and
replaces it through the path of feature 003; `view/editor.ts` and `view/exportPanel.ts` draw the controls.

## Technical Context

Stack unchanged: TypeScript strict, Vite, Vitest, fflate. No new dependency, no network.

## Constitution Check

| Principle | Result |
|---|---|
| I Gap-first | Closes the gaps found by hand: hidden accent colour, wrong outline icon, no guidance, refused upload: pass |
| II Local, read-only | Computed in the window on the package; nothing leaves: pass |
| III Honest preview | Captions say what the accent colour does; the preview colour says it is not saved: pass |
| IV Teams first | Colour and outline icon and the Teams version rule only: pass |
| V Marketplace policy | No new capability to declare: pass |
| VII Enterprise UI | Cards, labelled controls, no emoji, theme colours: pass |
| VIII Simplicity | Reuses operations of 004 and the replacement of 003; new state is only `iconMessage` and a cached advice: pass |

## Structure

```text
src/services/image/
  transparent.ts   makeTransparent, whiteShape, borderlessIcon, ALREADY_SEE_THROUGH, ALREADY_WHITE
  recommend.ts     recommend(picture, accent) -> SuggestionSet
src/view/
  editor.ts        buttons, captions, preview colour, suggestions card
  exportPanel.ts   version notice and its button
  checks.ts        "How to fix it" and the Go to button of a check
src/services/fixes.ts   FIXES, fixFor, STEP_NAME
src/app.ts         onIconTransparent, onIconWhite, onIconBorderless, onApplySuggestion,
                   adviceFor (cache), versionHint, onVersionBump
test/
  recommend.test.ts, ui.suggest.test.ts, ui.editor.test.ts (sections of this feature)
```

## Decisions

- Shortcuts act on the bytes of the icon now in the new package, not on the original, so they compose
  with a file the user chose or an editor result.
- The two "not a fault" messages are exported constants so the view can style them as information.
- The advice is cached on (bytes, accent) in `app.ts`; `recommend` is pure and does not mutate input.
- A suggestion is applied as one `edit` so the Changes table and Revert see one coherent change.

## Risks

- Advice depends on the 62.5 percent safe-area share and the contrast numbers; if the Teams guidance
  changes, the constants in `recommend.ts` change in one place.
- Pixel rendering in Teams is not testable here (manual check).

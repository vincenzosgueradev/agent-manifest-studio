# Feature Specification: Image Editor Workspace

**Feature Branch**: `009-image-editor-workspace`
**Created**: 2026-10-29
**Status**: Draft
**Input**: "The editor screen is not intuitive and there is little room to see the logo while editing. Split it into a right and a left part. Edit on the Colour icon and on the Outline icon must open the editor of that icon: the same editor, with the image that is being edited. The image editor has things that are not needed and ugly misaligned ones, like 'Read the pixel at x'. A zoom slider is missing."

## Context

Feature 004 built the image editor as a card at the bottom of the Look step, under the accent colour, the two icon cards and the band. Seen by hand
(2026-10-29): the user presses *Edit image* high on the page and the editor appears far below it, in a card whose canvas is at most 520 px high
and whose controls sit in several rows that do not line up (the pixel reader "Read the pixel at x [ ] y [ ] Read" is the clearest case). The picture,
the thing being edited, gets the smallest part of the screen, and there is no way to enlarge it but four fixed buttons (Fit, 100 %, 200 %, 400 %).

## Clarifications

- Q: Is it a new editor? -> A: No. The same editor, the same steps, the same services (`services/image/`) and the same results. Only the way it
  is opened, its layout and two controls change. *Edit image* of the Colour icon card and of the Outline icon card, and the two quick buttons
  that open it with a preset, open the editor on the picture of that icon.
- Q: Where does it open? -> A: As a **workspace that fills the tool window**, over the page, with its own title bar and Cancel and Apply. The page
  under it does not scroll. Cancel or Apply returns to the Look step where the user was.
- Q: What goes? -> A: The pixel reader by numbers (*Read the pixel at x, y*). The eyedropper (press the button, click the picture) stays: it is the
  way to read a colour. The four zoom buttons give way to a slider.
- Q: And what stays that someone might call "not needed"? -> A: Open another image, Undo, Redo, Reset, Save image as PNG, Show original, the
  background switch (checker, accent, white, black), the steps list, the tools, the quick presets and the accent colour suggestion. They are
  features of 004 that the user did not ask to remove; the user can name more to remove.

## User Scenarios & Testing

### User Story 1 - A big picture on the left, the tools on the right (P1)
The workspace has a title bar (what is edited, from which image), a **left** part with the picture as large as the window allows and a **right**
part with Quick, Tools, Steps and Colour, which scrolls on its own. The left part does not scroll with the right one. Under the picture, a strip
shows the result at the sizes of Teams (colour icon) or on the two app bars (outline icon).
**Tests**: the layout rules (CSS) and the order of the parts in the page; the right part is the one that scrolls.

### User Story 2 - Edit opens that icon in the same editor (P1)
*Edit image* on the Colour icon card opens the workspace for the colour icon (192 x 192); on the Outline icon card, for the outline icon (32 x 32).
The title says which. The picture shown is the one of that icon. *Outline from this icon* and *Teams-ready colour icon* of the cards open it with
their preset. While it is open the page behind is not reachable; Cancel and Apply close it.
**Tests**: each button opens the editor for its slot, the title and the size, the picture; Apply and Cancel close it.

### User Story 3 - A zoom slider (P1)
A slider from 10 % to 800 % in steps of 10 enlarges and reduces the picture; beside it the value (`Fit` or `250 %`), a **Fit** button and a
**100 %** button. With the Ctrl key, the mouse wheel on the picture zooms too. While the zoom is a number, the picture scrolls inside its area.
**Tests**: the slider changes the size of the canvas; Fit and 100 % set it; the value is shown; Ctrl and wheel zoom; the limits.

### User Story 4 - Nothing misaligned (P2)
The controls of the title bar, of the view bar and of the right part sit in rows with the same height and a fixed label column; no loose row of
number boxes remains.
**Tests**: no `ie-pixel` row; the order and the labels of the controls of each row.

## Requirements

- **FR-001** `#ie-card` is a workspace (`.ie-workspace`) that fills the tool window (`position: fixed; inset: 0`), hidden while no editor is open, with a title bar (`.ie-bar-top`), a body of two columns (`.ie-body`): left `.ie-left` and right `.ie-right`.
- **FR-002** `.ie-right` scrolls on its own (`overflow-y: auto`); `.ie-left` does not scroll with it; the picture area `.ie-stage` takes the height that is left (`flex: 1`).
- **FR-003** *Edit image*, *Outline from this icon* and *Teams-ready colour icon* open the workspace for the slot of their card; the title bar says "Edit colour icon" or "Edit outline icon" and the target size; the picture is the one of the slot (or of the colour icon for the outline preset).
- **FR-004** While the workspace is open the page behind it cannot be used with the pointer (it is covered) and `Escape` closes it as Cancel does.
- **FR-005** The pixel reader (`ie-pixel`, `ie-pick-x`, `ie-pick-y`, `ie-read`) is removed; the eyedropper reads the pixel under a click, with the hex, the alpha, the copy button and the four send buttons.
- **FR-006** The zoom is a slider `ie-zoom` (10 to 800, step 10) with a value `ie-zoom-value`, the buttons `ie-zoom-fit` and `ie-zoom-100`; the old buttons `ie-zoom-200` and `ie-zoom-400` are removed. The zoom is `Fit` or a number of percent.
- **FR-007** Ctrl and the mouse wheel on the picture change the zoom by 10 percent points per notch within the limits, and prevent the page from scrolling; the wheel alone scrolls.
- **FR-008** The strip with the result at the sizes of Teams stays (feature 004 FR-024, amended by 007: as the result is, not on the accent colour) and sits under the picture in the left part.
- **FR-009** Colours of the interface come from CSS custom properties; both themes readable; no emoji; no default checkbox; every control has a name.
- **FR-010** The services, the steps, the presets and the results of the editor are unchanged: the same package comes out of the same steps.

## Success Criteria

- SC-001 Every FR has a test in the traceability table of `tasks.md`; the tests of feature 004 that named a removed control are rewritten, not deleted without a replacement.
- SC-002 `npm run test:mutation` kills the mutants of the new lines of `imageEditor.ts`.
- SC-003 Not covered: how the workspace looks in PPTB at several window sizes in both themes, the feel of the slider, Ctrl and wheel in the host webview (manual checks).

## Amendment 2026-10-29 (second) - after the first hands-on use

Found by hand on the workspace: *Fit* and *100 %* did the same thing, the eyedropper was not wanted, and *Show original* showed no difference.

- **Fit is Fit.** *Fit* draws the picture as large as the area allows, whole, with its proportions kept, up and down (CSS: width and height 100 %, `object-fit: contain`); before, it only shrank a picture that was too big, so it was the same as 100 %. The value shown while on Fit is the size that this gives, rounded to a step of the slider (the smaller of the two sides decides). The **100 % button is removed**: the slider gives 100.
- **The eyedropper is removed** with everything that depended on it: the button `ie-pick`, the reading `ie-reading` (hex, alpha, copy) and the four send buttons `ie-send-bg`, `ie-send-solid`, `ie-send-fill`, `ie-send-accent`. A colour is typed or picked with the colour pickers of the steps, as before. (FR-005 amended: nothing reads a pixel any more.)
- **Show original shows the original.** It draws the icon of the slot **as it was in the package when it was opened** (not the picture the steps start from, which is the current icon or an image that was imported), and says so on the picture: a label `ie-view-label` "Original: the colour icon as it was in the package", with " (the same as now)" when the two pictures are identical, so that pressing it is never answered by silence. While the original is shown a drag on the picture makes no crop.

### Requirements changed or added

- **FR-005** (amended) The pixel reader by numbers and the eyedropper are removed, with the reading and the send buttons.
- **FR-006** (amended) The zoom is a slider `ie-zoom` with the value `ie-zoom-value` and the button `ie-zoom-fit`; `ie-zoom-100` is removed. Fit fills the area (see above).
- **FR-011** `Show original` draws `deps.originalIcon(slot)` (the icon of the package as opened), falling back on the source of the steps when the package has none, shows the label `ie-view-label`, and a drag makes no crop meanwhile.

Tests: `test/ui.workspace.test.ts` (Fit, no 100 %, removed ids), `test/ui.image.test.ts` ("Show original draws the icon as it was in the package", "still shows the package icon after an earlier Apply", "a drag ... does not make a crop").

## Amendment 2026-10-29 (third) - the redundant controls

An audit of the controls of the editor (asked by hand) found these that repeat another control or do not fit the workspace. They are removed, with their code.

| Removed | Why | What does the same |
|---|---|---|
| **Reset** (title bar) | it is Undo repeated until the list is empty | Undo, and the bin of each step |
| **Resize** (tool) | the result is brought to exactly 192 x 192 or 32 x 32 when applied, so a free resize has no use; it also needed the width and the height typed | *Fit*, *Make square* and Apply |
| **Make white**, **Make black** (tools) | a Solid colour with a fixed colour | *Solid colour* (the colour is typed or picked); for the outline icon, *Outline from this icon* and *Make the shape white* on its card |
| **Accent** (background of the canvas) | the accent colour is not drawn behind a picture any more (feature 007 amendment) | Checker, White, Black |
| the quick button of the **other icon** | *Teams-ready colour icon* made no sense while editing the outline icon, and *Outline from this icon* none while editing the colour icon | each icon shows its own quick button (`ie-preset-teams` for the colour icon, `ie-preset-outline` for the outline icon; the other has `hidden`) |

The operation `resize` (type, `defaultOp`, `applyOp`, `ops.resize`) and `pipeline.reset` go with them: nothing produced them any more. The resampling that Apply uses (`resizePicture`) stays and is tested directly.

Kept although a hand could call them overlapping, because each does something the others do not: *Open another image*, *Save image as PNG*, *Show original*, *Fill background*, *Outline maker*, the accent suggestion. The user can name more to remove.

- **FR-012** The title bar has Open another image, Undo, Redo, Save image as PNG, Cancel and Apply, in that order; the tools are Remove background, Trim, Crop, Make square, Fit, Rotate, Flip left-right, Flip top-bottom, Fill background, Solid colour, Tone, Outline maker; the canvas background is Checker, White or Black.

Tests: `test/ui.workspace.test.ts` ("no redundant control"), `test/ui.image.test.ts` (Undo without Reset, Solid colour), `test/image.pipeline.test.ts`, `test/image.ops.test.ts` (resampling through `resizePicture`).

## Amendment 2026-10-29 (fourth) - the icon cards only open the editor

Asked by hand (screenshot of the Look step): "too redundant here; only the Edit buttons should stay for the images; to change colours and the rest you go into the image editor."

The Colour icon card and the Outline icon card keep the **picture**, the line with the file and its size, the caption and **one button, Edit image**. Removed from them, with their code:

| Removed from the cards | Where the same thing is done now |
|---|---|
| **Choose a 192 x 192 PNG** / **Choose a 32 x 32 PNG** and the file input, and dropping a file on the card | *Open another image* in the editor (the result is brought to the exact size when applied) |
| **Revert** of each icon | *Revert all* at the top of the Look step; inside the editor, Undo and *Show original* |
| **Make background transparent** (colour icon) | *Remove background* in the editor (the same step, from the edges) |
| **Outline from this icon** and **Make the shape white** (outline icon) | *Outline from this icon* (the quick button of the outline icon in the editor) and *Solid colour* (white by default) |
| the **Preview colour** picker and the second picture of the outline icon on a bar | the strip under the picture in the editor shows the outline icon on a light and a dark bar |

The service `services/image/transparent.ts` (`makeTransparent`, `whiteShape`, `transparentState`) and `pickPng` of `files.ts` go too: nothing calls them any more. `ImageEditor.open(slot)` no longer takes a preset (the quick buttons are inside the editor).

The caption of an opaque colour icon now says: "...so the accent colour #X does not show behind it. Open the image editor and use Remove background to take it away."

- **FR-013** The Colour icon card and the Outline icon card have exactly one button, `ed-img-edit-color` and `ed-img-edit-outline` respectively (text "Edit image"), and no input, select or textarea; it is disabled while the editor is open on the other icon.
- **FR-014** `Revert all` is the only way back from the card level; the editor has Undo and *Show original*.

Tests: `test/ui.look.test.ts` ("the icon cards have one action, Edit image"), `test/ui.editor.test.ts` (the caption; Remove background in the editor), `test/ui.workspace.test.ts`, `test/ui.image.test.ts`.

## Amendment 2026-10-29 (fifth) - laid out like an image editor

Asked by hand (three screenshots, one of Photoshop's options bar): the zoom goes to 800 % which is too much (200 % at most), the space is used very badly (a wide empty area under the controls, the picture squeezed between a view bar and a tall strip of previews, tools in a loose column that wraps), and the editor should look like a professional image editor, with a grid.

**Layout** (the same parts, laid out as in Photoshop):

```
+--------------------------------------------------------------------------------------------+
| options bar: title | open | undo redo | save | canvas background | grid | original | cancel apply |
+----------+--------------------------------------------------------------+------------------+
| toolbox  |  ruler (top)                                                 | panels           |
| quick    |  r +---------------------------------------------------+     | steps            |
| tools    |  u |                                                   |     | colour           |
|          |  l |                    the picture                    |     | Teams preview    |
|          |  e |                                                   |     |                  |
|          |  r +---------------------------------------------------+     |                  |
+----------+--------------------------------------------------------------+------------------+
| status bar: size | pointer position |                          | Fit | zoom slider | value |
+--------------------------------------------------------------------------------------------+
```

- The **picture takes all the middle**: it is the only part that grows. The **toolbox** (Quick and Tools) is a narrow column on the left, the **panels** (Steps, Colour, the strip of Teams sizes) a column on the right that scrolls on its own; the strip of sizes is a panel, so it no longer takes height from the picture.
- The **zoom** is in the status bar, as in Photoshop, from **10 to 200 %** in steps of 10 (800 % was too much for an icon of 192 pixels).
- **Rulers** along the top and the left of the picture show its pixels (0 at the corner of the picture), with marks that are a round number of pixels apart and at least 48 screen pixels between two numbers; they follow the zoom and the scroll.
- A **grid** button in the options bar draws lines over the picture every 24 pixels (colour icon, 8 x 8 cells) or 4 pixels (outline icon), and for the colour icon the 120 x 120 safe area in the middle. It is a view only: it is never in the result.
- The **status bar** shows the size of the picture on the canvas, the pixel under the pointer (`x, y`, or a dash when the pointer is out of the picture), and the zoom.

### Requirements

- **FR-015** The zoom goes from 10 to 200 in steps of 10 (`ie-zoom`: `min=10`, `max=200`, `step=10`); the wheel with Ctrl stops at 10 and at 200.
- **FR-016** `.ie-workspace` is a column: options bar (`.ie-bar-top`), notes, `.ie-main` and status bar (`.ie-statusbar`); `.ie-main` is a grid of three columns, `.ie-toolbox` (fixed width), `.ie-canvas-area` (`minmax(0, 1fr)`) and `.ie-panels` (fixed width); the toolbox and the panels scroll on their own.
- **FR-017** The options bar has, in this order: Open another image, Undo, Redo, Save image as PNG, the canvas background (Checker, White, Black), Grid, Show original, then Cancel and Apply; the title is its first part.
- **FR-018** The toolbox has the quick button of the icon and the tools; the panels are Steps, Colour and the strip of the Teams sizes (`#ie-preview`), in that order.
- **FR-019** The status bar has `ie-size` ("192 x 192 pixels"), `ie-pos` and the zoom group (Fit, the slider, the value), in that order.
- **FR-020** Rulers `ie-ruler-h` and `ie-ruler-v`: `rulerStep(scale)` is the smallest of 1, 2, 5, 10, 20, 50, 100, 200, 500 that is at least 48 screen pixels at that scale; `rulerMarks` gives a numbered mark every step and, from step 5, a small one every fifth of it, only inside the picture.
- **FR-021** `ie-grid` (`aria-pressed`) shows or hides `#ie-grid-overlay`, which covers the picture exactly (its size is the picture size times the scale) with lines every 24 or 4 pixels, and the safe area box `ie-safe` (colour icon only, 120 x 120 pixels, centred).
- **FR-022** The pointer over the picture writes the pixel in `ie-pos`; leaving it writes a dash. Nothing is written while the original is shown.

Not covered by automatic tests: how the rulers, the grid lines and the panels look, and the feel of the layout at several window sizes in both themes (manual checks 7 to 9 of the quickstart).

Tests: `test/ruler.test.ts` (steps and marks, by hand), `test/ui.workspace.test.ts` (layout, order of the controls, grid, status bar, zoom limits), `test/ui.image.test.ts`.

## Amendment 2026-10-29 (sixth) - a professional toolbox, a history, rules

Asked by hand: the tools on the left, separated by category with a title and enterprise SVG icons as in a professional application; all the history, with the effects in sequence, on the right; the result at the sizes of Teams in the centre; *Suggest accent colour* and *Use as accent colour* gone; Undo, Redo and Revert all on the right next to Cancel and Apply, with Revert all, which is destructive, reddish; colours by function; tools that exclude each other switched off and on by the combinations; and each effect at most once.

### Layout and colours

- The **options bar**: on the left the title, Open another image, Save image as PNG, the canvas background, Grid and Show original; on the right, after a spacer, **Undo, Redo, Revert all, Cancel, Apply**.
- **Revert all** (`ie-revert-all`, icon trash, class `btn--danger`) takes away every step in one change, so that Undo brings them all back; it is off while the history is empty. It leaves the picture the steps started from (an imported image stays).
- The **toolbox** (left) has five groups, each with a title, an icon of the set and a colour of its own (`--cat-quick`, `--cat-background`, `--cat-geometry`, `--cat-colour`, `--cat-outline`, defined in both themes and used through `--cat`): **Quick** (Teams-ready colour icon, Outline from this icon), **Background** (Remove background, Fill background), **Geometry** (Trim, Crop, Make square, Fit, Rotate, Flip left-right, Flip top-bottom), **Colour** (Solid colour, Tone), **Outline** (Outline maker). Each tool has an icon of the set (eight were added: redo, bucket, trim, square, frame, flip-v, contrast, shape).
- Colours by function: group colours for the tools and the lines of the history; **red** (`--color-error`, on its soft background) for what destroys, that is Revert all; **primary** for Apply and the quick buttons; neutral for Undo, Redo, Cancel and the file buttons; grey with the reason for what is switched off.
- The **history** is the right column and its only content: each step is numbered, has the icon of its effect and the colour of its group (`data-cat`), then its settings. *Suggest accent colour* and *Use as accent colour* are removed, with `onAccent` and `dominantColour`.
- The **result** (`#ie-preview`) is in the centre, under the picture, as one strip: the colour icon at 96, 48 and 32 pixels (the 192 is the picture itself), or the outline icon on a light and a dark bar.

### Rules of the history

- **Each effect once** (FR-026): a tool is switched off while its effect is in the history, with the reason as its title ("Rotate is already in the history (step 1). Remove that step to add it again."); removing the step, or Undo, or Revert all, switches it on again. The two flips are two effects. A click on a switched-off button does nothing.
- **Effects that do not go together** (FR-027): the Outline maker with Solid colour, Tone and Fill background, and Solid colour with Tone; both ways. The title of the switched-off button says which step is in the way ("Solid colour does not go with Outline maker, which is step 2 of the history. Remove that step first.").
- The **quick buttons** follow the same rules for each of their steps: one is off when any of its steps would be repeated or would clash, and says which.
- The rules are a pure function (`services/image/rules.ts`: `toolKey`, `blockOf`, `blockText`, `presetBlockText`), tested by hand in `test/image.rules.test.ts`; the view only switches the buttons.

### Requirements

- **FR-023** The options bar has, in this order: Open another image, Save image as PNG, the canvas background, Grid, Show original, then Undo, Redo, Revert all, Cancel, Apply.
- **FR-024** Revert all removes every step in one change (Undo restores them), is off with no step, and is `btn--danger`; Apply is `btn--primary`; no other button of the bar is red.
- **FR-025** The toolbox has the five groups above, in this order, each with a title, an icon and a colour token; every tool has an icon; the buttons of a group have different icons (the two flips differ by the direction).
- **FR-026** Each effect at most once (see above), shown by switching the button off and by its title.
- **FR-027** The four clashes (see above), both ways, shown the same way.
- **FR-028** The right column is the History (`h4` "History"); each step has `data-cat`, its number and its icon.
- **FR-029** The strip of results is the second child of `.ie-center`, sizes 96, 48 and 32.
- **FR-030** `ie-accent-*`, `onAccent` and `dominantColour` do not exist.
- **FR-031** `.ie-main` has the children `.ie-toolbox`, `.ie-center`, `.ie-panels`.

Not covered by automatic tests: how the groups, the colours, the red of Revert all and the strip look in PPTB in both themes (manual checks 10 to 12).

Tests: `test/image.rules.test.ts`, `test/ui.workspace.test.ts` ("the toolbox by category", "Undo, Redo and Revert all", "each effect once", "the history and the result in the centre", "the colour section is gone"), `test/image.pipeline.test.ts` (reset), `test/ui.image.test.ts`.

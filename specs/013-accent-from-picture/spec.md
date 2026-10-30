# Feature 013: Accent colour from the picture

**Status**: built, 2026-10-30. **Principles**: I (removes a manual step between the icon and the result), II (local,
nothing leaves the window), III (says what it does not cover), VII (labels are words).

## Problem

The accent colour should match the icon background (Microsoft Learn: admin center customization, "must match your
icon background"). Today the user reads the colour of the icon by eye or with another program and types the hex
into the Accent colour field. The window's own colour picker (`input type=color`) shows a palette, not the picture.

## What the user can do

A popup, "Accent colour from the picture", shows a picture; the user clicks a pixel (or moves with the arrow keys),
sees its colour, and presses **Use this colour** (OK). The accent colour field takes that colour. Nothing else changes.

It is reachable from both places the colour icon is worked on:

1. **Look step, accent colour row**: button *From the picture* beside the colour picker. Uses the colour icon as the
   new package will hold it.
2. **Look step, colour icon card**: button *Accent from picture* beside *Edit image*. Same popup, same picture.
3. **Image editor**: button *Accent from picture* in the options bar. Uses the picture on the canvas as it is now
   (with the steps already applied), so the colour can be taken from the result before pressing Apply.

## Requirements

- **FR-001** The popup opens from the three places above and from nowhere else.
- **FR-002** Click on the picture chooses the pixel under the pointer; the pointer's colour is shown while moving.
- **FR-003** Keyboard: the canvas takes focus; arrows move the choice by one pixel, Shift+arrow by ten, Enter uses
  it, Escape cancels. The first arrow starts at the centre of the picture.
- **FR-004** Only a **fully opaque** pixel has a colour. A fully see-through pixel and a partly see-through one are
  refused with a message that says which; an earlier valid choice is kept.
- **FR-005** *Use this colour* is off until a valid pixel is chosen. Opening always starts with nothing chosen.
- **FR-006** *Use this colour* writes `accentColor` as lower-case `#rrggbb` through the normal edit path (the field,
  the Before/After band, the checks, Revert and the saved package follow it), and closes the popup.
- **FR-007** *Cancel*, Escape and a click on the dark area close it and change nothing. A click inside the panel
  does not close it. Escape in the popup does not also close the image editor behind it.
- **FR-008** The popup shows the accent colour as it is now, the colour under the pointer and the chosen colour.
- **FR-009** The two Look buttons are off, with the reason as title, when the colour icon is missing or not a PNG
  the tool can read, and while the image editor is open (it has its own button). The image editor's button is off
  for the outline icon (it is white: it has no colour to give).
- **FR-010** The image editor is untouched by the pick: no step is added, the picture is the same, Cancel of the
  editor does not undo the accent colour (it is a manifest field, not part of the picture).

## Not covered / out of scope

- Not an eyedropper over the whole screen (the window's `EyeDropper` is not used: the tool reads only its own
  pictures, Principle II).
- A partly see-through pixel is not blended with anything: the accent colour is one opaque colour and the surface
  behind the icon is not known (Verified Facts, 2026-10-29).
- Whether Teams shows the picked colour as the tile behind a see-through icon is unknown; the final check is a test
  in Teams (quickstart, manual).

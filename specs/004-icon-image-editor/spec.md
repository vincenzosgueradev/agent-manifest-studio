# Feature Specification: Icon Image Editor

**Feature Branch**: `004-icon-image-editor`

**Created**: 2026-10-27

**Amended 2026-10-29**: the tiles of the colour icon beside the working canvas (Q on line 42, user story 4 and FR-024) show the result **as it is**, on a chequerboard where it is see-through, and no longer "on the accent colour": Microsoft Learn does not say where Teams draws the accent colour (constitution 1.6.1). The canvas background switch (checker, accent colour, white, black; FR-025) stays: it is the user's own choice of view, not a claim about Teams. Test: `ui.image` ("draws the four Teams sizes as the result is", "an opaque result has no chequerboard").

**Amended 2026-10-29 (feature 009)**: the editor is a workspace over the page (picture left, tools right, own title bar), *Edit image* opens it for the icon of its card, the pixel reader by numbers is gone, the four zoom buttons are a slider with Fit and 100 %, Ctrl and wheel zoom, Escape closes. Services, steps, presets and results are unchanged. The eyedropper (FR-021, user story 3 and its reading) was removed on the same day, and *Show original* shows the icon of the package as opened. Reset, Resize, Make white, Make black and the accent background of the canvas were removed as redundant, and each icon shows only its own quick button. The colour suggestion (*Suggest accent colour*, FR-022) was removed; each effect can be in the history once and some do not go together (sixth amendment of 009). See `specs/009-image-editor-workspace/`.

**Status**: Draft

**Input**: User description: "An advanced image editor for the two icons of the package, in the spirit of a desktop image editor but made for this one job: remove the background, make it transparent, crop and fit, change colours, pick colours from the image, and produce a Teams-ready colour icon and a white outline icon from any picture. Everything is done in the tool, on the user's computer, with undo, a before and after comparison and the real Teams-style preview next to it."

## Context

Feature 003 lets the user replace the colour icon and the outline icon with a PNG of exactly the right
size. In practice the user rarely has that PNG. They have a logo with a white or coloured background,
a picture that is not square, a JPEG, a coloured logo where the outline icon needs a white silhouette,
or a logo that touches the edges when Teams wants it inside a safe area. Today they leave the tool,
open a desktop editor, fix the image, export it, come back and choose the file.

This feature closes that loop. The tool gets an **image editor** that opens from each icon card, works
on the picture with a short list of tools chosen for what an app icon needs, shows the effect as it is
made, and puts the result in the package at the exact size. It is not a general-purpose editor: every
tool is there because an icon for Teams needs it, and the result is checked by the same icon rules as
any other icon.

It stays local (Principle II): the picture is read from a file the user chooses, edited in the tool,
and saved only into the package the user saves. Nothing is uploaded and no network call is added.

## Clarifications

### Session 2026-10-27

Decided in autonomous mode by choosing the recommended option; the user can overrule any of them.

- Q: Where does the editor open? → A: A button "Edit image" on each icon card (colour and outline) opens a full-width "Image editor" card below the two icon cards, inside the Look step (step 3 since 2026-10-28; it was step 2 when written). One editor is open at a time. "Apply" puts the result in the package as the icon (the same replacement as choosing a file, so it appears in the preview, the checks and the Changes table); "Cancel" discards the work.
- Q: What does the editor start from? → A: The icon as it is now in the new package (replaced or original). The user can instead press "Open another image" to start from a file. PNG is always read by the tool's own reader. JPEG, WebP, GIF and SVG are read through the decoder of the host window when it has one, and the tool says when it could not read a format. A picture larger than 1024 pixels on its longer side is reduced to that size on import, and the editor says so.
- Q: How are the edits kept? → A: As a list of operations applied in order to the imported picture (non-destructive). Each tool adds one operation; the result is always computed from the picture and the list, so undo, redo (up to 50 steps), "Reset" and changing an earlier operation's value are exact. The list is shown, each entry with its name and values and a button to remove it.
- Q: Which tools exist? → A: Background removal, make transparent, crop, trim, fit, resize, rotate and flip, recolour, tone, outline maker, background fill, eyedropper and accent suggestion; listed in the functional requirements. A tool that is not an icon need (layers, brushes, text, filters) is out of scope.
- Q: What is the working resolution and the output? → A: The editor works on the imported picture (at most 1024 px). On Apply the result is brought to exactly 192 x 192 (colour icon) or 32 x 32 (outline icon) with an area-averaging reduction (or bilinear enlargement) and written as an 8-bit RGBA PNG, not interlaced, by the tool's own encoder.
- Q: What does the background tool do? → A: Two modes. "From the edges" removes the colour that touches the image border and the pixels connected to it (the usual white or flat background, leaving white inside the logo untouched). "Everywhere" removes that colour wherever it appears. Both take a tolerance (0 to 100 percent of the distance between black and white), a softness that fades the edge instead of cutting it, and a matte control that shrinks or grows the cut by 0 to 5 pixels to remove halos. The colour to remove starts as the most common colour of the four corners and can be changed with the eyedropper or a hex value.
- Q: What does recolour do for the outline icon? → A: "Outline maker" turns any picture into a white silhouette on transparent (every visible pixel pure white, alpha kept, or from brightness when the picture has no transparency), the exact form the outline icon check asks for. Offered as a one-click preset on the outline card and as a tool.
- Q: Is there a one-click path? → A: Yes, two presets: "Teams-ready colour icon" (remove an edge background when there is one, trim, fit the logo into the safe area, make it square at 192 x 192) and "Outline from this icon" (outline maker, trim, fit at 32 x 32). Presets add ordinary operations to the list, so the user can see and change them.
- Q: How does the user see the result? → A: Beside the working canvas the editor draws the picture the way the preview step does: on the accent colour at 192, 96, 48 and 32 pixels for the colour icon, and on a light and a dark app bar for the outline icon. A "Show original" toggle compares with the picture as imported, and a background switch (checker, accent colour, white, black) and zoom (fit, 100, 200, 400 percent) help to judge edges.
- Q: What does Apply refuse? → A: Nothing that the tool can fix: the size is always made exact. It refuses only an empty result (everything transparent) and a result whose PNG is over 100 KB, naming the cause; between 72 and 100 KB it applies and the existing weight check warns.
- Q: Does it keep the user's original picture? → A: The file is never changed. The editor keeps the imported picture in memory for the session of the editor only; Cancel, Apply, replacing the package or closing the tool forget it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Turn a logo with a background into a Teams icon (Priority: P1)

The user has a company logo as a PNG or JPEG on a white background, not square. They press "Edit
image" on the colour icon card, open the file, press "Teams-ready colour icon", look at the
preview on the accent colour, adjust the tolerance of the background removal until the edge is
clean, and press Apply. The icon in the package is a 192 by 192 PNG with a transparent background
and the logo inside the safe area.

**Why this priority**: it is the whole reason for the feature, and it combines the tools that matter
most (background removal, trim, fit, resize, output).

**Independent Test**: from a generated picture (a coloured glyph on a white background, 300 by 200),
apply the preset and Apply; read the icon from the saved package and check size, the transparency of
the corners, that the glyph pixels keep their colour, and that no glyph pixel is outside the safe
area.

**Acceptance Scenarios**:

1. **Given** the colour icon card, **When** the user presses "Edit image", **Then** the editor opens
   with the current icon on its canvas, the list of operations is empty and nothing has changed in the
   package.
2. **Given** a picture on a flat white background, **When** the user adds "Remove background" in
   mode "From the edges" with the default tolerance, **Then** the border-connected white becomes
   transparent and a white area enclosed by the logo stays opaque.
3. **Given** a picture that is not square, **When** the user presses "Teams-ready colour icon",
   **Then** the operations trim, fit and resize appear in the list and the result is square, 192 by
   192, with the logo inside the central 120 by 120 pixels.
4. **Given** edits on the canvas, **When** the user presses Apply, **Then** the editor closes, the
   icon card says "replaced", and the preview, the checks and the Changes table use the new image.
5. **Given** edits on the canvas, **When** the user presses Cancel, **Then** nothing in the package
   changed.

---

### User Story 2 - A white outline icon from the colour icon (Priority: P1)

The outline icon must be white on transparent at 32 by 32. The user presses "Outline from this
icon" on the outline card: the tool takes the colour icon, makes a white silhouette, fits it and
applies it, and the outline check passes.

**Why this priority**: the outline icon is the one users most often get wrong, and the rule is exact
enough to be automated.

**Independent Test**: from a generated coloured glyph, run the preset and apply; check that every
visible pixel of the saved 32 by 32 icon is pure white and that the silhouette equals the alpha
shape of the source after resizing.

**Acceptance Scenarios**:

1. **Given** the outline card, **When** the user presses "Outline from this icon", **Then** the
   editor opens on the colour icon with the outline maker, trim and fit already in the list, at 32 by
   32.
2. **Given** a picture without transparency (a dark logo on white), **When** the outline maker runs
   with the brightness mode, **Then** the dark shape becomes the white silhouette and the light
   background becomes transparent.
3. **Given** the result is applied, **When** the checks run, **Then** "Outline icon is white on
   transparent" and "Outline icon is 32 x 32 pixels" pass.

---

### User Story 3 - Recolour, tone and pick colours (Priority: P2)

The user wants the glyph in the brand colour, a darker or lighter version, or to take the colour from
the picture. They use the eyedropper on the canvas, see the hex value, set it as the solid colour of
the glyph, adjust brightness and contrast, and press "Use as accent colour" so that the accent colour
of the manifest matches the picture.

**Why this priority**: it makes icons consistent with the brand and fixes the common mismatch between
icon background and accent colour, but the icon can be made without it.

**Independent Test**: pick a pixel with the eyedropper at known coordinates and check the hex; apply
"Solid colour" and check that every opaque pixel has that colour and the alpha is unchanged; press
"Use as accent colour" and check the accent colour field.

**Acceptance Scenarios**:

1. **Given** the eyedropper active, **When** the user clicks a point of the canvas, **Then** the hex
   value of that pixel is shown with a swatch and a copy button, and it can be sent to the background
   colour, the recolour colour or the accent colour.
2. **Given** "Solid colour" with a colour, **When** it is added, **Then** every pixel that was
   visible takes the colour and keeps its alpha, and transparent pixels stay transparent.
3. **Given** hue, brightness, contrast, saturation, invert and grayscale controls, **When** the user
   moves one, **Then** the canvas and the preview change as the value changes.
4. **Given** "Suggest accent colour", **When** pressed, **Then** the tool proposes the most common
   non-background colour of the picture as a swatch and a hex, and applies it only when the user
   accepts.

---

### User Story 4 - Crop, fit, rotate and flip (Priority: P2)

The user crops to the part of the picture that matters (by dragging on the canvas or typing the
numbers), trims the empty border, makes the picture square without stretching it, scales the logo to
a chosen share of the icon, and rotates or flips it.

**Why this priority**: framing is needed for almost every real picture, but the presets of story 1
already cover the common case.

**Independent Test**: crop a generated picture to a known rectangle and compare with the expected
pixels; trim a picture with a known bounding box; fit with a known margin and check the bounding box
of the result.

**Acceptance Scenarios**:

1. **Given** the crop tool, **When** the user drags a rectangle (or types left, top, width, height),
   **Then** the rectangle is drawn over the picture with its size in pixels, and Apply crop cuts the
   picture to it; typing outside the picture is refused with the reason.
2. **Given** "Trim", **When** added, **Then** the picture is cut to the box that holds every pixel
   that is not fully transparent (or not the background colour when there is no transparency).
3. **Given** "Make square" and "Fit", **When** added with a margin, **Then** the logo is scaled
   without stretching so that its box fits inside the chosen share of the icon and is centred.
4. **Given** rotate by 90 degrees and flip horizontally or vertically, **When** added, **Then** the
   pixels move exactly (four rotations return the original).

---

### User Story 5 - History, comparison and honest preview (Priority: P1)

The user can undo and redo every change, remove or edit an earlier operation, reset to the imported
picture, compare with the original, and always sees how the icon will look in Teams.

**Why this priority**: an editor that cannot be undone or compared is not safe to use, and the
preview is the point of the whole tool.

**Independent Test**: add several operations, undo and redo through them and check the result after
each step against the expected pixels; remove the second operation and check that the result equals
applying the others in order.

**Acceptance Scenarios**:

1. **Given** operations in the list, **When** the user presses Undo, **Then** the last operation
   leaves the list and Redo brings it back, up to 50 steps.
2. **Given** an operation in the middle of the list, **When** the user changes its value or removes
   it, **Then** the result is exactly the picture with the remaining operations applied in order.
3. **Given** "Show original", **When** held or toggled, **Then** the canvas shows the picture as
   imported, and releasing it shows the result again.
4. **Given** the colour icon, **When** the user looks at the editor, **Then** the result is drawn on
   the accent colour at the Teams sizes next to the canvas, with the safe-area guide switch of the
   preview, and the outline icon is drawn on a light and a dark app bar.

---

### Edge Cases

- A picture that is not readable (damaged, a format the host cannot decode, a PNG of a kind the
  reader does not support such as 16-bit or interlaced when no host decoder exists) is refused with
  the cause, and the editor stays on the current picture.
- A picture over the size limits (file above 5 MB, a side above 4096 pixels for the tool's own PNG
  reader) is refused with the limit.
- A picture with a very large area is reduced to 1024 pixels on its longer side on import, and the
  editor says the size before and after.
- Background removal on a picture with no transparency and a photographic background cuts a ragged
  shape; the tolerance, softness and matte controls exist for this and the preview shows the result
  at once.
- Removing the background from a picture whose logo has the same colour as the background removes the
  logo too; the result being empty is detected and Apply is refused with the reason.
- Operations that have no effect (rotate by 0, recolour with the same colour) are allowed and listed,
  and do not change the pixels.
- A crop rectangle of zero size, outside the picture or with negative values is refused with the
  reason.
- Eyedropper on a transparent pixel reports "transparent" with its underlying colour values and does
  not offer it as a recolour colour.
- Undo with an empty list and Redo with nothing to redo are disabled.
- Changing the picture ("Open another image") while operations exist asks for nothing and keeps the
  operations that make sense (they are applied to the new picture); the user can Reset.
- Closing the editor with Cancel while operations exist discards them without a prompt; the list is
  cheap to rebuild and nothing was applied.
- Applying twice in a row from the same editor session is allowed: the second Apply replaces the first
  result.
- A result of fully opaque pixels (no transparency) is valid for the colour icon; for the outline icon
  the outline check reports it, the editor does not block it.

## Requirements *(mandatory)*

### Functional Requirements

**Opening and closing**

- **FR-001**: Each icon card MUST have an "Edit image" button that opens the Image editor card below
  the icon cards with the icon as it is now in the new package; the colour icon editor works at 192 by
  192 as its target and the outline icon editor at 32 by 32.
- **FR-002**: The user MUST be able to start from another image with "Open another image": a PNG is
  read by the tool; JPEG, WebP, GIF and SVG are read through the host window's decoder when it exists;
  a file that cannot be read is refused with the cause and the current picture stays.
- **FR-003**: A picture larger than 1024 pixels on its longer side MUST be reduced to that size on
  import with a visible note of the size before and after; a file above 5 MB MUST be refused.
- **FR-004**: "Apply" MUST put the result in the package through the same replacement as choosing an
  icon file (so the preview, the checks, the Changes table and the saved package use it) and close the
  editor; "Cancel" MUST discard the work and change nothing.
- **FR-005**: Only one editor MUST be open at a time; opening the other icon's editor while one has
  operations MUST keep the first editor's work until Apply or Cancel (the second button is disabled
  with the reason).

**History**

- **FR-006**: Every change MUST be an operation in an ordered list shown to the user with its name and
  values; the picture on screen MUST always be the imported picture with the list applied in order.
- **FR-007**: Undo and Redo MUST work over at least 50 steps; "Reset" MUST empty the list; removing or
  editing an operation MUST recompute the result from the picture and the remaining list.
- **FR-008**: "Show original" MUST show the imported picture while pressed or toggled on.

**Background**

- **FR-009**: "Remove background" MUST offer the modes "From the edges" and "Everywhere", a colour to
  remove (starting as the most common colour of the four corners, changeable with the eyedropper or a
  hex value), a tolerance of 0 to 100 percent, a softness of 0 to 100 percent and a matte of -5 to +5
  pixels.
- **FR-010**: In "From the edges" a pixel MUST be removed only when it is within the tolerance of the
  colour and connected to the image border through pixels that are; in "Everywhere" every pixel within
  the tolerance MUST be removed.
- **FR-011**: Softness MUST fade the alpha of pixels near the tolerance limit instead of cutting them,
  and a positive matte MUST grow the removed area and a negative one shrink it by that many pixels.
- **FR-012**: "Make transparent" for a chosen colour MUST be available as the quick form of
  "Everywhere" with the eyedropper; "Fill background" MUST flatten the picture onto a chosen colour
  (with a one-click "accent colour" choice) and the result MUST be fully opaque.

**Framing**

- **FR-013**: "Crop" MUST accept a rectangle given by left, top, width and height (in pixels) and by
  dragging on the canvas, MUST show the rectangle and its size, and MUST refuse a rectangle that is
  empty or outside the picture with the reason.
- **FR-014**: "Trim" MUST cut the picture to the smallest box that holds every pixel that is not fully
  transparent, or, when the picture has no transparency, every pixel that differs from the background
  colour by more than the tolerance; an empty picture MUST be left unchanged and said so.
- **FR-015**: "Make square" MUST pad the shorter side with transparency (or the fill colour chosen)
  without stretching; "Fit" MUST scale the picture, keeping its proportions, so that its box fits in
  the chosen share of the target (margin as a percentage) and centre it; a "safe area" shortcut MUST
  set the share so that the logo fits the central 120 by 120 pixels of a 192 by 192 icon.
- **FR-016**: "Rotate" (90, 180, 270 degrees) and "Flip" (horizontal, vertical) MUST move pixels
  exactly, with no resampling.
- **FR-017**: "Resize" MUST reduce with area averaging and enlarge with bilinear interpolation, and MUST
  be what brings the final picture to the exact target size on Apply.

**Colour**

- **FR-018**: "Solid colour" MUST give every visible pixel a chosen colour and keep its alpha;
  "Make white" and "Make black" MUST be its one-click forms.
- **FR-019**: The tool MUST offer hue shift (-180 to 180 degrees), saturation, brightness and contrast
  (-100 to 100 percent), invert, grayscale and a threshold, each as an operation with its value,
  each leaving alpha unchanged.
- **FR-020**: "Outline maker" MUST produce a white silhouette on transparent: in "alpha" mode every
  pixel with alpha above a cutoff becomes pure white with its alpha; in "brightness" mode the darkness
  of the pixel decides the alpha; the result MUST pass the outline icon check "white on transparent".
- **FR-021**: The eyedropper MUST show the hex value and alpha of the clicked pixel with a swatch and a
  copy button, and MUST send the colour to the background removal colour, the solid colour, the fill
  colour or the accent colour of the manifest; a transparent pixel MUST be reported as transparent and
  not be offered.
- **FR-022**: "Suggest accent colour" MUST propose the most common colour of the pixels that are not
  background and are opaque, as a swatch and hex, and MUST change the accent colour of the manifest
  only when the user accepts.

**Presets**

- **FR-023**: "Teams-ready colour icon" MUST add, as ordinary operations, background removal (only when
  the border colour covers most of the border), trim, fit in the safe area and make square, and the
  result MUST be 192 by 192 on Apply; "Outline from this icon" MUST add outline maker, trim and fit at
  32 by 32.

**Preview and output**

- **FR-024**: Beside the canvas the editor MUST draw the result as the preview step does: the colour
  icon on the accent colour at 192, 96, 48 and 32 pixels with the safe-area guide switch, and the
  outline icon on a light and on a dark app bar; and MUST state what the preview does not cover.
- **FR-025**: The canvas MUST offer a background switch (checker, accent colour, white, black) and zoom
  (fit, 100, 200, 400 percent), both only for viewing and never part of the result.
- **FR-026**: On Apply the result MUST be brought to exactly the target size and written as an 8-bit
  RGBA PNG, not interlaced, by the tool's own encoder; the encoder output MUST be read back identically
  by the tool's own PNG reader.
- **FR-027**: Apply MUST be refused, with the cause, when the result is fully transparent or the PNG is
  over 100 KB; between 72 and 100 KB it MUST apply and the weight check warns.
- **FR-028**: The user MUST be able to save the result as a PNG file with the host's save dialog
  ("Save image as PNG"), independent of Apply.

**Cross-cutting**

- **FR-029**: The editor MUST NOT use the network, MUST NOT write to any environment, and MUST NOT
  send the picture anywhere; the picture MUST be forgotten when the editor is closed, the package is
  replaced or removed, or the tool is closed.
- **FR-030**: Every tool MUST be usable without a mouse drag: each canvas interaction (crop, eyedropper)
  MUST have an equivalent with typed numbers or keys and every control MUST have an explicit label and be
  reachable by keyboard; controls and the canvas frame MUST be readable in the light and in the dark
  theme and use no emoji.
- **FR-031**: A change on a 1024 by 1024 picture with the usual steps MUST be computed in under one
  second; the editor MUST measure each change and, when it took more than 200 ms, say so with the size of
  the picture (the work runs on the page and cannot show a busy sign while it runs; running it in a
  background thread is left for a later release).
- **FR-032**: The README section "What this tool changes" and the constitution MUST say that the tool
  edits images locally and writes only the package the user saves; a test MUST fail if the README does
  not mention the image editor.

### Key Entities

- **Picture**: the imported image as 8-bit RGBA with width and height (at most 1024 on the long side)
  and a name.
- **Operation**: one step of the list: a kind (remove background, trim, crop, fit, resize, rotate,
  flip, solid colour, tone, outline maker, fill) and its values.
- **Pipeline**: the picture plus the ordered operations, with undo and redo stacks; the result is a
  function of these two only.
- **Eyedropper reading**: the colour and alpha at a pixel.
- **Preset**: a named group of operations added together.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can turn a logo on a flat background into a Teams-ready colour icon and apply it in
  under one minute with two clicks (preset and Apply) and no leaving the tool.
- **SC-002**: A user can produce a valid white outline icon from the colour icon in one click and Apply;
  the outline icon checks pass in 100% of the cases tested.
- **SC-003**: For every operation, the result equals the expected pixels computed by an independent
  oracle over the tested pictures, with no tolerance for the exact operations (crop, trim, rotate,
  flip, solid colour, fill) and a stated bound for the resampling ones.
- **SC-004**: Undo, Redo, removing and editing an operation give a result identical to applying the
  remaining operations in order, over every combination tested.
- **SC-005**: A PNG written by the tool is read back pixel for pixel by the tool's reader and by an
  independent reader in the tests, for every size and content tested.
- **SC-006**: A 1024 by 1024 picture is edited with a visible response to each change in under one
  second on a typical computer.
- **SC-007**: The editor adds no network call and no write method of the host APIs, proven by the
  existing test, and the README states what it does.

## Assumptions

- Users work on one icon at a time and on logos and simple graphics, not photographs.
- The host window can decode JPEG, WebP, GIF and SVG for drawing; this is not assumed to be true in
  every host, so only PNG is guaranteed and the others are best effort, recorded as UNVERIFIED in
  research.md and checked by hand.
- The preview and the editor are an approximation of what Teams draws; the final judgement remains a
  test in Teams.
- Layers, brushes, text, selections by hand, filters such as blur, shadows or gradients, and several
  pictures at once are out of scope.
- The colour icon's background rule of Microsoft ("solid or fully transparent") means a flat result is
  preferred; the editor does not enforce it, the existing checks report what they can.

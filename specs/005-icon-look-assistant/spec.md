# Feature Specification: Icon Look Assistant

**Feature Branch**: `005-icon-look-assistant`

**Created**: 2026-10-28

**Amended 2026-10-29 (second)**: the quick fixes of the cards (*Make background transparent*, *Make the shape white*) and the colour to try on the outline icon were removed from the cards; what they did is done in the image editor (specification 009).

**Amended 2026-10-29**: FR-001 to FR-003 changed by feature 007: the button is disabled when the icon is already see-through (it no longer answers with a message), it is highlighted when the icon needs it, the second picture on the accent colour is gone and the caption of a see-through icon no longer says that Teams puts the accent colour behind it.

**Superseded (2026-10-28)**: the suggestions (user story 4, FR-010 to FR-016) were removed from the tool; "Logo without background" (FR-004, FR-008 in part) was removed by feature 007.

**Earlier note**: "Logo without background" (FR-004, FR-008 in part) was removed, the suggestions became a gallery of presets and moved below the icon cards.

**Status**: Implemented (written after the code; see "How this spec was made")

**Input**: User description: "Everything done after the image editor must be a specification: the one-click actions on the icon cards (make the background transparent, logo without background, make the outline shape white), the colour to try on the outline icon, the suggested complete designs, and the notice about the version in the Save step."

## Context

Feature 004 gives the user a full image editor. Most users do not need a full editor: they need one
or two things done to the icon, and they need to know what a good icon is. Testing the tool by hand
showed four gaps:

1. A colour icon with a flat background hides the accent colour. The user did not know that, and the
   editor needed several steps to fix it.
2. The outline icon is the icon of the left bar of Teams. Teams draws only its shape, in the colour of
   its bar. Users did not know this and uploaded coloured icons.
3. The user did not know which combination of colour icon, accent colour and outline icon looks right.
4. After editing, the saved package kept the old version, and Teams and the admin center refuse an
   upload that is not newer ("Must upload a newer version of the title than what is already present").

This feature closes the four gaps with short actions and honest explanations. It adds no network call,
no write to an environment and no new dependency (Principle II); everything is computed in the window
on the icon that is in the new package.

## How this spec was made

The behaviour existed before the spec. The requirements were written from the code
(`src/services/image/transparent.ts`, `recommend.ts`, `src/view/editor.ts`, `exportPanel.ts`,
`src/app.ts`), from the tests that already assert each behaviour (traceability in `tasks.md`) and from
the changelog. Where a number appears (62.5 percent, 4.5 : 1, 3 : 1, 5 percent) it is the number the
code uses.

## Clarifications

### Session 2026-10-28

- Q: Extension of feature 004 or its own feature? → A: Its own. 004 is the editor with a list of
  operations; these are one-click shortcuts and advice on the cards of step 3 (Look). They reuse the
  operations of 004 but not its editor state.
- Q: Do the shortcuts go through the image editor? → A: No. They read the icon now in the new package,
  compute, and replace it through the same path as choosing a file (`acceptIcon` / `acceptResult`), so
  the result is brought to exactly 192 x 192 or 32 x 32, checked for the 100 KB limit, and shown in the
  preview, the checks and the Changes table like any other replacement. Revert puts back the original.
- Q: Is "nothing to take away" an error? → A: No. It is information (not red). A real problem (the edges
  are not one flat colour, the icon cannot be read, the result is refused) is an error (red).
- Q: Who chooses the colour of the outline icon? → A: Teams. The tool previews a colour only to show the
  shape on the bar; the preview colour is never saved and never changes the file.
- Q: Are suggestions a verdict on taste? → A: No. They are a starting point built on the guidance the
  tool already checks (safe area, contrast, see-through background, white outline). Each says why.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Make the background of the colour icon transparent in one click (Priority: P1)

A user has a colour icon with a flat colour behind the logo. They press "Make background transparent".
The flat colour that touches the edges goes, the logo (including the same colour inside it) stays, and
the accent colour now shows behind the logo.

**Why this priority**: it fixes the most common bad icon with one action, and explains why.

**Independent Test**: load a package whose colour icon is a logo on a flat colour; press the button; the
icon is replaced, the corners are see-through, the pixels inside the logo are unchanged.

**Acceptance Scenarios**:

1. **Given** an icon with a flat border colour, **When** the button is pressed, **Then** the icon is
   replaced by the same picture with that colour removed from the edges inward (the starting values of
   "Remove background" of feature 004), the Changes table lists the icon, and Revert is visible.
2. **Given** the same colour appears inside the logo, **When** the button is pressed, **Then** only the
   colour connected to the edges goes.
3. **Given** the icon is already see-through, **When** the button is pressed, **Then** the message says
   so, as information, and the icon is not changed.
4. **Given** the edges are not one flat colour, **When** the button is pressed, **Then** the message says
   that the tool cannot tell what the background is and points to the image editor, shown as an error.
5. **Given** an opaque icon, **Then** a caption says the accent colour does not show behind it and names
   the button; **Given** a see-through icon, **Then** the caption says the chequered parts are
   see-through and Teams puts the accent colour behind them.
6. **Given** the icon was replaced, **When** the user presses Revert, **Then** the original icon returns.

---

### User Story 2 - Show the logo alone on nothing, in one colour (Priority: P2)

The user picks a colour next to "Logo without background" and presses it. The background goes, every
visible pixel takes that colour, and the accent colour becomes white, so the agent shows the logo alone
on a light tile.

**Independent Test**: press it with `#2b5fd9` on a logo with a flat background: the edges are
see-through, every visible pixel is that colour, `accentColor` is `#FFFFFF`.

**Acceptance Scenarios**:

1. **Given** an icon with a flat background, **When** pressed, **Then** background removed, logo in the
   chosen colour (alpha kept), accent colour `#FFFFFF`, both changes in the Changes table.
2. **Given** an icon already see-through, **Then** it only gives the colour and sets the accent colour.
3. **Given** the edges are not flat and the icon is opaque, **Then** it refuses with the reason and
   changes neither the icon nor the accent colour.
4. **Given** the outline icon card, **Then** the control is not offered: Teams chooses that colour.

---

### User Story 3 - Make the outline icon what Teams draws (Priority: P2)

The outline card says what the outline icon is, offers "Make the shape white", and lets the user try a
colour of the bar without saving it.

**Independent Test**: on a coloured outline icon press "Make the shape white": every visible pixel is
pure white, alpha is unchanged, the outline checks pass; the preview colour does not touch the file.

**Acceptance Scenarios**:

1. **Given** the outline card, **Then** a caption says it is the icon of the left bar of Teams, that
   Teams draws only the shape, with no background and in the colour of the bar, and that it has to be
   white on see-through.
2. **Given** a coloured shape, **When** "Make the shape white" is pressed, **Then** every pixel with
   alpha above 0 becomes (255, 255, 255) and alpha is kept.
3. **Given** the shape is already white, **Then** the message says so as information and nothing changes.
4. **Given** the preview colour input (default `#5b5fc7`), **When** the user picks a colour, **Then** the
   shape is drawn on the bar tile in that colour; the corner of the tile stays the colour of the bar;
   the package, the Changes table and the saved file are unchanged.
5. **Given** the colour icon card, **Then** neither "Make the shape white" nor the preview colour is shown.

---

### User Story 4 - Choose a complete design from suggestions (Priority: P1)

In the Look step a card "Suggestions" shows up to three complete designs worked out from the user's
logo. Each shows the colour icon on its accent colour, the outline icon on a light and a dark app bar,
the accent colour and the contrast, the reasons, and "Use this design".

**Independent Test**: load a package with a white logo on a flat teal background: two designs appear
(white logo on the brand colour, coloured logo on white); using one changes the colour icon, the accent
colour and the outline icon together.

**Acceptance Scenarios**:

1. **Given** a one-colour logo on a flat background (or see-through), **Then** the designs `brand-tile`
   ("White logo on your brand colour") and `coloured-logo` ("Coloured logo on white") are listed, in
   that order, each with at least three reasons.
2. **Given** the logo has two or more colours (each at least 5 percent of the visible pixels, counted in
   5-bit groups), **Then** `keep-colours` is added when white or the dark ink stands out from the
   average colour by at least 3 : 1.
3. **Given** the picture is opaque with no flat background, **Then** no design is listed and a note says
   why and what to do (take the background away in the image editor).
4. **Given** a design, **Then** its logo is trimmed, squared and fitted so it stays inside the central
   120 x 120 pixels of 192 x 192 (62.5 percent), its background is see-through, and its outline icon is
   the same shape in white at 32 x 32.
5. **Given** the brand colour: it is the main colour of the logo when its saturation is at least 0.2,
   else the accent colour of the package when its saturation is at least 0.2, else `#2b5fd9`; it is
   darkened, keeping its hue, until white on it has a contrast of at least 4.5 : 1.
6. **When** "Use this design" is pressed, **Then** the colour icon, the outline icon and the accent
   colour change in one edit; nothing changes before that.
7. **Given** the icon or the accent colour changes, **Then** the designs are worked out again; for the
   same icon bytes and accent colour they are not computed twice; they are forgotten with the package.
8. **Given** a result that Apply refuses (empty or over 100 KB), **Then** the message is shown and
   nothing is changed.

---

### User Story 5 - Be told when the version did not change (Priority: P2)

In the Save step, when the package has changes and `version` is the one that was loaded, a notice
explains that Teams and the admin center refuse an upload that is not newer and offers "Raise it to X".

**Independent Test**: change a name, go to Save: the notice shows with the current version and the
button; press it: the notice goes and `version` has its patch raised.

**Acceptance Scenarios**:

1. **Given** no change, **Then** no notice.
2. **Given** a changed text or a replaced icon and the same version, **Then** the notice names the
   version and quotes the refusal; the button shows the next patch version.
3. **Given** the user raised the version by hand, **Then** no notice.
4. **Given** a version that is not three numbers, **Then** the notice has no button.
5. **Given** the notice, **Then** it never blocks the save.

---

### User Story 6 - Know how to fix each failing check (Priority: P1)

In the Checks step every check that does not pass says how to fix it, naming the control, and has a
button that goes to the step where the control is. Before this, a failed check said what was wrong and
left the user to find where to correct it.

**Independent Test**: load a package with a short name of 31 characters and a heavy colour icon: the
name check says "How to fix it" with a button "Go to Details", the weight check one with "Go to Look".

**Acceptance Scenarios**:

1. **Given** a check with the verdict warning or fail, **Then** its detail has the line "How to fix it"
   with a sentence that names the card or button to use and, unless the fix is outside the tool, a
   button "Go to Details" or "Go to Look".
2. **Given** a check that passes, **Then** it has no fix line.
3. **Given** the optional small colour icon, **Then** its fix says to change the zip and has no button.
4. **When** the button is pressed, **Then** the tool moves to that step (2 Details for names and
   descriptions, 3 Look for icons and accent colour).

### Edge Cases

- A colour icon that cannot be read as a PNG: the shortcut says so and does nothing.
- A result that is fully transparent or over 100 KB: refused by the shared acceptance with the cause.
- A shortcut pressed twice: the second press gives the "already see-through" information.
- The accent colour is missing from the manifest: the caption on the colour card is hidden.
- The suggestions card is hidden when there is neither a design nor a note.
- The preview colour is changed before any other action: only the canvas changes.

## Requirements *(mandatory)*

### Functional Requirements

**Colour icon shortcuts**

- **FR-001**: The colour icon card MUST have "Make background transparent". It MUST remove, from the
  icon in the new package, the flat colour that touches the edges and the pixels connected to it, with
  the starting values of "Remove background" (feature 004), and replace the icon through the shared
  replacement path.
- **FR-002**: When the icon is already see-through the message MUST say so and be shown as information.
  When the edges are not one flat colour the message MUST say that the background cannot be told and
  MUST be shown as an error. When the icon cannot be read as a PNG the message MUST say so.
- **FR-003**: Under the colour icon the tool MUST show a caption: for a see-through icon, that Teams
  puts the accent colour (named) behind the chequered parts; for an opaque icon, that the accent colour
  does not show and which button to press. It MUST be hidden when the icon cannot be read or there is
  no accent colour.
- **FR-004**: The colour icon card MUST have "Logo without background" with a colour input (default
  `#2b5fd9`). It MUST remove the flat background when there is one, give every visible pixel the chosen
  colour keeping alpha, set the accent colour to `#FFFFFF`, and replace the icon and the field in one
  edit. A see-through icon only gets the colour. An opaque icon with no flat edges MUST be refused with
  the reason, changing nothing.

**Outline icon**

- **FR-005**: The outline icon card MUST show a caption saying it is the icon of the left bar of Teams,
  drawn as a shape with no background in the colour of the bar, and that it has to be white on
  see-through.
- **FR-006**: The outline icon card MUST have "Make the shape white": every pixel with alpha above 0
  becomes pure white, alpha kept. When no visible pixel is other than white, the message MUST say the
  shape is already white, as information, and nothing changes.
- **FR-007**: The outline icon card MUST have a "Preview colour" input (default `#5b5fc7`) that draws
  the shape on the app bar tile in that colour. The colour MUST NOT be stored, written to the package or
  listed in the Changes table. The corner of the tile MUST stay the colour of the bar.
- **FR-008**: "Logo without background", "Make background transparent" and the accent colour caption
  MUST NOT appear on the outline icon card, and "Make the shape white" and the preview colour MUST NOT
  appear on the colour icon card.
- **FR-009**: A replaced icon MUST show Revert, which puts back the original icon of the package.

**Suggestions**

- **FR-010**: The Look step MUST have a card "Suggestions" listing the designs of `recommend`, each with
  the colour icon on its accent colour, the outline icon on a light and a dark app bar (colours from the
  theme properties), the line "Accent colour #RRGGBB - contrast N.N : 1", at least three reasons, and
  the button "Use this design".
- **FR-011**: `brand-tile`: the logo in white on the brand colour; `coloured-logo`: the logo in the
  brand colour on `#FFFFFF`; `keep-colours`: the logo as it is on `#FFFFFF` or the dark ink `#1F2937`,
  whichever stands out more, offered only when the logo has at least two colours and the contrast is at
  least 3 : 1.
- **FR-012**: The brand colour MUST be chosen as in scenario 5 of Story 4. The contrast shown MUST be
  the WCAG ratio between the logo and the accent colour behind it.
- **FR-013**: Every design MUST be complete and consistent: colour icon 192 x 192 with the logo trimmed,
  squared and fitted into 62.5 percent of the side, see-through background; accent colour a valid
  `#RRGGBB`; outline icon 32 x 32, white on see-through, the shape of the same logo.
- **FR-014**: When the colour icon is opaque and has no flat background the card MUST show a note that
  says why there is no design and what to do, and no design.
- **FR-015**: "Use this design" MUST replace the colour icon, the outline icon and the accent colour in
  one edit through the shared acceptance; if the acceptance refuses, the message MUST be shown and
  nothing changed. Before it, nothing is changed.
- **FR-016**: The designs MUST be recomputed only when the icon bytes or the accent colour change, MUST
  NOT modify the picture they are given, and MUST be dropped with the package.

**Version notice**

- **FR-017**: In the Save step, when the plan has changes and `version` equals the loaded `version`, a
  status notice MUST name the version, say that Teams and the Microsoft 365 admin center refuse an
  upload whose version is not higher, and offer "Raise it to X" (the next patch).
- **FR-018**: The notice MUST be absent when nothing changed or when the version was changed; its button
  MUST be absent when the version is not three numbers; pressing it MUST raise the patch number of the
  field and the notice MUST go. The notice MUST NOT block saving.

**How to fix a check**

- **FR-022**: Every check id that `runChecks` can produce MUST have a fix: a sentence of more than
  40 characters that names the control to use, and the step it is in (2 Details, 3 Look, or none when
  the fix is outside the tool). A test MUST fail when a check has no fix or a fix has no check.
- **FR-023**: In the Checks table a check that does not pass MUST show "How to fix it" with its sentence
  and, when the step is not none, a button "Go to <Details|Look>" that moves to that step. A check that
  passes MUST show none.
- **FR-024**: The name and description checks MUST lead to Details; the icon, safe-area, contrast,
  outline and accent colour checks MUST lead to Look. The sentences MUST name the controls of this
  feature and of feature 004 ("Edit image", "Teams-ready colour icon", "Outline from this icon",
  "Make the shape white").

**Guarantees**

- **FR-019**: None of the above MAY call the network, write to an environment, or add a dependency; the
  README claim and the no-network test cover the new files.
- **FR-020**: The UI MUST follow the constitution: no emoji, colours from custom properties, both
  themes, explicit labels, no repeated values, full-width cards.
- **FR-021**: What the tests do not cover MUST be recorded in the quickstart as manual checks: how Teams
  draws the colour and outline icons, and the refusal of Teams for a version that is not newer.

### Key Entities

- **Suggestion**: `id` (`brand-tile` | `coloured-logo` | `keep-colours`), `title`, `why[]`, `icon`
  (192 x 192), `accent` (hex), `outline` (32 x 32), `contrast` (number).
- **SuggestionSet**: `suggestions[]` and `note` (null or the reason there is none).
- **TransparentResult**: `{ ok: true, picture }` or `{ ok: false, message }`.
- **Version hint**: `{ current, next | null }` or null.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A logo on a flat background becomes a colour icon that lets the accent colour show with
  one click, without opening the image editor.
- **SC-002**: A user who follows "Use this design" ends with colour icon, accent colour and outline icon
  that pass the safe-area, contrast and outline checks of the tool.
- **SC-003**: Every refusal of a shortcut names its cause; "nothing to do" is never shown as an error.
- **SC-004**: No shortcut or preview colour changes the package unless the user pressed the button that
  says so; the saved package differs from the opened one only in what the Changes table lists.
- **SC-005**: A package with changes and an unchanged version always shows the notice.
- **SC-006**: A mutation run on `transparent.ts` and `recommend.ts` leaves no surviving mutation.

## Assumptions

- The shortcuts work on the colour icon and the outline icon declared in the manifest.
- The WCAG limits used (3 : 1 graphics, 4.5 : 1 comfortable) are guidance, not a Teams validation.
- Pixels as Teams draws them, Teams validation of the package, and the native save dialog are not
  covered by automatic tests (see quickstart).

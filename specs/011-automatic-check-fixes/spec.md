# Feature Specification: Automatic Check Fixes

**Feature Branch**: `011-automatic-check-fixes`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "The Checks page is not clear or easy to use enough: it reports errors and warnings but gives the user no fast, confident way to make everything pass. Add, for every check the tool can safely resolve on its own, a one-click control that applies the fix immediately (not only a written suggestion and a link to the step), plus a single bulk control that applies every available fix at once."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fix an icon problem with one click (Priority: P1)

A user opens the Checks page and sees a warning such as "Logo stays in the safe area" or a
failure such as "Colour icon is 192 x 192 pixels". Instead of reading the instructions, switching
to the Look step, opening the image editor and pressing a tool there, the user presses a "Fix it"
control on the check row itself and the icon is corrected in place.

**Why this priority**: icon problems are the most common reason the Checks page is not all
green (see the warning in the screenshot: "Logo stays in the safe area"), and today fixing one
means leaving the page entirely.

**Independent Test**: open a package whose colour or outline icon fails or warns on size, square,
safe area, PNG format or weight, or on outline size/colour; press "Fix it" on one of those rows;
every row that the same underlying problem affects turns green without visiting another step.

**Acceptance Scenarios**:

1. **Given** a colour icon whose logo sits outside the 120 x 120 safe area, **When** the user
   presses "Fix it" on the "Logo stays in the safe area" row, **Then** the icon is replaced by a
   corrected one, sized 192 x 192, square, inside the safe area, in an ordinary PNG format and
   under the weight limit, and every one of those rows turns green in the same action.
2. **Given** an outline icon that is not white or not 32 x 32, **When** the user presses "Fix it"
   on either of those rows, **Then** the icon is replaced by a corrected white shape at 32 x 32
   and both rows turn green.
3. **Given** the colour icon file is missing from the package, **When** the user looks at the
   "Colour icon is in the package" row, **Then** no "Fix it" control is shown (the tool has no
   image to use), only today's written explanation and the link to the Look step.

---

### User Story 2 - Fix a too-long name or description with one click (Priority: P2)

A user sees "Short name length" or "Full description length" failing because the text is longer
than the allowed limit. Pressing "Fix it" shortens the text to the exact limit immediately,
without the user having to decide by hand what to cut.

**Why this priority**: length failures are common after editing a name or pasting a longer
description, and are otherwise fixed by hand, one character count at a time.

**Independent Test**: open a package whose short name or full description exceeds its character
limit; press "Fix it" on that row; the row turns green and the stored text is exactly at the
limit.

**Acceptance Scenarios**:

1. **Given** a short name longer than 30 characters, **When** the user presses "Fix it" on
   "Short name length", **Then** the name is cut to exactly 30 characters, no other character is
   changed, and the row turns green.
2. **Given** a full description that is missing entirely, **When** the user looks at "Full
   description length", **Then** no "Fix it" control is shown, because the tool has no text to
   write; only the written explanation and the link to Details are shown.
3. **Given** the short name and the full name are identical, **When** the user looks at "Short
   and full name differ", **Then** no "Fix it" control is shown, because the tool cannot invent a
   full name that means something.

---

### User Story 3 - Fix the accent colour with one click (Priority: P3)

A user sees "Accent colour is #RRGGBB" failing (missing or not a valid colour) or "Logo stands
out from the accent colour" warning (a valid colour that is too close to the logo). Pressing
"Fix it" sets a colour that is both valid and readable against the logo.

**Why this priority**: choosing a contrasting colour by eye is the hardest of the three kinds of
problem to self-serve, and the tool already computes the contrast ratio for the warning.

**Independent Test**: open a package with a missing, invalid or low-contrast accent colour; press
"Fix it" on that row; the accent colour becomes a valid "#RRGGBB" value that passes the contrast
check against the logo (or the documented fallback colour when the logo cannot be read).

**Acceptance Scenarios**:

1. **Given** an accent colour that is missing, **When** the user presses "Fix it" on "Accent
   colour is #RRGGBB", **Then** a valid colour is set and the row turns green.
2. **Given** a valid accent colour that is too close to the logo colour, **When** the user
   presses "Fix it" on "Logo stands out from the accent colour", **Then** the accent colour
   changes to one that passes the contrast rule and the row turns green.

---

### User Story 4 - Fix everything on the page with one click (Priority: P4)

A user with several problems at once (an icon, a name and the accent colour, say) presses a
single "Fix everything" control next to the pass/warning/fail counts, instead of pressing "Fix
it" on each row in turn.

**Why this priority**: it is the fastest path from "many problems" to "all pass", and it only
needs the per-check fixes of the first three stories to already exist.

**Independent Test**: open a package with one fixable problem in each of the icon, text and
accent colour groups, plus one check that has no fix (for example a missing icon file); press
"Fix everything"; every fixable row turns green in one action and the row with no fix is left
exactly as it was, with its explanation unchanged.

**Acceptance Scenarios**:

1. **Given** a package with problems in more than one group, **When** the user presses "Fix
   everything", **Then** every row that has a "Fix it" control turns green, every row that does
   not have one is untouched, and one combined message reports what changed.
2. **Given** a package where every fixable row already passes, **When** the user looks at the
   page, **Then** "Fix everything" is not shown (there is nothing left for it to do).

### Edge Cases

- A check that passes is never touched by an individual or a bulk fix.
- A single fix (for example the colour icon's) can make several rows pass at once; the bulk
  control counts this as one action, not one per row.
- Fixing the accent colour when the colour icon cannot be read at all (missing, not a PNG, or a
  PNG the tool cannot draw) falls back to a fixed, documented colour rather than failing silently
  or leaving the row unfixed.
- Right after a fix (single or bulk) the user can press "Undo" once to put back every value
  exactly as it was immediately before that action; leaving the Checks page clears that option,
  the same way the rest of the tool's one-shot confirmations behave.
- Running "Fix everything" twice in a row does the same thing the second time as the first
  (nothing, once every fixable row already passes).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Checks page MUST show, on every failing or warning check that the tool can
  resolve without more information from the user, a "Fix it" control in addition to the existing
  written explanation.
- **FR-002**: The Checks page MUST NOT show a "Fix it" control on a check whose correct
  resolution needs content only the user can supply: a missing icon file, a name or description
  that is missing (as opposed to too long), two names that are identical, or a manifest schema
  problem outside the fields this tool already edits (names, descriptions, developer, version,
  accent colour). Those checks keep today's written explanation and step link, unchanged.
- **FR-003**: For the colour icon group (size, square, safe area, PNG format, weight), "Fix it"
  MUST resize, centre and re-encode the icon the same way the "Teams-ready colour icon" tool
  already does in the image editor, so that one action turns every row in the group green
  together when it can.
- **FR-004**: For the outline icon group (size, white shape), "Fix it" MUST regenerate the icon
  the same way the "Outline from this icon" and "Make the shape white" tools already do in the
  image editor.
- **FR-005**: For a short or full name that fails only because it is longer than its limit, "Fix
  it" MUST shorten it to exactly the allowed number of characters, leaving every character that
  remains unchanged.
- **FR-006**: For a short or full description that fails only because it is longer than its
  limit, "Fix it" MUST shorten it to exactly the allowed number of characters, leaving every
  character that remains unchanged. A description that is missing entirely is never auto-fixed.
- **FR-007**: For an accent colour that is missing, not a valid "#RRGGBB" value, or valid but too
  close to the logo colour, "Fix it" MUST set it to whichever of pure black or pure white reads
  better against the logo of the colour icon; when no logo can be read, it MUST set a fixed,
  documented fallback colour instead.
- **FR-008**: Applying a fix (single or bulk) MUST take effect immediately: the checks list MUST
  recompute right away and every row it resolves MUST turn green without a page reload or an
  extra confirmation step.
- **FR-009**: After a fix (single or bulk) is applied, the page MUST show a dismissible message
  naming what changed and offering a single "Undo" that restores every value exactly as it was
  immediately before that action.
- **FR-010**: The Checks page MUST show one "Fix everything" control, next to the pass/warning/
  fail counts, that applies every currently available fix in one action and then shows one
  combined message and one combined "Undo"; it MUST be hidden when no fixable check is failing or
  warning.
- **FR-011**: A fix (single or bulk) MUST never change a check that already passes.
- **FR-012**: "Fix everything" MUST apply its changes in a fixed order (icons, then names and
  descriptions, then the accent colour) so that running it twice over the same problems produces
  the same result both times.
- **FR-013**: The written explanation already shown under a failing or warning check ("How to fix
  it") MUST keep describing, in plain language, what pressing "Fix it" will do, so the user is
  never asked to trust a change they cannot read about first.

### Key Entities

- **Automatic fix**: the action tied to one check id that can resolve it without more input from
  the user; it knows what it changes and how to describe that change in one sentence for the
  "Fix it"/"Fix everything" message.
- **Undo snapshot**: the manifest fields and icon files exactly as they were immediately before
  one fix action (single or bulk) ran; held only until the user leaves the Checks page or starts
  another action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A package whose only problems are icon problems (size, square, safe area, format,
  weight, outline) can be brought to "all pass" from the Checks page with a single click, with no
  visit to another step.
- **SC-002**: A package whose only problem is a short name or a description longer than its
  limit can be brought to "all pass" with a single click, with no typing.
- **SC-003**: A package whose only problem is a missing, invalid or low-contrast accent colour
  can be brought to "all pass" with a single click.
- **SC-004**: A package with one fixable problem in each of the icon, text and accent colour
  groups can be brought to "all pass" (every check this tool can resolve) with one click on "Fix
  everything".
- **SC-005**: Every fix the page applies, single or bulk, can be undone back to the exact
  state the package was in immediately before, every time, for as long as the user stays on the
  Checks page.
- **SC-006**: No check that the tool cannot safely resolve on its own ever shows a "Fix it"
  control; this holds for every check id the tool currently produces, not only the ones shown in
  the examples above.

## Assumptions

- The "Teams-ready colour icon" and outline presets already in the image editor (features 004,
  009, 010) are the agreed definition of "fixed" for those icon problems; this feature only
  offers them from the Checks page in one click, it does not redefine what they do.
- Cutting a name or description to the exact character limit is preferable to leaving the check
  failing or asking the user to shorten it by hand; the full, uncut text is still visible and
  editable in the Details step before and after the fix runs.
- A single, page-scoped "Undo" is enough safety net for an automatic fix, consistent with the
  Undo/Revert controls the tool already offers elsewhere; a full multi-step history for fixes
  applied from the Checks page is not required.
- The exact fallback accent colour used when no logo can be read at all is a fixed value decided
  during planning and written down there; this spec only requires that it be documented and that
  it always produce a valid "#RRGGBB" colour.
- Out of scope: generating a missing icon file from nothing, inventing a missing name or
  description, resolving manifest schema problems outside the fields this tool already edits, and
  resolving any check the tool does not already produce.

# Feature Specification: Two-Way Sync Between the Colour Icon and the Outline Icon

**Feature Branch**: `010-icon-two-way-sync`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "When the colour icon changes, the outline icon must be regenerated to match it. And when the user loads a new outline icon, an engine should be able to rebuild an HD colour icon from it, so the two icons stay in step with each other in both directions."

## Context

Feature 009 already has a manual, one-way tool: inside the image editor, on the outline icon, "Outline from this
icon" (`presetOutline`) takes the current colour icon, turns it into a white shape (the existing Outline maker
operation) and fits it at 32 x 32. A user who changes the colour icon and forgets to press that button ends up with
an outline icon that no longer matches, and nothing on the Look page says so.

There is no tool at all for the other direction: building a colour icon from the outline icon. The outline icon
carries no colour and is only 32 x 32, so "rebuilding" a colour icon from it can only ever be a starting design,
never a lossless reconstruction — the same honesty limit Principle III already asks of every preview and fix.

This feature does not add a new pixel algorithm for the shape itself. It reuses, in both directions, operations
that already exist in `services/image`:

- Colour icon -> outline icon: the existing `presetOutline` pipeline (Outline maker operation, trim, square, fit to
  32 x 32, already used by the editor's "Outline from this icon" button), offered proactively instead of only
  inside the editor.
- Outline icon -> colour icon: the outline's shape enlarged to 192 x 192 (the existing `fit` operation) and placed
  on an opaque tile of one colour (the existing background-fill operation), the colour being the current accent
  colour when it is not close to grey, else Teams blue `#2B5FD9` — the one new rule this feature adds, written out
  in FR-002.

What is new is the orchestration: noticing that one icon changed, offering the matching regeneration for the
other one as a suggestion the user confirms, and not offering it again until something actually changes — so the
two pictures can be kept in step without the user having to remember the manual button exists, but also without
the tool silently overwriting a picture the user chose.

## Clarifications

### Session 2026-10-29

- Q: When the colour icon changes, must the outline be regenerated at once and on its own, or offered as an
  action the user confirms? -> A: Offered as an action to confirm, on the outline icon card — the same pattern as
  the other one-click actions of the Look page (005/007): it goes through the normal replace path, appears in the
  Changes table and can be reverted.
- Q: The outline icon has no colour and is only 32 x 32; rebuilding a colour icon from it is necessarily a
  guess. What should the engine do? -> A: Keep it to a single deliberate rule: the outline's own shape, enlarged,
  in white, on a tile of one colour the tool works out from the accent colour (or Teams blue as a fallback),
  offered the same way, as an action to confirm.
- Q: Once a suggestion has been shown and accepted or dismissed, when does it come back? -> A: Only after the
  source icon changes again through a direct action of the user; it does not keep reappearing on its own.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep the outline icon in step with the colour icon (Priority: P1)

A user replaces or edits the colour icon (a new file, an edit saved from the image editor, or one of the existing
one-click fixes). The outline icon card shows a suggestion: regenerate the outline from the icon that is now in the
package. The user presses it; the outline icon is replaced by the white shape of the new colour icon, fitted at
32 x 32, exactly as "Outline from this icon" already does inside the editor.

**Why this priority**: this is the gap the user ran into by hand — editing the colour icon and shipping a
stale outline icon that no longer belongs to it.

**Independent Test**: load a package, replace the colour icon with a different logo, see the suggestion appear on
the outline icon card, accept it, and see the outline icon change to the new logo's shape; Revert restores the
original outline icon.

**Acceptance Scenarios**:

1. **Given** a package is open, **When** the user replaces the colour icon with a new file, **Then** a
   "Regenerate the outline icon" suggestion appears on the outline icon card.
2. **Given** the suggestion is showing, **When** the user presses it, **Then** the outline icon is replaced by the
   result of the existing outline pipeline applied to the current colour icon, through the same replace path as
   any other icon change (resized, checked against the size limit, shown in the preview, listed in the Changes
   table), and Revert is visible.
3. **Given** the computed outline would be fully transparent (nothing crosses the shape threshold), **When** the
   user presses the suggestion, **Then** the tool refuses with the same message already used whenever a computed
   icon is empty, and does not change the outline icon.
4. **Given** the user dismisses the suggestion or edits the colour icon again before acting on it, **When** the
   colour icon has not changed since the suggestion was last shown, **Then** the suggestion is not shown a second
   time for that same state.
5. **Given** the user accepts the suggestion, **When** the user presses Revert on the outline icon, **Then** the
   outline icon returns to what it was before, and the colour icon is unaffected.

---

### User Story 2 - Build a starting colour icon from a new outline icon (Priority: P2)

A user replaces or edits the outline icon on its own (for example they only had a silhouette logo at hand). The
colour icon card shows a suggestion: build a colour icon design from this shape. The user presses it; the colour
icon becomes the outline's shape, enlarged to 192 x 192, in white, on a tile of a colour the tool works out from
the current accent colour (or Teams blue as a fallback), and the accent colour is set to that same colour.

**Why this priority**: closes the gap in the other direction, but it is a starting point to refine, not a
one-click final answer, so it ranks below User Story 1.

**Independent Test**: load a package, replace the outline icon with a different shape, see the suggestion appear
on the colour icon card, accept it, and see the colour icon become the enlarged shape on a coloured tile that
passes the existing Look checks (safe area, contrast, see-through background); the outline icon is unchanged.

**Acceptance Scenarios**:

1. **Given** a package is open, **When** the user replaces the outline icon with a new file, **Then** a "Build a
   colour icon from this shape" suggestion appears on the colour icon card.
2. **Given** the suggestion is showing, **When** the user presses it, **Then** the colour icon becomes the
   outline's shape enlarged to 192 x 192 in white, on a tile of the base colour, the accent colour is set to that
   same colour, both changes are listed in the Changes table, and only the colour icon and the accent colour
   change — the outline icon is not touched.
3. **Given** the current accent colour is close to grey (low saturation) or missing, **When** the user presses the
   suggestion, **Then** the tile uses Teams blue `#2B5FD9` instead.
4. **Given** the user accepts the suggestion, **When** the user presses Revert, **Then** the colour icon and the
   accent colour return to what they were before; the outline icon is unaffected throughout.

---

### User Story 3 - Opening a package never nags the user (Priority: P2)

A user opens a package whose colour icon and outline icon already disagree (as many real packages do today). No
suggestion appears just from opening the file. Suggestions only appear once the user changes one of the two icons
during the session.

**Why this priority**: an honest assistant proposes a fix for what the user just did, not a running verdict on a
file the user has not touched yet; this also keeps the two user stories above independently testable without a
baseline state leaking between them.

**Independent Test**: open a package whose colour and outline icons do not match; confirm neither icon card shows
a sync suggestion until the user replaces one of the two icons.

**Acceptance Scenarios**:

1. **Given** a freshly opened package, **When** the Look page is shown, **Then** no sync suggestion appears on
   either icon card, however the two icons compare to each other.
2. **Given** the user accepted a sync suggestion for one icon, **When** that replacement is now showing, **Then**
   it does not itself trigger a suggestion to regenerate the icon it came from (no back-and-forth loop).

### Edge Cases

- What happens when the colour icon and the outline icon are both edited before either suggestion is acted on?
  The later suggestion reflects the latest state of its source icon; accepting an outdated suggestion is not
  possible once its source has changed again, so it is withdrawn and, if still relevant, re-offered against the
  new state.
- What happens if the user keeps alternating — accepts the outline suggestion, then immediately edits the new
  outline icon by hand? That hand edit is a direct user action, so it is allowed to trigger the colour-icon
  suggestion in the usual way; only the regeneration this feature's own suggestion produced is exempt (FR-006).
- What happens on the outline icon when the computed shape would be fully transparent? Same refusal as User
  Story 1, Scenario 3; the outline icon is left unchanged.
- What happens when the user already has a colour icon and outline icon that happen to match? The suggestion can
  still appear after a direct edit to one of them (the tool does not compare pixels to decide this), and accepting
  it simply reapplies the same deterministic computation; nothing is lost by accepting it twice.
- What happens when the source icon for a suggestion is missing from the package, or is not a PNG the tool can
  read? The suggestion is not offered: there is nothing to compute it from.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the colour icon is replaced or edited by a direct user action (a new file picked, or an edit
  applied, in the image editor), the tool MUST offer a "Regenerate the outline icon" suggestion on the outline icon
  card, computed by the existing outline pipeline (Outline maker operation, trim, square, fit to 32 x 32) applied
  to the colour icon now in the package.
- **FR-002**: When the outline icon is replaced or edited by a direct user action, the tool MUST offer a "Build a
  colour icon from this shape" suggestion on the colour icon card: the outline's shape enlarged to 192 x 192 in
  white on a tile of the base colour (the current accent colour when its HSL saturation is at least 0.2, else
  Teams blue `#2B5FD9`), with the accent colour set to that same base colour.
- **FR-003**: Neither suggestion MUST replace anything on its own: accepting it MUST go through the same
  replacement path as any other icon change (resized, checked against the 100 KB limit, shown in the preview, listed
  in the Changes table, reversible with Revert); dismissing it MUST leave both icons unchanged.
- **FR-004**: The tool MUST NOT show the same suggestion again once the user has accepted or dismissed it, for as
  long as its source icon has not changed again through a direct user action.
- **FR-005**: Accepting the outline suggestion MUST change only the outline icon; accepting the colour suggestion
  MUST change only the colour icon and the accent colour. Neither MUST touch the other icon.
- **FR-006**: A replacement produced by accepting one of these suggestions MUST NOT itself count as a direct user
  action that triggers the opposite suggestion, so the two suggestions cannot alternate endlessly.
- **FR-007**: Opening a package MUST NOT trigger either suggestion by itself, however the colour icon and the
  outline icon it contains compare to each other; suggestions MUST only follow a direct user action taken during
  the session.
- **FR-008**: When the computed result (the outline shape, or its enlarged, recoloured version) would be fully
  transparent, the tool MUST refuse it with the same message already used whenever a computed icon is empty, and
  MUST NOT change the target icon.
- **FR-009**: Each suggestion MUST state, in one short line, which icon (and, for the colour suggestion, the
  accent colour) it will replace, before the user accepts it.

### Key Entities *(include if feature involves data)*

- **Icon Sync State** (held for the open package, not saved to the manifest): for each of the colour icon and the
  outline icon, a count of direct user actions and, for each suggestion, the count it was last resolved (accepted
  or dismissed) against. Used to decide when a suggestion is shown (FR-001, FR-002, FR-007) and to stop a
  suggestion's own replacement from triggering the opposite suggestion (FR-006).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After replacing or editing the colour icon, a user can bring the outline icon back in step with one
  confirmation, without opening the image editor.
- **SC-002**: After replacing the outline icon on its own, a user can get a colour icon design that passes every
  existing Look check (safe area, contrast, see-through background) with one confirmation, without picking a colour
  by hand.
- **SC-003**: Opening any existing package, whatever state its colour and outline icons are in, shows no sync
  suggestion until the user changes one of the two icons.
- **SC-004**: Every accepted suggestion can be undone with the existing Revert control, restoring both the icon and
  (for the colour suggestion) the accent colour.
- **SC-005**: Accepting a suggestion never produces a second, opposite suggestion about the icon that was just
  regenerated (no back-and-forth loop).

## Assumptions

- Both directions reuse existing, already-tested pixel operations (the Outline maker operation, trim, square, fit,
  and the background-fill operation); this feature adds one new rule (the base colour for the reverse direction,
  FR-002) and the proactive suggestion / sync-state tracking that decide when to offer each regeneration.
- "Direct user action" on an icon means: picking a new file for it in the image editor, or applying an edit there
  (including the editor's own existing "Teams-ready colour icon" and "Outline from this icon" presets). Accepting
  this feature's own suggestions is not a direct action on the icon it writes to.
- Both suggestions go through the existing icon-replacement path (the same one the image editor's Apply button
  already uses: resized or fitted to the slot's exact size, refused when empty or over the size limit, applied
  through the same edit as any other icon change): no new file-acceptance code path, no new manifest field, and no
  network or environment call (Principle II).
- Sync state is kept only for the current session on the open package; it is not written to the manifest and does
  not survive closing and reopening the tool.

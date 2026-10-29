# Feature Specification: Effect Info Guides in the Image Editor

**Feature Branch**: `012-effect-info-guides`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Add an info popup for every effect in the image editor toolbox: the user clicks an info control next to the effect, a popup opens with a professional, practical guide to that effect — what it does, when to use it, with a visual before/after example — written in an engaging, enterprise tone."

## Context

The image editor toolbox (feature 004/009) already gives every tool button a one-line hint, shown only as a native
browser tooltip on hover (the `title` attribute: see `PRESET_HINT`, `OP_HINT` and the `tool()` hints in
`src/view/imageEditor.ts`). A one-line hover hint is easy to miss, impossible to use on a touch device, and has no
room for a worked example or a picture. A user picking between, say, Trim and Make square, or deciding whether
Remove background or Outline maker is the right tool, has no on-screen explanation beyond that single line and the
tool's own name.

This feature adds a second, deliberate way to learn what a tool does, next to (not instead of) the existing hover
hint: an info control on every tool and preset button that opens a short, self-contained guide for that one effect —
in plain, confident, professional language, with a concrete example of when to reach for it, and a small picture
showing the effect actually applied to a sample logo, computed by the editor's own pixel engine so the picture is
always exactly correct.

## Clarifications

### Session 2026-10-29

- Q: Where does the picture in the before/after example come from? -> A: A small built-in sample logo, the same
  for every user and every package, computed by the editor's own operations — not the icon the user currently has
  open. This keeps every guide identical and testable regardless of what package is open, and never shows a
  user's real logo back to them out of context.
- Q: Which tools get a guide? -> A: Every entry in the toolbox: the 11 editing operations (Remove background, Fill
  background, Trim, Crop, Make square, Fit, Rotate, Flip left-right, Flip top-bottom, Solid colour, Tone, Outline
  maker — Flip left-right and Flip top-bottom share one guide about mirroring) and the 2 Quick presets
  (Teams-ready colour icon, Outline from this icon). 13 guides in total.
- Q: How does the user open a guide? -> A: A small, separate info control sits next to every tool and preset
  button in the toolbox, always visible (not hidden behind a menu or a long-press), so the guide is discoverable
  without disturbing the button's own click action (which still adds or runs the effect immediately).

### Session 2026-10-29 (follow-up: parameter-level detail)

- Q: Should each operation's guide also explain its individual adjustable settings, not just the effect as a
  whole? -> A: Yes — a Parameters section listing every setting, by its real label, with its range or choices and
  a plain explanation, for every editing operation (not the 2 Quick presets, which take no settings of their own).
- Q: How is this kept from drifting out of date as operations change, now and for any operation added later? ->
  A: The parameter list itself (names, labels, ranges, choices) is read from the same single definition the
  editor's own step controls already use, never duplicated by hand; only the explanation prose is written by
  hand, and an automated check fails the build if a setting is added, renamed or removed there without a matching
  update to its explanation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn what a tool does before using it (Priority: P1)

A user opens the image editor, is unsure what "Outline maker" or "Fit" actually does to a picture, and presses the
info control next to that tool instead of guessing from the name. A guide opens: a short, plain explanation of
what the effect changes, a sentence about when it is the right tool to reach for, and a small before/after picture
showing the effect applied to a sample logo. The user closes the guide and, now confident, applies the real tool.

**Why this priority**: this is the entire point of the feature — replacing a guess, or a one-line tooltip, with an
answer a user can actually act on.

**Independent Test**: open the image editor, press the info control next to any one tool, confirm a guide opens
with that tool's name, an explanation, a practical example and a before/after picture, and confirm closing it
leaves the editor exactly as it was (no effect applied, no step added to the history).

**Acceptance Scenarios**:

1. **Given** the image editor toolbox is open, **When** the user presses the info control next to a tool or a
   Quick preset, **Then** a guide opens showing that tool's name, what it does, a practical example of when to use
   it, and a before/after picture of the effect applied to the sample logo.
2. **Given** a guide is open, **When** the user closes it (its own close control, the Escape key, or clicking
   outside it), **Then** the editor returns to exactly the state it was in before the guide opened: no operation
   was added, no picture changed.
3. **Given** the image editor toolbox is open, **When** the user looks at it, **Then** every one of the 13 tools
   and presets has its own info control, distinct from the button that runs the effect.

---

### User Story 2 - See the effect, not just read about it (Priority: P2)

A user reads a guide and sees, without leaving it, a small picture of the sample logo before the effect and the
same logo after it, so the written explanation is backed by something they can see rather than only imagine.

**Why this priority**: builds directly on User Story 1; the written guide alone already delivers value, the
picture makes it concrete.

**Independent Test**: open any one guide and confirm it shows two small pictures side by side, labelled "Before"
and "After", and that the "after" picture visibly differs from the "before" picture in the way the guide's text
describes (for example, Remove background: the background turns from solid to see-through).

**Acceptance Scenarios**:

1. **Given** a guide is open, **When** the user looks at it, **Then** it shows a "Before" picture and an "After"
   picture of the same sample logo, and the two are visibly different in the way the guide describes.
2. **Given** the guide is for a tool whose result depends on transparency (Remove background, Fill background,
   Solid colour, Outline maker), **When** the "after" picture has see-through pixels, **Then** they are shown
   against a checkerboard, the same way the main editor already shows transparency, so see-through is not mistaken
   for white or black.

---

### User Story 3 - A consistent, professional reading experience across every guide (Priority: P3)

A user who has read one guide already knows how to read the next one: the same layout, the same tone, the same
place to close it. Moving from tool to tool to compare their guides feels like reading one short, well-written
manual, not a patchwork of notes.

**Why this priority**: raises the ceiling from "informative" to "feels like enterprise software", but every
individual guide is already useful without this consistency being perfect.

**Independent Test**: open two or three different guides in a row and confirm each follows the same structure
(name, explanation, example, before/after picture, close control) and reading level.

**Acceptance Scenarios**:

1. **Given** any two guides, **When** compared, **Then** both follow the same section order and the same tone
   (plain, confident, professional language; no jargon introduced without being explained).
2. **Given** the editor's light or dark theme, **When** a guide is open, **Then** its colours follow the active
   theme and stay readable (Principle VII).

---

### User Story 4 - A technical manual of every modifiable parameter (Priority: P2)

A user who already knows roughly what an operation does wants to know exactly what each of its adjustable
settings controls before touching it — for example, what "Tolerance" or "Softness" actually changes on Remove
background, or what the four numbers of Crop mean. Opening that operation's guide shows a Parameters section
listing every setting the operation's own step controls expose, each with its valid range or choices and a plain
explanation of what it does.

**Why this priority**: turns the guide from "what this button roughly does" into a reference a user can act on
immediately once they open the real tool's own fields, without trial and error.

**Independent Test**: open the guide for an operation with several settings (Remove background), confirm the
Parameters section lists every one of its five settings by the same label the real tool uses, each with its range
or choices and an explanation; open the guide for a Quick preset and confirm it shows no Parameters section,
since a preset takes no settings of its own.

**Acceptance Scenarios**:

1. **Given** the guide for an editing operation, **When** the user looks at its Parameters section, **Then** it
   lists every setting that operation's own fields expose in the editor, under the same label, each with its
   valid range or choices and a plain explanation of what it changes.
2. **Given** the guide for one of the 2 Quick presets, **When** the user looks at it, **Then** no Parameters
   section is shown, because a preset takes no settings of its own.
3. **Given** a later change adds a new setting to an operation's own fields, or removes or renames one, **When**
   that operation's guide is opened, **Then** its Parameters section lists exactly the current settings, never a
   stale or missing one — the guide's parameter list and ranges always come from the same definition the
   editor's own fields use, so the two cannot drift apart.

### Edge Cases

- What happens when the user opens a guide, then resizes the window or switches theme? The guide stays open,
  re-laid-out or re-themed like the rest of the editor; it does not close by itself.
- What happens when the user opens a second guide while one is already open? The first guide closes and the new
  one opens; only one guide is on screen at a time.
- What happens on a very narrow PPTB pane? The guide still fits inside the container without causing the page to
  scroll sideways (Principle VII): it stacks its before/after pictures instead of placing them side by side.
- What happens for Flip left-right and Flip top-bottom, which are two buttons for one idea? They open the same
  single guide about mirroring; its before/after picture shows the left-right mirror, and its text says the
  top-bottom button works the same way on the other axis.
- What happens if the user never opens any guide? Nothing changes about how the toolbox already behaves; the
  guides are additive and change no existing button's click behaviour.
- What happens when an operation gains, loses or renames a setting later? Its guide's Parameters section is
  derived from the same definition the editor's own step controls use, so the list, labels, ranges and choices
  update automatically; only the new or renamed setting's plain-language explanation needs to be written once,
  and an automated check fails the build until it is.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST show an info control next to every one of the 13 toolbox entries (11 editing
  operations, counting the two Flip buttons as one shared guide, plus the 2 Quick presets), separate from the
  button that applies or adds the effect, so pressing one never triggers the other.
- **FR-002**: Pressing an info control MUST open a guide for that one effect containing, in this order: the
  effect's name, a short explanation of what it changes, one practical example of when to use it, and a
  before/after picture pair.
- **FR-003**: The before/after picture pair MUST be computed by applying the real effect (the same operation code
  the toolbox button itself runs, with sensible default settings) to one fixed, built-in sample logo, never to the
  icon currently open in the editor and never fetched from the network (Principle II).
- **FR-004**: Where the "after" picture contains see-through pixels, the tool MUST show them against the same
  checkerboard pattern the main editor canvas already uses for transparency, never as plain white or black.
- **FR-005**: Closing a guide (its own close control, the Escape key, or a click outside it) MUST leave the
  editor's picture and operation history exactly as they were before the guide opened; opening or closing a guide
  MUST NOT add, remove or change any operation.
- **FR-006**: Only one guide MUST be open at a time: opening a new one closes whichever was already open.
- **FR-007**: Every guide MUST follow the same section order and tone, and MUST use the active light/dark theme's
  colours, staying readable in both (Principle VII); no emoji, CSS shapes or basic glyphs only for any icon used
  inside the guide.
- **FR-008**: The guide MUST fit inside the editor's own container at any width the editor itself already supports,
  without causing the page to scroll sideways (Principle VII).
- **FR-009**: For every one of the 11 editing operations, the operation's guide MUST show a Parameters section
  listing every setting that operation's own step controls expose (the same labels, ranges and choices as the
  real tool), each with a plain explanation of what it does; the 2 Quick presets, which take no settings of their
  own, MUST show no Parameters section.
- **FR-010**: The parameter list and its labels, ranges and choices MUST be read from the same single definition
  the editor's own step controls already use for that operation, never duplicated by hand, so a setting added,
  renamed or removed there is reflected in its guide without a separate edit; an automated check MUST fail
  whenever a setting's plain-language explanation is missing, for that operation or any added later.

### Key Entities *(include if feature involves data)*

- **Effect Guide**: static, built-in content for one toolbox entry — its name, explanation text, example text, and
  the recipe (which sample picture and which operation, with which default settings) used to compute its
  before/after pair. Not user data, not saved anywhere; the same for every user and every session.
- **Parameter Explanation**: static, built-in prose — one entry per setting of an editing operation, keyed to the
  same name the editor's own step controls use for that setting, explaining what it does. The setting's label,
  range and choices are never duplicated here: both the real tool and its guide read them from the one
  definition the step controls already use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user unfamiliar with the toolbox can, for any tool, find out in one click what it does, when to
  use it and see a picture of its effect, without leaving the image editor.
- **SC-002**: Every one of the 13 toolbox entries has a guide; none is missing or shows another entry's content.
- **SC-003**: Opening and closing any guide, any number of times, never changes the picture being edited or its
  operation history.
- **SC-004**: Guides remain fully readable (text and pictures both legible, no sideways page scroll) at every
  width the image editor itself already supports, and in both the light and the dark theme.
- **SC-005**: For every editing operation, a user can find out what each of its settings does, and its valid
  range or choices, without leaving the guide or opening the real tool first — and this stays true after a
  setting is added, renamed or removed, with no separate edit to keep the two in step.

## Assumptions

- "Info control" is a small, always-visible button (an "i" glyph with an accessible label), not a hover-only
  tooltip, a long-press or a right-click menu, so it works the same on mouse, keyboard and touch.
- The sample logo and every before/after picture are generated in code from simple shapes (not an image asset
  file), so they add no binary assets, stay pixel-exact across runs, and are produced by the same, already-tested
  operation code the toolbox buttons call (`services/image/ops.ts`, `services/image/pipeline.ts`) — this feature
  adds no new pixel algorithm, only a fixed sample input and a guide-content map.
- The two Flip buttons intentionally share one guide, since they are the same idea on two axes; every other
  toolbox entry gets its own guide.
- The guide is presented as an overlay within the image editor workspace (which is itself already a full-screen
  dialog); it does not need its own route or a change to any other page.
- No telemetry, analytics or persistence of which guides a user opened: Principle II (nothing leaves the machine)
  and Principle VIII (no scope beyond what was asked) both rule it out for this feature.
- The parameter names, labels, ranges and choices a guide's Parameters section shows (FR-009, FR-010) come from
  the same definition the image editor's own step controls already use for that operation (extracted to its own
  shared module so both can read it without one importing the other); only the plain-language explanation of each
  parameter is content specific to this feature, and an automated test keeps that explanation list exactly in
  step with the shared definition, for every operation today and any added later.

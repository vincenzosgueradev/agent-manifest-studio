# Feature Specification: Manifest Editor

**Feature Branch**: `003-manifest-editor`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Edit the manifest. Extend the step Suffix into an Edit step where the user changes every field of the Teams app manifest that is safe and meaningful to change for a Copilot Studio agent package, with live validation, and exports a package in which only the fields the user changed differ. Groups: identity (names with the suffix chips), descriptions, developer, look (accent colour, colour icon, outline icon), version, valid domains, permissions. Identity and structure fields (manifest version, app id, bots, agents, extensions) are shown and kept as they are. Per-field changed marker, Revert, Revert all, a Changes panel in the export step, export blocked while a field is invalid, and a safety net that proves that only edited fields differ."

## Context

Features 001 and 002 (002 was withdrawn on 2026-10-28: the tool opens a file only) get a Teams app package into the tool and let the user change one thing: the
environment suffix of the two names. Everything else in the package is read, previewed and checked,
and then saved exactly as it was. That is safe, and it is also the limit of the tool's usefulness:
the user who sees a wrong description, a wrong accent colour, an old developer link or an icon that
fails a check has to leave the tool, unzip the package, edit it by hand and zip it again.

This feature removes that. Every field of the manifest that can be changed without breaking the app
is editable in the tool, next to the preview that shows the effect, and the saved package differs
from the original **only in what the user edited**. What cannot be changed safely (the app id, the
manifest schema version, the bots and agents the package declares) is shown, explained and kept.

The tool still works on a package file and writes nothing to an environment (Principle II). What
changes is the promise about the output: spec 001 said only `name.short` and `name.full` may
differ; this feature widens it to the fields the user edited, and the constitution is amended
(version 1.2.0) so that its first-release scope no longer says "only the names changed".

## Clarifications

### Session 2026-10-27

Decided in autonomous mode by choosing the recommended option; the user can overrule any of them.

- Q: Where does editing live in the flow? → A: Step 2 is renamed from "Suffix" to "Edit" and holds every editor, as cards one under another and full width, grouped Identity, Descriptions, Developer, Look, Version, Valid domains, Permissions, then the read-only groups. The preview and the checks (steps 3 and 4) always show the edited package, so what the user sees is what is saved.
- Q: May a field that the manifest does not have be added? → A: Yes, for the optional fields the schema defines (`developer.termsOfUseUrl`, a description, an optional URL, `validDomains`, `permissions`, `devicePermissions`): typing a value adds the entry, and emptying an optional field removes it again. A required field cannot be emptied.
- Q: How is an icon replaced? → A: By choosing a PNG file (the host's file dialog, or by dropping it on the icon card). The new file takes the place of the old one at the same path in the package; the manifest path does not change. The file is read by the same rules as any icon (PNG, exact size, weight, colour rules) and refused with the cause if it fails a blocking rule; a warning does not refuse it.
- Q: What is read-only? → A: `manifestVersion` and `id` (changing them changes what the app is or how Teams reads it), every entry the tool does not edit (`bots`, `copilotAgents`, `composeExtensions`, `staticTabs`, `webApplicationInfo`, `authorization` and the like) and any name or description that is a localisation key. They are listed in a read-only group with one sentence saying why.
- Q: What does the version helper do? → A: It rewrites `version` as a semantic version: "Bump patch" raises the third number, "Bump minor" raises the second and sets the third to 0. If the current value is not a three-number version the buttons are disabled and say so.
- Q: Which permission values are offered? → A: The documented ones, as a pick list: `permissions` (`identity`, `messageTeamMembers`) and `devicePermissions` (`geolocation`, `media`, `notifications`, `midi`, `openExternal`). A value already in the manifest and not in this list is shown, kept, and can be removed but not re-added. Verified against Microsoft Learn in research.md; anything not verified is marked UNVERIFIED there.
- Q: How are `validDomains` entered? → A: One host name per entry (letters, digits, hyphens and dots, an optional leading `*.`), no scheme, no path, no port; duplicates are refused; the number of entries and their length follow the schema limits recorded in research.md.
- Q: What happens to the formatting of the manifest? → A: Untouched wherever the user changed nothing. The tool changes only the text of the edited values; the order of keys, the spacing, the line endings and an initial byte order mark stay as they are. When an entry has to be added or an array has changed, only that part is written.
- Q: What does the "Changes" panel show? → A: In the Save step, a table with one row per manifest field that differs (field path, old value, new value, with long values shortened and the full text in a tooltip) and one row per replaced icon (path, old and new size in pixels and bytes), above the existing file list, which marks the changed entries.
- Q: Does a failing check block export? → A: As in feature 001: a failing check on a value blocks the export and names it. A field that is invalid as typed (not a URL, not a hex colour, over its length) blocks too and is named. A warning never blocks.
- Q: What if the user edits and then loads or removes the package? → A: All edits are dropped with the package, as the package itself is, and nothing is kept between loads.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct the text fields and the accent colour and save (Priority: P1)

The user has a package whose descriptions are the default text, whose developer links are old and
whose version needs to go up. They open step 2 (Details), change the descriptions, the developer name and links
and the accent colour, press "Bump patch", look at the preview and the checks, and save. The new
package has those changes and nothing else.

**Why this priority**: this is the smallest slice that makes the tool a manifest editor and not only
a suffix tool; the text fields cover most real corrections.

**Independent Test**: load a generated package, change `description.short`, `developer.name`,
`developer.websiteUrl`, `accentColor` and `version`, save, read the saved zip, and compare the saved
manifest with the original value by value: exactly those five differ, every other entry and file are
identical.

**Acceptance Scenarios**:

1. **Given** a loaded package, **When** the user opens step 2 (Details; the Look group is in step 3), **Then** every editable group is a
   card, one under another and full width, each field shows its current value, its limit when it has
   one, and no field is marked as changed.
2. **Given** a field, **When** the user types a different value, **Then** the field is marked as
   changed, a Revert button for that field appears, the preview and the checks use the new value as
   it is typed, and "Revert all" becomes available.
3. **Given** a changed field, **When** the user presses Revert (or types the original value back),
   **Then** the field is back to the original and no longer marked.
4. **Given** an invalid value (a description over its limit, a developer link that is not an https
   URL, an accent colour that is not `#RRGGBB`), **When** the user types it, **Then** the field says
   why in words next to it and Save is blocked naming the field.
5. **Given** the version `1.2.3`, **When** the user presses "Bump patch", **Then** the version is
   `1.2.4`; "Bump minor" from `1.2.3` gives `1.3.0`; for the value `1.0` or `2024-01` the buttons are
   disabled and say the value is not a three-number version.
6. **Given** the edits above, **When** the user saves, **Then** the new package differs from the
   original in exactly the edited fields and in no other manifest entry or file.

---

### User Story 2 - Replace the colour icon and the outline icon (Priority: P2)

The user has a new PNG for the agent. They choose it for the colour icon, see it laid on the accent
colour at the Teams sizes with the safe area, see the checks of the new image, replace the outline
icon the same way, and save a package carrying the new images.

**Why this priority**: it is what the tool is named for, and it closes the loop "I have an idea for
the icon" to "I have a package with it" without leaving the tool. It depends on the editing frame of
story 1.

**Independent Test**: load a package, replace the colour icon with a generated 192 by 192 PNG, save,
and verify that the entry at the manifest path holds exactly the new bytes, that the old and new
images differ, and that nothing else in the package changed.

**Acceptance Scenarios**:

1. **Given** the icon card, **When** the user chooses a PNG, **Then** the preview, the checks and the
   Changes panel use the new image, the card shows its size and weight, and a Revert button restores
   the original image.
2. **Given** a file that is not a PNG, is not square, or is not the required size for that icon,
   **When** the user chooses it, **Then** it is refused with the cause and the current icon stays.
3. **Given** a PNG that passes the blocking rules but breaks a warning rule (over 72 KB, the logo
   outside the safe area), **When** it is chosen, **Then** it is accepted and the warning is shown.
4. **Given** a package whose manifest declares an icon path that is missing from the zip, **When**
   the user chooses a PNG, **Then** the missing entry is added at that path and the check that
   reported it is satisfied.
5. **Given** a replaced icon, **When** the user saves, **Then** the entry at that path is the new
   file byte for byte, the manifest still names the same path, and every other entry is unchanged.

---

### User Story 3 - Edit valid domains and permissions (Priority: P3)

The user adds a host name that the agent's content comes from, removes one that is no longer used,
and adds a device permission, each as an entry of a list.

**Why this priority**: lists need their own editor (add, remove, duplicates) and affect behaviour
rather than looks, so they come after text and icons.

**Independent Test**: load a package, add one valid domain and one permission, remove one existing
domain, save, and check the three arrays in the saved manifest against the expected arrays.

**Acceptance Scenarios**:

1. **Given** the Valid domains card, **When** the user types `contoso.com` and presses Add, **Then**
   it appears as a removable entry; the same value again is refused as a duplicate; `https://x.com`,
   `x.com/path` and `x.com:8080` are refused with the reason.
2. **Given** an entry, **When** the user presses its remove button, **Then** it leaves the list and the
   change is marked; Revert restores the list in its original order.
3. **Given** the Permissions card, **When** the user opens the pick list, **Then** only documented
   values not yet present are offered; adding one appends it.
4. **Given** a manifest with no `validDomains`, **When** the user adds the first entry, **Then** the
   saved manifest gains the array; removing the last entry of a list the manifest did not have
   removes the key again.

---

### User Story 4 - See every change before saving, and trust the result (Priority: P1)

Before saving, the user reads a table of every manifest field that will differ and every icon that
was replaced. After saving, the tool proves, from the bytes it wrote, that nothing else changed.

**Why this priority**: an editor that can change many fields must make the change visible and
provable, or the user cannot trust the package; it is the replacement for the old promise "only the
names change".

**Independent Test**: edit fields in every group, open the Save step, compare the Changes table with
the list of edits made; save, re-read the saved package with an independent reader, and check that
the set of differing fields equals the set of edits.

**Acceptance Scenarios**:

1. **Given** edits in several groups, **When** the user opens the Save step, **Then** the Changes
   table has one row per differing field with old and new value, and one row per replaced icon.
2. **Given** no edits, **When** the user opens the Save step, **Then** the table says that nothing
   changed and the saved package has the same content as the original.
3. **Given** any invalid field or a failing check, **When** the user presses Save, **Then** nothing is
   saved and the message names every field or check that blocks.
4. **Given** the saved bytes, **When** the tool compares them with the original, **Then** any
   difference outside the edited fields stops the save with an explanation (the safety net), and the
   user is told that nothing was written.

---

### User Story 5 - See what is read-only and why (Priority: P3)

The user opens the read-only group and sees the app id, the manifest version, the bots and agents the
package declares, and any localised text, each with the reason it is not editable.

**Why this priority**: an editor that silently omits fields invites the question "why can't I change
this?"; the answer belongs on the screen.

**Independent Test**: load a package with `bots`, `copilotAgents` and a localisation-key name; check
that each is listed in the read-only group with its reason, that no input exists for them, and that
they are unchanged after export.

**Acceptance Scenarios**:

1. **Given** a package with an `id`, `manifestVersion`, `bots` and `copilotAgents`, **When** the user
   opens step 2, **Then** they are listed as read-only with one sentence each saying why.
2. **Given** a name written as `[[KEY]]`, **When** the user opens step 2, **Then** the name field is
   read-only with the key shown and the reason (its text lives in a language file); the suffix chips
   are not offered for it.
3. **Given** an entry the tool does not know, **When** the package is exported, **Then** it is kept
   exactly as it was.

---

### Edge Cases

- A manifest that is not valid JSON, or has no `name` object, behaves as in feature 001: refused or
  read-only, never edited.
- Two edits that would make `name.short` equal `name.full` are blocked, as the schema requires the
  two to differ.
- A value with characters that JSON must escape (quotes, backslashes, line breaks in the full
  description, characters above U+FFFF) is written correctly and read back as typed.
- A manifest with a byte order mark, Windows line endings or tabs keeps them untouched where nothing
  changed.
- A manifest where a field to edit appears twice (a duplicate key) is refused as ambiguous, rather
  than editing one of them.
- A very long value (the full description at its limit) is edited and saved without loss.
- Pasting text with leading or trailing spaces: the value is kept as typed, and a warning says the
  value has leading or trailing spaces; the name rules of feature 001 about the suffix still apply to
  the names.
- Replacing the icon with the same bytes as the current one is not a change.
- Editing a field and then loading another package, or removing the package, drops every edit.
- An optional field edited to empty is removed from the manifest; a required one reports that it
  cannot be empty and keeps the last valid value for the preview.
- Reverting a field that was added restores the original absence of the key.

## Requirements *(mandatory)*

### Functional Requirements

**Edit step**

- **FR-001**: Step 2 MUST be named "Edit" (amended 2026-10-28: the code splits it in two steps, "Details" with Identity, Descriptions, Developer, Version, Valid domains, Permissions and the read-only group, and "Look" with the Look group, the icon cards and the image editor; ids `step-suffix` and `step-look`) and MUST hold, as cards one under another and full width,
  the groups Identity, Descriptions, Developer, Look, Version, Valid domains and Permissions, then the
  read-only group.
- **FR-002**: Every editable field MUST show its current value, its limit when it has one with the
  count typed, and an explicit label, not a key name alone.
- **FR-003**: Every changed field MUST be marked as changed and MUST have a Revert button; a "Revert
  all" action MUST restore every field and every icon to the original and be disabled while nothing
  is changed. Typing the original value back MUST clear the marker.
- **FR-004**: Every editor MUST validate as the user types and MUST say in words why a value is
  invalid, next to the field; an invalid value MUST NOT reach the preview as if it were valid (the
  preview keeps the last valid value and says so).
- **FR-005**: The preview (step 4 since the Look step exists) and the checks (step 5) MUST always be computed from the edited
  package, so that what is previewed is what is saved.

**Identity and descriptions**

- **FR-006**: The user MUST be able to edit `name.short` and `name.full` as free text, and the suffix
  chips, the Clear action and the suffix rules of feature 001 MUST keep working on top of them.
- **FR-007**: The user MUST be able to edit `description.short` (at most 80 characters) and
  `description.full` (at most 4000 characters); over the limit is invalid; `description.full` MUST
  accept line breaks.

**Developer**

- **FR-008**: The user MUST be able to edit `developer.name` (at most 32 characters),
  `developer.websiteUrl`, `developer.privacyUrl` and `developer.termsOfUseUrl`; each URL MUST be an
  https URL of at most 2048 characters; `developer.termsOfUseUrl` is optional.

**Look**

- **FR-009**: The user MUST be able to edit `accentColor` as text in the form `#RRGGBB`, with a
  swatch showing the colour and a colour picker (the window's own) next to the field; a value that is not
  six hexadecimal digits after `#` is invalid. (The first version had no picker; the user asked for one.)
- **FR-010**: The user MUST be able to replace the colour icon and the outline icon with a PNG file,
  chosen by the host's file dialog or dropped on the icon card.
- **FR-011**: A chosen icon MUST be read by the same rules as an icon in a package (PNG, exact size
  192 by 192 for the colour icon and 32 by 32 for the outline icon, weight, colour rules); a blocking
  failure MUST refuse the file with the cause and keep the current icon; a warning MUST accept it and
  show the warning.
- **FR-012**: A replaced icon MUST take the place of the old one at the same path in the package; the
  manifest path MUST NOT change; when the declared path is missing from the package the entry MUST be
  added at that path.
- **FR-013**: Each icon card MUST show the current image with its size in pixels and bytes, and a
  Revert button when replaced.

**Version**

- **FR-014**: The user MUST be able to edit `version` as text; "Bump patch" and "Bump minor" MUST
  rewrite a three-number version as specified in the Clarifications, and be disabled with a reason for
  any other value. An empty `version` is invalid.

**Lists**

- **FR-015** (superseded by the user's decision of 2026-10-27: valid domains and permissions are shown read-only, never edited; the core can still do it, the screen does not offer it): The user MUST be able to add and remove entries of `validDomains`; an entry is a host
  name as defined in the Clarifications; duplicates, empty entries and entries outside the schema
  limits MUST be refused with the reason.
- **FR-016**: The user MUST be able to add and remove entries of `permissions` and `devicePermissions`
  from the documented values; the pick list MUST offer only values not already present; a value in the
  manifest that is not documented MUST be kept and removable.
- **FR-017**: Revert of a list MUST restore its original entries in their original order; an array the
  manifest did not have MUST be removed again when it becomes empty.

**Read-only**

- **FR-018** (changed on 2026-10-27 by the user: the first step shows everything the package declares; the Edit step shows only what can be edited, so read-only entries are not repeated there): `manifestVersion`, `id`, every entry the tool does not edit and every name or
  description that is a localisation key MUST be shown read-only with a reason, MUST have no input and
  MUST be kept exactly as they were.

**Changes and export**

- **FR-019**: The Save step MUST show a Changes table with one row per manifest field that differs
  (path, old value, new value, long values shortened with the full text in a tooltip) and one row per
  replaced icon (path, old and new size in pixels and bytes), and the text "No change" when there is
  none. The file list of feature 001 MUST mark every changed entry.
- **FR-020**: The new package MUST differ from the original only in the edited manifest values and the
  replaced icon entries: the decompressed content of every other entry MUST be identical, and in the
  manifest every other value, the order of keys and the formatting of untouched text MUST be kept.
- **FR-021**: Exporting without any edit MUST give a package with the same content as the original.
- **FR-022**: Export MUST be blocked, naming each cause, while any edited field is invalid or any check
  that blocks fails; a warning MUST NOT block.
- **FR-023**: After building the new package the tool MUST compare it with the original by an
  independent reading, and if anything outside the edited fields differs it MUST refuse to save and say
  so (the safety net of feature 001, widened to the edited set).
- **FR-024**: The suggested file name and the report of the checks of feature 001 MUST keep working
  and MUST describe the edited package; the report MUST list the fields that were edited.

**Cross-cutting**

- **FR-025**: The tool MUST NOT write to Dataverse, to Copilot Studio or to any environment, and MUST
  NOT add any network call; the editor MUST work with no connection at all, on a package from a file.
- **FR-026**: Edits MUST NOT be kept once another package is loaded, the package is removed, or the
  tool is closed.
- **FR-027**: Every message, marker and control MUST be readable in the light and in the dark theme,
  use no emoji, and be reachable and usable with the keyboard; every control MUST have an explicit
  label.
- **FR-028**: The README section "What this tool changes" and the constitution MUST be updated to say
  that the saved package differs from the opened one only in the fields the user edited, and a test
  MUST fail if the README still says that only the names change.
- **FR-029**: Facts the editor relies on (field limits, documented permission values, valid domain
  rules) MUST be recorded in research.md with the date and source read on Microsoft Learn, and any not
  verified MUST be marked UNVERIFIED.

### Key Entities

- **Edit set**: the fields and icons the user has changed in this session, each with its original
  value, so that it can be reverted and listed.
- **Field**: one manifest value the tool can edit; has a path, a kind (text, URL, colour, version,
  list), a limit, whether it is required, and a validation result.
- **Icon replacement**: the new bytes for an icon path, with their checks, and the original bytes.
- **Change row**: the pair (old, new) shown in the Changes table for one field or icon.
- **Read-only entry**: a manifest entry that is displayed with a reason and never edited.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can change the descriptions, developer data, accent colour and version of a
  package and save it in under two minutes without leaving the tool.
- **SC-002**: In a saved package, 100% of the manifest values and files the user did not edit are
  identical to the original, over every combination of edited groups covered by the tests.
- **SC-003**: Every invalid value is caught before saving: no invalid field reaches the saved package
  in any test, and each blocked save names the field.
- **SC-004**: A replaced icon is in the saved package byte for byte, and the preview shows it at all
  four sizes before saving.
- **SC-005**: The Changes table lists exactly the fields and icons that differ between the original and
  the saved package, with no missing and no extra row, for every edit combination tested.
- **SC-006**: A user can find why a field is not editable without leaving the screen, for every
  read-only entry.
- **SC-007**: The editor adds no network call and no write method of the host APIs, proven by a test,
  and the README states what changes.

## Assumptions

- The package is a Copilot Studio agent package: the manifest has the app-level fields above and
  declares its agent or bot in entries this tool does not edit.
- The field limits and documented values in the Clarifications are taken from the Microsoft 365 app
  manifest schema read on Microsoft Learn; where a limit could not be confirmed it is recorded as
  UNVERIFIED in research.md and the tool uses the documented one, as a warning where the doubt is real.
- Editing the agent itself (its name in Copilot Studio, its topics, its icon in Dataverse) is out of
  scope: this tool edits the Teams package file.
- Editing `bots`, `composeExtensions`, `copilotAgents`, `webApplicationInfo` and the other structure
  entries, creating a manifest from scratch, uploading the package and handling several packages at once
  are out of scope.
- Localisation files in a package (language JSON files) are not edited; names and descriptions that
  point to them are read-only.
- The first release of this feature does not reorder the entries of a list and does not edit
  `icons.color32x32`.

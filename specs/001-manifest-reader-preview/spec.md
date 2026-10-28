# Feature Specification: Manifest Reader, Preview and Name Suffix Editor

**Feature Branch**: `001-manifest-reader-preview`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "The user loads a Copilot Studio agent Teams app package (manifest zip). The tool validates it, reads the manifest, shows all important information, shows an honest preview of icon and name, runs automatic checks, lets the user change the name suffix (for example [DEV] to [UAT] or [PROD]) and exports a new zip where only the name fields changed."

## Context

Today the only way to see how the icon and the name of a Copilot Studio agent will look in Microsoft
Teams is to upload the icon, publish the agent and look in Teams. Moving the same agent between
environments (DEV, UAT, PROD) also means renaming it by hand, because the environment suffix lives
in the name.

This tool works on the **Teams app package** that Copilot Studio produces (a zip with a manifest and
two icons), not on an environment. It is therefore different from Agent Nameplate, which works on
the agents inside an environment. Here nothing is read from or written to any environment: the user
brings a file and takes a file away.

## Clarifications

### Session 2026-10-26

Decided in autonomous mode by choosing the recommended option; the user can overrule any of them.

- Q: What is the largest package the tool accepts? → A: 5 MB for the whole zip and 1 MB per entry, checked before anything is decompressed (a Teams package is a few hundred KB; a larger one is either wrong or hostile).
- Q: Which failing checks block the export? → A: Only the name checks (length) that the user's change affects. A failure the original package already had (for example an oversized icon) is shown but does not block, because the user may still need the renamed copy; the export dialog lists the failures that remain.
- Q: What does "identical" mean for the files of the exported zip? → A: The decompressed bytes of every entry other than the manifest are identical, and names and order of entries are kept. The compressed bytes and the zip container may differ. The manifest keeps every entry and its order; only the two name values change.
- Q: What is suggested as the name of the saved file? → A: The original file name without extension, then a hyphen, then the new suffix without brackets and with characters that are not allowed in file names removed, then `.zip` (for example `Agent-UAT.zip`). If the suffix is empty the name gets `-no-suffix`. The original file is never overwritten.
- Q: Which suffix forms are recognised? → A: Only one final group in square brackets, optionally preceded by one space, of 1 to 20 characters without square brackets (`[DEV]`, `[UAT]`, `[PROD]`, `[Test 2]`). Other separators (`- DEV`, `(DEV)`) are not recognised: the name is treated as having no suffix and the typed suffix is appended in brackets.

### Session 2026-10-27 (hands-on in PPTB)

Requirements that came from using the tool, written down so that the spec matches what is built.

- The tool follows the look of Agent Nameplate: six steps (Package, Details, Look, Preview, Checks, Save; amended 2026-10-28, first built as five with Suffix in the second place) with a stepper in every header, a breadcrumb from the second step, Back and Next, panels with an icon and a title, and the usual environment names (DEV, TEST, UAT, STAGING, PREPROD, PROD) as chips beside the suffix input.
- Information blocks are cards or tables, not long lists: the summary is five cards, the checks are one compact table that needs no expanding.
- A loaded package is a compact bar (name, number of files, size, schema) with Replace and Remove; Remove returns the tool to its empty first step and leaves nothing of the package behind.
- Every icon belongs to one set of enterprise line icons (SVG masks, because the host does not draw inline SVG); the logo is the one of Agent Nameplate. **Open point**: the logo is a Microsoft Copilot-style mark; Principle V forbids presenting a Microsoft brand as the tool's own, so it must be checked against the marketplace policy before publishing.
- Added by the author of the tool, unasked, because they were missing: copy buttons, the contents table of the new package, the checks report, the safe-area check and guide, the colour icon at several sizes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load a package and see what is inside (Priority: P1)

The user downloads the Teams app package of an agent from Copilot Studio and loads it in the tool.
The tool checks that it is a usable package and shows, in one place, everything that identifies the
app: names, descriptions, version, schema version, developer information, accent colour, the
identifiers of the app and of its bot, the icons that are declared, and the permissions and valid
domains if the package declares any. Anything missing or not recognised is reported explicitly, never
left out silently.

**Why this priority**: it is the entry point of the whole tool. Without a package that is loaded and
understood, nothing else can be shown. On its own it already answers "what does this package really
contain?", which today requires unzipping it and reading raw text.

**Independent Test**: load a generated valid package and check that every item listed above appears
with the value in the package; load a package with missing and unknown entries and check that each is
named as missing or unknown.

**Acceptance Scenarios**:

1. **Given** a valid package, **When** the user loads it, **Then** the tool shows the short and full
   name, short and full description, app version, manifest schema version, developer information,
   accent colour, app identifier, bot identifier(s) and the declared icons.
2. **Given** a package whose manifest declares permissions or valid domains, **When** it is loaded,
   **Then** they are listed; **Given** it declares none, **Then** the tool says none are declared.
3. **Given** a package whose manifest has entries the tool does not know, **When** it is loaded,
   **Then** those entries are listed as "not recognised" and are carried through untouched.
4. **Given** a package that lacks an expected entry (for example no short description), **When** it
   is loaded, **Then** the tool names the missing entry instead of showing an empty value.
5. **Given** a file that is not a zip, a zip without a manifest, a zip without the colour icon or
   without the outline icon, or a manifest that is not valid text of the expected kind, **When** the
   user loads it, **Then** the tool refuses it with a message that says which of these it is, and
   shows nothing as if it had been read.

---

### User Story 2 - Honest preview of icon and name (Priority: P1)

After loading, the user sees the icon and the name as the agent will appear: the colour icon laid on
the accent colour as Teams shows it, the outline icon in the app bar in both the light and the dark
theme, and the app name as it will be read. Next to the preview the tool states what the preview
does not cover.

**Why this priority**: this is the reason the tool exists. It replaces "publish and look in Teams"
with "look here first". It is P1 together with the first story because a package that is read but not
shown does not change anything for the user.

**Independent Test**: load generated packages with known icon pixels and accent colours and compare
the pixels of the preview with a hand-computed table; check that both themes are shown and that the
limits notice is present.

**Acceptance Scenarios**:

1. **Given** a loaded package whose colour icon has transparent areas, **When** the preview is shown,
   **Then** the transparent areas show the accent colour, and a colour icon with a solid background
   is shown as it is.
2. **Given** a loaded package, **When** the preview is shown, **Then** the outline icon is shown on a
   light and on a dark app bar.
3. **Given** a loaded package, **When** the preview is shown, **Then** the app name is shown as the
   short name and, separately, as the full name.
4. **Given** the preview is on screen, **When** the user reads next to it, **Then** the tool says
   that (a) this is the Teams app name, not the name of the agent in Copilot Studio or in Dataverse,
   and (b) it does not reproduce exactly what Teams draws, so the final check is a test in Teams.

---

### User Story 3 - Automatic checks with a clear verdict (Priority: P2)

For each loaded package the tool runs a fixed list of checks and shows each with a verdict (pass,
warning, fail) and the value that was found, so the user knows before uploading whether the package
is likely to be accepted. Each check also says what it does not prove.

**Why this priority**: it turns the preview into a decision ("can I upload this?"). It depends on the
package being loaded, but the stories above are useful without it.

**Independent Test**: run the checks over a matrix of generated packages that each break exactly one
rule, and check that the one rule is reported and no other.

**Acceptance Scenarios**:

1. **Given** a colour icon that is a PNG, square, 192 by 192 pixels and under 72 KB, **When** the
   checks run, **Then** every colour-icon check passes.
2. **Given** a colour icon between 72 KB and 100 KB, **When** the checks run, **Then** the size check
   is a warning that explains the two limits documented by Microsoft, and above 100 KB it fails.
3. **Given** a colour icon that is not a PNG, is not square, is not 192 by 192, or has an unsupported
   bit depth or colour type, **When** the checks run, **Then** the matching check fails and names the
   value found.
4. **Given** an outline icon that is not 32 by 32 or is not white on transparent, **When** the checks
   run, **Then** the matching check fails or warns and names the value found.
5. **Given** a short name or a full name longer than the allowed length, **When** the checks run,
   **Then** the matching check fails and shows the length found and the limit.
6. **Given** an accent colour that is not a valid six-digit hexadecimal colour, **When** the checks
   run, **Then** the accent-colour check fails.
7. **Given** a file declared as an icon but not present in the package, **When** the checks run,
   **Then** it fails and names the file.

---

### User Story 4 - Change the name suffix and export (Priority: P1)

The user wants the same package for another environment. They change the suffix of the name (for
example from `[DEV]` to `[UAT]` or `[PROD]`), see the preview and the name checks update, and save a
new package. In the new package only the name fields differ from the original; every other file and
every other entry is identical.

**Why this priority**: this is the second half of the reason the tool exists and the part the user
asked to have in the first release. It removes the manual step of unzipping, editing text and zipping
again, and it removes the risk of damaging the rest of the package by doing so.

**Independent Test**: load a generated package, change the suffix, export, then compare the exported
package with the original entry by entry: only the two name entries differ, and the differences are
exactly the suffix.

**Acceptance Scenarios**:

1. **Given** a loaded package whose names end with a recognised suffix, **When** the user types
   another suffix, **Then** the suffix is shown separately from the rest of the name, the preview
   shows the new names, and the name-length checks are recalculated.
2. **Given** a loaded package whose names have no recognised suffix, **When** the user types a
   suffix, **Then** it is added at the end of the names and the preview shows it.
3. **Given** the user clears the suffix, **When** the preview is shown, **Then** the names are shown
   without suffix.
4. **Given** a suffix that makes a name longer than the allowed length, **When** the user types it,
   **Then** the length check fails at once and the export is not offered until it is fixed.
5. **Given** a changed suffix and no failing check, **When** the user exports, **Then** a new package
   is saved by the user; its name entries carry the new suffix and every other file and manifest
   entry is identical to the original.
6. **Given** the user exports without changing anything, **When** the new package is compared with
   the original, **Then** they carry the same content.
7. **Given** the user has changed the suffix, **When** they load another package or leave, **Then**
   the change is not kept (nothing is stored between loads).

---

### Edge Cases

- A package that contains the colour icon at a different size or declares an icon with a different
  file name: the tool follows what the manifest declares and reports a mismatch, it does not guess.
- A package over 5 MB, or with an entry over 1 MB: the tool refuses it with a message about the
  limit before decompressing it, and does not freeze.
- A package whose original icons already fail a check: it is still loaded, shown and exportable
  with a new suffix; the failures stay visible.
- A package whose names contain characters that are not plain text (accents, symbols, right-to-left
  text): they are shown and exported unchanged.
- A name where the recognised suffix appears twice or in the middle: only the final one is treated as
  the suffix.
- A short name and a full name that carry different suffixes: both are shown; the change applies to
  both and the tool says so.
- Two entries in the package with the same path, or paths that try to leave the package folder: the
  package is refused.
- The accent colour is absent: the preview says there is none and shows the icon as it is, not on an
  invented colour.
- A package that was already edited by this tool: it is treated like any other package.
- Dark and light theme of the tool itself: every message, verdict and preview is readable in both.

## Requirements *(mandatory)*

### Functional Requirements

**Loading and validation**

- **FR-001**: Users MUST be able to load a Teams app package from a file on their computer.
- **FR-002**: The tool MUST refuse, with a message that names the cause, a file that is not a valid
  package, a package without a manifest, without the colour icon or without the outline icon, a
  manifest that cannot be read, and a package with unsafe or duplicated paths.
- **FR-003**: The tool MUST refuse a package larger than 5 MB, or containing an entry larger than
  1 MB, or more than 200 entries, or more than 16 MB once everything is unpacked, before
  decompressing or processing it, with a message that says which limit was exceeded.

**Information shown**

- **FR-004**: The tool MUST show the short name, full name, short description, full description, app
  version, manifest schema version, developer information, accent colour, app identifier and bot
  identifier(s) of the loaded package.
- **FR-005**: The tool MUST show the icons declared by the manifest (colour, outline and, if
  present, the small colour icon) and the permissions and valid domains if declared.
- **FR-006**: The tool MUST report every expected entry that is missing and every entry it does not
  recognise, and MUST NOT remove or change an entry it does not recognise.

**Preview**

- **FR-007**: The tool MUST show the colour icon as Teams shows it: laid on the accent colour, with
  transparent areas taking that colour.
- **FR-008**: The tool MUST show the outline icon on a light and on a dark app bar.
- **FR-009**: The tool MUST show the app name as the short name and as the full name.
- **FR-010**: The preview MUST state next to it that the shown name is the Teams app name and not the
  name of the agent in Copilot Studio or in Dataverse, and that it does not reproduce exactly what
  Teams draws, with the final check being a test in Teams.
- **FR-011**: Every automatic check MUST state what it does not prove.

**Automatic checks**

- **FR-012**: The tool MUST check the colour icon: that it is a PNG, that it is square and 192 by 192
  pixels, that its bit depth and colour type are supported, and its size, with a warning above 72 KB
  and a failure above 100 KB.
- **FR-013**: The tool MUST check the outline icon: that it is a PNG, 32 by 32 pixels, white on
  transparent.
- **FR-014**: The tool MUST check the length of the short name and of the full name against the
  limits of the manifest schema. The limits MUST be re-read from Microsoft documentation before
  being relied on, and the date and source recorded with the feature's research notes.
- **FR-015**: The tool MUST check that the accent colour is a valid six-digit hexadecimal colour.
- **FR-016**: Each check MUST show a verdict (pass, warning or fail) and the value that was found.
- **FR-017**: A file that is declared in the manifest but absent from the package MUST be reported as
  a failure.

**Name suffix**

- **FR-018**: Users MUST be able to change the suffix of the short name and of the full name with a
  single input, and the change MUST apply to both names.
- **FR-019**: The tool MUST recognise as suffix only one final group of 1 to 20 characters in square
  brackets, optionally preceded by one space, show it separately from the base of the name, and add
  the typed suffix at the end, in brackets, when none is recognised.
- **FR-020**: The preview and the name checks MUST update as the suffix is typed.
- **FR-030**: When a name is not a literal text but a localisation key (a value written as
  `[[KEY]]`, used by declarative-agent packages), the tool MUST show the key as it is, say that the
  real text lives in a localisation file, and MUST NOT offer to change its suffix; the other name,
  if literal, remains editable.
- **FR-031**: The tool MUST present the work as six steps - Package, Details, Look, Preview, Checks, Save (originally five, with Suffix as the second; the suffix lives in Details, the Look step came with features 003 to 005) - with a stepper in the header of each, a breadcrumb from the second step on, and Back and Next buttons. Steps after the first MUST be reachable only once a package is loaded; after that any step MUST be reachable from the stepper or the breadcrumb, and what the user typed MUST survive moving between steps.
- **FR-032**: A loaded package MUST be shown as a compact bar with its file name, number of files, size and manifest schema version, a Replace button and a Remove button (trash icon). A file dropped on the panel MUST be loaded in either state. Remove MUST return to the first step with nothing loaded and MUST clear every region of the page, hidden steps included (FR-027), the typed suffix and any message.
- **FR-033**: The checks MUST be shown as one table with the columns Status, Check, Found, Rule and Does not prove, a heading row for each subject carrying its worst verdict, and no element that has to be expanded to be read.
- **FR-034**: Before saving, the tool MUST list every file of the new package with its size and whether it is identical or changed, and state in one sentence what changes: for a changed manifest, which of `name.short` and `name.full` differ and the size before and after.
- **FR-035**: The App ID, the bot id(s), the developer links and the accent colour MUST have a button that copies the value (all bot ids one per line); the button MUST confirm the copy, or say that the clipboard refused.
- **FR-036**: The user MUST be able to copy the checks report as JSON and save it as a file. The report MUST hold the tool and its version, the package name, the app id, version and names, the verdict counts and every check with its verdict, found value, rule and what it does not prove; it MUST NOT hold a date or any information about the machine.
- **FR-037**: For a 192 x 192 colour icon the tool MUST check that the logo stays inside the central 120 x 120 pixels (Microsoft Learn), as a warning, stating its assumption: the background is transparent or the colour of the top-left pixel and anything else counts as logo. The preview MUST offer a toggle that draws that area over the icon.
- **FR-038**: The preview MUST draw the colour icon at 192, 96, 48 and 32 pixels from the same pixels.
- **FR-021**: While a name check fails because of the suffix the user typed, the tool MUST NOT offer
  the export and MUST say which check blocks it. A check that already failed in the original
  package (for example an oversized icon) MUST NOT block the export; it stays visible and the
  export confirmation lists the failures that remain in the new package.

**Export**

- **FR-022**: Users MUST be able to save a new package that carries the changed names.
- **FR-023**: In the new package, the decompressed content of every file other than the manifest MUST
  be identical to the original, and the names and order of the entries MUST be kept. In the
  manifest only the short name and the full name values MUST differ; every other entry, including
  those the tool does not recognise, MUST be preserved with its value and order.
- **FR-024**: Exporting without any change MUST give a package with the same content as the original.
- **FR-025**: The suggested name of the saved file MUST be the original file name without extension,
  a hyphen, the new suffix without brackets (characters not allowed in file names removed, or
  `no-suffix` when empty, `copy` when the user typed nothing) and `.zip`; the original file MUST
  never be overwritten by the tool.

**Scope and safety**

- **FR-026**: The tool MUST NOT write to Dataverse, to Copilot Studio or to any environment, MUST NOT
  publish an agent, and MUST NOT make any call over the network. The files never leave the computer.
- **FR-027**: The tool MUST NOT keep any part of a loaded package once another is loaded or the tool
  is closed.
- **FR-028**: Every message, verdict and preview MUST be readable in the light and in the dark theme,
  and the screen MUST adapt to a narrow pane without horizontal page scrolling.
- **FR-029**: Empty and error states MUST say why (which file, which check) and MUST NOT be a blank
  area.

### Key Entities

- **Package**: the zip the user loads; has a set of files, each with a path, content and size.
- **Manifest**: the text entry of the package that describes the app; has names, descriptions,
  version, schema version, developer information, accent colour, identifiers, declared icons,
  permissions and valid domains, plus any entry the tool does not recognise.
- **Icon**: an image of the package, either colour or outline (or the small colour icon); has
  dimensions, format, bit depth, colour type, size and transparency.
- **Name**: the short name or the full name; has a base, a recognised suffix (possibly empty) and a
  length.
- **Check**: one rule applied to the package; has a name, a verdict (pass, warning, fail), the value
  found and what it does not prove.
- **Preview**: the combined view of the colour icon on the accent colour, the outline icon on light
  and dark bars, and the names.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from a downloaded package to seeing its preview and checks in under
  30 seconds, with a single action after choosing the file.
- **SC-002**: Changing a package from one environment suffix to another and saving it takes under
  1 minute and needs no editing of text files by hand.
- **SC-003**: In 100% of exports, the decompressed content of every file other than the manifest is
  identical to the original and the manifest differs only in the short name and full name values.
- **SC-004**: Over a matrix of generated packages that each break one rule, 100% of the broken rules
  are reported with the right verdict and no unrelated rule is reported.
- **SC-005**: 100% of refused files (not a zip, missing manifest, missing icon, unreadable manifest,
  unsafe path) are refused with a message that names the cause, and none is shown as if it were read.
- **SC-006**: The preview's pixels match a hand-computed table for every combination of icon
  transparency and accent colour tested.
- **SC-007**: The notice about what the preview does not cover is visible with the preview in 100% of
  cases.
- **SC-008**: Nothing is sent over the network and nothing is written to any environment, verified by
  a test that fails if either happens.
- **SC-009**: Each of the four main journeys is completed correctly in both light and dark theme
  during the manual test in the real tool, with the result recorded in the quickstart.

## Assumptions

- The user obtains the package from Copilot Studio (download of the Teams app package of the agent)
  and has permission to use it. The tool does not obtain packages itself.
- The package follows the structure Copilot Studio produces: a manifest and two icons at the top
  level. Packages with a different structure are handled as far as the manifest declares them.
- "Suffix" is defined in FR-019 and in the Clarifications. Other separators are out of scope for
  this release.
- The same suffix is applied to the short name and the full name, because the two carry the same
  environment marker in packages from Copilot Studio.
- The name lengths and the colour-icon limits are those recorded in the constitution's *Verified
  Facts*; the name length limits are not yet recorded there and MUST be verified and added.
- The warning above 72 KB and failure above 100 KB reflect a documentation conflict that is still
  untested; the thresholds can change when a test settles it.
- Editing the icon image, the accent colour or any other entry, comparing several packages side by
  side, reading from an environment, and any machine-readable entry point for agents are out of
  scope for this release and are planned for later ones.
- This feature requires an amendment to Principle VIII of the constitution (patch version 1.0.1) so
  that the first release is: read the manifest, show the preview of icon and name, change the name
  suffix, export. Glyph and accent colour editing move to the next release.
- Difference from Agent Nameplate: that tool acts on agents inside an environment; this one acts
  only on the Teams app package and never touches an environment. The README and the marketplace
  description of this tool will say so.

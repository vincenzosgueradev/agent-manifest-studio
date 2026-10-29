# Changelog

All notable changes to Agent Manifest Studio are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Two-way icon sync**: editing or replacing the colour icon offers, on the outline icon card, to regenerate the
  outline icon to match its new shape (the same computation as the editor's "Outline from this icon"); editing or
  replacing the outline icon offers, on the colour icon card, to build a colour icon from its shape, enlarged onto
  a tile of the accent colour (or Teams blue when the accent is close to grey), setting the accent colour to match.
  Both are suggestions the user confirms, go through the normal replace path (Changes table, Revert all), are not
  repeated for the same state, and never trigger each other back (no loop).

- **Fix it, with one click**: every check that fails or warns, and that the tool can resolve on its own, gets a "Fix it" button next to "How to fix it": it resizes and re-encodes the colour icon or the outline icon so the whole group passes, shortens a too-long name or description to exactly its limit, or sets the accent colour to whichever of black or white stands out most against the logo. A "Fix everything" control applies every available fix in one action. Either one leaves a banner with what changed and an Undo that restores exactly what was there before.
- **Two-way sync between the colour icon and the outline icon**: after you replace the colour icon directly (a new file, or an edit applied in the image editor), its card offers to regenerate the outline icon to match its new shape, and the other way round from the outline icon, with the accent colour set to match when going from outline to colour. Accept replaces the icon and lists it in Changes; Not now dismisses the suggestion until that icon changes again; accepting one never asks for the opposite suggestion back.
- **Effect guides in the image editor**: every tool and Quick preset in the toolbox now has its own small "i" info control, next to the button that applies it. It opens a short guide — what the effect does, when to use it and a Before/After picture of it applied to a fixed sample logo — in plain, professional language. For every editing operation (not the two Quick presets, which take no settings of their own), the guide also lists a **Parameters** section: every one of its settings, by its real label, with its valid range or choices and a plain explanation of what it does — read from the same definition the editor's own controls use, so it can never go out of step with them. Opening or closing a guide never changes the picture you are editing or its history; only one guide is open at a time.
- **Image editor, professional toolbox**: the tools are grouped by category (Quick, Background, Geometry, Colour, Outline), each group with a title, an SVG icon and a colour of its own; the right column is the **History**, every effect in order with its icon and colour; the result at the sizes of Teams is under the picture. **Undo, Redo and Revert all** (red, because it destroys) are on the right with Cancel and Apply. An effect can be in the history **once**: its tool goes grey, with the reason, until the step is removed, and tools that do not go together switch each other off (the Outline maker with Solid colour, Tone and Fill background; Solid colour with Tone).
- **Image editor laid out like an image editor**: an options bar on top, a toolbox on the left, the picture in the middle with **rulers**, the steps, colour and Teams sizes in panels on the right, and a **status bar** with the size, the pixel under the pointer and the zoom. A **grid** button draws lines over the picture (and the safe area of the colour icon). The zoom goes from 10 to 200 %; before, it went to 800 %.
- **Image editor workspace**: *Edit image* on the Colour icon and on the Outline icon opens the editor of that icon in a workspace that fills the window: the picture large on the left, the quick buttons, tools, steps and colour on the right (they scroll on their own), the result at the sizes of Teams under the picture. A **zoom slider** (10 to 800 %) with Fit, which fills the area, and Ctrl with the mouse wheel; Escape closes the editor. The pixel reader by numbers and the eyedropper are gone, and the controls line up in rows.
- **Manifest schema validation**: the Package step has a Manifest schema card (right under the Package card, as soon as a package is loaded) that validates `manifest.json` against the Microsoft JSON schema of its own `manifestVersion` (1.10 to 1.17 and 1.19 to 1.30 are part of the tool; 1.18 was never published). It says whether the manifest follows the schema, shows the schema address with a copy button, and explains every problem in plain words with its path, what is wrong, what was expected, what was found and what the schema says, with a "Did you mean" for a misspelt entry. Problems are grouped by the top-level entry and can be copied as text. The result also appears as one check row and in the saved report. It follows your edits, never blocks saving, and uses no network: the schemas are bundled.
- **Look page**: a band at the top of the Look step shows the icons as opened (Original) above the icons as they will be saved (Now), colour icon on its accent colour and outline icon on a light and a dark bar, with Changed or Unchanged for each, and it stays in view while you scroll and edit. The buttons of the icon cards are in labelled rows (Image, Quick fix) so they line up.
- **Drop zone**: the empty first step is a large dashed zone with an upload icon, "Drop the package here" and the Open package button. It lights up while a file is dragged over it and says whether the package will be opened or replaced; a file that is not a .zip, or several files at once, are refused with a clear message, and a file dropped elsewhere on the page no longer makes the window navigate to it.
- Load the Teams app package of a Copilot Studio agent (zip) and see everything it declares: names,
  descriptions, version, schema version, developer, accent colour, identifiers, icons, permissions
  and valid domains, with missing and unrecognised entries named.
- Preview of the colour icon on the accent colour, the outline icon on a light and a dark app bar,
  and the app name, with a notice of what the preview does not cover.
- Automatic checks on the icons, the name and description lengths and the accent colour, and a warning when a
  see-through colour icon does not stand out from the accent colour (a white logo on a light accent colour can
  nearly disappear in Microsoft 365 Copilot).
- Change the environment suffix of the app name and save a new package.
- Six steps (Package, Details, Look, Preview, Checks, Save) with a stepper, a breadcrumb and Back and Next,
  in the look of Agent Nameplate; the usual environment names as chips beside the suffix.
- The loaded package is a compact bar with Replace and Remove; Remove clears everything.
- The checks are one compact table. New check: the logo stays inside the safe area of the colour icon.
- The colour icon is previewed at 192, 96, 48 and 32 pixels, with a toggle that draws the safe area.
- Contents of the new package: every file with its size and whether it changed.
- Copy buttons for the App ID, the bot ids, the developer links and the accent colour.
- Copy or save the checks report as JSON.
- A set of enterprise line icons used everywhere, and the logo of Agent Nameplate.
- Cards and tables are full width, one under another, on every screen.
- **Manifest editor**: step 2 is now Edit. Change the names, short and full description, developer name
  accent colour and version (with Bump patch and Bump minor), and replace the colour and outline icon with a PNG of the right size. Every field is
  validated as you type against the documented limits, marked when changed, and can be reverted one by
  one or all at once. The preview and the checks use your changes.
- The Save step has a **Changes** table with every manifest value that differs (old and new) and every
  icon that was replaced. The saved package differs from the one opened only in what was edited, and
  the tool proves it by comparing the two manifests before it saves.
- The id of the app, the manifest version and every entry the tool does not edit are listed as read-only
  with the reason, and kept exactly as they were.
- **Image editor** for the colour icon and the outline icon: remove a background (from the edges or
  everywhere, with tolerance, softness and matte), make transparent, trim, crop by dragging or by
  numbers, make square, fit into the safe area, resize, rotate, flip, recolour (solid colour, hue,
  saturation, brightness, contrast, invert, grayscale, threshold), outline maker, fill background, an
  eyedropper that sends a colour to a tool or to the accent colour, and a suggestion of the accent colour
  from the picture. Two one-click presets: Teams-ready colour icon and Outline from this icon.
- The editor keeps a list of steps with Undo, Redo (50 steps), Reset, a before and after toggle, a canvas
  background and zoom, and the Teams-style preview beside the canvas. The result is brought to exactly
  192 x 192 or 32 x 32 and written as a PNG by the tool, and goes into the package as a replaced icon.
- A notice in the Save step when the package changed and its version did not: Teams and the admin
  center refuse an upload that is not a newer version, and the notice offers to raise the patch number.
- Valid domains and the permission lists are shown read-only with the reason and are never edited: Copilot
  Studio fills them for the agent and changing them could break it.
- **Make background transparent**: one button on the colour icon card takes the flat colour behind the logo away,
  so that the accent colour shows through; it says why when there is nothing to take away. Revert undoes it.
- **Make the shape white** on the outline icon card, and a note that says what the outline icon is: the icon of
  the left bar of Teams, drawn as a shape with no background in the colour of the bar.
- A **Preview colour** on the outline icon card shows the shape on the Teams bar in any colour; it is not saved,
  because Teams chooses the colour of that icon.
- **How to fix it**: every check that does not pass says how to fix it, naming the control, with a button that goes to
  Details or to Look (specification 005).
- The tool works on a **file** and touches no environment: it uses no connection, no Dataverse and no Power Platform
  API, and a test fails if any source names one, calls the network or writes.

### Changed

- **Edit**: the developer links (Website, Privacy statement, Terms of use) are no longer editable; they are still shown in the Package step and kept exactly as they are in the saved package.
- **Look page**: *Logo without background* is gone. *Make background transparent* stays.

### Removed

- **Image editor**: *Suggest accent colour* and *Use as accent colour*, and the tile of the result at 192 pixels (the picture is that size).
- **Look page**: the icon cards only have *Edit image*. *Choose a PNG*, *Revert* of each icon, *Make background transparent*, *Outline from this icon*, *Make the shape white*, the preview colour and the drop of a file on a card are gone from them; the image editor does all of it (Open another image, Remove background, Outline from this icon, Solid colour, Undo, Show original), and *Revert all* is still at the top.
- **Image editor**: Reset (Undo does it), Resize (the result is brought to the exact size when applied), Make white and Make black (Solid colour does it), the Accent background of the canvas, and the quick button of the other icon (the colour icon shows Teams-ready colour icon, the outline icon shows Outline from this icon). The eyedropper went the same day.
- **Suggestions** in the Look step (the three designs of the first version and the gallery of palette presets that replaced them). A package built from a suggestion showed a blank icon in the Microsoft 365 admin center, so the feature was taken out together with its code, its tests and its styles.

### Fixed

- In the image editor, *Show original* showed no difference; it now draws the icon as it was in the package, with a label on the picture that says so (and "the same as now" when nothing differs).
- In the image editor, *Fit* and *100 %* did the same thing; Fit now fills the area and the 100 % button is gone (the slider gives 100).
- The image editor shows the result of a colour icon as it is, on a chequerboard where it is see-through, and no longer on the accent colour (the background switch of its canvas is unchanged).
- The Preview step no longer lays a see-through colour icon on the accent colour: Microsoft Learn does not say where Teams draws the accent colour, and the admin center list showed such an icon alone. The icon is shown as it is, and the caption says that the accent colour is saved in the manifest but not drawn behind the icon here.
- On the Look step, *Make background transparent* is disabled when the colour icon is already see-through (it used to stay clickable and answer with a message) and is highlighted when the icon has a flat background to take away.
- On the Look step, a see-through colour icon is no longer drawn on a tile of the accent colour: the card shows the picture by itself, and so do the Original and Now tiles of the band. The accent colour stays in the manifest and is shown as text.
- Moving to another step with Back, Next, the stepper or the breadcrumb now starts at the top of that step; before, the page kept the scroll position of the step you had left.
- The **Next** button of the first step is hidden until a package is loaded, instead of showing disabled.

### Notes

- Downloading the package from an environment was tried and removed: the host hands a zip back as text, which
  destroys its bytes. Open the zip you downloaded from Copilot Studio instead.

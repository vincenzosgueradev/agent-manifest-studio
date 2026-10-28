# Changelog

All notable changes to Agent Manifest Studio are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
  and links, accent colour and version (with Bump patch and Bump minor), and replace the colour and outline icon with a PNG of the right size. Every field is
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
- **Logo without background**: pick a colour on the colour icon card and one click takes the background away,
  gives the logo that colour and makes the accent colour white, so that the agent shows the logo alone. The
  outline icon keeps the colour Teams gives it.
- **Make the shape white** on the outline icon card, and a note that says what the outline icon is: the icon of
  the left bar of Teams, drawn as a shape with no background in the colour of the bar.
- **Suggestions** in the Look step: the tool works out complete designs from your logo (a white logo on your brand
  colour, the coloured logo on white, and the one that keeps your colours), each with the colour icon, the accent colour
  and the outline icon together, the contrast, and the guidance it follows. One button uses a design.
- A **Preview colour** on the outline icon card shows the shape on the Teams bar in any colour; it is not saved,
  because Teams chooses the colour of that icon.
- **How to fix it**: every check that does not pass says how to fix it, naming the control, with a button that goes to
  Details or to Look (specification 005).
- The tool works on a **file** and touches no environment: it uses no connection, no Dataverse and no Power Platform
  API, and a test fails if any source names one, calls the network or writes.

### Notes

- Downloading the package from an environment was tried and removed: the host hands a zip back as text, which
  destroys its bytes. Open the zip you downloaded from Copilot Studio instead.

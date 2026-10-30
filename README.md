# Agent Manifest Studio

A Power Platform ToolBox tool to **preview, check and edit the Teams app package of a Copilot Studio agent
before you upload it**: see the icon and the name as Teams shows them, check the manifest against its JSON
schema, fix the problems with one click, change the text, version, accent colour and icons (with a built-in image
editor) and save a new package. It works on a file and never touches an environment.

Today the only way to know how an agent icon looks in Teams is to upload it, publish the agent and look, and
the only way to change the icon, the colour or a name is to start that loop again. This tool replaces the loop
with a file, a preview and a list of checks.

It works on the **Teams app package** of an agent: the zip that Copilot Studio produces. You can open the zip you
downloaded from Copilot Studio, or drop it on the panel.

![Package step with a sample agent loaded: the contents of the package and the manifest schema check](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/01-package.png)

## Features

**See it before you publish**
- **Package contents.** Opens the package and shows what is inside: names, descriptions, version, identifiers,
  accent colour, icons, permissions and valid domains. Anything missing or not recognised is named.
- **Preview where Teams shows it.** The colour icon as it is (on a chequerboard where it is see-through), at
  several sizes and with its safe area; the outline icon on a light and a dark app bar; the app name.
- **Before and after.** A band at the top of the Look step shows the original and the new icons and accent colour
  side by side, with Unchanged or Changed under each.

**Check it**
- **Automatic checks** on the icon format, size and weight, the safe area, the lengths of the names and the
  accent colour. Each check says what it found.
- **Manifest schema check.** Checks `manifest.json` against the JSON schema of its own `manifestVersion` (1.10 to
  1.17 and 1.19 to 1.30, bundled with the tool) and explains each problem: the entry, what is wrong, what the schema
  expects, what was found and, for a misspelt entry, the one you probably meant. Copy or save the report.
- **One-click fixes.** The problems that have a safe fix get a Fix it button, a Fix everything button and an Undo.

**Change it**
- **Names, descriptions, developer data and version.** Edit every safe text field, with its limit shown as you type.
  A suffix helper adds or replaces `DEV`, `TEST`, `UAT`, `STAGING`, `PREPROD` or `PROD`, and a bump helper raises the
  version. Each changed field is marked and can be reverted alone or all together.
- **Accent colour.** Type it, choose it with the colour picker, or **take it from a pixel of the colour icon**: a
  popup shows the picture, you click a pixel (or use the arrow keys) and press Use this colour. It opens from the
  Look step and from the image editor.
- **Icons.** Replace the colour icon and the outline icon with a picture of your own, or edit the one you have.
- **Two-way sync.** After you change the colour icon, the tool offers to regenerate the outline icon to match;
  after you change the outline icon, it offers to build a colour icon from its shape. Nothing is replaced until you
  accept, and Revert brings it back.

**The image editor**
- **Background:** remove a flat background (from the edges or everywhere, with tolerance, softness and a matte) or
  fill the see-through parts.
- **Geometry:** trim the empty margin, crop (by dragging or by numbers), make square, fit the logo inside the safe
  area, rotate and flip.
- **Colour:** give every visible pixel one colour, or change hue, saturation, brightness and contrast.
- **Outline maker:** turn the picture into the white silhouette the outline icon needs.
- **Quick buttons:** a Teams-ready colour icon, or an outline icon from the colour icon, in one click.
- **History:** every change is a step you can undo, redo, edit and remove; Show original compares with the picture
  you started from.
- **See while you work:** zoom, rulers, a grid with the 120 x 120 safe area, a checker, white or black background,
  and the result as Teams-sized tiles (96, 48 and 32 pixels).
- **Guides:** an info button next to each tool explains what it does, with a before and after example, and lists its
  parameters.
- **Files:** open another image (PNG always; JPEG, WebP, GIF and SVG when the window can read them) and save the
  result as a PNG.

**Save it**
- **A package that differs only in what you edited.** A Changes table lists every changed value and every file
  before you press Save, and after building the package the tool checks that nothing else changed. The original
  file is never overwritten.
- **A report of the checks,** as a JSON file, when you ask.

**Private and local**
- Works on a file, never on an environment; nothing is sent anywhere; follows the light or dark theme of Power
  Platform ToolBox.

## Installation

Install **Agent Manifest Studio** from the Power Platform ToolBox marketplace. It needs **no connection**:
it works on a file you choose.

## Usage

1. **Open a file**: the Teams app package you downloaded from Copilot Studio (a zip), or drop it on
   the panel.
2. The tool shows what is inside: names, descriptions, version, identifiers, accent colour, icons,
   permissions and valid domains. Anything missing or not recognised is named.
3. **Details**: type a new suffix or press one of the usual names (DEV, TEST, UAT, STAGING, PREPROD,
   PROD), and change the text of the app: names, descriptions, developer name, and the version
   (with a bump helper). **Look**: the accent colour (typed, chosen with the colour picker, or taken from a
   pixel of the colour icon) and the colour and outline icons. Each changed field
   is marked and can be reverted.

   ![Details step: suffix buttons, changed fields marked and Revert](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/02-details.png)

   ![Look step: the original and the new icons side by side, and the accent colour with From the picture](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/03-look.png)

   ![Accent colour from the picture: click a pixel of the colour icon and press Use this colour](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/08-accent-from-picture.png)
4. Look at the preview of the colour icon as it is (on a checkerboard where it is see-through), at several sizes and with its safe
   area, the outline icon on a light and a dark app bar, and the app name.

   ![Preview of the colour icon at 192, 96, 48 and 32 pixels with the safe area](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/09-preview.png)
5. Read the checks: icon format, size, weight, safe area, name lengths, accent colour. The **Manifest schema**
   card of the Package step says whether `manifest.json` follows the JSON schema of its own `manifestVersion` (the tool has the
   schemas 1.10 to 1.17 and 1.19 to 1.30) and explains each problem: the entry, what is wrong, what the
   schema expects, what was found and, for a misspelt entry, the one you probably meant. Copy or save the
   report if you want to keep it.

   ![Checks step with the counters, Fix everything and a failed check with Fix it](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/04-checks.png)
6. Do not have the right image? Press **Edit image** on an icon: the **image editor** removes a
   background (from the edges or everywhere, with tolerance, softness and a matte), trims, crops (by
   dragging or by numbers), fits the logo inside the safe area, resizes, rotates and flips, recolours
   (solid colour, hue, saturation, brightness, contrast, invert, grayscale, threshold), makes a white
   silhouette for the outline icon and takes the accent colour from a pixel of the picture. One click gives a Teams-ready colour icon or an outline icon from the colour icon.
   Every change is a step in a list you can undo, redo, edit and remove, and you see the result as
   Teams-style tiles next to it.

   ![Image editor after the Teams-ready colour icon: toolbox, rulers, history and Teams-size tiles](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/05-image-editor.png)

   ![Guide of Remove background with a before and after picture and its parameters](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/06-effect-guide.png)
7. Save the new package: you see every changed value and every file before you press the button.

   ![Save step: what changes in the new package and what stays identical](https://raw.githubusercontent.com/vincenzosgueradev/agent-manifest-studio/main/docs/screenshots/dark/07-changes-save.png)

## What this tool changes

- It reads **one package file** that you choose, and any **image file** that you open in the image
  editor (PNG always; JPEG, WebP, GIF and SVG when the window can read them). Nothing else on your
  computer is read.
- It writes **one new zip file**, only when you press save, in the place you choose in the save
  dialog. The original file is never overwritten. It can also write a **report** of the checks, as a
  JSON file, only when you ask.
- The new package differs from the one you opened **only in what you edited**: the manifest values you
  changed (names, descriptions, developer data, accent colour, version) and
  the icon images you replaced. Every other file is identical and every other manifest entry is kept
  exactly as it was, in the same order and formatting. Before you save, a Changes table lists every
  value that differs, and after building the package the tool checks that nothing else changed.
- **Images are edited on your computer, in the tool's image editor.** The picture you open is never uploaded and
  never changed on disk; the edited icon goes only into the package you save, or into a PNG file if you
  press Save image as PNG.
- **The manifest is checked against its JSON schema on your computer.** The schemas are part of the tool; nothing is
  downloaded when you use it, and a problem is a warning that never stops you from saving.
- **Nothing is read from or written to any environment.** The tool does not use a connection, does not
  query Dataverse, does not call Copilot Studio, does not publish an agent, does not import a package
  and does not change a solution.
- **Nothing is sent anywhere.** The tool makes no network call, and a test fails if the sources
  contain a network call or the name of an environment API.
- The tool keeps nothing between loads: when you load another package, remove it or close the tool,
  the previous one is gone.

## What it does not cover

- The name in the manifest is the name of the **Teams app**. It is not the name of the agent in
  Copilot Studio or in Dataverse (`bot.name`), and changing it does not change that.
- The preview is close to, not identical with, what Teams draws. The final check is a test in Teams.
- A name that is a localisation key (`[[KEY]]`, used by declarative-agent packages) is shown but not
  edited: its text lives in a language file.
- The package is not downloaded from an environment: the host hands a zip back as text, which destroys
  its bytes, so the tool works on the file you choose. The new package is saved as a file, not uploaded.
- The identity of the app (`id`), the manifest version, the bots and agents the package declares and
  every entry the tool does not edit are shown and kept, never edited. Language files are not edited.

## Privacy and network use

Packages and images are processed on your computer and never leave it. The tool makes no network call,
sends no telemetry and keeps nothing between loads.

## Support and bugs

Report a bug or ask for a change in the [GitHub Issues](https://github.com/vincenzosgueradev/agent-manifest-studio/issues).
Give the tool version (shown in the tool), what you did, what you expected and what happened, and attach a
**generated or anonymised** sample package, never a real one. A vulnerability goes to the private
reporting described in [SECURITY.md](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/SECURITY.md), not to a public issue.

## AI Assistance

A substantial part of this tool was written with an AI coding assistant (Claude Code)
and was reviewed, tested and is maintained by the author listed in `package.json`.

## Updates

Newest first. The full history is in [CHANGELOG.md](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/CHANGELOG.md). Rules: [docs/marketplace-page-standard.md](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/docs/marketplace-page-standard.md).

### 0.1.1 - 2026-10-31

- Fixed the tool asking for an environment connection before it opens: it now declares that it needs none, so it opens straight away.
- Fixed the links to the security policy, the changelog and the project rules, which did not open from the marketplace page.
- Changed the tool icon to a single-colour outline that follows the light and dark themes.

### 0.1.0 - 2026-10-30

- Added the preview of the colour icon, the outline icon and the app name of a Copilot Studio agent's Teams app package, with the safe area and a light and a dark app bar.
- Added the automatic checks (icon format, size, weight, safe area, names, accent colour) and the check of `manifest.json` against the JSON schema of its own `manifestVersion`, with a Fix it button, Fix everything and Undo for the problems that have a safe fix.
- Added the editing of names, descriptions, developer data, version and accent colour, with the suffix buttons (`DEV`, `TEST`, `UAT`, `STAGING`, `PREPROD`, `PROD`) and a version bump helper.
- Added the image editor for both icons: remove or fill a background, trim, crop, make square, fit, rotate, flip, recolour, outline maker, quick buttons, history with undo and redo, guides for every tool.
- Added the accent colour taken from a pixel of the colour icon, from the Look step and from the image editor.
- Added the offer to regenerate the outline icon after the colour icon changes, and the other way round.
- Added the saving of a new package that differs from the original only in what you edited, with a Changes table, and a report of the checks as a JSON file.

## License

MIT, see [LICENSE](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/LICENSE).

Specs live in [specs/](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/specs/); the project rules are in [.specify/memory/constitution.md](https://github.com/vincenzosgueradev/agent-manifest-studio/blob/main/.specify/memory/constitution.md).

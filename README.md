# Agent Manifest Studio

A Power Platform ToolBox tool to **see how the icon and the name of a Copilot Studio agent will look
before you upload it**, and to move the same Teams app package between environments by changing the
environment suffix of its name (`[DEV]` to `[UAT]` or `[PROD]`).

Today the only way to know how an agent icon looks in Teams is to upload it, publish the agent and
look. This tool replaces that loop with a file and a preview.

It works on the **Teams app package** of an agent: the zip that Copilot Studio produces. You can open
the zip you downloaded from Copilot Studio. This is what separates it from
[Agent Nameplate](../agent-nameplate/), which renames agents inside an environment: this tool works on
a file and never touches an environment.

## How to use it

1. **Open a file**: the Teams app package you downloaded from Copilot Studio (a zip), or drop it on
   the panel.
2. The tool shows what is inside: names, descriptions, version, identifiers, accent colour, icons,
   permissions and valid domains. Anything missing or not recognised is named.
3. **Details**: type a new suffix or press one of the usual names (DEV, TEST, UAT, STAGING, PREPROD,
   PROD), and change the text of the app: names, descriptions, developer name, and the version
   (with a bump helper). **Look**: the accent colour and the colour and outline icons. Each changed field
   is marked and can be reverted.
4. Look at the preview of the colour icon as it is (on a checkerboard where it is see-through), at several sizes and with its safe
   area, the outline icon on a light and a dark app bar, and the app name.
5. Read the checks: icon format, size, weight, safe area, name lengths, accent colour. The **Manifest schema**
   card of the Package step says whether `manifest.json` follows the JSON schema of its own `manifestVersion` (the tool has the
   schemas 1.10 to 1.17 and 1.19 to 1.30) and explains each problem: the entry, what is wrong, what the
   schema expects, what was found and, for a misspelt entry, the one you probably meant. Copy or save the
   report if you want to keep it.
6. Do not have the right image? Press **Edit image** on an icon: the **image editor** removes a
   background (from the edges or everywhere, with tolerance, softness and a matte), trims, crops (by
   dragging or by numbers), fits the logo inside the safe area, resizes, rotates and flips, recolours
   (solid colour, hue, saturation, brightness, contrast, invert, grayscale, threshold), makes a white
   silhouette for the outline icon, picks colours from the picture with an eyedropper and suggests the
   accent colour. One click gives a Teams-ready colour icon or an outline icon from the colour icon.
   Every change is a step in a list you can undo, redo, edit and remove, and you see the result as
   Teams-style tiles next to it.
7. Save the new package: you see every changed value and every file before you press the button.

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
- Choosing a glyph from a library, comparing several agents and an MCP entry point are planned for
  later releases.

## Status

Work in progress. Specs live in [specs/](specs/); the project rules are in
[.specify/memory/constitution.md](.specify/memory/constitution.md).

# Feature Specification: Look Page (before and after, palette presets, aligned actions)

**Feature Branch**: `007-look-page`
**Created**: 2026-10-28
**Status**: The gallery of presets (user stories 2 and its requirements FR-005 to FR-008 and FR-012) was **removed on 2026-10-28** at the request of the user, after a package built from a preset showed a blank icon in the admin center; the band of before and after, the labelled rows of actions and the removal of *Logo without background* remain.
**Input**: "New specification for the Look page. The original (top) and the current icons must be visible on top while editing, so the difference is always seen. Suggestions go below, as a series of presets with colour palettes (like the theme gallery of the settings page), improved, with a graphic algorithm that works out the palettes from the colours of the logo. Organise the buttons better: in each section they are misaligned. If Make background transparent does the same as Logo without background, remove one."

## Context

Step 3 (Look) of feature 003/005 is one long column: the guidance text, the suggestions (three designs with long
sentences), the accent colour, the colour icon card, the outline icon card and the image editor. Three problems were
found by hand on 2026-10-28:

1. While the user edits an icon far down the page, the original is not on screen: the difference is not seen.
2. The suggestions are three text-heavy cards. A gallery of palettes is faster to scan and to choose from.
3. Buttons and captions in the icon cards do not line up (different heights, labels beside the picker, buttons
   wrapping at random).

On the question "do the two buttons do the same?": **they do not**. *Make background transparent* only takes the flat
colour away and keeps the colours of the logo and the accent colour. *Logo without background* takes the background
away, **recolours** the logo and sets the accent colour to white. The second is a palette preset ("logo in colour X on
white"), so it moves into the gallery and its button and colour picker are removed. *Make background transparent* stays,
because it is the one operation the gallery cannot do (it keeps the logo's own colours and the accent colour).

## Clarifications

- Q: Original of what? -> A: Of the package as opened: the colour icon on the accent colour of the opened manifest
  and the outline icon on a light and a dark bar. "Now" is the package as it will be saved (edits applied).
- Q: Always on top? -> A: The comparison band is sticky at the top of the Look step, so it stays in view while the
  page scrolls. It is compact (small tiles).
- Q: What is a preset? -> A: A complete design: the colour icon (logo in one colour or its own colours), the accent
  colour and the outline icon, with a palette (accent, logo colour and two supporting tints) and a name. Using it
  replaces the colour icon, the outline icon and the accent colour in one edit, as the three old suggestions did.
- Q: Is a palette a verdict on taste? -> A: No. Every preset obeys the same guidance the tool already checks (logo in the safe
  area, see-through background, contrast of at least 3 : 1 between logo and accent colour, white outline shape). The order
  is a score computed from stated numbers (below); the user chooses.
- Q: Where do the colours come from? -> A: From the picture itself: the dominant colour of the logo, else the accent colour
  of the package, else Teams blue. Nothing is sent anywhere (Principle II).

## The algorithm (palette presets)

Input: the colour icon (RGBA), the accent colour of the package (or none).

1. **Logo**: the picture with its flat background removed (existing `makeTransparent`); if that is impossible the note of
   the old suggestions is shown and there are no presets.
2. **Base colour** B: the dominant colour of the logo if its saturation is at least 0.2, else the accent colour if its
   saturation is at least 0.2, else Teams blue `#2B5FD9`. Its hue is H, saturation S.
3. **Families** (hue in degrees from H): `brand` (0), `analogous-warm` (+30), `analogous-cool` (-30), `split-a` (+150),
   `complementary` (180), `split-b` (-150), `triadic-a` (+120), `triadic-b` (-120), plus `neutral` (saturation 0.08
   at hue H) and `midnight` (hue H, lightness 0.16). Each family gives a colour A with the saturation of B (at least 0.35 so a
   grey logo still gets colour) and lightness 0.45.
4. **Styles** per family: `tile` (white logo on A, A darkened until white has 4.5 : 1), `on-white` (logo coloured A
   darkened until it has 4.5 : 1 on white, accent colour white) and, for `midnight` only, `on-dark` (light tint of B on
   the dark colour). The three designs of feature 005 remain as presets `brand-tile`, `coloured-logo`,
   `keep-colours` (same ids, same rules).
5. **Palette** of a preset: [accent colour, logo colour, accent lightened by 0.25 of lightness, accent darkened by 0.2].
6. **Contrast** of a preset = WCAG contrast between logo colour and accent colour (for `keep-colours`, as before). A
   candidate below 3 : 1 is never shown.
7. **Score** = `min(contrast, 7) / 7 * 50 + hueCloseness * 30 + saturationFit * 20` where `hueCloseness = 1 - d / 180`
   (d = angular distance between the family hue and H) and `saturationFit = 1` for a colourful logo, `0.5` for a
   family `neutral` or `midnight`. Sorted by score, ties by id. At most 16 presets in total; `brand-tile` and `coloured-logo` are always kept. Each preset also has a `style` (`tile`, `on-white`, `on-dark`, `keep`), a `name` and a `family`; the three designs of feature 005 are the `brand` family (`brand-tile`, `coloured-logo`) and the `logo` family (`keep-colours`), so the generator does not make them twice.
8. Deterministic: the same picture and accent give the same list. The input picture is not changed.

## User Scenarios & Testing

### User Story 1 - The difference is always on screen (P1)
A sticky band at the top of the Look step shows **Original** and **Now**: colour icon on its accent colour, outline
icon on a light and a dark bar, and a word `Unchanged` or `Changed` for each icon and for the accent colour. While the
user scrolls to the image editor the band stays visible.
**Tests**: band present with both rows; Original equals the opened package whatever the edits; Now follows edits;
`Changed` appears and disappears with revert; band is sticky (CSS) and first in the step.

### User Story 2 - A gallery of palettes (P1)
Below the editing cards the Suggestions card is a grid of presets, each card with the tile (colour icon on its accent
colour), the two bars, a four-colour palette strip, its name, the accent colour, the contrast and a `Use` button. The
best first. Clicking Use applies colour icon, outline and accent colour as one edit and revert undoes it.
**Tests**: oracle table from the algorithm; every preset has contrast >= 3; palette strip has four colours; ordering by
score; apply = one edit; the cards are below the icon cards.

### User Story 3 - Buttons that line up (P1)
In each icon card the actions are in labelled rows with the same button height and a fixed label column: **Image**
(Edit image, Choose a PNG, Revert), **Quick fix** (Make background transparent for the colour icon; Outline from this
icon, Make the shape white for the outline icon). The preview colour picker sits in the caption row under its picture.
**Tests**: each row has its label and its buttons in order; the old button and picker of the removed action are gone.

### User Story 4 - No repeated action (P2)
*Logo without background* and its colour picker no longer exist; the same result is a preset.
**Tests**: the ids `ed-img-borderless-color` and `ed-img-logo-colour` are not in the page; a preset of style `on-white`
gives the logo in colour and the accent colour white.

## Requirements

- **FR-001** `#look-compare` is the first child of the Look step content, sticky at the top, with the rows Original and Now.
- **FR-002** (amended by FR-015) Each row shows: colour icon as it is (see FR-015), with the accent colour as text, outline icon on a light bar and on a dark bar.
- **FR-003** The Original row is drawn from the opened package and never changes while editing; the Now row from the plan.
- **FR-004** Each of colour icon, outline icon and accent colour has a state `Unchanged` or `Changed` (compared with the opened package).
- **FR-005** The Suggestions card is after the two icon cards and the image editor root; it is a grid of presets.
- **FR-006** Presets follow the algorithm above (families, styles, palette of four, contrast >= 3, score, at most 16, deterministic).
- **FR-007** Each preset card shows tile, two bars, palette strip, name, accent hex, contrast, and a `Use` button with id `ed-sg-ID-apply`.
- **FR-008** Using a preset replaces both icons and the accent colour in one edit; a preset that cannot be accepted shows its message in the card and changes nothing.
- **FR-009** Icon-card actions are in labelled rows (`Image`, `Quick fix`) with one button size; captions and the preview colour picker are aligned.
- **FR-010** `Logo without background`, its colour picker and `onIconBorderless` are removed; `Make background transparent` stays.
- **FR-011** No network, no environment API; colours of the interface from CSS custom properties; both themes readable; no emoji; no default checkbox. The only colours that are not theme colours are the data of the package and of the presets (the accent colour and the logo colours).
- **FR-012** If the colour icon cannot be read or its background is not flat, the note of feature 005 is shown and the gallery is empty.

## Success Criteria

- SC-001 Every FR has a test in the traceability table of `tasks.md`; the palette oracle is written from the algorithm above with no code from `src/`.
- SC-002 `npm run test:mutation` kills the mutants of `palette.ts`, `compare.ts` and the changed lines of `editor.ts`.
- SC-003 Not covered: how the band, the gallery and the aligned rows look in PPTB pixels in both themes, and the real sticky behaviour in the host scroll container (manual checks).

## Amendment 2026-10-29 - a see-through icon is shown alone

Found by hand on 2026-10-29 (screenshot of the Look step) and in the admin center on 2026-10-28, where the list of agents showed a
see-through icon with no accent-coloured tile behind it.

- **Make background transparent** is a button that depends on the icon: when the icon is **already see-through** (no flat colour at the
  edges to take away, and it has see-through pixels) the button is **disabled**, with the reason in its title, instead of staying
  clickable and answering with a message; when the icon is **opaque with a flat background** the button is **highlighted** (it is the
  action that the icon needs); in every other case (for example the edges are not one flat colour) it stays as it was and explains
  itself when pressed.
- A **see-through icon is never drawn on the accent colour** in the Look step: the colour icon card has no second picture "On the accent
  colour" (the first picture, on a chequerboard, is the icon), and the **Now** and **Original** tiles of the band draw the icon as it is
  on a chequerboard. The accent colour is still shown as text and saved; the card caption says that the picture is shown by itself and
  that some places draw the accent colour behind it and some do not.
- The **Preview step follows the same rule** (feature 001, FR-007 amended the same day): the colour icon is drawn as it is on a checkerboard, never on the accent colour, because Microsoft Learn does not say where Teams draws the accent colour (see the constitution, Verified Facts, 2026-10-29).

### Requirements added

- **FR-013** The button *Make background transparent* is disabled, with the message "The background is already see-through: there is no flat colour at the edges to take away." as its title, when the colour icon is already see-through; it carries the class `is-suggested` when the icon is opaque with a flat background; it follows the icon as it changes (a result of the button, a chosen PNG, Revert).
- **FR-014** The colour icon card has no `ed-img-onaccent-color` picture; the caption of a see-through icon is "The chequered parts of the picture are see-through, so it is shown by itself. The accent colour #X is saved in the manifest; some places draw it behind the picture and some do not (the admin center list showed the picture alone, observed 2026-10-28)." and the caption of an opaque icon is unchanged.
- **FR-015** The colour tile of the band is drawn from the pixels of the icon as they are (no flattening on the accent colour) and carries the class `ed-checker` when the icon has see-through pixels.

Tests: `test/ui.look.test.ts` ("a see-through icon is shown alone", "Make background transparent follows the icon"), `test/ui.editor.test.ts` (caption).
- The tiles of the colour icon in the **image editor** follow the same rule (feature 004, amended the same day).

### Amendment 2026-10-29 (second)

The quick fixes of the icon cards (*Make background transparent*, *Outline from this icon*, *Make the shape white*), the per-icon *Revert*, *Choose a PNG* and the preview colour were **removed**: the cards only have *Edit image* (feature 009, amendment four). FR-009 (rows Image and Quick fix), FR-010 (the button *Make background transparent* stays) and FR-013 (the state of that button) no longer apply; FR-014 and FR-015 (nothing drawn on the accent colour) still do.

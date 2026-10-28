# Research: Icon Look Assistant

1. **Accent colour and transparency.** The colour icon is drawn on the accent colour; a see-through
   icon lets it show, an opaque one hides it. The preview already draws it this way (features 001, 004).
2. **Outline icon.** The 32 x 32 outline icon is the icon of the left bar of Teams. Teams uses only the
   shape and draws it in the colour of the bar, so the file has to be white on transparent (existing
   check). The preview colour exists only to show that.
3. **Contrast.** WCAG 1.4.11 asks 3 : 1 for graphics; the tool asks 4.5 : 1 when it picks a colour for a
   one-colour logo so the result is comfortable. Contrast is the WCAG relative-luminance ratio.
4. **Safe area.** The logo stays inside the central 120 x 120 of 192 x 192, which is 62.5 percent.
5. **Brand colour.** The main colour of the logo is the best guess; when it is grey the accent colour of
   the package is next; a blue (`#2b5fd9`) is the last resort. It is darkened, keeping hue, until white
   reaches 4.5 : 1.
6. **Colour count.** Colours are counted in 5-bit groups per channel with at least 5 percent of the
   visible pixels; two or more groups mean a multi-colour logo.
7. **Version rule.** Teams and the admin center answer "Must upload a newer version of the title than
   what is already present" for an upload whose version is not higher. The tool cannot know what is
   installed, so it warns when the version is the one that was loaded and offers the next patch.
8. **UNVERIFIED**: how the resulting icons look in Teams. Recorded as a manual check in the quickstart.

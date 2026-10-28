# UI contract

Order of the Look step: `#look-compare` (sticky), intro + Revert all, Look (accent colour) card, colour icon card, outline icon card, `#image-editor-root`, Suggestions card `#ed-card-suggest`.

Compare band: rows `#cmp-original`, `#cmp-now`; canvases `cmp-{original|now}-color`, `cmp-{original|now}-bar-light`, `cmp-{original|now}-bar-dark`; state words `#cmp-state-color`, `#cmp-state-outline`, `#cmp-state-accent` with text `Unchanged` or `Changed`; accent hex `#cmp-{original|now}-accent`.

Icon card actions: `.ed-actions` with rows `.ed-act-row` each with `.ed-act-label` (`Image`, `Quick fix`) and `.ed-act-buttons`. Colour icon: Image = Edit image, Choose a 192 x 192 PNG, Revert; Quick fix = Make background transparent. Outline icon: Image = Edit image, Choose a 32 x 32 PNG, Revert; Quick fix = Outline from this icon, Make the shape white.

Gallery: `#ed-suggest-list.pal-grid`, each `article.pal-card[data-id]` with canvases `ed-sg-ID-icon`, `ed-sg-ID-bar-light`, `ed-sg-ID-bar-dark`, strip `.pal-strip` with four `.pal-swatch` (style background = palette colour), `.pal-name`, `.pal-facts`, button `ed-sg-ID-apply` text `Use`.

Removed ids: `ed-img-borderless-color`, `ed-img-logo-colour`.

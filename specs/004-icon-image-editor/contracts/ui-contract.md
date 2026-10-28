# UI contract (feature 004)

- Each icon card (`ed-img-<slot>`) has `ed-img-edit-<slot>` ("Edit image").
- The editor card is `ie-card` inside `edit-groups`, after the two icon cards, hidden until opened.
- Header actions: `ie-open-other`, `ie-undo`, `ie-redo`, `ie-reset`, `ie-save-png`, `ie-apply`, `ie-cancel`.
- Canvas: `ie-canvas` (the result), `ie-original` toggle (`aria-pressed`), view switches `ie-bg-<checker|accent|white|black>`
  and zoom `ie-zoom-<fit|100|200|400>`; overlay `ie-crop-box`; eyedropper toggle `ie-pick`; reading `ie-reading`
  with `ie-reading-hex`, `ie-reading-copy` and the send buttons `ie-send-bg`, `ie-send-solid`, `ie-send-fill`,
  `ie-send-accent`.
- Tools (buttons that add an operation): `ie-add-removeBg`, `ie-add-trim`, `ie-add-crop`, `ie-add-square`,
  `ie-add-fit`, `ie-add-resize`, `ie-add-rotate`, `ie-add-flip-h`, `ie-add-flip-v`, `ie-add-fill`, `ie-add-solid`,
  `ie-add-white`, `ie-add-black`, `ie-add-tone`, `ie-add-outline`, and presets `ie-preset-teams`, `ie-preset-outline`.
- The list: `ie-ops`, each entry `ie-op-<i>` with its inputs `ie-op-<i>-<name>` and `ie-op-<i>-remove`.
- Preview: `ie-preview` with the tiles of the preview step; `ie-accent-suggest` and `ie-accent-swatch`,
  `ie-accent-accept`.
- Messages: `ie-note` (import note), `ie-message` (`role="alert"`, refusals).

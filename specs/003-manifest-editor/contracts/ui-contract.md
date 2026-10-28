# UI contract (feature 003)

Amended 2026-10-28: step 2 keeps the id `step-suffix` and is labelled "Details" (Identity, Descriptions, Developer, Version, Valid domains, Permissions, Read-only); the Look group, the two icon cards and the image editor are in step 3, id `step-look`, container `look-groups`, labelled "Look". Originally one step labelled "Edit". Cards, in order, each a `.panel`, full
width: `name-editor` (Suffix, kept), `names` (kept), then `edit-groups` holding Identity
(`ed-name.short`, `ed-name.full`), Descriptions, Developer, Look (accent and two icon cards),
Version, Valid domains, Permissions, Read-only.

- Field control id `ed-<path>` (input or textarea); `data-changed="true"` on its row; error
  `ed-err-<path>` (`role="alert"`); revert `ed-revert-<path>`; counter `ed-count-<path>`.
- Lists: `ed-list-<path>` (entries with `data-value`, remove button `data-remove`), add input
  `ed-add-<path>` and `ed-add-btn-<path>`; permissions use a `select` `ed-pick-<path>`.
- Icons: card `ed-img-<slot>`, choose button `ed-img-pick-<slot>`, revert
  `ed-img-revert-<slot>`, message `ed-img-msg-<slot>`.
- Version: `ed-bump-patch`, `ed-bump-minor`. Everything: `ed-revert-all`.
- Save step: `changes-body` with `changes-table` (rows `data-path`) or `changes-none`.

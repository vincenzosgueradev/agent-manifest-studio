# Research: Manifest Editor (feature 003)

Read on **2026-10-27** on Microsoft Learn, "Microsoft 365 app manifest schema reference", pages
`root`, `root.developer`, `root.name`, `root.description`, `root.icons`, `root.accentColor`
(schema version **1.30**, `https://learn.microsoft.com/microsoft-365/extensibility/schema/root?view=m365-app-1.30`)
and "Request device permissions for your Teams app". Re-read the page before relying on a detail.

## 1. Field limits (verified)

| Field | Rule found | Source |
|---|---|---|
| `name.short` | required, max 30 | root.name (also in constitution, 2026-10-26) |
| `name.full` | max 100; the two names must differ | same |
| `description.short` | max 80 | root.description |
| `description.full` | max 4000; the store validation says it cannot be empty | root.description; Graph "Publish teamsApp" errors (`FullDescriptionCannotBeEmpty`, `FullDescriptionLengthCheck`) |
| `developer.name` | required, max **32** | root.developer; Graph error `DeveloperNameLengthCheck` |
| `developer.websiteUrl`, `privacyUrl`, `termsOfUseUrl` | string, max **2048**, "must start with `http://` or `https://`" in the schema; the publish validation says "must be HTTPS" (`...MustBeHttps`) | root.developer; Graph errors |
| `developer.mpnId` | max 10 (not edited here) | root.developer |
| `version` | required, "semver standard", max **256**; an Office add-in limits each segment to 5 digits and does not support prerelease/metadata | root |
| `accentColor` | required, hex colour starting with `#` | root.accentColor |
| `validDomains` | array of string, each max 2048, **max 100 items** (raised from 16 in a schema revision) | root |
| `permissions` | **deprecated**, array of enum, max 2 items: `identity`, `messageTeamMembers` | root |
| `devicePermissions` | array of enum, max 5 items: `geolocation`, `media`, `notifications`, `midi`, `openExternal` | root; "Request device permissions" |
| `manifestVersion` | required, allowed value `1.30` in this schema page | root |
| `id` | required GUID; "must not be modified" when updating an AppSource app | root |

## 2. Rules for `validDomains` entries (verified, "Teams rules")

- Domain listings can use wildcards such as `*.example.com`; a wildcard segment must be the only
  character in its segment and any segment before a wildcard segment must be a wildcard too
  (`*.*.domain.com` valid, `foo.*.myteam.domain.com` invalid).
- Do not add domains outside your control (`*.onmicrosoft.com` is not valid).
- The same page, "Office Add-in rules", says an item must include the protocol (`https://host`) and
  must not end with `/`. **Those are rules for Office add-ins, not for Teams.** A Copilot Studio agent
  package is a Teams app, so the editor follows the Teams rules (host names, optional wildcard). A
  value that already has a scheme in an existing manifest is kept as it is and shown with a note.

## 3. Decisions taken from this reading

1. URLs must be `https://` (the stricter of the two statements): a warning is not enough because the
   store validation rejects `http`. Recorded as a decision, not as a schema fact.
2. `description.full` empty is invalid (publish validation). `description.short` is required by the
   schema.
3. `developer.termsOfUseUrl` is optional in practice for a sideloaded package; the schema page marks
   it required. **UNVERIFIED**: whether Teams rejects a custom app without it. The editor allows
   removing it and reports the package check as a warning only (not as a failure).
4. `permissions` is deprecated: still editable (documented values), shown with the word "deprecated".
5. The permission and domain limits are enforced as invalid (the schema states them as constraints).
6. Version bump works on `n.n.n` only (the Office note limits each segment to five digits: a bump that
   would produce a six-digit segment is refused with the reason).

## 4. UNVERIFIED

- Whether Teams custom-app upload accepts an `http://` developer link or a missing `termsOfUseUrl`
  (the editor is stricter than the schema for the first and lenient for the second).
- Whether `validDomains` items with a scheme are accepted by Teams (kept if present, never offered).
- How Teams treats an icon whose pixel size is right but whose file is over 72 KB (inherited from
  feature 001, unchanged).

## 5. Technical decisions

| Decision | Why | Alternatives |
|---|---|---|
| Edit the manifest **as text**, one splice per edited member, re-parsing after each splice | Keeps key order, spacing, line endings and BOM; same principle as `rename.ts` | Re-serialise the object: loses formatting and unknown formatting; rejected |
| A new JSON structure walker (`jsonPatch.ts`) that records member spans for the top-level object and the four known child objects | `locateNames` finds only two strings; a general editor needs replace, insert, remove | Regex: rejected by feature 001 research (false matches) |
| Safety net compares the parse of the output with the parse of the input **with the same edits applied to a clone** | Independent of the splice logic | Compare only the touched fields: weaker |
| Suffix and name fields keep working on the old `applySuffix` path; explicit edits are layered on top | 1800+ tests of feature 001 stay valid; no rewrite of a proven path | Move the suffix into edits: large churn for no user gain |
| New icon bytes are validated with the existing PNG decoder and icon checks | One set of icon rules | A second validator: duplicates |
| `writePackage` accepts entries that the package does not have (appended at the end) | An icon declared but missing must be addable (FR-012) | Refuse: leaves the check failing forever |
| The Changes table is derived from the two manifest parses (`diffManifest`), not from the list of edits | It then proves what really differs, which is the point | Print the edits: can disagree with the bytes |

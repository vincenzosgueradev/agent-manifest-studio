# Data Model: Manifest Reader, Preview and Name Suffix Editor

Nothing is persisted. All state lives in memory for the loaded package and is dropped when another
package is loaded (FR-027).

## PackageFile (the loaded zip)

| Field | Type | Rule |
|-------|------|------|
| `fileName` | string | name of the file the user chose, as shown; never changed |
| `entries` | ordered list of `Entry` | order of the zip directory, kept on export |
| `byteLength` | number | at most 5 MB (FR-003) |

## Entry

| Field | Type | Rule |
|-------|------|------|
| `path` | string | no `..`, no leading `/`, no backslash, no drive letter, unique |
| `data` | bytes | decompressed; at most 1 MB |
| `isDirectory` | boolean | path ends with `/` |

## Manifest (read view)

Read from the text of `manifest.json`. Unknown keys are kept in `unknownKeys`; they are never
removed or changed.

| Field | Source key | Notes |
|-------|-----------|-------|
| `schemaUrl` | `$schema` | shown |
| `manifestVersion` | `manifestVersion` | shown |
| `appVersion` | `version` | shown |
| `appId` | `id` | shown |
| `nameShort`, `nameFull` | `name.short`, `name.full` | `NameValue`, see below |
| `descriptionShort`, `descriptionFull` | `description.short`, `description.full` | |
| `developer` | `developer.*` | name, website, privacy, terms |
| `accentColor` | `accentColor` | text as written |
| `icons` | `icons.color`, `icons.outline`, `icons.color32x32` | paths as written |
| `botIds` | `bots[].botId` | list, may be empty |
| `permissions`, `validDomains` | `permissions`, `validDomains` | lists; "none declared" when absent |
| `missingKeys` | | expected keys that are absent, by dotted path |
| `unknownKeys` | | top-level keys the tool does not know, by name |

Known top-level keys (everything else is "not recognised"): `$schema`, `manifestVersion`,
`version`, `id`, `developer`, `name`, `description`, `icons`, `accentColor`, `bots`, `permissions`,
`validDomains`, `staticTabs`, `configurableTabs`, `composeExtensions`, `webApplicationInfo`,
`copilotAgents`, `localizationInfo`, `supportsChannelFeatures`, `showLoadingIndicator`,
`isFullScreen`, `devicePermissions`, `activities`, `authorization`, `extensions`,
`defaultInstallScope`, `defaultGroupCapability`, `configurableProperties`, `meetingExtensionDefinition`,
`mutualCertificate`, `dashboardCards`, `scopeConstraints`, `subscriptionOffer`, `backgroundLoadedBot`,
`connectors`, `nameDescriptionOverride`, `elementRelationshipSet`. The list lives in code as data.

## NameValue

| Field | Type | Rule |
|-------|------|------|
| `raw` | string | the value decoded from the JSON text |
| `kind` | `literal` \| `localisationKey` \| `missing` | `[[...]]` is a key (FR-030) |
| `base` | string | `raw` without the recognised suffix |
| `suffix` | string | recognised suffix text without brackets, may be empty |
| `hasBrackets` | boolean | whether a recognised suffix was found |
| `span` | `{ start, end }` | position of the value's string literal in the manifest text |

Recognised suffix (FR-019): `^(.*?)( ?\[([^\[\]]{1,20})\])$` on the end of `raw`; only one final
group. `compose(base, suffix)`: empty suffix gives `base`; otherwise `base + ' [' + suffix + ']'`
(a single space, unless the original had none, in which case the original separator is kept).

## Icon (decoded)

| Field | Type | Rule |
|-------|------|------|
| `path` | string | as declared |
| `present` | boolean | entry exists in the package |
| `isPng` | boolean | 8-byte signature |
| `width`, `height` | number | from IHDR |
| `bitDepth`, `colorType`, `interlace` | number | from IHDR |
| `supported` | boolean | bit depth 8, colour types 0, 2, 3, 4, 6, no interlace |
| `rgba` | bytes | 8-bit RGBA, only when `supported` |
| `byteLength` | number | size of the file in the package |

## Check

| Field | Type | Rule |
|-------|------|------|
| `id` | string | stable, see list |
| `verdict` | `pass` \| `warning` \| `fail` | |
| `found` | string | the value found, as text |
| `expected` | string | the rule, as text |
| `notProven` | string | what the check does not prove (FR-011) |

Check ids, in order: `color.present`, `color.png`, `color.size-px`, `color.square`,
`color.format`, `color.weight`, `outline.present`, `outline.png`, `outline.size-px`,
`outline.white`, `color32.present` and `color32.size-px` (only if the small icon is declared),
`name.short.length`, `name.full.length`, `name.distinct`, `description.short.length`,
`description.full.length`, `accent.hex`.

The validity of the zip and of the manifest are not checks: a package that fails them is refused
and never reaches the list. The presence of a declared icon is the `*.present` check (it names the
missing file). A check whose input is missing (the dimensions of a file that is not a PNG) is left
out: the check that explains the cause carries the failure.

## Edit (the user's change)

| Field | Type | Rule |
|-------|------|------|
| `suffix` | string | text without brackets, trimmed, at most 20 characters, no `[` `]` |
| `applied` | `{ short: string \| null, full: string \| null }` | the resulting names; `null` for a name that is a localisation key or missing |

State transitions: `Empty` → (load ok) → `Loaded` → (type suffix) → `Edited` → (export) →
`Loaded` (the edit stays, nothing is stored). Any new load → `Loaded` of the new package. A
refused file keeps the previous state and shows the message.

## Export result

| Field | Type | Rule |
|-------|------|------|
| `bytes` | bytes | the new zip |
| `suggestedFileName` | string | FR-025 |
| `remainingFailures` | list of `Check` | failures present in the new package (FR-021) |
| `blocking` | list of `Check` | name checks that fail now and passed in the original |

## Preview model

| Field | Type | Rule |
|-------|------|------|
| `colorFlattened` | RGBA 192x192 | `flatten(rgba, accent)` with the formula of research §5; if the accent is invalid or absent, the icon is drawn as it is on a neutral checkerboard and the preview says so |
| `outlineMask` | 32x32 alpha | alpha channel of the outline icon |
| `nameShortShown`, `nameFullShown` | string | the names as composed, or the key as written |

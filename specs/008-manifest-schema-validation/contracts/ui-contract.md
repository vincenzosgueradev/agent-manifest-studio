# Contract: Manifest Schema Validation

## Core API

```ts
// services/schema/validate.ts
interface Problem { path: string; keyword: string; message: string; expected: string; found: string; description: string | null; suggestion: string | null }
validate(data: unknown, schema: object): { problems: Problem[]; checked: number; unsupported: string[] }

// services/schema/index.ts
BUNDLED: string[]                                   // 1.10 to 1.17 and 1.19 to 1.30 (no 1.18 exists)
schemaUrl(version: string): string
validateManifestText(text: string): SchemaReport
interface SchemaReport { state: 'valid' | 'invalid' | 'no-schema'; version: string | null; url: string | null; problems: Problem[]; checked: number; notes: string[] }
```

## Messages (plain English; `P` is the path, `V` the value found)

| keyword | message | expected | found |
|---|---|---|---|
| required | `Missing the required entry "K".` | `an entry "K"` | `not there` |
| additionalProperties | `"K" is not an entry of this schema here.` | `one of: A, B, C` | `"K"` |
| type | `Must be a T, not a U.` | `T` (list joined by " or ") | `U` |
| enum | `Must be one of the allowed values.` | `A, B, C` | `V` |
| const | `Must be exactly "C".` | `"C"` | `V` |
| pattern | `Does not have the required form.` | `the pattern /R/` | `V` |
| format | `Must be a web address (a URL).` | `a URL such as https://example.com` | `V` |
| maxLength | `Is N characters long; the limit is M.` ("1 character" for one) | `at most M characters` | `N characters` |
| minLength | `Is N characters long; at least M are needed.` | `at least M characters` | `N characters` |
| maximum / minimum | `Is V; the largest allowed is M.` / `the smallest allowed is M` | `at most M` / `at least M` | `V` |
| maxItems / minItems | `Has N items; at most M are allowed.` / `at least M are needed.` | `at most M items` / `at least M items` | `N items` |
| uniqueItems | `The same item appears more than once.` | `different items` | `a repeated item` |
| minProperties | `Needs at least M entries.` ("1 entry" for one) | `at least M entries` | `N entries` |
| oneOf (none) | `Does not match any of the N allowed shapes.` | | |
| oneOf (several) | `Matches more than one of the allowed shapes; it must match exactly one.` | | |
| anyOf (none) | `Does not match any of the N allowed shapes.` | | |
| not | `This value is not allowed here.` | | `V` |
| dependencies | `"K" needs "D" to be present too.` | `an entry "D"` | `not there` |

`suggestion` is `Did you mean "X"?` for additionalProperties when a known key is within 2 edits (case-insensitive), else `null`.
`path` is dotted with indexes: `developer.websiteUrl`, `bots[0].scopes[1]`; the root is `(manifest)`.

## UI

Card `#schema` (in `#step-package`, between `#loader` and `#summary`, `hidden` until a package is loaded): head `Manifest schema`, chip `follows v1.19` / `N problems` / `not validated`.
Body `#schema-body`: strip with `#schema-version`, `#schema-url` + button `[data-copy]`, `#schema-checked`; notes `.sch-note`;
groups `.sch-group[data-group]` (native `details`, open when it has problems) each with `.sch-problem` rows holding
`.sch-path`, `.sch-message`, `.sch-line` for Expected / Found / Schema says, and `.sch-hint` for the suggestion.
Check row: id `schema.valid`, label `Manifest follows its JSON schema`.

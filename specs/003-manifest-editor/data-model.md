# Data Model: Manifest Editor

- `FieldPath`: `name.short | name.full | description.short | description.full | developer.name |
  developer.websiteUrl | developer.privacyUrl | developer.termsOfUseUrl | accentColor | version`.
- `ListPath`: `validDomains | permissions | devicePermissions`.
- `IconSlot`: `color | outline`.
- `Edits { fields: Partial<Record<FieldPath, string>>; lists: Partial<Record<ListPath, string[]>>;
  icons: Partial<Record<IconSlot, Uint8Array>> }`. Empty edits mean nothing changed.
- `FieldDef { path; label; group; kind: 'text' | 'multiline' | 'url' | 'color' | 'version'; max?;
  required; note? }`.
- `Invalid { path; label; message }`.
- `ChangeRow { path; before: string | null; after: string | null }` (from `diffManifest`).
- `IconChange { slot; path; before: { w, h, bytes } | null; after: { w, h, bytes } }`.
- `Plan` (extended): `invalid: Invalid[]`, `changes: ChangeRow[]`, `iconChanges: IconChange[]`,
  `entries: Record<string, Uint8Array>` (replaced or added entries), `icons: IconSet`.
- Limits (in `limits.ts`): developer name 32, URL 2048, domain 2048 and 100 items, version 256,
  permissions 2, device permissions 5.

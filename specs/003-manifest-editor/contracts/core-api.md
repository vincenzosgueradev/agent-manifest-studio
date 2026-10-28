# Core API contract (feature 003)

```ts
// edit/fields.ts
FIELDS: FieldDef[]
validateField(path: FieldPath, value: string): string | null        // message, or null when valid
validateDomain(value: string, existing: string[]): string | null
bumpVersion(version: string, part: 'patch' | 'minor'): { ok: true; value: string } | { ok: false; reason: string }
PERMISSION_VALUES: string[]; DEVICE_PERMISSION_VALUES: string[]

// edit/jsonPatch.ts
type Op = { path: string[]; value: unknown } | { path: string[]; remove: true }   // path length 1 or 2
patchText(text: string, ops: Op[]): { ok: true; text: string } | { ok: false; message: string }
verifyPatch(before: string, after: string, ops: Op[]): boolean

// edit/edits.ts
EMPTY: Edits; isEmpty(e): boolean
opsFrom(edits: Edits, manifest: ManifestView, iconPaths): { ops: Op[]; invalid: Invalid[] }
diffManifest(before: string, after: string): ChangeRow[]

// edit/iconEdit.ts
checkNewIcon(slot: IconSlot, bytes: Uint8Array): { ok: true } | { ok: false; message: string }

// export.ts
planEdits(ctx, suffix: string | null, edits: Edits): PlanResult
exportPackage(ctx, suffix, edits?): ExportResult        // edits defaults to EMPTY
```

Behaviour rules: `patchText` changes only the spans it must and refuses a repeated key in an edited
object; `exportPackage` refuses (`blocked`) while `invalid` or blocking checks exist and fails
(`failed`) when the safety net fails.

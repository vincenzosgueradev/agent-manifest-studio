# Data model: Look Page

`Suggestion` (feature 005) gains: `name: string`, `family: string`, `palette: [string, string, string, string]` (hex, accent first, logo colour second), `score: number`; `id: string`.
`PresetSet = SuggestionSet` (same shape: `suggestions`, `note`).
`CompareModel`: `{ original: { icons: IconSet; accent: string | null }, now: { icons: IconSet; accent: string | null } }`; the states are derived: an icon is `Changed` when the plan has an `iconChanges` entry for its slot, the accent colour when it differs (case-insensitive) from the opened one.
No stored data.

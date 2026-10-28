# Data model: Manifest Schema Validation

`Problem` and `SchemaReport` as in `contracts/ui-contract.md`. `checked` counts the values (objects, arrays and leaves) that were compared with a schema node.
Bundled schema file: the original schema with `description` cut to the first sentence, plus two keys `x-source` (URL) and `x-read` (`2026-10-28`) at the root, which the validator ignores.
No stored data; the report of a manifest is recomputed at every render from the text of the manifest as it will be saved.

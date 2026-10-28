# Data Model: Get the Teams Package from an Environment

Nothing is persisted. The catalog lives in memory for the session of the tool and for one connection.

## ConnectionInfo

| Field | Type | Rule |
|-------|------|------|
| `id` | string | from the host |
| `name` | string | shown in the badge |
| `url` | string | shown in the badge, truncated with the full text in `title` |
| `enabledForPowerPlatformAPI` | boolean \| undefined | `false` stops the download with its own cause |

## Solution

| Field | Type | Rule |
|-------|------|------|
| `solutionId` | string | |
| `uniqueName` | string | system containers (`Default`, `Active`, `Basic`) are never listed |
| `friendlyName` | string | a name matching "default solution" is never listed |
| `version` | string | |
| `isManaged` | boolean | chip "Managed" or "Unmanaged" |
| `agentCount` | number | at least 1 for a listed solution |

## Agent

| Field | Type | Rule |
|-------|------|------|
| `id` | string | the `botid`; the `AgentId` of the download |
| `name` | string | "(unnamed)" when empty |
| `schemaName` | string | |
| `isActive` | boolean | `statecode` is not 1 |
| `modifiedOn`, `publishedOn` | string | ISO text or empty; shown as the date part, "never" when empty |
| `solution` | Solution \| null | the real solution wins over a container |

## Catalog

`{ agents: Agent[]; solutions: Solution[]; updatedAt: Date }`. Groups: one per listed solution, plus
`NO_SOLUTION` ("Agents in no solution") when some agent has none.

## Browse state

| Field | Type | Rule |
|-------|------|------|
| `source` | `'file'` \| `'environment'` | `'file'` at start |
| `level` | 0 \| 1 | 0 solutions, 1 agents of a group |
| `groupKey` | string \| null | a solution id or `NO_SOLUTION` |
| `agentId` | string \| null | the selected agent; dropped when it leaves the list |
| `search` | `{ solutions: string; agents: string }` | kept across refreshes |
| `status` | `idle` \| `loading` \| `refreshing` | `refreshing` keeps the rows |
| `error` | string \| null | with `lastGoodAt` shows what failed and when |
| `downloading` | boolean | a second press is ignored |
| `environmentId` | string \| null | resolved or pasted; cleared when another package is chosen |
| `token` | number | increases on every package change; a download that finishes with an old token is dropped |

## DownloadResult

`{ ok: true; bytes; fileName } | { ok: false; cause; message }`, with `cause` one of `no-connection`,
`api-not-enabled`, `permission`, `not-found`, `environment-id`, `not-a-zip`, `other`.

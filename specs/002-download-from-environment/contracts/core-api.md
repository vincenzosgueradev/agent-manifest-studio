# Contract: environment modules (`src/services/environment/`)

Only `host.ts` touches the host's APIs. Everything else takes small interfaces and is tested with fakes.

| Module | Function | Contract |
|--------|----------|----------|
| `host.ts` | `getConnection(): Promise<ConnectionInfo \| null>` | `toolboxAPI.connections.getActiveConnection`, mapped to `ConnectionInfo` |
| `host.ts` | `hostSource(): CatalogSource` | `{ fetchXml(xml), queryAll(odataPath) }` over `dataverseAPI.fetchXmlQuery` and `queryData`, following `@odata.nextLink` |
| `host.ts` | `queryOne(path)` | one `queryData` call, for `RetrieveCurrentOrganization` |
| `host.ts` | `copilotStudioGet(path)` | `powerplatformAPI.CopilotStudio.Get(path, 'primary', { Accept: 'application/zip' })` |
| `host.ts` | `onConnectionChange(fn)` | listens to `connection:created` and `connection:updated` |
| `catalog.ts` | `fetchCatalog(source): Promise<Catalog>` | the rules of research section 4; throws when the agents cannot be read, never when only the solutions fail |
| `catalog.ts` | `groupsOf(catalog): Group[]` | listed solutions (system containers out, sorted by name), then `NO_SOLUTION` when needed, each with its agent count |
| `catalog.ts` | `agentsOf(catalog, key): Agent[]` | the agents of a group, sorted by name |
| `catalog.ts` | `filterGroups(groups, text)`, `filterAgents(agents, text)` | case-insensitive match on any shown text; empty text keeps all |
| `catalog.ts` | `isSystemSolution(s)` | `Default`, `Active`, `Basic`, or a name matching "default solution" |
| `download.ts` | `isGuid(text)`, `normalizeGuid(text)` | trims, removes braces, validates `8-4-4-4-12` |
| `download.ts` | `resolveEnvironmentId(read): Promise<string \| null>` | reads `Detail.EnvironmentId` from the function result (object or `value[0]`); `null` when absent or not a GUID; never throws |
| `download.ts` | `downloadPath(environmentId, agentId)` | `environments/{env}/agents/{agent}/channels/M365/download?api-version=2024-10-01` |
| `download.ts` | `coerceZip(response): Uint8Array \| null` | research section 2; checks the `PK` signature; never throws |
| `download.ts` | `classifyDownloadError(err, connection): DownloadError` | the causes of the data model, in this order: `api-not-enabled`, `not-found`, `permission`, `other` |
| `download.ts` | `packageFileName(agentName)` | `<name>-manifest.zip`, forbidden characters out, never empty |
| `download.ts` | `downloadManifest(deps, agent, envId): Promise<DownloadResult>` | checks the connection, calls once, coerces; every failure is a result, not an exception |

## Invariants the tests assert

1. No function of these modules calls a write method of the host or `fetch`; the source test lists the
   only host methods that may appear.
2. `coerceZip` returns bytes only for data that starts with a zip signature, and the same bytes for every
   wrapping of the same zip.
3. An agent never disappears from the catalog because the solution lookup failed.
4. A failed refresh keeps the previous catalog.

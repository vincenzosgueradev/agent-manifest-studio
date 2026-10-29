# Research: Get the Teams Package from an Environment

Read on **2026-10-27** unless stated otherwise.

## 1. The download operation (verified in documentation)

Microsoft Learn, "Agent Channels - Download Agent Channel Manifest" (Power Platform API, version
2024-10-01):

```
GET https://api.powerplatform.com/copilotstudio/environments/{EnvironmentId}/agents/{AgentId}/channels/{ChannelName}/download?api-version=2024-10-01
```

| Part | Value |
|------|-------|
| `EnvironmentId` | the environment id (uuid) |
| `AgentId` | "The bot ID" (uuid) = `botid` of the Dataverse `bot` table |
| `ChannelName` | "Currently only `M365` is supported" |
| `includeAgentSchema` | optional boolean; **not used** (out of scope; its effect on the package is unknown) |
| Response | 200, `application/zip` |
| Security | OAuth2, scope `.default` of `https://api.powerplatform.com` |

Observed by the author in the browser's network panel while using Copilot Studio (2026-10-27): the same
download exists on an environment-specific host (`.../copilotstudio/agents/{id}/channels/m365/download`),
status 200, `Content-Disposition: attachment; filename=manifest.zip`, `Content-Type: application/zip`.
This confirms the shape of the answer (a zip), not the path the tool uses; the tool uses the documented one.

## 2. The host's client (verified in the type definitions and documentation)

- `powerplatformAPI.CopilotStudio.Get(path, connectionTarget?, headers?)` with `path` relative to
  `https://api.powerplatform.com/copilotstudio`; it returns `Promise<PowerPlatformResponse>`, an object
  with unspecified fields (`@pptb/types` 1.2.x; "PowerPlatform API" page of the PPTB documentation).
- The documentation says nothing about binary downloads, response parsing or the error shape of this client.
  **UNVERIFIED**: in what form the zip comes back. Decision: `coerceZip` accepts every form it can
  recognise (bytes, `ArrayBuffer`, a Node `Buffer` serialised as `{type:'Buffer', data:[...]}`, an array
  of numbers, base64 text with or without a `data:` prefix, a binary string, or any of these nested
  under `data`, `body`, `content`, `value`, `bytes`, `file` or `blob`) and checks the `PK` signature of a
  zip; anything else is "not readable as a zip package", with a message. Manual test 12 in the quickstart
  settles it with a real environment; if the host returns something else, only `coerceZip` changes.
- A tool must declare `features.enabledForPowerPlatformAPI`; this "does not enable the API for a
  connection": the user must enable it per connection, and `Connection.enabledForPowerPlatformAPI` and
  `Connection.scopesForPowerPlatformAPI` say whether they did. Decision: before calling, if the
  connection says it is not enabled the tool stops with that cause and does not call.
- `features.connections` accepts a range with `min` 0: the tool starts without a connection.
- Dataverse client errors carry `message`, `status` and `statusText` (Error Handling page). The Power
  Platform API client's errors are undocumented: `classifyDownloadError` reads `status`, `statusCode`,
  `code` and the message text, and falls back to "other, with the text".

## 3. The environment id

- Documented: the Web API function `RetrieveCurrentOrganization` returns a `Detail` property, an
  `OrganizationDetail`, and `OrganizationDetail.EnvironmentId` is "the unique identifier of the
  organization's environment" (Microsoft Learn; read 2026-10-27). Request documented as
  `GET [Org]/api/data/v9.2/RetrieveCurrentOrganization(AccessType=@p1)?@p1=Microsoft.Dynamics.CRM.EndpointAccessType'Default'`.
- Decision: `dataverseAPI.queryData("RetrieveCurrentOrganization(AccessType=@p1)?@p1=Microsoft.Dynamics.CRM.EndpointAccessType'Default'")`
  (a read; `execute` is not used so that no write-capable call exists in the tool), reading
  `Detail.EnvironmentId` from the object or from `value[0]`. **UNVERIFIED** that the host's `queryData`
  accepts a function call and that the JSON carries the property; if not, the tool asks for the id
  (FR-015). Manual test 11.
- The pasted id is checked as a GUID (`8-4-4-4-12` hexadecimal, any case), trimmed, braces removed.

## 4. Browsing solutions and agents (read 2026-10-27)

Rules chosen, with their reasons:

1. The agents come from the `bot` table, never from `solutioncomponent`: a failure resolving solutions
   must not hide an agent.
2. `solutioncomponent` is filtered by `objectid` on the known bot ids, never by a guessed component type
   (a wrong value returns zero rows without an error).
3. Solutions are read with the publisher expanded; system containers (`Default`, `Active`, `Basic`, and any
   display name matching "default solution") are left out; when a bot is in several solutions the real one
   wins over a container.
4. OData follows `@odata.nextLink` to the end (Dataverse pages at 5000).
5. Managed solutions are listed (here nothing is exported, so they are shown).
6. FetchXML values are escaped.

Difference: this tool's code is adapted (English, its own types, no logging module, a source interface so
the tests use a fake) and **read-only by construction**: the module has no method that writes.

## 5. Stale-while-revalidate (rule of the author, memory "dati obsoleti")

The catalog is cached in memory for the session of the tool and for the connection that produced it.
Entering a list shows the cache and reads again in the background; a result replaces the rows without
losing selection or search text; "Updated at hh:mm" and a quiet spinner say what is going on. A change of
connection clears the cache.

## 6. Decisions

| Topic | Decision | Rejected |
|-------|----------|----------|
| Host access | One module (`services/environment/host.ts`) touches `dataverseAPI`, `powerplatformAPI` and `toolboxAPI.connections`; everything else gets a small interface and is tested with fakes | calling the host everywhere |
| Read-only proof | A test lists the host methods the sources may use (`queryData`, `fetchXmlQuery`, `CopilotStudio.Get`, `getActiveConnection`) and fails on any other | trusting review |
| Dates in tables | the date part of the ISO value (`2026-10-26`), full value in `title` | local date-time (differs by time zone, hard to test) |
| Agent file name | `<agent name>-manifest.zip`, forbidden characters removed, never empty (`agent-manifest.zip`) | the host's `manifest.zip` (every agent the same) |
| Step 1 layout | a switch, then the file block or the environment block; the loaded bar stays on top | a separate step (would add a step for one choice) |

## 7. What the tests cannot see (quickstart, manual)

- That the host hands back the zip in a form `coerceZip` reads (11, 12).
- That the connection can be enabled for the Power Platform API and the download works for a real agent.
- That `RetrieveCurrentOrganization` works through `queryData`.
- The real look of the tables and the breadcrumb in both themes.

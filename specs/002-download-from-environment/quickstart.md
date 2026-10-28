# Quickstart: validating "Get the Teams package from an environment"

Run from the tool folder (`agent-manifest-studio/`).

## Automatic checks

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npx tsc --noEmit` | no errors |
| 2 | `npm run build` | `dist/` built |
| 3 | `npm test` and `npm run test:full` | all green; the tests use a fake host (connection, Dataverse, Power Platform API) |
| 4 | `npm run test:mutation` | no surviving mutation |
| 5 | `npm run validate` | `features` accepted; `readmeUrl` fine once pushed |

The source test fails if any source uses a network primitive, a write method of the host's APIs, or a
host method outside the allowed list (`queryData`, `fetchXmlQuery`, `CopilotStudio.Get`,
`getActiveConnection`).

## Manual checks (record the result next to each) - none has been run yet

Needs PPTB with a connection to a development environment that has at least one Copilot Studio agent.

| # | Check | Expected | Result / date |
|---|-------|----------|---------------|
| 1 | Open the tool with no connection selected, switch to "Download from an environment" | a message says no connection is selected and how to choose one; "Open a file" still works | |
| 2 | Select a connection that is **not** enabled for the Power Platform API | a warning chip on the badge; Download stops with the right cause | |
| 3 | Enable the connection for the Power Platform API, reload the tool | the badge shows the connection without the warning | |
| 4 | Switch to the environment | the solutions with their agent counts appear; system containers are absent | |
| 5 | Compare the list with Agent Nameplate for the same connection | same solutions, same counts | |
| 6 | Type in the search box, press Refresh | rows narrow; "Updated at" changes | |
| 7 | Open a solution | the agents appear; the breadcrumb reads Package, Solutions, the name | |
| 8 | Leave and re-enter the list | the rows are there at once, then refresh | |
| 9 | Select an agent | the Download button names it | |
| 10 | Press Download | the package loads; the file bar says it was downloaded from the connection | |
| 11 | Watch whether the id of the environment was asked | if it was, `RetrieveCurrentOrganization` through the host does not give it: note what came back | |
| 12 | Compare the downloaded package with the one downloaded by hand from Copilot Studio for the same agent | same content | |
| 13 | Continue: suffix, preview, checks, save | as for an opened file | |
| 14 | Download an agent that was deleted meanwhile | "not found", with advice to refresh | |
| 15 | Switch the theme | tables, chips, badge, breadcrumb readable in both | |
| 16 | Check in the environment that nothing changed (no new solution, no publish) | nothing changed | |

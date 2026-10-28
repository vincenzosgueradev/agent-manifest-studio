# Feature Specification: Get the Teams Package from an Environment

**Feature Branch**: `002-download-from-environment`

**Created**: 2026-10-27

**Status**: WITHDRAWN on 2026-10-28 (the code, the tests and the claims of this feature were removed; this folder is kept as the record)

**Input**: User description: "In step 1 (Package) the user chooses the source: open a file, or download the Teams package of an agent from an environment. Download mode uses the active connection of the host and the solution and agent browsing of Agent Nameplate: a table of solutions, then the agents of the chosen solution, then Download manifest. The downloaded package is loaded exactly as if the user had opened it."

## Withdrawn

On a real DEV environment the download failed with: "The host returned the package as text, which
destroys the bytes of a zip, so it cannot be rebuilt here". The call `powerplatformAPI.CopilotStudio.Get`
returns a generic object (`PowerPlatformResponse`, an open index signature) and the Power Platform ToolBox
documentation and `@pptb/types` (1.2.7) offer no way to ask for binary data. Bytes that the host has decoded
as text cannot be recovered, so the tool cannot rebuild the zip. The user decided to remove the feature
rather than keep a button that cannot work.

Removed: `src/envFlow.ts`, `src/services/environment/`, `src/view/environment.ts`, the source switch and the
environment block of `index.html`, the tests `catalog`, `download` and `ui.env*`, the `features` block of
`package.json`, and the reading of environments from Principle II (constitution 1.4.0). The tool works on a
file only. To bring it back, the host must return a download as bytes (an ArrayBuffer, a Uint8Array or base64)
and the requirements below would have to be re-read against that answer.

The text below is what was built and is no longer true of the tool.

## Context

Feature 001 starts from a zip file that the user has already downloaded from Copilot Studio. That
step is manual: open the agent, find the channel page, press download, find the file. This feature
removes it. The user picks the solution and the agent in the tool, and the tool brings the Teams app
package of that agent in, ready for the preview, the suffix and the checks of feature 001.

It stays **read-only toward the environment**: the tool lists solutions and agents and downloads one
package. It writes, publishes and changes nothing there. The constitution was amended to allow
exactly this (Principle II, version 1.1.0).

## Clarifications

### Session 2026-10-27

Decided in autonomous mode by choosing the recommended option; the user can overrule any of them.

- Q: How does the user choose between a file and an environment? → A: A segmented switch at the top of step 1 with two options, "Open a file" and "Download from an environment". The file option is the one that is on when the tool opens, so a user without a connection loses nothing.
- Q: What is the name of the package that was downloaded? → A: The agent's name followed by `-manifest`, with characters that file names cannot hold removed, and `.zip` (for example `Sales Helper-manifest.zip`). It is only the name shown for the loaded package and the base of the suggested name of the saved copy.
- Q: How does the tool find the environment id that the download needs? → A: From the connection, by asking the environment for its own details. If that fails, the user is asked to paste the environment id (a GUID), and the pasted value is checked for its shape before it is used and kept only until another package is chosen.
- Q: Which solutions are listed? → A: The same as in Agent Nameplate: every solution that holds at least one agent, system containers (Default, Active, Basic and "Default solution") left out, managed ones included (a managed solution is readable, only not editable).
- Q: Is a managed solution's agent downloadable? → A: Yes. The download does not change anything.
- Q: How fresh are the lists? → A: Each time the user enters a list the tool shows what it already has and reads again in the background, then says "Updated at hh:mm" and shows a quiet indicator while it reads; a change is shown without losing the selection or the search text.
- Q: What if an agent belongs to no visible solution? → A: It is not lost: an extra row "Agents in no solution" lists them, as the list of agents comes from the agents table and not from the solutions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick an agent and get its package (Priority: P1)

The user opens the tool, chooses "Download from an environment", sees which connection is in use,
picks a solution from a table, picks an agent from the table of that solution, and presses
"Download manifest". The package is loaded and the tool shows the summary, exactly as if the user had
opened the zip.

**Why this priority**: it is the whole feature. Without it the user still has to download by hand.

**Independent Test**: with a simulated host that returns solutions, agents and a package, choose the
environment source, a solution and an agent, press Download, and check that the loaded package is the
one the host returned and that the next steps work on it.

**Acceptance Scenarios**:

1. **Given** the tool is open, **When** the user looks at step 1, **Then** a switch offers "Open a
   file" (on) and "Download from an environment" (off).
2. **Given** the user switches to the environment, **When** a connection is active, **Then** its name
   and address are shown, and a table of solutions with their agent counts appears.
3. **Given** the table of solutions, **When** the user picks one, **Then** the table of its agents
   appears, and the breadcrumb reads Package, Solutions, the solution's name.
4. **Given** the table of agents, **When** the user picks an agent, **Then** the Download button is
   enabled and says which agent it will download.
5. **Given** an agent is picked, **When** the user presses Download, **Then** the package is brought
   in, loaded like an opened file, named after the agent, and the file bar tells where it came from.
6. **Given** a package was downloaded, **When** the user goes on, **Then** the suffix, preview,
   checks and save work exactly as for an opened file.
7. **Given** a package is loaded from the environment, **When** the user switches back to "Open a
   file", **Then** the loaded package stays until the user removes it or loads another.

---

### User Story 2 - Find the agent quickly and trust what is listed (Priority: P2)

The lists can be long. The user types to narrow a table, refreshes it, and always sees when it was
last read. Empty and failing states explain themselves.

**Why this priority**: it makes the feature usable in real environments, but it can be tried
without it.

**Independent Test**: lists of different sizes; type in the search box and check the rows; simulate a
slow second read and check that the old rows stay while the new ones are read.

**Acceptance Scenarios**:

1. **Given** a table, **When** the user types in its search box, **Then** only the rows that contain
   the text (in any shown column, any letter case) remain, and the count is shown.
2. **Given** a search that matches nothing, **When** the table is empty, **Then** it says which text
   matched nothing, not a blank area.
3. **Given** the user presses Refresh, **When** the read finishes, **Then** the rows are replaced, the
   selection is kept if the row still exists, and the time of the update is shown.
4. **Given** the user returns to a list they already saw, **When** it opens, **Then** the rows are
   there at once and a new read runs in the background.
5. **Given** an environment with no agents, **When** the list is read, **Then** it says that no agent
   was found in this environment.
6. **Given** agents that belong to no visible solution, **When** the solutions are listed, **Then** a
   row "Agents in no solution" gives access to them.
7. **Given** a read fails, **When** the list was shown before, **Then** the old rows stay, with the
   error and the time of the last successful read; if nothing was shown before, the error says what
   to do and offers the file route.

---

### User Story 3 - When something is missing, say what and offer the way out (Priority: P3)

Without a connection, without the right access, or when the environment id or the downloaded file
cannot be used, the tool says exactly what is wrong and what to do, and always points at opening a
file instead.

**Why this priority**: the happy path works without it; it turns failures into something the user
can act on.

**Independent Test**: simulate each failure and check the message and that "Open a file" is offered.

**Acceptance Scenarios**:

1. **Given** no connection is active, **When** the user switches to the environment, **Then** the tool
   says that no connection is selected in the host and how to choose one, and offers the file route.
2. **Given** the connection is not enabled for the Power Platform API, **When** the download is refused
   for that reason, **Then** the message says the connection must be enabled for it in the host.
3. **Given** the user lacks permission on the agent or the environment, **When** the download is
   refused, **Then** the message says it is a permission problem, not a fault of the tool.
4. **Given** the agent no longer exists, **When** the download answers "not found", **Then** the message
   says so and suggests refreshing the list.
5. **Given** the environment id cannot be found from the connection, **When** the user presses Download,
   **Then** the tool asks for the environment id, checks it has the shape of a GUID, and goes on with it.
6. **Given** the answer cannot be read as a zip package, **When** the download finishes, **Then** the
   message says that, never shows a half-loaded package, and offers the file route.
7. **Given** any failure, **When** the message is shown, **Then** the previous package, if any, stays
   on screen and the message can be dismissed.

---

### Edge Cases

- The connection changes in the host while the tool is open: the lists are cleared and read again for
  the new connection, and a loaded package stays until the user removes it.
- An agent has no name or a name with characters a file name cannot hold: the displayed name and the
  suggested file name handle it (the file name is cleaned, never empty).
- Two agents have the same name: both are listed, told apart by their modification time.
- A solution holds hundreds of agents or the environment holds thousands: the tables scroll inside
  their panel and the search keeps working; the list is never truncated silently.
- The user presses Download twice quickly: the second press is ignored while the first runs.
- The user leaves the step or removes the package while a download runs: its result is dropped and
  never loaded behind the user's back.
- A downloaded package is larger than the limits of feature 001: it is refused with the same message.
- The environment answers with an empty body or with an error page: reported as "not readable as a
  zip package", with no part of it kept.
- A table row is chosen with the keyboard: Enter or Space selects it, and the selection is announced.

## Requirements *(mandatory)*

### Functional Requirements

**Source**

- **FR-001**: Step 1 MUST offer a switch between "Open a file" and "Download from an environment",
  with the file option on when the tool opens.
- **FR-002**: Switching MUST NOT unload a package that is already loaded.

**Connection**

- **FR-003**: In environment mode the tool MUST show the name and address of the active connection of
  the host, and MUST say clearly, with the file route offered, when there is none.
- **FR-004**: When the connection of the host changes, the tool MUST clear its lists and selection and
  read them again for the new connection.

**Browsing**

- **FR-005**: The tool MUST list the solutions that hold at least one agent, with name, unique name,
  version, whether managed or unmanaged, and the number of agents, leaving out the system containers
  (Default, Active, Basic and any "Default solution").
- **FR-006**: The tool MUST give access to the agents that belong to no visible solution.
- **FR-007**: Selecting a solution MUST show its agents with name, state (active or inactive), last
  modification and last publication, and the breadcrumb of step 1 MUST read Package, Solutions, and the
  name of the solution, each earlier segment leading back to its level without losing the selection above.
- **FR-008**: Each table MUST have a search box that narrows the rows by any shown text, any letter
  case, and MUST show how many rows remain; an empty result MUST say what was searched for.
- **FR-009**: The list of agents MUST come from the agents of the environment and not only from the
  solutions, so that a failure in finding the solution of an agent never hides the agent.
- **FR-010**: Entering a list MUST show what the tool already has at once and read again in the
  background; the tool MUST show when the list was last updated and a quiet indicator while it reads,
  and a Refresh button MUST read it on demand. A new read MUST keep the selection and the search text.
- **FR-011**: A failed read MUST keep the rows already shown, say what failed and when the last good
  read was, and MUST NOT leave a blank area.

**Download**

- **FR-012**: The user MUST pick exactly one agent, and the Download button MUST be disabled until one
  is picked and MUST name the agent.
- **FR-013**: The tool MUST bring in the Teams app package of the picked agent for the Microsoft 365
  channel, and nothing else, and MUST load it with the same checks and limits as an opened file
  (feature 001, FR-001 to FR-003), without keeping any part of a response that is not a valid package.
- **FR-014**: The loaded package MUST be named after the agent as in the Clarifications, and the file
  bar MUST say it was downloaded from the connection, with its name.
- **FR-015**: The tool MUST find the environment id from the connection; when it cannot, it MUST ask
  the user for it, MUST check that it has the shape of a GUID, and MUST NOT keep it after another
  package is chosen.
- **FR-016**: A second press of Download while one runs MUST be ignored, and the result of a download
  whose step was left or whose package was removed MUST be dropped.
- **FR-017**: Every failure MUST name its cause among: no connection, connection not enabled for the
  Power Platform API, no permission, agent not found, the environment id missing or malformed, the
  answer not readable as a zip package, any other error with its text; and MUST offer to open a file
  instead and keep any previous package on screen.

**Safety and scope**

- **FR-018**: The tool MUST NOT write to Dataverse, to Copilot Studio or to the environment in any way,
  MUST NOT publish, import or change anything, and MUST NOT call any network primitive of its own; every
  read goes through the host's APIs to the connection the user selected.
- **FR-019**: The tool MUST declare that it needs no connection to start (it works from a file without
  one) and may use one connection that is enabled for the Power Platform API.
- **FR-020**: The README section "What this tool changes" MUST say what the tool reads from the
  environment, that it writes nothing there, and that nothing is sent anywhere else; a test MUST prove
  that no source writes through the host's APIs or uses a network primitive.
- **FR-021**: Tables MUST scroll inside their panel, be readable with the keyboard (rows selectable with
  Enter or Space, with the selection announced), follow the light and dark theme, and fit a narrow pane
  without horizontal page scroll.

### Key Entities

- **Connection**: the environment the user selected in the host: a name and an address; may be absent.
- **Solution**: a container of agents: name, unique name, version, managed or not, number of agents.
- **Agent**: name, identifier, state, last modification, last publication, and the solution it belongs
  to (possibly none).
- **Environment id**: the identifier of the environment the download needs; resolved from the connection
  or typed by the user.
- **Downloaded package**: the zip the environment returned for one agent; once checked it is the same
  thing as an opened package.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with an active connection gets from opening the tool to a loaded package without
  leaving the tool, in no more than four choices (source, solution, agent, Download).
- **SC-002**: Across a matrix of environments (no agents, one, hundreds, agents in no solution, managed
  and unmanaged solutions, names with unusual characters), 100% of agents of the environment can be
  reached in the tables.
- **SC-003**: 100% of the failures listed in FR-017 produce a message that names its cause and offers the
  file route, and none leaves a half-loaded package.
- **SC-004**: A test fails if any source of the tool calls a network primitive, or a method of the host's
  APIs that writes, creates, updates or deletes, or an operation that is not a read.
- **SC-005**: A list opened for the second time shows its rows without waiting for the new read.
- **SC-006**: A downloaded package passes through exactly the same loading code as an opened file, so
  the same package gives the same summary, preview, checks and export by either route.
- **SC-007**: In both themes the tables, the switch, the messages and the breadcrumb are readable
  during the manual test in the real tool, with the result recorded in the quickstart.

## Assumptions

- The user has a connection in the host with enough access to read the solutions and agents of the
  environment and to use the Power Platform API; the tool does not obtain or manage connections.
- The download is the operation "Download Agent Channel Manifest" of the Power Platform API, version
  2024-10-01 (Microsoft Learn, read on 2026-10-27): it returns the Teams app package of an agent as a
  zip, only for the Microsoft 365 channel; the agent identifier is the bot id of the agents table.
- **Unverified** (to be recorded in `research.md` and tested by hand): that the environment's own details
  hold the environment id; and the exact form in which the host hands the zip back to the tool (bytes,
  base64 text, or something else). The tool accepts every form it can recognise as a zip and refuses the
  rest, with a message.
- The solution and agent browsing of Agent Nameplate is reused in behaviour and in rules (read-only,
  agents from the agents table, solutions resolved on the side, system containers hidden); its code is
  adapted to this tool and not shared.
- The package returned for an agent is the same kind of package as the one downloaded by hand from
  Copilot Studio, so everything of feature 001 applies to it unchanged.
- Other channels, the option to include the agent schema, writing to the environment, uploading the new
  package and more than one connection are out of scope.
- This feature required amending Principle II of the constitution (MINOR, version 1.1.0), done with
  this specification.

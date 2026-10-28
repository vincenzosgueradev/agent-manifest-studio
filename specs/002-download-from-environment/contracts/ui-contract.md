# Contract: step 1 with an environment source

Everything of the screen contract of feature 001 stays. Step 1 gains:

| Region | Id | Content |
|--------|----|---------|
| Source switch | `source-switch` | two buttons, `data-source="file"` ("Open a file") and `data-source="environment"` ("Download from an environment"), `aria-pressed` on the active one; file is active at start |
| File block | `source-file` | the drop area of feature 001 (hidden once a package is loaded) |
| Environment block | `source-env` | hidden unless the environment source is active |
| Connection badge | `env-connection` | dot, name, address (truncated, full text in `title`); a warning chip when the connection is not enabled for the Power Platform API; a message with the file route when there is none |
| Solutions table | `env-solutions` | search box `env-search-solutions`, count, columns Solution, Unique name, Version, Type (chip), Agents; the row "Agents in no solution" when needed; rows are keyboard operable (`tabindex`, Enter or Space) |
| Agents table | `env-agents` | search box `env-search-agents`, count, radio mark, columns Name, State (chip), Modified, Published; the selected row is marked |
| Refresh | `env-refresh-btn` | reads again; `env-updated` says "Updated at hh:mm"; a quiet spinner while reading |
| Download | `env-download-btn` | "Download manifest", disabled until an agent is selected, its label names the agent |
| Environment id prompt | `env-id-prompt` | shown when the id could not be resolved: input `env-id-input`, hint, error text; Download continues with the typed value |
| Message | `env-message` | cause and the file route (button "Open a file instead"); can be dismissed |
| Breadcrumb | `breadcrumb` | in step 1 at level 1: Package > Solutions > the solution's name; "Package" and "Solutions" are links |

## Behaviour

- Choosing the environment source with a connection shows the solutions at once from the cache (if any)
  and reads in the background. Without a connection it shows the message instead of the tables.
- Selecting a solution opens level 1; the breadcrumb or a "Back to solutions" button returns to level 0
  keeping the search text.
- A successful download loads the package exactly like an opened file and moves nothing else: the file bar
  shows the agent's package name and "downloaded from <connection>".
- Texts that must appear: "Nothing is written to the environment." under the Download button, and the
  empty states of the spec.

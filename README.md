# Onyx community plugins

This repository is the **community plugin registry** for
[Onyx](https://github.com/onyx-notes/onyx). The app reads
[`registry.json`](registry.json) to show the in-app plugin browser, and each
plugin's code lives here in its own directory.

Plugins run in a **sandboxed iframe** and can only do what their declared
capabilities allow — the app brokers every privileged call. There is no
ambient access to your vault or the network.

## Repository layout

```
plugins/
├─ registry.json                 # the list the app fetches
├─ <plugin-id>/
│  ├─ manifest.json              # id, name, version, description, capabilities
│  ├─ main.js                    # the plugin entry point (sandboxed)
│  └─ README.md                  # what it does, screenshots
└─ schema/                       # JSON Schemas both files must satisfy
```

## Submitting a plugin

1. Fork this repo and add a directory `your-plugin-id/` containing
   `manifest.json`, `main.js`, and a `README.md`.
2. Add a matching entry to `registry.json` (keep the array sorted by `id`).
   The `source` should point at your directory on `main`:
   `https://raw.githubusercontent.com/onyx-notes/plugins/main/your-plugin-id`
3. Open a pull request. CI validates your manifest and registry entry
   automatically (see `.github/workflows/validate.yml`); a maintainer then
   reviews the code for the sandbox rules before merging.

### Capabilities

Declare the least you need. Recognized capabilities:

| Capability | Grants |
|------------|--------|
| `vault:read` | read note contents and metadata |
| `vault:write` | create/modify/delete notes |
| `editor:read` | read the active editor selection/content |
| `editor:write` | insert or replace text in the active editor |
| `ui:commands` | register commands in the command palette |
| `ui:panel` | render a side panel |
| `net:fetch` | make outbound network requests (user-approved) |

## Review criteria

- The manifest is honest — it declares every capability the code uses and no
  more.
- No obfuscated code, no attempts to escape the sandbox, no telemetry without
  a clear opt-in.
- A working `README.md` describing what the plugin does.

## License

Plugins are owned and licensed by their authors. By submitting you confirm you
have the right to distribute the code under the license stated in your plugin's
directory.

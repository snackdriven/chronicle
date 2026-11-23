# Chronicle setup reference

[README](../README.md)

## Database and environment

The MCP entry point is [src/mcp-server.ts](../src/mcp-server.ts). It initializes SQLite through [src/storage/db.ts](../src/storage/db.ts).

Set `CHRONICLE_DB_PATH` in the process environment to an absolute database path. Create its parent directory first. The storage module opens the database but does not create that directory.

The source default resolves to `data/chronicle.db`. A bundled entry point changes the location used to resolve relative paths, so use an explicit path for compiled builds.

The startup scripts do not load `.env` automatically. [.env.example](../.env.example) lists credential placeholders and settings, but copying it does not configure a running process. The browser proxy does not read `MEMORY_SERVER_ENDPOINT` or `MEMORY_HTTP_PORT`; its paths and port are constants in [server/index.js](../server/index.js).

`better-sqlite3` is a native dependency. If pnpm skips its install script, enable its build under your local pnpm policy. The [CI workflow](../.github/workflows/ci.yml) explicitly rebuilds it with `node-gyp`. Installation needs a compatible native binary or a working native build toolchain.

## Commands

These scripts exist in [package.json](../package.json):

| Command | Runs |
| --- | --- |
| `pnpm mcp` | The TypeScript stdio MCP server |
| `pnpm build:mcp` | Bundles the MCP server into `dist/mcp-server.mjs`; leaves `better-sqlite3` external |
| `pnpm dev` | Browser frontend and proxy backend |
| `pnpm dev:frontend` | Vite on port 5183 |
| `pnpm dev:backend` | Express proxy on port 3002 |
| `pnpm build` | TypeScript check and Vite build |
| `pnpm type-check` | TypeScript check without emitting files |
| `pnpm test --run` | Vitest without watch mode |
| `pnpm preview` | Vite build preview |

There are no `dev:http`, `setup:google`, or `prepare:calendar` package scripts. Import utilities remain in [scripts/](../scripts/), including the Google OAuth and calendar/Jira preparation tools. Inspect each tool's inputs and target database before running it.

## Browser wiring

The default browser path is:

```text
React frontend → Express MCP proxy → spawned MCP process → SQLite
```

Before expecting data access, reconcile these source settings:

1. The API URL in [useMemoryData.ts](../src/hooks/useMemoryData.ts) and [useMemoryMutations.ts](../src/hooks/useMemoryMutations.ts) uses port 3001. [MemoryManagerPage.tsx](../src/pages/MemoryManagerPage.tsx) also has a direct call to that port.
2. [server/index.js](../server/index.js) listens on port 3002. Align every browser API URL with the intended backend.
3. The proxy's `mcpServerPath` resolves outside the checkout to `../../../projects/chronicle/dist/mcp-server.js`, relative to the server directory. The local build command produces `dist/mcp-server.mjs`. Set the proxy path to the actual server entry point.
4. The proxy's `dbPath` resolves outside the checkout to `../../../.swarm/chronicle.db`. Confirm the intended database before using the interface. The proxy passes this path to its child process as `CHRONICLE_DB_PATH`.

The frontend's configured port is 5183 in [vite.config.ts](../vite.config.ts).

The proxy forwards one JSON-RPC tool call to each spawned process. Process startup alone does not prove an end-to-end MCP exchange. Browser data access needs runtime verification after the wiring changes.

These are source findings, not completed runtime fixes.

## HTTP interfaces

The browser proxy and the separate REST server are different entry points. See [HTTP interfaces](HTTP_API_README.md) before choosing a route or startup command.

## Keyboard controls

The [shortcut hook](../src/hooks/useKeyboardShortcuts.ts) defines Cmd/Ctrl+K for search, Cmd/Ctrl+N for a new item, Cmd/Ctrl+R for refresh, and Cmd/Ctrl+T for switching tabs. Escape closes a modal or clears selection.

Handlers depend on the calling page. Most shortcuts are suppressed while typing in a form field.

## Verification boundary

The commands, ports, paths, and environment names above were checked against source. Installation, native-module compilation, imports, and live browser/MCP communication were not exercised for this documentation update.

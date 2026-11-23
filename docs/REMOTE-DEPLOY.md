# Remote MCP setup

[README](../README.md) · [Database configuration](reference.md#database-and-environment)

The stdio MCP server can be launched through SSH. Configure your MCP client to start an SSH process whose input and output remain connected to the remote Node process.

## Prepare the host

Use a compatible Node.js runtime and install this repository's dependencies on the target host. The native `better-sqlite3` module must match the host's operating system, architecture, and Node version.

Build the MCP entry point:

```bash
pnpm build:mcp
```

The output is `dist/mcp-server.mjs`. The build leaves `better-sqlite3` external, so that module must remain available on the host.

Create the database directory before starting. Use an absolute `CHRONICLE_DB_PATH` in the remote process environment. The storage code reads that name; `DB_PATH` has no effect.

## Launch over SSH

Adapt the host and paths to your installation:

```bash
ssh user@host env CHRONICLE_DB_PATH=/absolute/path/data/chronicle.db node /absolute/path/dist/mcp-server.mjs
```

Use this command and its arguments in your MCP client's configuration. It runs a stdio process, not a public HTTP endpoint.

Keep stdout available for MCP messages. Chronicle sends startup diagnostics to stderr. A startup message does not verify a working client connection: check that the client can list tools and perform an intended read.

The local browser proxy does not invoke SSH; it spawns a local Node process. Remote MCP use does not configure browser access.

This guide describes the entry point and environment variables in the code. No remote host or client configuration was changed or verified during this documentation update.

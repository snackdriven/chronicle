# Chronicle HTTP interfaces

[README](../README.md) · [Setup checklist](reference.md#browser-wiring)

## Browser MCP proxy

`pnpm dev:backend` starts [server/index.js](../server/index.js) on port 3002. It exposes:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/mcp/chronicle` | Call an allowlisted MCP tool |
| GET | `/api/mcp/chronicle/tools` | List the proxy's tool names and categories |

The POST body has a `tool` name and an optional `arguments` object. Successful responses contain `success`, `data`, and `meta`. Errors use an HTTP error status and an `error` field.

The proxy spawns an MCP process for each call. Its server path and database path are workspace-specific. Follow the [browser wiring checklist](reference.md#browser-wiring) before testing requests.

## Separate REST server

[src/http-server.ts](../src/http-server.ts) is a separate Express entry point. The package has no `dev:http` script. To launch this source directly, use:

```bash
pnpm exec tsx src/http-server.ts
```

Set `CHRONICLE_DB_PATH` and create its parent directory before starting. This server reads `MEMORY_HTTP_PORT`, defaulting to 3002.

It defines `GET /health` and mounts the [API router](../src/api/routes.ts) at `/api`. That router provides timeline, entity, memory, and insight route groups, plus category and statistics routes. Consult the route modules for exact paths and request fields.

Do not run this server and the default browser proxy on the same port. The browser hooks currently call the MCP proxy route, not these REST routes.

The REST server's origin allowlist does not include the browser frontend's port 5183. Review that configuration before attempting a browser connection. These launch and integration paths have not been runtime-verified in this documentation change.

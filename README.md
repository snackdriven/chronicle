# Chronicle

I'd like the next conversation to begin somewhere after “let me explain the whole thing again.”

Chronicle keeps dated events and persistent notes in SQLite, with MCP tools for looking them up. The timeline holds what happened; the key-value store holds the context I keep needing to repeat.

There's a React browser interface too. Its workspace wiring needs attention before it can be treated as a standalone app.

## Start with MCP

Use Node.js 22 and pnpm. In Bash, run from the repository root:

```bash
pnpm install
mkdir -p data
CHRONICLE_DB_PATH="$PWD/data/chronicle.db" pnpm mcp
```

This starts the stdio MCP server. Your MCP client communicates through its input and output streams.

Keep `CHRONICLE_DB_PATH` explicit when using a compiled build. These startup commands do not load `.env` automatically. See [setup details](docs/reference.md#database-and-environment) for native dependencies and configuration.

## Open the notebook

Before running the browser app, follow the [wiring checklist](docs/reference.md#browser-wiring).

The frontend currently calls port 3001; the bundled backend listens on 3002. The backend also expects an MCP build and database outside this checkout.

After aligning those settings:

```bash
pnpm dev
```

The browser interface uses **http://localhost:5183**. End-to-end browser data access remains unverified.

## Check changes

```bash
pnpm type-check
pnpm build
pnpm test --run
```

[Commands and architecture](docs/reference.md) · [HTTP interfaces](docs/HTTP_API_README.md) · [Remote MCP setup](docs/REMOTE-DEPLOY.md)

## License

MIT

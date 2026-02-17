# Chronicle

Timeline memory system with MCP integration. Store events from JIRA, Spotify, Google Calendar, and anything else — then query them directly from Claude mid-conversation.

Two data stores: a timeline for temporal events (timestamped, typed, with metadata) and a key-value store for persistent context. Both accessible through a React UI and a REST API that connects to the MCP server.

## Stack

React 19, TypeScript, Vite, Tailwind CSS, TanStack Table, Express, SQLite

## Quick start

```bash
pnpm install
pnpm dev
```

Frontend on `http://localhost:5183`, backend on `http://localhost:3002`.

Copy `.env.example` to `.env` and fill in credentials before running scripts.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Frontend + backend |
| `pnpm dev:frontend` | Vite only |
| `pnpm dev:backend` | Express only |
| `pnpm build` | Production build → `dist/` |
| `pnpm type-check` | TypeScript check without build |
| `pnpm setup:google` | OAuth setup for Google Calendar import |
| `pnpm prepare:calendar` | Fetch and cache calendar events |

## Architecture

```
React frontend (5183)
       ↓
Express backend (3002) — proxy layer
       ↓
MCP server
       ↓
SQLite
```

The backend is a thin proxy between the React app and the MCP server. It doesn't do much on its own — the MCP server handles actual storage.

## API

**Timeline events**
```
GET    /api/timeline
GET    /api/timeline/:id
POST   /api/timeline
PUT    /api/timeline/:id
DELETE /api/timeline/:id
```

**KV memory**
```
GET    /api/memory
GET    /api/memory/:key
POST   /api/memory
PUT    /api/memory/:key
DELETE /api/memory/:key
```

See `HTTP_API_README.md` for request/response shapes.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+N` | New timeline event |
| `Ctrl+R` | New KV memory |
| `Ctrl+F` | Focus search |
| `Ctrl+T` | Switch tabs |
| `Esc` | Close modal |

## Data import

Scripts in `scripts/` handle bulk imports from Google Calendar, Spotify, and JIRA. They cache fetched data locally before writing to the database so you can inspect it first. See `docs/import-guides/` for per-source setup.

Credentials go in `.env` — see `.env.example`. Token files and cache files are gitignored.

## Project structure

```
src/
├── components/memory/    # Table, forms, modals
├── pages/                # MemoryManagerPage (main view)
├── hooks/                # useMemoryData, useMemoryMutations, useKeyboardShortcuts
├── api/                  # Fetch wrappers for timeline and KV endpoints
├── types/                # TypeScript types
└── lib/                  # Shared utilities
server/
└── index.js              # Express proxy
scripts/                  # Import scripts (Google Calendar, Spotify, JIRA)
docs/                     # Import guides and phase notes
```

## Known limitations

- No offline support — requires backend connection
- KV values must be JSON-serializable
- Timeline optimized for up to ~100K records; larger sets should use pagination
- Google Calendar import pulls primary calendar only

## Troubleshooting

**Port in use**
```bash
lsof -i :5183
kill -9 <PID>
```

**Deps not found**
```bash
pnpm install
# or from monorepo root: pnpm install
```

**Backend connection errors** — check that the backend is running (`pnpm dev:backend`) and that `MEMORY_SERVER_ENDPOINT` is set correctly in `.env`.

## License

MIT

# Chronicle

Claude has no memory between conversations. Chronicle gives it one — a local database of events, calendar data, and persistent notes that it can query directly via MCP. Built because re-explaining the same context every session stopped being something I was willing to do.

Two stores: a timeline for typed, timestamped events and a KV store for the stuff you'd otherwise be pasting into every session by hand. Both have a React UI and REST API.

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

The backend is a proxy, nothing more. Forwards requests, gets out of the way.

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

See `docs/HTTP_API_README.md` for request/response shapes.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+N` | New timeline event |
| `Ctrl+R` | New KV memory |
| `Ctrl+F` | Focus search |
| `Ctrl+T` | Switch tabs |
| `Esc` | Close modal |

## Data import

Bulk import scripts for Google Calendar and JIRA live in `scripts/`. They pull everything locally first so you can look before anything hits the database. Per-source setup in `docs/import-guides/`.

Credentials go in `.env` (see `.env.example`). Token and cache files are gitignored.

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
scripts/                  # Import scripts (Google Calendar, JIRA)
docs/                     # HTTP API reference, deployment guide
```

## Known limitations

- Needs a running backend (no offline mode)
- KV values have to be JSON-serializable
- Timeline handles ~100K records fine; past that, lean on pagination
- Google Calendar import only touches the primary calendar

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

**Backend connection errors**: make sure the backend is running (`pnpm dev:backend`) and `MEMORY_SERVER_ENDPOINT` is set in `.env`.

## License

MIT

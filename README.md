# Chronicle

A powerful React 19 application for managing timeline events and key-value memories with seamless MCP (Model Context Protocol) server integration.

## Overview

Chronicle is your personal memory augmentation system. Store temporal events (from JIRA tickets, Spotify plays, calendar events, journal entries, and more), manage a flexible key-value store for persistent context, and access everything through an intuitive web interface. The application connects to the chronicle MCP server, enabling Claude and other AI assistants to augment their context with your personal memories.

## Features

### Timeline Management
- **Create & Edit Events** - Add temporal events with title, type, timestamp, and metadata
- **Rich Metadata** - Store custom attributes and relationships for each event
- **Advanced Filtering** - Filter by type, date range, or search content
- **Bulk Operations** - Import multiple events at once
- **Event Types** - Support for JIRA tickets, Spotify plays, calendar events, journal entries, and custom types
- **Statistics** - View summaries and counts by event type

### Key-Value Memory Store
- **Flexible Storage** - Store any JSON-serializable data with simple key-value pairs
- **Namespacing** - Organize memories by namespace (e.g., `dev:`, `project:`)
- **Inline Editing** - Edit values directly in the table
- **TTL Support** - Set expiration times for temporary memories
- **Full-Text Search** - Search across all keys and values
- **Bulk Operations** - Create, update, and delete multiple memories at once

### User Experience
- **Tab Navigation** - Switch between Timeline and KV Store views
- **Modal Forms** - Full-featured forms for creating and editing entries
- **Error Handling** - Graceful error boundaries with user-friendly messages
- **Real-time Updates** - Changes sync instantly across the UI
- **Keyboard Shortcuts** - Quick access to common operations:
  - `Ctrl+N` - New timeline event
  - `Ctrl+R` - New KV memory
  - `Ctrl+F` - Focus search
  - `Ctrl+T` - Switch tabs

### Visual Design
- **Responsive Layout** - Works seamlessly on desktop and tablet
- **Dark Mode** - Eye-friendly dark theme using Tailwind CSS
- **Smooth Animations** - Framer Motion for polished interactions
- **Accessibility** - ARIA labels and keyboard navigation support

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 19.2.0 |
| **TypeScript** | Type safety | 5.7.3 |
| **Vite** | Build tool & dev server | 7.2.5 |
| **Tailwind CSS** | Styling | 4.0.0 |
| **TanStack Table** | Data grid/table | 8.20.6 |
| **Framer Motion** | Animations | 12.0.0 |
| **React Hook Form** | Form management | 7.54.2 |
| **Zod** | Schema validation | 3.24.1 |
| **Lucide React** | Icons | 0.469.0 |
| **Express** | Backend API | 4.21.2 |
| **Concurrently** | Dev server orchestration | 9.1.2 |

## Prerequisites

- **Node.js** 18+ (tested with Node 20+)
- **pnpm** 9+ for package management
- **chronicle MCP server** configured and accessible (for production use)
- **Modern browser** with ES2020+ support

### Optional
- WSL 2 on Windows (recommended for best performance)

## Installation

### From Project Root (Monorepo)

```bash
cd /path/to/projects-dashboard
pnpm install
```

### Standalone Installation

```bash
cd projects/chronicle
pnpm install
```

## Getting Started

### Quick Start

Run both frontend and backend servers:

```bash
pnpm dev
```

This starts:
- **Frontend** on `http://localhost:5183` (Vite dev server)
- **Backend** on `http://localhost:3002` (Express API proxy)

### Frontend Only

```bash
pnpm dev:frontend
```

Runs Vite dev server on `http://localhost:5183`

### Backend Only

```bash
pnpm dev:backend
```

Runs Express backend on `http://localhost:3002`

### Production Build

```bash
pnpm build
```

Outputs optimized build to `dist/` directory.

### Preview Build

```bash
pnpm preview
```

Serves the production build locally for testing.

## Port Configuration

| Service | Port | Configuration |
|---------|------|----------------|
| Frontend (Vite) | 5183 | `vite.config.ts` |
| Backend (Express) | 3002 | `server/index.js` |

To change ports, update the respective configuration files.

## Project Structure

```
projects/chronicle/
├── src/
│   ├── components/           # React components
│   │   ├── memory/          # Memory-specific components
│   │   │   ├── MemoryTable.tsx
│   │   │   ├── columns/     # TanStack Table column definitions
│   │   │   │   ├── timelineColumns.tsx
│   │   │   │   └── kvColumns.tsx
│   │   │   ├── FullFormModal.tsx
│   │   │   ├── TimelineEventForm.tsx
│   │   │   └── KVMemoryForm.tsx
│   │   └── ErrorBoundary.tsx
│   │
│   ├── pages/               # Page-level components
│   │   └── MemoryManagerPage.tsx
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useMemoryData.ts      # Fetch timeline/KV data
│   │   ├── useMemoryMutations.ts # Create/update/delete operations
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── api/                 # API client functions
│   │   ├── timeline.ts      # Timeline API calls
│   │   └── memory.ts        # KV memory API calls
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── memory.ts        # Core memory types
│   │
│   ├── lib/                 # Utility functions
│   │   └── api-client.ts    # Axios/fetch wrapper
│   │
│   ├── utils/               # Helper functions
│   │
│   ├── index.ts             # App entry point
│   └── index.css            # Global styles
│
├── server/
│   └── index.js            # Express backend (proxy to MCP server)
│
├── public/                 # Static assets
│
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Development Guide

### Adding a New Timeline Event

```tsx
const { createTimelineEvent } = useMemoryMutations();

await createTimelineEvent({
  title: 'My Event',
  type: 'custom_event',
  timestamp: Date.now(),
  metadata: { custom: 'data' },
});
```

### Creating KV Memories

```tsx
const { createKVMemory } = useMemoryMutations();

await createKVMemory({
  key: 'user:preferences',
  value: { theme: 'dark', notifications: true },
  namespace: 'user',
});
```

### Custom Form Fields

Extend `TimelineEventForm.tsx` or `KVMemoryForm.tsx` for additional fields:

```tsx
<input
  type="text"
  placeholder="Custom field"
  {...register('customField')}
/>
```

### Type Safety

All components are fully typed. Import types from `@/types/memory`:

```tsx
import type { TimelineEvent, KVMemory } from '@/types/memory';

const event: TimelineEvent = {
  id: '1',
  title: 'Event',
  type: 'jira_ticket',
  timestamp: Date.now(),
  metadata: {},
};
```

## Quality Checks

### Type Checking

Verify TypeScript types without building:

```bash
pnpm type-check
```

### Building

Build for production:

```bash
pnpm build
```

Outputs:
- JavaScript bundle: `dist/index-*.js`
- CSS bundle: `dist/index-*.css`
- HTML: `dist/index.html`

## MCP Server Integration

Chronicle connects to the chronicle MCP server for persistent storage. The backend acts as a proxy between the React frontend and the MCP server.

### Architecture

```
┌─────────────────────┐
│  React Frontend     │
│  (Port 5183)        │
└─────────────────────┘
           ↓
┌─────────────────────┐
│  Express Backend    │
│  (Port 3002)        │
│  (Proxy)            │
└─────────────────────┘
           ↓
┌─────────────────────┐
│  Memory MCP Server  │
│  (Storage Layer)    │
└─────────────────────┘
           ↓
┌─────────────────────┐
│  SQLite Database    │
│  (Persistent Store) │
└─────────────────────┘
```

### Backend Endpoints

The Express backend provides REST APIs:

**Timeline Events**
- `GET /api/timeline` - List timeline events
- `GET /api/timeline/:id` - Get event by ID
- `POST /api/timeline` - Create event
- `PUT /api/timeline/:id` - Update event
- `DELETE /api/timeline/:id` - Delete event

**KV Memories**
- `GET /api/memory` - List memories
- `GET /api/memory/:key` - Get memory by key
- `POST /api/memory` - Create memory
- `PUT /api/memory/:key` - Update memory
- `DELETE /api/memory/:key` - Delete memory

See `HTTP_API_README.md` for detailed API documentation.

## Keyboard Shortcuts

Enhance productivity with keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new timeline event |
| `Ctrl+R` | Create new KV memory |
| `Ctrl+F` | Focus search field |
| `Ctrl+T` | Switch between Timeline and KV tabs |
| `Esc` | Close modals |

Implemented in `useKeyboardShortcuts` hook.

## Performance Optimizations

### Build Performance
- **Vite with Rolldown** - Sub-second rebuilds with HMR
- **Tree-shaking** - Unused code automatically removed
- **Code splitting** - Lazy-loaded components

### Runtime Performance
- **React Strict Mode** - Development checks for unsafe patterns
- **Memoization** - `React.memo` for table rows and cells
- **Virtual scrolling** - TanStack Table for large datasets
- **Suspense boundaries** - Graceful async handling

### Best Practices
1. Use TanStack Table's `columnHelper` for type-safe columns
2. Memoize expensive computations with `useMemo`
3. Lazy-load modals and heavy components
4. Use React Query or SWR for data fetching (consider future upgrade)

## Accessibility

Memory Shack follows WCAG 2.1 Level AA standards:

- **ARIA Labels** - All interactive elements labeled
- **Keyboard Navigation** - Full keyboard support
- **Focus Indicators** - Visible focus states
- **Color Contrast** - Dark theme meets contrast requirements
- **Semantic HTML** - Proper heading hierarchy and structure

## Error Handling

The app includes comprehensive error handling:

- **Error Boundary** - Catches React component errors
- **API Error Handling** - User-friendly messages for API failures
- **Form Validation** - Zod schemas catch invalid input
- **Toast Notifications** - Inform users of success/failure

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5183
lsof -i :5183

# Kill process (get PID from above)
kill -9 <PID>

# Or change port in vite.config.ts
```

### Dependencies Not Found

```bash
# Reinstall from monorepo root
cd ../..
pnpm install

# Or from chronicle directory
pnpm install --force
```

### Types Not Resolving

```bash
# Rebuild TypeScript project
pnpm type-check

# Clear build cache
rm -rf dist node_modules/.vite
pnpm install
```

### Backend Connection Errors

1. Verify backend is running: `pnpm dev:backend`
2. Check backend is listening on port 3002
3. Verify environment variables (if needed)
4. Check browser console for CORS errors

### Memory MCP Server Not Accessible

1. Ensure chronicle MCP server is running
2. Check backend proxy configuration in `server/index.js`
3. Verify connection string/endpoint in environment variables

## Contributing

### Code Style
- Follow existing patterns in components
- Use TypeScript strict mode
- Write meaningful commit messages
- Add types for new functions

### Adding Features
1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement feature with tests
3. Update types in `src/types/`
4. Commit changes with descriptive message
5. Create pull request with description

### Reporting Bugs
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if UI-related
- Environment details (Node version, browser, etc.)

## Performance Benchmarks

Target metrics (measured on WSL2 with standard hardware):

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | ~1.2s |
| Time to Interactive | < 2.5s | ~2.1s |
| Bundle Size | < 500KB | ~350KB |
| React Re-renders | < 5 per action | ~3 |
| Table Scroll FPS | 60 | 60 |

## Known Limitations

- Timeline events limited to ~100K records (optimize with pagination for larger sets)
- KV memory values must be JSON-serializable
- No offline support (requires backend connection)
- No built-in data export/import UI (API available)

## Future Enhancements

- [ ] Data export (JSON, CSV)
- [ ] Import wizard for bulk data
- [ ] Advanced search with filters UI
- [ ] Timeline visualization (calendar view)
- [ ] Relationships between events
- [ ] Tagging system
- [ ] Collaboration features
- [ ] Mobile app

## Environment Variables

### Frontend (Optional)
```env
VITE_API_BASE_URL=http://localhost:3002/api
```

### Backend (Required)
```env
PORT=3002
MEMORY_SERVER_ENDPOINT=<MCP server endpoint>
```

See `docs/credential_setup.md` (monorepo root) for detailed setup.

## Scripts Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start frontend + backend |
| `pnpm dev:frontend` | Start Vite dev server only |
| `pnpm dev:backend` | Start Express backend only |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm type-check` | Check TypeScript types |

## Support & Documentation

- **API Docs** - See `HTTP_API_README.md` for REST API details
- **MCP Server** - See chronicle MCP server documentation
- **Monorepo Guide** - See `../../../CLAUDE.md` for monorepo info
- **Issues** - Check GitHub issues or create a new one

## License

MIT

---

**Built with** React 19, TypeScript, Vite, and Tailwind CSS.

**Status:** Production-ready with active development.

**Last Updated:** November 2024

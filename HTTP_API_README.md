# Chronicle HTTP API

RESTful HTTP API for Chronicle - your personal memory augmentation system.

## Quick Start

```bash
# Start the HTTP server
pnpm dev:http

# Server runs on http://localhost:3002
# Health check: http://localhost:3002/health
# API root: http://localhost:3002/api
```

## Architecture

The HTTP API provides REST access to the same SQLite database used by the MCP server:

```
┌─────────────────────┐
│  MCP Server         │───┐
│  (Claude Desktop)   │   │
└─────────────────────┘   │
                          ├──> SQLite (WAL mode)
┌─────────────────────┐   │    Concurrent access
│  HTTP API Server    │───┘
│  (React frontends)  │
└─────────────────────┘
```

Both servers can run simultaneously thanks to SQLite's WAL (Write-Ahead Logging) mode.

## Endpoints

### Memory (Key-Value Store)
- `POST /api/memory` - Store memory
- `GET /api/memory/:key` - Retrieve memory
- `DELETE /api/memory/:key` - Delete memory
- `GET /api/memory/list` - List memories (with filters)
- `GET /api/memory/search` - Search memories by content
- `GET /api/memory/stats` - Get memory statistics
- `POST /api/memory/bulk` - Bulk store memories
- `DELETE /api/memory/bulk` - Bulk delete by pattern
- `PUT /api/memory/:key/ttl` - Update TTL

### Timeline (Temporal Events)
- `POST /api/timeline` - Create timeline event
- `GET /api/timeline/:date` - Get events for date (YYYY-MM-DD)
- `GET /api/timeline/:date/summary` - Get daily stats
- `GET /api/timeline/range` - Get events across date range
- `GET /api/timeline/:date/:event_id/full` - Get event with full details
- `POST /api/timeline/:event_id/expand` - Store full details for event
- `PUT /api/timeline/:event_id` - Update event
- `DELETE /api/timeline/:event_id` - Delete event

### Entities (People, Projects, Artists)
- `POST /api/entities/:type` - Create entity
- `GET /api/entities/:type` - List entities by type
- `GET /api/entities/:type/:name` - Get specific entity
- `PUT /api/entities/:type/:name` - Update entity
- `DELETE /api/entities/:type/:name` - Delete entity
- `GET /api/entities/:type/:name/timeline` - Get entity's timeline
- `GET /api/entities/:type/:name/versions` - Get entity history
- `GET /api/entities/:type/:name/relations` - Get entity relations
- `POST /api/entities/relations` - Create relation between entities
- `GET /api/entities/search` - Search entities
- `GET /api/entities/stats` - Get entity statistics

## Response Format

All endpoints return JSON in this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Error Codes

- `VALIDATION_ERROR` (400) - Invalid input data
- `NOT_FOUND` (404) - Resource not found
- `CORS_ERROR` (403) - Origin not allowed
- `INTERNAL_ERROR` (500) - Server error

## CORS Configuration

Allowed origins (configured in `src/http-server.ts`):
- `http://localhost:5180` - Dashboard
- `http://localhost:5179` - Quantified Life
- `http://localhost:5173-5178` - Other projects

To add more origins, edit the `ALLOWED_ORIGINS` array in `src/http-server.ts`.

## Examples

### Store and Retrieve Memory

```bash
# Store
curl -X POST http://localhost:3002/api/memory \
  -H "Content-Type: application/json" \
  -d '{"key": "user:preferences", "value": {"theme": "dark", "lang": "en"}}'

# Retrieve
curl http://localhost:3002/api/memory/user:preferences
```

### Create Timeline Event

```bash
curl -X POST http://localhost:3002/api/timeline \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-22T10:00:00Z",
    "type": "jira_ticket",
    "title": "Implemented HTTP API",
    "metadata": {"ticket_id": "MS-123", "status": "done"}
  }'
```

### Create Entity and Relation

```bash
# Create person
curl -X POST http://localhost:3002/api/entities/person \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kayla Gilbert",
    "properties": {"role": "developer", "team": "engineering"}
  }'

# Create project
curl -X POST http://localhost:3002/api/entities/project \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chronicle",
    "properties": {"status": "active"}
  }'

# Create relation
curl -X POST http://localhost:3002/api/entities/relations \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Kayla Gilbert",
    "relation": "assigned_to",
    "to": "Chronicle"
  }'
```

## Testing

Run the comprehensive test suite:

```bash
./test-api.sh
```

Or see individual test examples in `TEST_API.md`.

## Implementation Details

### Technology Stack
- **Express** - HTTP framework
- **Zod** - Input validation
- **better-sqlite3** - Database driver
- **CORS** - Cross-origin security

### File Structure
```
src/
├── http-server.ts       # Main HTTP server
├── api/
│   ├── routes.ts        # Main router
│   ├── timeline.ts      # Timeline endpoints
│   ├── entity.ts        # Entity endpoints
│   └── memory.ts        # Memory endpoints
└── storage/
    ├── db.ts            # Database layer (shared)
    ├── timeline.ts      # Timeline storage
    ├── entity.ts        # Entity storage
    └── memory.ts        # Memory storage
```

### Shared Storage Layer

The HTTP API reuses the same storage layer as the MCP server:
- No code duplication
- Consistent data access patterns
- Same validation rules
- SQLite WAL mode enables concurrent access

### Validation

All inputs are validated using Zod schemas before hitting the storage layer:
- Type checking
- Required fields
- Format validation (dates, UUIDs)
- Custom validation rules

### Error Handling

Global error handler catches and formats all errors:
- Custom error types (ValidationError, NotFoundError)
- Proper HTTP status codes
- Consistent error response format

## Development

### Running the Server

```bash
# Development mode (hot reload)
pnpm dev:http

# Production mode
pnpm build
node dist/http-server.js
```

### Environment Variables

- `CHRONICLE_HTTP_PORT` - HTTP server port (default: 3002)
- `CHRONICLE_DB_PATH` - Database file path (default: data/chronicle.db)

### Adding New Endpoints

1. Add route handler in `src/api/[module].ts`
2. Add Zod validation schema
3. Call storage layer function
4. Return consistent response format
5. Add to test script
6. Document in TEST_API.md

## Production Deployment

### Considerations

1. **Security**
   - Add authentication middleware
   - Implement rate limiting
   - Use HTTPS (reverse proxy)
   - Validate CORS origins strictly

2. **Performance**
   - Enable response compression
   - Add caching headers
   - Monitor database size
   - Regular VACUUM operations

3. **Reliability**
   - Add request logging
   - Implement health checks
   - Monitor error rates
   - Set up alerting

4. **Scaling**
   - SQLite is single-server only
   - Consider read replicas for scale
   - Use connection pooling
   - Implement request queuing

## License

MIT

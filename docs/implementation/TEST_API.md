# Memory Shack HTTP API - Test Guide

## Server Status

Health Check:
```bash
curl http://localhost:3002/health
```

API Info:
```bash
curl http://localhost:3002/api
```

## Memory Endpoints

### Store Memory
```bash
curl -X POST http://localhost:3002/api/memory \
  -H "Content-Type: application/json" \
  -d '{"key": "dev:context", "value": {"project": "memory-shack", "phase": "2"}, "namespace": "dev"}'
```

### Retrieve Memory
```bash
curl http://localhost:3002/api/memory/dev:context
```

### Check Memory Exists
```bash
curl http://localhost:3002/api/memory/dev:context/exists
```

### Delete Memory
```bash
curl -X DELETE http://localhost:3002/api/memory/dev:context
```

### List Memories
```bash
curl "http://localhost:3002/api/memory/list?namespace=dev"
curl "http://localhost:3002/api/memory/list?pattern=dev:*"
```

### Search Memories
```bash
curl "http://localhost:3002/api/memory/search?q=memory-shack"
```

### Memory Stats
```bash
curl http://localhost:3002/api/memory/stats
```

### Bulk Store Memories
```bash
curl -X POST http://localhost:3002/api/memory/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "memories": [
      {"key": "config:theme", "value": "dark"},
      {"key": "config:lang", "value": "en"},
      {"key": "temp:session", "value": "abc123", "ttl": 3600}
    ]
  }'
```

### Bulk Delete Memories
```bash
curl -X DELETE http://localhost:3002/api/memory/bulk \
  -H "Content-Type: application/json" \
  -d '{"pattern": "temp:*"}'
```

### Clean Expired Memories
```bash
curl -X POST http://localhost:3002/api/memory/cleanup
```

### Update Memory TTL
```bash
curl -X PUT http://localhost:3002/api/memory/config:theme/ttl \
  -H "Content-Type: application/json" \
  -d '{"ttl": 86400}'
```

## Timeline Endpoints

### Create Timeline Event
```bash
curl -X POST http://localhost:3002/api/timeline \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-22T10:00:00Z",
    "type": "jira_ticket",
    "title": "Fixed bug in API",
    "metadata": {"ticket_id": "MS-123", "status": "done"},
    "namespace": "dev:work"
  }'
```

### Get Timeline for Date
```bash
curl "http://localhost:3002/api/timeline/2025-11-22"
curl "http://localhost:3002/api/timeline/2025-11-22?type=jira_ticket"
curl "http://localhost:3002/api/timeline/2025-11-22?limit=10"
```

### Get Timeline Summary (stats only)
```bash
curl "http://localhost:3002/api/timeline/2025-11-22/summary"
```

### Get Timeline Range
```bash
curl "http://localhost:3002/api/timeline/range?start=2025-11-01&end=2025-11-30"
curl "http://localhost:3002/api/timeline/range?start=2025-11-01&end=2025-11-30&type=jira_ticket"
```

### Get Event with Full Details
```bash
# First, get event ID from timeline query, then:
curl "http://localhost:3002/api/timeline/2025-11-22/EVENT_ID/full"
```

### Expand Event (store full details)
```bash
curl -X POST "http://localhost:3002/api/timeline/EVENT_ID/expand" \
  -H "Content-Type: application/json" \
  -d '{
    "full_data": {
      "description": "Full ticket description...",
      "comments": ["comment1", "comment2"],
      "attachments": ["file1.pdf"]
    }
  }'
```

### Update Timeline Event
```bash
curl -X PUT "http://localhost:3002/api/timeline/EVENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "metadata": {"status": "closed"}}'
```

### Delete Timeline Event
```bash
curl -X DELETE "http://localhost:3002/api/timeline/EVENT_ID"
```

## Entity Endpoints

### Create Entity
```bash
curl -X POST http://localhost:3002/api/entities/person \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kayla Gilbert",
    "properties": {
      "email": "kayla@example.com",
      "role": "developer",
      "team": "engineering"
    }
  }'
```

Other entity types:
```bash
# Project
curl -X POST http://localhost:3002/api/entities/project \
  -H "Content-Type: application/json" \
  -d '{"name": "Memory Shack", "properties": {"status": "active", "tech": ["Node.js", "SQLite"]}}'

# Artist
curl -X POST http://localhost:3002/api/entities/artist \
  -H "Content-Type: application/json" \
  -d '{"name": "The Beatles", "properties": {"genre": "rock", "country": "UK"}}'
```

### Get Entity
```bash
curl "http://localhost:3002/api/entities/person/Kayla%20Gilbert"
curl "http://localhost:3002/api/entities/all/Memory%20Shack"
```

### List Entities by Type
```bash
curl "http://localhost:3002/api/entities/person"
curl "http://localhost:3002/api/entities/project"
curl "http://localhost:3002/api/entities/all"  # All types
```

### Search Entities
```bash
curl "http://localhost:3002/api/entities/search?q=Kayla"
curl "http://localhost:3002/api/entities/search?q=developer&type=person"
```

### Update Entity
```bash
curl -X PUT "http://localhost:3002/api/entities/person/Kayla%20Gilbert" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin" \
  -d '{
    "properties": {
      "email": "kayla.new@example.com",
      "role": "senior developer",
      "team": "engineering"
    },
    "change_reason": "Promotion"
  }'
```

### Delete Entity
```bash
curl -X DELETE "http://localhost:3002/api/entities/person/Kayla%20Gilbert"
```

### Get Entity Timeline
```bash
curl "http://localhost:3002/api/entities/person/Kayla%20Gilbert/timeline"
```

### Get Entity Versions (history)
```bash
curl "http://localhost:3002/api/entities/person/Kayla%20Gilbert/versions"
```

### Get Entity Relations
```bash
curl "http://localhost:3002/api/entities/person/Kayla%20Gilbert/relations"
curl "http://localhost:3002/api/entities/person/Kayla%20Gilbert/relations?direction=from"
curl "http://localhost:3002/api/entities/person/Kayla%20Gilbert/relations?relation_type=assigned_to"
```

### Create Relation
```bash
curl -X POST http://localhost:3002/api/entities/relations \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Kayla Gilbert",
    "relation": "assigned_to",
    "to": "Memory Shack",
    "properties": {"role": "lead developer", "since": "2025-01-01"}
  }'
```

### Entity Stats
```bash
curl http://localhost:3002/api/entities/stats
```

## Response Format

All responses follow this format:

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error description"
  }
}
```

Error codes:
- `VALIDATION_ERROR` (400) - Invalid input
- `NOT_FOUND` (404) - Resource not found
- `CORS_ERROR` (403) - Origin not allowed
- `INTERNAL_ERROR` (500) - Server error

## CORS Configuration

Allowed origins:
- http://localhost:5180 (Dashboard)
- http://localhost:5179 (Quantified Life)
- http://localhost:5173-5178 (Other projects)

## Notes

- All timestamps are Unix milliseconds
- Dates are in YYYY-MM-DD format
- The database uses WAL mode for concurrent access (MCP + HTTP)
- Memory TTL is in seconds
- Entity names must be unique across all types
- Relations are directional (from -> to)

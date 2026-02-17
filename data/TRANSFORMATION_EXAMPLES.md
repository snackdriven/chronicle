# JIRA Data Transformation Examples

This document shows how raw JIRA tickets will be transformed into Memory Shack entities, timeline events, and relations.

## Example Ticket (Raw Data)

```json
{
  "key": "WRKA-3808",
  "project": "WRKA",
  "summary": "QA | O&E UAF - Shelter / Treatment Tab Updates",
  "status": "Backlog",
  "type": "Sub-task",
  "priority": "Medium",
  "component": "OC O&E Mobile",
  "labels": [],
  "created": "2025-11-20",
  "sourceFile": "kayla-tickets-wrka.md"
}
```

## Transformation Output

### 1. Timeline Event

Stored in `timeline_events` table:

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000", // UUID
  timestamp: 1732060800000, // Unix ms: 2025-11-20 00:00:00 UTC
  date: "2025-11-20", // YYYY-MM-DD for fast date queries
  type: "jira_ticket",
  namespace: "jira",
  title: "WRKA-3808: QA | O&E UAF - Shelter / Treatment Tab Updates",
  metadata: {
    key: "WRKA-3808",
    status: "Backlog",
    project: "WRKA",
    component: "OC O&E Mobile",
    priority: "Medium",
    type: "Sub-task",
    labels: []
  },
  full_data_key: "jira:WRKA-3808:full",
  created_at: 1700000000000,
  updated_at: 1700000000000
}
```

**Why this structure?**
- `timestamp` + `date`: Fast chronological queries
- `metadata`: Lightweight data always loaded with timeline
- `full_data_key`: Reference to full ticket details (lazy-loaded)
- `namespace: "jira"`: Group all JIRA events together

### 2. Full Details (Lazy-loaded)

Stored in `full_details` table:

```typescript
{
  key: "jira:WRKA-3808:full",
  data: {
    // Complete raw ticket
    key: "WRKA-3808",
    project: "WRKA",
    summary: "QA | O&E UAF - Shelter / Treatment Tab Updates",
    status: "Backlog",
    type: "Sub-task",
    priority: "Medium",
    component: "OC O&E Mobile",
    labels: [],
    created: "2025-11-20",
    sourceFile: "kayla-tickets-wrka.md",

    // Import metadata
    importedAt: 1700000000000,
    importBatch: 7,
    dataSource: "markdown_export"
  },
  created_at: 1700000000000,
  accessed_at: 1700000000000
}
```

**Why lazy-load?**
- Timeline queries don't need full ticket data
- Reduces memory footprint
- Only fetched when user expands ticket details

### 3. Entities Created

#### Person Entity

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440001",
  type: "person",
  name: "Kayla Gilbert",
  properties: {
    email: "kayla@joinchorus.com",
    alternateEmails: [
      "kayla.gilbert@chorus.com"
    ],
    role: "QA Engineer",
    company: "Chorus"
  },
  created_at: 1700000000000,
  updated_at: 1700000000000
}
```

#### Project Entity

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440002",
  type: "project",
  name: "WRKA",
  properties: {
    key: "WRKA",
    fullName: "Workforce Management - Core",
    ticketCount: 400,
    components: [
      "OC O&E Mobile",
      "OC TAR",
      "Universal Referral Portal (URP)",
      "OC CareCourt"
    ],
    dateRange: {
      earliest: "2025-02-21",
      latest: "2025-11-20"
    }
  },
  created_at: 1700000000000,
  updated_at: 1700000000000
}
```

### 4. Relations Created

#### Person worked_on Ticket

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440003",
  from_entity_id: "550e8400-e29b-41d4-a716-446655440001", // Kayla Gilbert
  relation_type: "worked_on",
  to_entity_id: "jira:WRKA-3808", // Ticket (using ticket key as entity ID)
  properties: {
    role: "assignee",
    status: "Backlog",
    created: "2025-11-20"
  },
  created_at: 1700000000000
}
```

#### Ticket belongs_to Project

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440004",
  from_entity_id: "jira:WRKA-3808", // Ticket
  relation_type: "belongs_to",
  to_entity_id: "550e8400-e29b-41d4-a716-446655440002", // WRKA project
  properties: {
    component: "OC O&E Mobile",
    priority: "Medium",
    type: "Sub-task"
  },
  created_at: 1700000000000
}
```

## Query Examples

### Get Timeline for a Date

**Query:**
```typescript
timeline_get({
  date: "2025-11-20",
  type: "jira_ticket"
})
```

**Response:**
```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": 1732060800000,
      "date": "2025-11-20",
      "type": "jira_ticket",
      "title": "WRKA-3808: QA | O&E UAF - Shelter / Treatment Tab Updates",
      "metadata": {
        "key": "WRKA-3808",
        "status": "Backlog",
        "project": "WRKA"
      }
    }
  ],
  "stats": {
    "total": 1,
    "by_type": {
      "jira_ticket": 1
    }
  }
}
```

### Get Entity Timeline

**Query:**
```typescript
entity_get_timeline({
  entity: "Kayla Gilbert",
  limit: 10
})
```

**Response:** All tickets worked on by Kayla, chronologically sorted.

### Search Timeline

**Query:**
```typescript
search_timeline({
  query: "O&E UAF",
  date_range: { start: "2025-11-01", end: "2025-11-30" }
})
```

**Response:** All tickets matching "O&E UAF" in title or metadata.

## Batch Processing Strategy

### Batch 1 (100 tickets, 2024-02-06 to 2024-03-20)

For each ticket:
1. Create timeline event
2. Store full details
3. Create person → ticket relation
4. Create ticket → project relation

**Operations per ticket:** 4 database inserts
**Total operations for batch:** 400 inserts
**Estimated time:** ~2 seconds

### Transaction Strategy

Wrap each batch in a transaction:

```typescript
db.transaction(() => {
  for (const ticket of batch) {
    // 1. Create timeline event
    const eventId = storeTimelineEvent({
      timestamp: ticket.created,
      type: 'jira_ticket',
      title: `${ticket.key}: ${ticket.summary}`,
      metadata: { /* ... */ }
    });

    // 2. Store full details
    expandEvent(eventId, ticket);

    // 3. Create relations
    createRelation({
      from: 'Kayla Gilbert',
      relation: 'worked_on',
      to: ticket.key
    });

    createRelation({
      from: ticket.key,
      relation: 'belongs_to',
      to: ticket.project
    });
  }
})();
```

**Benefits:**
- Atomic batch import (all or nothing)
- Fast (SQLite transactions are very fast)
- Rollback on error

## Data Integrity

### Deduplication

Before creating entities, check if they exist:

```typescript
// Check if person exists
try {
  const person = getEntity('Kayla Gilbert');
  // Person exists, use their ID
} catch (NotFoundError) {
  // Person doesn't exist, create them
  const person = createEntity({
    type: 'person',
    name: 'Kayla Gilbert',
    properties: { /* ... */ }
  });
}
```

### Idempotency

Tickets can be re-imported safely:

```typescript
// Check if ticket already imported
const existing = db.prepare(
  'SELECT id FROM timeline_events WHERE metadata LIKE ?'
).get(`%"key":"${ticket.key}"%`);

if (existing) {
  console.log(`Ticket ${ticket.key} already imported, skipping`);
  continue;
}
```

## Performance Optimization

### Index Strategy

Ensure these indexes exist:

```sql
-- Fast date queries
CREATE INDEX idx_timeline_date ON timeline_events(date);

-- Fast type queries
CREATE INDEX idx_timeline_type ON timeline_events(type);

-- Fast metadata searches (FTS)
CREATE VIRTUAL TABLE timeline_fts USING fts5(
  content='timeline_events',
  title,
  metadata
);
```

### Batch Size Optimization

- **100 tickets per batch** - Good balance
- Smaller batches: More overhead, slower
- Larger batches: Memory pressure, harder rollback

## Error Handling

### Validation Errors

```typescript
try {
  storeTimelineEvent(eventInput);
} catch (ValidationError e) {
  console.error(`Invalid ticket ${ticket.key}: ${e.message}`);
  // Log error, continue with next ticket
}
```

### Database Errors

```typescript
try {
  db.transaction(() => {
    // Import batch
  })();
} catch (DatabaseError e) {
  console.error(`Batch ${batchNumber} failed: ${e.message}`);
  // Rollback automatically, retry or skip batch
}
```

## Verification

After import, verify data:

```bash
# Check total events
sqlite3 data/memory.db "SELECT COUNT(*) FROM timeline_events WHERE type='jira_ticket'"
# Expected: 700

# Check date range
sqlite3 data/memory.db "SELECT MIN(date), MAX(date) FROM timeline_events WHERE type='jira_ticket'"
# Expected: 2024-02-06 | 2025-11-20

# Check entities
sqlite3 data/memory.db "SELECT type, COUNT(*) FROM entities GROUP BY type"
# Expected: person: 1, project: 4

# Check relations
sqlite3 data/memory.db "SELECT COUNT(*) FROM relations"
# Expected: 1400+ (2 per ticket)
```

## Next Steps

1. Run `pnpm import:jira` to execute the import
2. Verify data using SQL queries above
3. Test MCP server with imported data
4. Query timeline events via HTTP API or MCP tools

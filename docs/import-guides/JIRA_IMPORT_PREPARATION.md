# JIRA Import Preparation - Complete

**Phase:** 3-4 (Agent B)
**Date:** 2025-11-22
**Status:** READY FOR IMPORT

## Overview

Successfully parsed and prepared 700 JIRA tickets for import into Memory Shack. All data has been validated, entities extracted, and a batched import plan created.

## Data Sources

Parsed 4 markdown files containing JIRA ticket exports:

1. **kayla-tickets-wrka.md** - 400 tickets (WRKA project)
2. **kayla-tickets-wmb.md** - 100 tickets (WMB project)
3. **kayla-tickets-cp.md** - 100 tickets (CP project)
4. **kayla-tickets-historical.md** - 100 tickets (RNP project)

**Total Tickets:** 700
**Date Range:** 2024-02-06 to 2025-11-20
**Validation:** PASSED (0 errors, 0 warnings)

## Entities Extracted

### People (1 person)

| Name | Email | Variations |
|------|-------|------------|
| Kayla Gilbert | kayla@joinchorus.com | 3 email/name variations |

**Deduplication Map:**
- `kayla@joinchorus.com` → Kayla Gilbert
- `kayla.gilbert@chorus.com` → Kayla Gilbert
- `Kayla Gilbert` → Kayla Gilbert

### Projects (4 projects)

| Project Key | Project Name | Ticket Count | Percentage |
|-------------|--------------|--------------|------------|
| WRKA | Workforce Management - Core | 400 | 57.1% |
| WMB | Workforce Management - Business | 100 | 14.3% |
| CP | Chorus Platform | 100 | 14.3% |
| RNP | Historical Projects (RNP) | 100 | 14.3% |

### Components (8 components)

Components represent different modules/subsystems within projects:

| Component | Ticket Count |
|-----------|--------------|
| NHHA | 210 |
| OC TAR | 177 |
| OC Warmline | 100 |
| Universal Referral Portal (URP) | 73 |
| OC CareCourt | 23 |
| OC O&E Mobile | 15 |
| NHHA, Turning Point | 1 |
| Multi-component ticket | 1 |
| No Component | 100 |

## Data Quality Analysis

### Status Breakdown

| Status | Count | Percentage |
|--------|-------|------------|
| Done | 687 | 98.1% |
| Backlog | 9 | 1.3% |
| To Do | 3 | 0.4% |
| In Review | 1 | 0.1% |

**Insight:** 98% of tickets are completed, showing strong historical data for retrospective analysis.

### Type & Priority Distribution

- **Type:** Primarily Sub-tasks, Bugs, and Tasks
- **Priority:** Mostly Medium priority (standard for QA tickets)

### Labels

Tickets include labels for categorization:
- O&E (Outreach & Engagement)
- TAR (Treatment Authorization Request)
- URP (Universal Referral Portal)
- NHHA (New Hope Healthcare Access)
- CRP/CSU, Warmline, etc.

## Batch Import Plan

**Total Batches:** 7
**Batch Size:** 100 tickets per batch
**Ordering:** Chronological (oldest to newest by created date)

| Batch | Tickets | Date Range |
|-------|---------|------------|
| 1 | 100 | 2024-02-06 to 2024-03-20 |
| 2 | 100 | 2024-03-21 to 2025-01-08 |
| 3 | 100 | 2025-02-21 to 2025-04-07 |
| 4 | 100 | 2025-04-07 to 2025-06-26 |
| 5 | 100 | 2025-06-30 to 2025-08-21 |
| 6 | 100 | 2025-08-22 to 2025-10-15 |
| 7 | 100 | 2025-10-15 to 2025-11-20 |

## Transformation Strategy

Each JIRA ticket will be transformed into:

### 1. Timeline Event

```typescript
{
  timestamp: new Date(ticket.created).getTime(),
  type: 'jira_ticket',
  title: `${ticket.key}: ${ticket.summary}`,
  namespace: 'jira',
  metadata: {
    key: ticket.key,
    status: ticket.status,
    project: ticket.project,
    component: ticket.component,
    priority: ticket.priority,
    type: ticket.type,
    labels: ticket.labels
  },
  full_data_key: `jira:${ticket.key}:full`
}
```

### 2. Entity Relations

For each ticket, create relations:

**Ticket → Project:**
```typescript
{
  from: ticket.key,
  relation: 'belongs_to',
  to: ticket.project,
  properties: { component: ticket.component }
}
```

**Person → Ticket:**
```typescript
{
  from: 'Kayla Gilbert',
  relation: 'worked_on',
  to: ticket.key,
  properties: { role: 'QA Engineer' }
}
```

### 3. Full Details (Lazy-loaded)

Store complete ticket data in `full_details` table:

```typescript
{
  key: `jira:${ticket.key}:full`,
  data: {
    ...ticket, // All fields
    sourceFile: ticket.sourceFile,
    importedAt: Date.now()
  }
}
```

## Deduplication Strategy

### Entity Deduplication

1. **Projects:** Use project key (WRKA, WMB, CP, RNP) as unique identifier
2. **People:** Use canonical name "Kayla Gilbert" with email variations mapped
3. **Components:** Treat as string tags (no entity creation needed for MVP)

### Ticket Deduplication

- **Primary Key:** JIRA ticket key (e.g., WRKA-3808)
- **Uniqueness Check:** Before inserting, check if ticket key already exists
- **Update Strategy:** If exists, update metadata but preserve original timestamp

## Generated Files

### Import Plan
**Location:** `/packages/memory-shack/data/jira-import-plan.json`

Contains:
- `ready`: true (validation passed)
- `totalTickets`: 700
- `batches`: Array of 7 batches with ticket keys
- `entities`: People, projects, components
- `deduplicationMap`: Email/name variations
- `dateRange`, `statusBreakdown`, `componentBreakdown`

### Raw Tickets
**Location:** `/packages/memory-shack/data/jira-tickets-raw.json`

Contains:
- Array of 700 parsed ticket objects
- All extracted fields: key, summary, status, component, etc.
- Source file reference for traceability

## Data Quality Concerns

### No Issues Found

- **Validation:** All tickets passed validation
- **Required Fields:** All tickets have key, summary, and status
- **Date Format:** All dates in YYYY-MM-DD format
- **Key Format:** All keys match pattern `[A-Z]+-\d+`

### Minor Notes

1. **No Component:** 100 tickets (historical RNP project) have no component assigned
   - This is expected for older tickets
   - Component field will be stored as "No Component"

2. **Limited Person Data:** Only Kayla Gilbert extracted
   - Markdown format doesn't include assignee/reporter fields
   - Full JIRA API export would include more people

3. **Multi-component Tickets:** 1 ticket has comma-separated components
   - Will be stored as single component string
   - Future enhancement: split into multiple relations

## Next Steps

### Phase 4: Execute Import

Run the actual import script:

```bash
cd packages/memory-shack
pnpm import:jira
```

This will:
1. Create entity: Kayla Gilbert (person)
2. Create entities: 4 projects (WRKA, WMB, CP, RNP)
3. Import tickets in 7 batches (100 tickets each)
4. Create timeline events for each ticket
5. Create relations (person → ticket, ticket → project)
6. Store full details for lazy loading

### Verification Steps

After import:
1. Query timeline by date range: `2024-02-06` to `2025-11-20`
2. Check entity count: 5 entities (1 person + 4 projects)
3. Check relation count: 1400+ relations (2 per ticket minimum)
4. Verify timeline event count: 700 events

### MCP Server Integration

Once imported, data will be accessible via MCP tools:
- `timeline_get_range` - Query tickets by date range
- `entity_get` - Get project/person details
- `entity_get_timeline` - Get all tickets for a person/project
- `search_timeline` - Search tickets by keyword

## Execution Plan

### Batch Processing

Import in chronological order (oldest to newest):
- **Batch 1:** Feb-Mar 2024 (CP/RNP historical tickets)
- **Batch 2:** Mar 2024 - Jan 2025 (CP/RNP historical)
- **Batch 3:** Feb-Apr 2025 (WRKA tickets begin)
- **Batch 4:** Apr-Jun 2025 (WRKA continues)
- **Batch 5:** Jun-Aug 2025 (WRKA + WMB)
- **Batch 6:** Aug-Oct 2025 (WMB + WRKA)
- **Batch 7:** Oct-Nov 2025 (Recent WRKA + WMB)

### Performance Estimates

- **Tickets per batch:** 100
- **Estimated time per batch:** ~2 seconds
- **Total import time:** ~15 seconds
- **Database operations:** ~2800 inserts (700 events + 700 full_details + 1400 relations)

### Rollback Strategy

If import fails:
1. Delete all `jira_ticket` timeline events
2. Delete all `jira:*:full` full details
3. Delete all ticket-related relations
4. Preserve project/person entities for retry

## Summary

**Status:** READY FOR IMPORT

- Parsed: 700 tickets
- Validated: 0 errors, 0 warnings
- Batches: 7 batches of 100 tickets
- Entities: 1 person, 4 projects, 8 components
- Date Range: 2024-02-06 to 2025-11-20
- Import Plan: Generated and saved

The preparation phase is complete. All data is validated and ready for import into Memory Shack.

# Quick Start: JIRA Import

**Status:** READY TO IMPORT
**Location:** `packages/memory-shack/`

## TL;DR

```bash
cd packages/memory-shack

# Validate import plan (optional, already validated)
pnpm validate:jira

# Execute import
pnpm import:jira
```

## What Gets Imported

- **700 JIRA tickets** from 4 projects
- **Date range:** 2024-02-06 to 2025-11-20
- **Projects:** WRKA (400), WMB (100), CP (100), RNP (100)
- **Person:** Kayla Gilbert (QA Engineer)

## Import Plan Summary

```json
{
  "ready": true,
  "totalTickets": 700,
  "totalBatches": 7,
  "entityCounts": {
    "people": 1,
    "projects": 4,
    "components": 8
  },
  "dateRange": {
    "earliest": "2024-02-06",
    "latest": "2025-11-20"
  },
  "errors": 0,
  "warnings": 0
}
```

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm prepare:jira` | Parse markdown files and create import plan (DONE) |
| `pnpm validate:jira` | Validate import plan (PASSED) |
| `pnpm import:jira` | Execute import (NEXT STEP) |

## Files Generated

- `data/jira-import-plan.json` - Import plan with batches
- `data/jira-tickets-raw.json` - 700 parsed tickets
- `scripts/prepare-jira-import.ts` - Preparation script
- `scripts/validate-import-plan.ts` - Validation script

## What Happens During Import

1. **Create entities** (5 total)
   - 1 person: Kayla Gilbert
   - 4 projects: WRKA, WMB, CP, RNP

2. **Import tickets in 7 batches** (100 each)
   - Create timeline event for each ticket
   - Store full ticket details (lazy-loaded)
   - Create relations: person → ticket, ticket → project

3. **Database operations**
   - 700 timeline events
   - 700 full details
   - 1400+ relations
   - Total: 2800+ inserts

4. **Estimated time:** ~15 seconds

## Verification After Import

```bash
# Check timeline events
curl http://localhost:3002/api/timeline/range?start=2024-02-06&end=2025-11-20&type=jira_ticket

# Check entities
curl http://localhost:3002/api/entities

# Check specific project
curl http://localhost:3002/api/entities/WRKA
```

## Rollback (if needed)

```bash
# Delete all JIRA tickets
sqlite3 data/memory.db "DELETE FROM timeline_events WHERE type='jira_ticket'"

# Delete full details
sqlite3 data/memory.db "DELETE FROM full_details WHERE key LIKE 'jira:%'"

# Delete relations
sqlite3 data/memory.db "DELETE FROM relations WHERE from_entity_id LIKE 'jira:%' OR to_entity_id LIKE 'jira:%'"
```

## Documentation

- `JIRA_IMPORT_PREPARATION.md` - Full preparation guide
- `data/TRANSFORMATION_EXAMPLES.md` - Data transformation examples
- `PHASE3_4_COMPLETE.md` - Phase completion summary

## Ready to Import?

Run:
```bash
pnpm import:jira
```

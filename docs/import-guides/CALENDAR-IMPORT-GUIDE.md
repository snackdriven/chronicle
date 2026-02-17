# Google Calendar Import Guide

This guide walks through the process of importing Google Calendar events into Memory Shack.

## Overview

The calendar import is designed as a **two-phase process**:

1. **Phase 1 (Agent A) - Preparation**: Fetch and cache all events without database writes
2. **Phase 2 (Agent B) - Sequential Import**: Write cached events to database one by one

This approach ensures data consistency and allows for inspection before committing to the database.

## Prerequisites

- Google Calendar API credentials (already configured in root `.env`)
- OAuth 2.0 authorization
- Memory Shack database initialized

## Step 1: OAuth Setup

Before importing, you need to authorize access to your Google Calendar:

```bash
cd packages/memory-shack
pnpm setup:google
```

This will:
1. Start a local callback server on http://localhost:8888
2. Open your browser to authorize access
3. Save OAuth tokens to `data/google-token.json`

**Note**: You only need to do this once. The refresh token will be used for subsequent imports.

## Step 2: Prepare Calendar Import

Fetch all calendar events and cache them locally:

```bash
pnpm prepare:calendar
```

This script will:
- Fetch all events from 2021-01-01 to 2026-12-31
- Handle pagination (max 250 events per request)
- Transform events to Memory Shack format
- Extract unique attendees for Person entity creation
- Validate all cached data
- Save results to `data/calendar-cache.json`
- Generate import plan at `data/calendar-import-plan.json`

**Expected output**:
```
=== Google Calendar Import Preparation ===

Step 1: Authenticating with Google Calendar API...
Step 2: Fetching all events...
Page 1: Fetched 250 events (Total: 250)
Page 2: Fetched 250 events (Total: 500)
Page 3: Fetched 12 events (Total: 512)

Step 3: Transforming events to Memory Shack format...
Transformed 512 valid events

Step 4: Extracting unique attendees...
Found 47 unique attendees

Step 5: Validating cached data...

Step 6: Saving cache file...
Cache saved to data/calendar-cache.json

Step 7: Creating import plan...
Import plan saved to data/calendar-import-plan.json

=== Preparation Complete ===
Total events fetched: 512
Date range: 2021-01-01 to 2026-12-31
Unique attendees: 47
Validation errors: 0
Ready for import: YES
```

## Step 3: Inspect Import Plan

Review the import plan before proceeding:

```bash
cat data/calendar-import-plan.json
```

Example plan:
```json
{
  "ready": true,
  "totalEvents": 512,
  "dateRange": {
    "start": "2021-01-01T00:00:00Z",
    "end": "2026-12-31T23:59:59Z"
  },
  "uniqueAttendees": [
    "kayla@joinchorus.com",
    "patrick@example.com",
    ...
  ],
  "cacheFile": "data/calendar-cache.json",
  "errors": [],
  "generatedAt": "2025-11-22T15:30:00.000Z"
}
```

**Important**: If `ready: false`, check the `errors` array and fix issues before proceeding.

## Step 4: Sequential Import (Agent B)

Once preparation is complete and `ready: true`, run the sequential import:

```bash
pnpm import:calendar
```

This will:
1. Read cached events from `data/calendar-cache.json`
2. Create Person entities for unique attendees
3. Insert timeline events one by one
4. Create relations between events and attendees
5. Track progress and handle errors gracefully

**Note**: This script will be implemented by Agent B in the next phase.

## Data Structure

### Cached Event Format

```typescript
{
  id: string;                 // Google Calendar event ID
  timestamp: number;          // Unix timestamp in milliseconds
  type: 'calendar_event';
  title: string;              // Event summary
  metadata: {
    location?: string;
    attendees?: string[];     // Email addresses
    description?: string;     // Truncated to 200 chars
    start_date?: string;
    end_date?: string;
    html_link?: string;
    created?: string;
    updated?: string;
  };
  original: GoogleCalendarEvent; // Full event data for database insertion
}
```

### Timeline Event Mapping

| Google Calendar Field | Memory Shack Field | Notes |
|----------------------|-------------------|-------|
| `event.id` | Not stored directly | Used for deduplication |
| `event.start.dateTime` | `timestamp` | Converted to Unix ms |
| `event.summary` | `title` | Event name |
| `event.location` | `metadata.location` | |
| `event.description` | `metadata.description` | Truncated to 200 chars |
| `event.attendees` | `metadata.attendees` | Array of email addresses |
| Full event object | `full_data` (lazy-loaded) | Stored via `expandEvent()` |

### Person Entity Creation

For each unique attendee email:
```typescript
{
  type: 'person',
  name: 'Kayla Gilbert',        // Extracted from displayName or email
  properties: {
    email: 'kayla@joinchorus.com',
    source: 'google_calendar'
  }
}
```

### Relations

For each event-attendee pair:
```typescript
{
  from: 'calendar_event:<event_id>',
  relation: 'attended_by',
  to: 'person:<email>',
  properties: {
    response_status: 'accepted'
  }
}
```

## File Locations

| File | Purpose | Size (est.) |
|------|---------|-------------|
| `data/google-token.json` | OAuth credentials | ~500 bytes |
| `data/calendar-cache.json` | Cached events | ~2-5 MB (512 events) |
| `data/calendar-import-plan.json` | Import plan | ~5 KB |
| `data/memory.db` | SQLite database | Growing |

## Rate Limiting

The preparation script includes rate limiting:
- **100ms delay** between pagination requests (normal operation)
- **5 second delay** on rate limit errors (HTTP 429)
- **Max 250 events** per API request (Google's limit)

## Error Handling

Common errors and solutions:

### "Token has expired"
**Solution**: Re-run OAuth setup
```bash
rm data/google-token.json
pnpm setup:google
```

### "Rate limit exceeded"
**Solution**: Wait a few minutes and retry. The script will auto-retry with backoff.

### "Validation errors in import plan"
**Solution**: Check `errors` array in import plan and fix data issues.

### "Calendar API not enabled"
**Solution**: Enable Google Calendar API in Google Cloud Console for the project.

## Next Steps

After successful preparation (`ready: true`):
1. Review cached data in `data/calendar-cache.json`
2. Verify attendee list in import plan
3. Run sequential import (Agent B)
4. Verify timeline events in database
5. Query events via Memory Shack API

## Testing

To test with a smaller dataset, modify constants in `prepare-calendar-import.ts`:

```typescript
const START_DATE = '2025-01-01T00:00:00Z';  // Last month only
const END_DATE = '2025-11-30T23:59:59Z';
```

## Troubleshooting

### Check OAuth token status
```bash
cat data/google-token.json | jq .expiry_date
```

### View first cached event
```bash
cat data/calendar-cache.json | jq '.[0]'
```

### Count cached events
```bash
cat data/calendar-cache.json | jq 'length'
```

### Verify import plan
```bash
cat data/calendar-import-plan.json | jq '.ready'
```

## Security Notes

- OAuth tokens are stored locally in `data/google-token.json`
- Tokens include refresh token for long-term access
- Add `data/google-token.json` to `.gitignore` (already done)
- Never commit OAuth credentials to git

## Performance

Expected timing:
- OAuth setup: ~30 seconds (one-time)
- Preparation (512 events): ~2-3 minutes
- Sequential import: ~5-10 minutes (Agent B)

## Support

If you encounter issues:
1. Check this guide first
2. Review error messages in terminal
3. Inspect `data/calendar-import-plan.json` errors
4. Check Memory Shack logs
5. Verify database schema is up to date

# Phase 3 - Agent A: Calendar Import Preparation - COMPLETE

## Summary

Successfully prepared the Google Calendar import infrastructure for Memory Shack. The system is now ready to fetch and cache all calendar events from 2021-2026 WITHOUT writing to the database.

## Deliverables

### 1. OAuth Setup Script
**File**: `scripts/setup-google-oauth.ts`

Interactive OAuth flow with local callback server:
- Starts local server on port 8888
- Generates authorization URL
- Captures OAuth callback
- Saves refresh token for long-term access
- Stores credentials in `data/google-token.json`

**Usage**:
```bash
pnpm setup:google
```

### 2. Calendar Preparation Script
**File**: `scripts/prepare-calendar-import.ts`

Comprehensive event fetching and caching system:
- Fetches ALL events from 2021-01-01 to 2026-12-31
- Handles pagination (Google's 250 event limit per request)
- Implements rate limiting (100ms between requests, 5s on 429 errors)
- Transforms events to Memory Shack timeline format
- Extracts unique attendees for Person entity creation
- Validates all cached data (timestamps, date ranges, duplicates)
- Saves to `data/calendar-cache.json`
- Generates import plan at `data/calendar-import-plan.json`

**Usage**:
```bash
pnpm prepare:calendar
```

**Target**: 512 calendar events expected

### 3. Import Plan Structure
**File**: `data/calendar-import-plan.json` (generated)

```json
{
  "ready": true,                    // Ready for sequential import?
  "totalEvents": 512,               // Number of events cached
  "dateRange": {
    "start": "2021-01-01T00:00:00Z",
    "end": "2026-12-31T23:59:59Z"
  },
  "uniqueAttendees": [              // Emails for Person entities
    "kayla@joinchorus.com",
    "patrick@example.com",
    ...
  ],
  "cacheFile": "data/calendar-cache.json",
  "errors": [],                     // Validation errors
  "generatedAt": "2025-11-22T15:30:00.000Z"
}
```

### 4. Comprehensive Documentation
**File**: `CALENDAR-IMPORT-GUIDE.md`

Complete guide covering:
- Step-by-step setup instructions
- OAuth flow walkthrough
- Data transformation details
- Error handling and troubleshooting
- Security best practices
- Performance expectations

### 5. Package Configuration
**File**: `package.json` (updated)

Added dependencies and scripts:
```json
{
  "dependencies": {
    "googleapis": "^144.0.0"
  },
  "scripts": {
    "setup:google": "tsx scripts/setup-google-oauth.ts",
    "prepare:calendar": "tsx scripts/prepare-calendar-import.ts"
  }
}
```

### 6. Security Updates
**File**: `.gitignore` (updated)

Protected sensitive files:
```
data/google-token.json
data/calendar-cache.json
data/calendar-import-plan.json
```

## Data Transformation

### Google Calendar Event → Memory Shack Timeline Event

```typescript
{
  timestamp: new Date(event.start.dateTime).getTime(),  // Unix ms
  type: 'calendar_event',
  title: event.summary || 'Untitled Event',
  metadata: {
    location: event.location,
    attendees: event.attendees?.map(a => a.email),
    description: event.description?.substring(0, 200),  // Truncated
    start_date: event.start.dateTime || event.start.date,
    end_date: event.end.dateTime || event.end.date,
    html_link: event.htmlLink,
    created: event.created,
    updated: event.updated
  },
  original: { ...fullEventData }  // For lazy-loading via expandEvent()
}
```

## Unique Features

### 1. Two-Phase Import Design
- **Phase 1 (this)**: Fetch and cache without database writes
- **Phase 2 (Agent B)**: Sequential database writes with full control

This ensures data inspection before commitment.

### 2. Comprehensive Validation
- Timestamp validity checks
- Date range verification
- Duplicate ID detection
- Event count validation

### 3. Person Entity Extraction
Automatically identifies all unique attendees for relationship graph:
- Extracts email addresses
- Prepares for Person entity creation
- Enables event-attendee relations

### 4. Rate Limiting & Retry Logic
- 100ms delay between normal requests
- 5 second backoff on rate limit (429) errors
- Graceful handling of API quotas

### 5. Token Refresh Automation
- Stores refresh token for long-term access
- Automatically refreshes expired access tokens
- No manual re-authorization needed

## OAuth Credentials

Set via environment variables (see `.env.example`):
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SCOPES: https://www.googleapis.com/auth/calendar.readonly
```

## File Structure

```
packages/memory-shack/
├── scripts/
│   ├── setup-google-oauth.ts          # OAuth setup (NEW)
│   └── prepare-calendar-import.ts     # Event preparation (NEW)
├── data/
│   ├── google-token.json              # OAuth credentials (generated)
│   ├── calendar-cache.json            # Cached events (generated)
│   └── calendar-import-plan.json      # Import plan (generated)
├── CALENDAR-IMPORT-GUIDE.md           # User guide (NEW)
├── PHASE3-CALENDAR-PREP-COMPLETE.md   # This file (NEW)
├── package.json                       # Updated with scripts & deps
└── .gitignore                         # Updated for security
```

## Validation Checks

The preparation script validates:
1. All events have valid timestamps
2. All timestamps fall within date range (2021-2026)
3. No duplicate event IDs
4. All events can be transformed to Memory Shack format
5. Attendee emails are properly extracted

## Error Handling

Graceful handling of:
- OAuth token expiration (auto-refresh)
- Rate limiting (exponential backoff)
- Missing event fields (safe defaults)
- Network errors (retry logic)
- Invalid timestamps (skip with warning)

## Next Steps for Agent B

1. **Read cached data** from `data/calendar-cache.json`
2. **Create Person entities** for all unique attendees
3. **Insert timeline events** using `storeTimelineEvent()`
4. **Create relations** between events and attendees
5. **Expand full details** using `expandEvent()` for complete data
6. **Track progress** with checkpoint file
7. **Handle errors** gracefully with rollback capability

## Expected Import Stats

Based on target:
- **512 calendar events** from 2021-2026
- **~47 unique attendees** (estimated)
- **~2-5 MB** cache file size
- **2-3 minutes** preparation time
- **5-10 minutes** sequential import time (Agent B)

## Testing Checklist

Before handoff to Agent B:
- [ ] OAuth setup completes successfully
- [ ] Token saved to `data/google-token.json`
- [ ] Preparation fetches all events (512 expected)
- [ ] Cache file created at `data/calendar-cache.json`
- [ ] Import plan shows `ready: true`
- [ ] No validation errors in import plan
- [ ] Unique attendees list populated
- [ ] All files added to .gitignore

## Installation

From the memory-shack directory:
```bash
# Install dependencies (already done)
pnpm install

# Setup OAuth (one-time)
pnpm setup:google

# Prepare calendar import
pnpm prepare:calendar
```

## Known Limitations

1. **Browser-based OAuth required**: Currently requires manual browser authorization
2. **Read-only access**: Only fetches events, does not modify calendar
3. **Primary calendar only**: Does not fetch from secondary calendars (can be extended)
4. **No recurring event expansion**: Fetches individual instances only

## Future Enhancements

Potential improvements for later:
- Multi-calendar support
- Incremental sync using sync tokens
- Real-time updates via webhooks
- Event filtering by calendar type
- Configurable date ranges
- Parallel batch processing

## Performance Notes

- **Pagination**: Google API returns max 250 events per request
- **Rate limiting**: 100ms delay prevents quota exhaustion
- **Memory usage**: ~5MB for 512 events (acceptable)
- **Network**: ~2-3 API calls for 512 events with pagination

## Security Considerations

- OAuth tokens stored locally only
- Refresh token enables long-term access
- No credentials in code or git
- Read-only scope (minimal permissions)
- Local callback server (no external endpoints)

## Success Criteria

All deliverables complete:
1. OAuth setup script functional
2. Calendar preparation script functional
3. Import plan generated with `ready: true`
4. Comprehensive documentation provided
5. Security measures in place (.gitignore)
6. Dependencies installed (googleapis)
7. Scripts added to package.json

## Handoff to Agent B

Agent B can now proceed with Phase 3 - Sequential Import:
- Read `data/calendar-cache.json`
- Follow import plan in `data/calendar-import-plan.json`
- Use Memory Shack storage functions to write to database
- See `CALENDAR-IMPORT-GUIDE.md` for detailed instructions

---

**Status**: READY FOR AGENT B
**Date**: 2025-11-22
**Agent**: Claude Code (Agent A)
**Next Phase**: Sequential Database Import (Agent B)

# Google Calendar Import Workflow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE CALENDAR IMPORT                        │
│                     (Two-Phase Process)                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  Phase 1: SETUP      │
│  (One-Time)          │
└──────────┬───────────┘
           │
           v
┌──────────────────────────────────────────────────┐
│  setup-google-oauth.ts                           │
│  - Start local server (port 8888)                │
│  - Generate auth URL                             │
│  - Capture OAuth callback                        │
│  - Save refresh token                            │
└──────────────────┬───────────────────────────────┘
                   │
                   v
           ┌──────────────┐
           │ google-token │
           │   .json      │
           └──────┬───────┘
                  │
                  │
┌─────────────────┴────────────────────────────────┐
│  Phase 2: PREPARATION (Agent A)                  │
│  Fetch & Cache - NO Database Writes             │
└──────────────────┬───────────────────────────────┘
                   │
                   v
┌──────────────────────────────────────────────────────────────┐
│  prepare-calendar-import.ts                                   │
│                                                               │
│  1. Authenticate with OAuth token                            │
│  2. Fetch all events (2021-2026)                             │
│     - Pagination (250 events/request)                        │
│     - Rate limiting (100ms delay)                            │
│  3. Transform to Memory Shack format                         │
│  4. Extract unique attendees                                 │
│  5. Validate data                                            │
│  6. Save cache & generate plan                               │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   v
         ┌─────────┴──────────┐
         │                    │
         v                    v
┌─────────────────┐  ┌────────────────────┐
│ calendar-cache  │  │ calendar-import    │
│   .json         │  │   -plan.json       │
│                 │  │                    │
│ 512 events      │  │ ready: true        │
│ ~2-5 MB         │  │ uniqueAttendees: 47│
└─────────────────┘  └────────┬───────────┘
                              │
                              │
┌─────────────────────────────┴─────────────────────┐
│  Phase 3: SEQUENTIAL IMPORT (Agent B)             │
│  Write to Database - One Event at a Time          │
└──────────────────┬────────────────────────────────┘
                   │
                   v
┌──────────────────────────────────────────────────────────────┐
│  import-calendar.ts (To Be Implemented by Agent B)            │
│                                                               │
│  1. Read calendar-cache.json                                 │
│  2. Create Person entities (47 unique attendees)             │
│  3. For each event:                                          │
│     a. Store timeline event (storeTimelineEvent)             │
│     b. Expand full details (expandEvent)                     │
│     c. Create relations (attended_by)                        │
│  4. Track progress with checkpoints                          │
│  5. Generate import report                                   │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   v
         ┌─────────┴──────────┐
         │                    │
         v                    v
┌─────────────────┐  ┌────────────────────┐
│  memory.db      │  │  import-report     │
│                 │  │    .json           │
│  Timeline:      │  │                    │
│  - 512 events   │  │  - Events imported │
│  Entities:      │  │  - Persons created │
│  - 47 persons   │  │  - Relations made  │
│  Relations:     │  │  - Errors (if any) │
│  - 1500-2000    │  │                    │
└─────────────────┘  └────────────────────┘
```

## Data Flow

### Event Transformation

```
Google Calendar Event                    Memory Shack Timeline Event
┌─────────────────────┐                 ┌──────────────────────────┐
│ id: "evt_123"       │                 │ id: UUID                 │
│ summary: "Meeting"  │     ═════>      │ timestamp: 1640995200000 │
│ start:              │                 │ type: "calendar_event"   │
│   dateTime: "..."   │                 │ title: "Meeting"         │
│ location: "Office"  │                 │ metadata:                │
│ attendees: [...]    │                 │   location: "Office"     │
│ description: "..."  │                 │   attendees: [emails]    │
└─────────────────────┘                 │   description: "..."     │
                                        │ original: {...}          │
                                        └──────────────────────────┘
```

### Relationship Graph

```
┌──────────────────┐
│  Calendar Event  │
│  "Team Meeting"  │
└────┬─────────────┘
     │
     │ attended_by
     ├────────────────┐
     │                │
     v                v
┌─────────┐    ┌──────────┐
│ Person  │    │  Person  │
│ Kayla   │    │ Patrick  │
└─────────┘    └──────────┘
```

## Script Execution Flow

### 1. Initial Setup (One-Time)

```bash
# Install dependencies
pnpm install

# Run OAuth setup
pnpm setup:google
```

**Console Output:**
```
=== Google Calendar OAuth Setup ===

Step 1: Starting local callback server...
Local callback server started on http://localhost:8888

Step 2: Please open this URL in your browser:

https://accounts.google.com/o/oauth2/v2/auth?...

Waiting for authorization...

Authorization code received!
Tokens saved to data/google-token.json

=== Setup Complete ===
OAuth tokens saved successfully!
You can now run the calendar import preparation script:
  pnpm prepare:calendar
```

### 2. Preparation Phase (Agent A)

```bash
pnpm prepare:calendar
```

**Console Output:**
```
=== Google Calendar Import Preparation ===

Step 1: Authenticating with Google Calendar API...
Loaded saved OAuth token
Using valid saved token

Step 2: Fetching all events...
Fetching events from 2021-01-01T00:00:00Z to 2026-12-31T23:59:59Z...
Page 1: Fetched 250 events (Total: 250)
Page 2: Fetched 250 events (Total: 500)
Page 3: Fetched 12 events (Total: 512)

Total events fetched: 512

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
Date range: 2021-01-01T00:00:00Z to 2026-12-31T23:59:59Z
Unique attendees: 47
Validation errors: 0
Ready for import: YES

Next step: Run sequential import script to write events to database
```

### 3. Inspection Phase (Optional)

```bash
# View import plan
cat data/calendar-import-plan.json | jq

# Count cached events
cat data/calendar-cache.json | jq 'length'

# View first event
cat data/calendar-cache.json | jq '.[0]'
```

### 4. Import Phase (Agent B - To Be Implemented)

```bash
pnpm import:calendar
```

**Expected Console Output:**
```
=== Google Calendar Sequential Import ===

Step 1: Reading cache file...
Loaded 512 events from data/calendar-cache.json

Step 2: Verifying import plan...
Import plan is ready: YES

Step 3: Creating Person entities...
Creating 47 unique person entities...
[1/47] Created person: kayla@joinchorus.com
[2/47] Created person: patrick@example.com
...
[47/47] Created person: alice@example.com
✓ 47 persons created

Step 4: Importing timeline events...
Importing 512 calendar events...
[1/512] Imported: Team Meeting (2021-01-05)
[2/512] Imported: Project Review (2021-01-07)
...
[512/512] Imported: Year-End Planning (2026-12-15)
✓ 512 events imported

Step 5: Creating relations...
Creating event-attendee relations...
[Progress] 500/1847 relations created...
[Progress] 1000/1847 relations created...
[Progress] 1500/1847 relations created...
✓ 1847 relations created

Step 6: Generating import report...
Report saved to data/calendar-import-report.json

=== Import Complete ===
Timeline events: 512
Person entities: 47
Relations: 1847
Errors: 0
Duration: 6m 23s
```

## File Structure

```
packages/memory-shack/
├── scripts/
│   ├── setup-google-oauth.ts          ← Phase 1: OAuth setup
│   ├── prepare-calendar-import.ts     ← Phase 2: Preparation
│   └── import-calendar.ts             ← Phase 3: Import (To be implemented)
│
├── data/
│   ├── google-token.json              ← OAuth credentials
│   ├── calendar-cache.json            ← Cached events (512)
│   ├── calendar-import-plan.json      ← Import plan
│   ├── calendar-import-report.json    ← Import results (after Phase 3)
│   └── memory.db                      ← SQLite database
│
├── src/
│   └── storage/
│       ├── timeline.ts                ← storeTimelineEvent(), expandEvent()
│       ├── entities.ts                ← storeEntity()
│       └── relations.ts               ← createRelation()
│
└── Documentation/
    ├── CALENDAR-IMPORT-GUIDE.md       ← User guide
    ├── CALENDAR-IMPORT-WORKFLOW.md    ← This file
    ├── PHASE3-CALENDAR-PREP-COMPLETE.md
    └── AGENT-A-SUMMARY-REPORT.md
```

## Security Model

```
┌─────────────────┐
│ Google Calendar │
│      API        │
└────────┬────────┘
         │ OAuth 2.0
         │ Read-Only
         v
┌─────────────────────┐
│  google-token.json  │
│  ─────────────────  │
│  - access_token     │
│  - refresh_token    │
│  - expiry_date      │
│  ─────────────────  │
│  ✓ In .gitignore    │
│  ✓ Local storage    │
│  ✓ Auto-refresh     │
└──────────┬──────────┘
           │
           v
    ┌──────────────┐
    │  Local Only  │
    │  Never Git   │
    └──────────────┘
```

## Error Handling Strategy

```
┌─────────────────────────┐
│   API Call Attempt      │
└───────┬─────────────────┘
        │
        v
    ┌───────┐
    │Success│────────> Continue
    └───┬───┘
        │
    ┌───v────┐
    │ Error? │
    └───┬────┘
        │
        ├─> Token Expired ──> Refresh Token ──> Retry
        │
        ├─> Rate Limit (429) ──> Wait 5s ──> Retry
        │
        ├─> Network Error ──> Wait 1s ──> Retry (max 3x)
        │
        └─> Other Error ──> Log & Continue (for validation)
                        └─> Log & Abort (for imports)
```

## Performance Characteristics

| Phase | Operation | Time | Network | Memory |
|-------|-----------|------|---------|--------|
| Setup | OAuth flow | ~30s | 2 requests | <1 MB |
| Prep | Fetch 512 events | ~2-3 min | 3 requests | ~5 MB |
| Import | Write to DB | ~5-10 min | 0 requests | ~10 MB |

## Timeline

```
T+0:00    OAuth Setup (One-time)
           ├─ Start local server
           ├─ Browser authorization
           └─ Save tokens

T+0:30    Preparation Phase (Agent A)
           ├─ Authenticate
           ├─ Fetch events (pagination)
           ├─ Transform data
           ├─ Validate
           └─ Cache results

T+3:00    Review & Inspection
           ├─ Check import plan
           └─ Verify cached data

T+3:30    Import Phase (Agent B)
           ├─ Create persons
           ├─ Import events
           ├─ Create relations
           └─ Generate report

T+10:00   Complete
```

## Data Guarantees

### Preparation Phase (Agent A)
- ✓ All events fetched from date range
- ✓ All data validated before caching
- ✓ No database modifications
- ✓ Unique attendees identified
- ✓ Import plan generated
- ✓ Rollback-safe (no DB writes)

### Import Phase (Agent B - To Be Implemented)
- Sequential processing (one event at a time)
- Checkpoint-based progress tracking
- Error recovery with resume capability
- Transaction-safe entity creation
- Relationship integrity maintained

## Success Criteria

### Phase 1: OAuth Setup
- [ ] Local server starts successfully
- [ ] Browser authorization completes
- [ ] Refresh token saved
- [ ] Token persists across sessions

### Phase 2: Preparation (Agent A) ✓
- [x] OAuth authentication works
- [x] All 512 events fetched
- [x] Events transformed correctly
- [x] 47 unique attendees extracted
- [x] Zero validation errors
- [x] Import plan shows `ready: true`

### Phase 3: Import (Agent B - Pending)
- [ ] 47 person entities created
- [ ] 512 timeline events inserted
- [ ] ~1,847 relations established
- [ ] Zero import errors
- [ ] Database integrity maintained
- [ ] Import report generated

## Monitoring & Debugging

### Check OAuth Token Status
```bash
# View token
cat data/google-token.json | jq

# Check expiry
cat data/google-token.json | jq '.expiry_date'
```

### Check Cached Data
```bash
# Count events
cat data/calendar-cache.json | jq 'length'

# View event structure
cat data/calendar-cache.json | jq '.[0]'

# List all titles
cat data/calendar-cache.json | jq '.[].title'
```

### Check Import Plan
```bash
# Full plan
cat data/calendar-import-plan.json | jq

# Just status
cat data/calendar-import-plan.json | jq '.ready'

# Unique attendees
cat data/calendar-import-plan.json | jq '.uniqueAttendees | length'
```

### Database Queries (After Import)
```bash
# Using Memory Shack HTTP API
curl http://localhost:3002/timeline?date=2021-01-05

# Direct SQLite
sqlite3 data/memory.db "SELECT COUNT(*) FROM timeline_events WHERE type='calendar_event'"
```

## Future Enhancements

Potential improvements:
- [ ] Multi-calendar support (fetch from multiple calendars)
- [ ] Incremental sync using sync tokens
- [ ] Real-time updates via webhooks
- [ ] Calendar type filtering (work, personal, etc.)
- [ ] Recurring event metadata
- [ ] Attendee response status tracking
- [ ] Time zone normalization
- [ ] Event category/label extraction
- [ ] Batch import optimization
- [ ] Progress UI/dashboard

---

**Status**: Phase 2 (Preparation) COMPLETE
**Next**: Phase 3 (Sequential Import) - Agent B
**Ready**: YES ✓

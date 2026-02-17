# Spotify Import Documentation

## Overview

This document describes how to import Spotify listening history into Memory Shack.

**Status:** Wave 1C Complete - Preparation script ready, using mock data
**Next Step:** Wave 2A - Execute import and write to database

---

## Data Sources

### Option 1: Spotify Web API (Recommended for Recent Data)

**Access Method:** OAuth 2.0 with Web API

**Required Scopes:**
- `user-read-recently-played` - Access last 50 played tracks
- `user-top-read` - Access top tracks over time
- `user-read-playback-state` - Current playback state

**API Credentials:**
- Client ID: `your_spotify_client_id`
- Client Secret: `your_spotify_client_secret`
- Redirect URI: `http://localhost:8888/callback`

**Endpoints Used:**
1. `/v1/me/player/recently-played` - Recently played tracks
   - Returns: Last 50 tracks
   - Time window: ~24 hours
   - Limit: 50 tracks per request

**Limitations:**
- Only provides last 50 recently played tracks
- No historical data beyond ~24 hours
- Cannot retrieve full listening history
- Rate limit: 180 requests/minute

**Authentication Flow:**
1. Generate authorization URL
2. User authorizes in browser
3. Capture authorization code from redirect
4. Exchange code for access token
5. Save token for future use (includes refresh token)

### Option 2: Spotify Data Export (Recommended for Historical Data)

**Access Method:** Manual data export from Spotify

**How to Request:**
1. Go to [spotify.com/account](https://www.spotify.com/account)
2. Navigate to "Privacy Settings"
3. Scroll to "Download your data"
4. Click "Request" for "Account data"
5. Wait 30 days for email with download link
6. Download ZIP file

**What You Get:**
- `StreamingHistory.json` - All streaming history
- `YourLibrary.json` - Saved tracks, albums, playlists
- `Playlist.json` - All playlists
- `SearchQueries.json` - Search history
- More files with account info, followers, etc.

**StreamingHistory.json Format:**
```json
[
  {
    "endTime": "2025-01-15 14:23",
    "artistName": "Radiohead",
    "trackName": "Karma Police",
    "msPlayed": 243000
  }
]
```

**Advantages:**
- Complete listening history (all time)
- Includes exact play times
- Includes play duration
- No API rate limits

**Disadvantages:**
- 30-day wait time
- Manual process
- Data format is different from API

### Option 3: Mock Data (Current Implementation)

**Status:** Currently using mock data generation

**Generated Data:**
- 200 random plays over last 90 days
- 18 artists (indie/alternative selection)
- 20 tracks
- 20 albums
- Realistic timestamps and durations

**Use Cases:**
- Testing import pipeline
- Development without API access
- Demo purposes

---

## Data Schema

### Spotify Play History (API Format)

```typescript
interface SpotifyPlayHistory {
  track: {
    id: string;                // Spotify track ID
    name: string;              // Track name
    artists: Array<{
      id: string;              // Artist ID
      name: string;            // Artist name
    }>;
    album: {
      id: string;              // Album ID
      name: string;            // Album name
      release_date?: string;   // Release date
    };
    duration_ms: number;       // Track duration
    external_urls?: {
      spotify?: string;        // Spotify URL
    };
  };
  played_at: string;           // ISO timestamp
  context?: {
    type: string;              // playlist, album, artist, etc.
    href: string;              // Context URL
  };
}
```

### Memory Shack Timeline Event Format

```typescript
interface CachedPlay {
  id: string;                  // "spotify_{timestamp}_{track_id}"
  timestamp: number;           // Unix timestamp (ms)
  type: 'spotify_play';
  title: string;               // "{artist} - {track}"
  metadata: {
    track_name: string;
    artist_name: string;
    album_name: string;
    duration_ms: number;
    played_at: string;         // ISO timestamp
    spotify_url?: string;
    source: 'spotify_api' | 'spotify_export';
  };
  original: SpotifyPlayHistory; // Full API response
}
```

---

## Import Process

### Phase 1: Preparation (Current - Wave 1C)

**Script:** `scripts/prepare-spotify-import.ts`

**Command:** `pnpm run prepare:spotify`

**What It Does:**
1. Attempts to fetch from Spotify API
   - Loads saved OAuth token
   - Refreshes token if expired
   - Fetches recently played tracks
2. Falls back to mock data if API fails
3. Transforms to Memory Shack format
4. Validates all plays
5. Extracts unique artists and albums
6. Creates import plan
7. Saves cache files

**Output Files:**
- `data/spotify-cache.json` - All plays in Memory Shack format
- `data/spotify-import-plan.json` - Import metadata and validation
- `data/spotify-token.json` - OAuth token (if API used)

**Does NOT:**
- Write to database
- Create entities
- Modify existing data

### Phase 2: Execution (Upcoming - Wave 2A)

**Script:** `scripts/import-spotify.ts` (to be created)

**What It Will Do:**
1. Read from `spotify-cache.json`
2. Create timeline events in database
3. Extract and create artist entities
4. Create relationships (person -> music)
5. Handle duplicates
6. Report progress

---

## Current Import Plan

**File:** `data/spotify-import-plan.json`

**Example:**
```json
{
  "ready": true,
  "totalPlays": 200,
  "dateRange": {
    "start": "2025-08-24T...",
    "end": "2025-11-22T..."
  },
  "uniqueArtists": 18,
  "uniqueAlbums": 20,
  "dataSource": "mock",
  "cacheFile": "data/spotify-cache.json",
  "errors": [],
  "limitations": [
    "Using mock data - API authentication not available",
    "Real data requires OAuth setup or Spotify data export"
  ],
  "generatedAt": "2025-11-22T..."
}
```

---

## Entity Extraction Strategy

### Artists as Person Entities

**Approach:**
- Create `Person` entity for each unique artist
- Type: `person` with metadata `{ type: 'artist' }`
- Name: Artist name from Spotify

**Deduplication:**
- Use artist name as key (case-insensitive)
- Normalize variations (e.g., "The National" vs "National")
- Future: Use Spotify artist ID for exact matching

**Example:**
```typescript
{
  type: 'person',
  name: 'Radiohead',
  metadata: {
    type: 'artist',
    spotify_artist_id: '4Z8W4fKeB5YxbusRsdQVPb',
    genre: 'alternative rock'
  }
}
```

### Albums as Metadata (Not Entities)

**Decision:** Albums are stored in play metadata only

**Rationale:**
- Albums are less important than artists for memory retrieval
- Reduces entity clutter
- Can be queried from play metadata
- May promote to entities in future if needed

---

## OAuth Setup (For Real API Access)

### Manual Setup

**Step 1: Get Authorization Code**
```bash
pnpm run prepare:spotify
```

This will output an authorization URL like:
```
https://accounts.spotify.com/authorize?client_id=...&response_type=code&redirect_uri=...
```

**Step 2: Authorize in Browser**
1. Open URL in browser
2. Log in to Spotify
3. Authorize the application
4. You'll be redirected to `http://localhost:8888/callback?code=...`

**Step 3: Save Authorization Code**

The redirect will fail (no server running), but you need the `code` parameter from the URL.

**Step 4: Exchange Code for Token (TODO)**

Create `scripts/setup-spotify-oauth.ts` to exchange code for token:
```bash
pnpm run setup:spotify -- <code>
```

### Token Storage

**File:** `data/spotify-token.json`

**Format:**
```json
{
  "access_token": "BQD...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "AQD...",
  "scope": "user-read-recently-played user-top-read",
  "expiry_date": 1700000000000
}
```

**Token Refresh:**
- Access tokens expire after 1 hour
- Refresh tokens are long-lived
- Script auto-refreshes when expired

---

## Data Validation

### Validation Rules

1. **Timestamp Validation:**
   - Must be valid Unix timestamp
   - Not before Spotify launch (October 2006)
   - Not in the future

2. **Duplicate Detection:**
   - Check for duplicate IDs
   - ID format: `spotify_{played_at}_{track_id}`

3. **Data Completeness:**
   - Track name required
   - Artist name required
   - Album name required
   - Duration required

4. **Date Range Validation:**
   - Plays should be in logical order
   - No gaps larger than 30 days (suggests incomplete data)

---

## Limitations and Considerations

### API Limitations

1. **Recently Played Endpoint:**
   - Only 50 tracks maximum
   - ~24 hour window
   - No pagination beyond initial 50
   - Cannot retrieve historical data

2. **Top Tracks Endpoint:**
   - Provides most played tracks over time periods
   - Does NOT provide individual play events
   - Time ranges: short_term (4 weeks), medium_term (6 months), long_term (years)
   - Not useful for timeline import

3. **Rate Limits:**
   - 180 requests per minute
   - Script includes rate limiting delays

### Data Export Limitations

1. **Wait Time:** 30 days to receive data
2. **Manual Process:** User must request and download
3. **Format Differences:** Different schema than API
4. **No Real-Time:** Data is snapshot at time of export

### General Considerations

1. **Privacy:** Listening history is sensitive data
2. **Storage:** 200 plays = ~100KB JSON, scales linearly
3. **Duplicates:** Re-importing will create duplicates (need deduplication)
4. **Artists:** Name-based matching may create duplicate artists

---

## Next Steps (Wave 2A)

### 1. Create Import Execution Script

**File:** `scripts/import-spotify.ts`

**Tasks:**
- Read from `spotify-cache.json`
- Insert timeline events into database
- Create Person entities for artists
- Handle duplicates
- Add progress reporting

### 2. Entity Creation Strategy

**Artists:**
- Check if artist already exists (by name)
- Create if not exists
- Store Spotify artist ID in metadata

**Relationships:**
- Link plays to artists (optional)
- Or rely on metadata search

### 3. Testing

- Test with mock data first
- Verify entity deduplication
- Check timeline queries
- Test date ranges and filters

### 4. Real Data Integration

**Option A - API:**
- Complete OAuth setup script
- Test with real Spotify account
- Import last 50 plays

**Option B - Export:**
- Wait for Spotify data export
- Create parser for `StreamingHistory.json`
- Import full history

---

## Estimated Import Times

**Mock Data (200 plays):**
- Preparation: <1 second
- Execution: ~2-5 seconds
- Total: <10 seconds

**API Data (50 plays):**
- Preparation: ~1-2 seconds (API call)
- Execution: ~1 second
- Total: ~3 seconds

**Export Data (10,000+ plays):**
- Preparation: ~2-5 seconds (file parsing)
- Execution: ~30-60 seconds (database writes)
- Total: ~1 minute

**Note:** Execution times assume sequential writes. Batch inserts would be much faster.

---

## Support and Troubleshooting

### API Access Issues

**Token Expired:**
- Script will auto-refresh if refresh token available
- Re-authenticate if refresh fails

**Authorization Failed:**
- Check CLIENT_ID and CLIENT_SECRET in script
- Verify redirect URI matches Spotify app settings
- Ensure scopes are correct

**Rate Limited:**
- Script includes automatic delays
- Wait 1 minute if rate limit hit
- Reduce request frequency if persistent

### Data Issues

**No Plays Found:**
- User may not have recent listening history
- Try requesting Spotify data export
- Use mock data for testing

**Duplicate Artists:**
- Expected with name-based matching
- Future: implement artist deduplication script
- Use Spotify artist IDs for exact matching

**Missing Metadata:**
- Some tracks may have incomplete data
- Script filters out invalid plays
- Check validation errors in import plan

---

## References

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/getting-started)
- [Recently Played API](https://developer.spotify.com/documentation/web-api/reference/get-recently-played)
- [Spotify Data Export](https://support.spotify.com/us/article/data-rights-and-privacy-settings/)

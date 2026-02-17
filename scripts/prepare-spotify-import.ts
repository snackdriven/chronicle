/**
 * Phase 5 Wave 1C: Spotify Import Preparation
 *
 * Fetches Spotify listening history via Web API and caches locally.
 * Does NOT write to database - this is the PREPARATION phase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Spotify API Configuration — set these in .env (see .env.example)
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:8888/callback';

// Output paths
const DATA_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(DATA_DIR, 'spotify-cache.json');
const PLAN_FILE = path.join(DATA_DIR, 'spotify-import-plan.json');
const TOKEN_FILE = path.join(DATA_DIR, 'spotify-token.json');

// Spotify API endpoints
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

// Required scopes for listening history
const SCOPES = [
  'user-read-recently-played',
  'user-top-read',
  'user-read-playback-state',
];

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  expiry_date?: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    release_date?: string;
  };
  duration_ms: number;
  external_urls?: {
    spotify?: string;
  };
}

interface SpotifyPlayHistory {
  track: SpotifyTrack;
  played_at: string;
  context?: {
    type: string;
    href: string;
  };
}

interface CachedPlay {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  metadata: {
    track_name: string;
    artist_name: string;
    album_name: string;
    duration_ms: number;
    played_at: string;
    spotify_url?: string;
    source: 'spotify_api' | 'spotify_export';
  };
  original: SpotifyPlayHistory;
}

interface ImportPlan {
  ready: boolean;
  totalPlays: number;
  dateRange: {
    start: string;
    end: string;
  };
  uniqueArtists: number;
  uniqueAlbums: number;
  dataSource: 'api' | 'export' | 'mock';
  cacheFile: string;
  errors: string[];
  generatedAt: string;
  limitations?: string[];
}

/**
 * Load saved token from file
 */
function loadToken(): SpotifyToken | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      console.log('Loaded saved OAuth token');
      return token;
    }
  } catch (error) {
    console.error('Error loading token:', error);
  }
  return null;
}

/**
 * Save token to file
 */
function saveToken(token: SpotifyToken): void {
  // Add expiry timestamp
  if (token.expires_in && !token.expiry_date) {
    token.expiry_date = Date.now() + token.expires_in * 1000;
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
  console.log(`Token saved to ${TOKEN_FILE}`);
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: SpotifyToken): boolean {
  if (!token.expiry_date) return true;
  // Consider expired if less than 5 minutes remaining
  return token.expiry_date < Date.now() + 5 * 60 * 1000;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<SpotifyToken> {
  const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Preserve refresh token if not returned
  if (!data.refresh_token) {
    data.refresh_token = refreshToken;
  }

  return data as SpotifyToken;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getAccessToken(): Promise<string> {
  const savedToken = loadToken();

  if (savedToken) {
    if (!isTokenExpired(savedToken)) {
      console.log('Using valid saved token');
      return savedToken.access_token;
    }

    // Try to refresh
    if (savedToken.refresh_token) {
      try {
        console.log('Refreshing expired token...');
        const newToken = await refreshAccessToken(savedToken.refresh_token);
        saveToken(newToken);
        return newToken.access_token;
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }
  }

  // Need new authorization
  console.log('\n=== Spotify Authorization Required ===');
  console.log('Please visit this URL to authorize access:\n');

  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('show_dialog', 'true');

  console.log(authUrl.toString());
  console.log('\nAfter authorizing, you will be redirected to a URL.');
  console.log('Copy the "code" parameter from that URL and run:');
  console.log('  pnpm run setup:spotify -- <code>\n');

  throw new Error('Manual OAuth flow required. Please authorize and re-run with auth code.');
}

/**
 * Fetch recently played tracks from Spotify API
 *
 * NOTE: Spotify API limitations:
 * - Recently played: Max 50 tracks, last ~24 hours only
 * - No historical data beyond recent plays
 * - Top tracks: Gives most played over time periods, not individual plays
 */
async function fetchRecentlyPlayed(accessToken: string): Promise<SpotifyPlayHistory[]> {
  const allPlays: SpotifyPlayHistory[] = [];
  let url = `${API_BASE}/me/player/recently-played?limit=50`;

  console.log('Fetching recently played tracks...');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired or invalid. Please re-authenticate.');
      }
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.items || [];
    allPlays.push(...items);

    console.log(`Fetched ${items.length} recent plays`);

    // Note: Spotify's recently-played endpoint doesn't support pagination beyond the initial 50
    // It uses "before" and "after" cursors, but only returns last 50 tracks total

  } catch (error: any) {
    if (error.code === 429) {
      console.error('Rate limit exceeded. Please try again later.');
      throw error;
    }
    throw error;
  }

  console.log(`\nTotal plays fetched: ${allPlays.length}`);
  return allPlays;
}

/**
 * Generate mock Spotify listening data
 * Used when API access is not available
 */
function generateMockData(): SpotifyPlayHistory[] {
  console.log('\n=== Generating Mock Spotify Data ===');

  const mockArtists = [
    'Radiohead', 'The National', 'Bon Iver', 'Arcade Fire', 'Fleet Foxes',
    'Sufjan Stevens', 'LCD Soundsystem', 'Vampire Weekend', 'The Strokes',
    'Beach House', 'Tame Impala', 'MGMT', 'Phoebe Bridgers', 'Taylor Swift',
    'Kendrick Lamar', 'Frank Ocean', 'SZA', 'Tyler, The Creator'
  ];

  const mockTracks = [
    'Karma Police', 'Bloodbuzz Ohio', 'Holocene', 'Wake Up', 'White Winter Hymnal',
    'Chicago', 'All My Friends', 'Oxford Comma', 'Reptilia', 'Space Song',
    'Let It Happen', 'Kids', 'Motion Sickness', 'Anti-Hero', 'HUMBLE.',
    'Ivy', 'Good Days', 'EARFQUAKE', 'The Less I Know The Better', 'Mr. Brightside'
  ];

  const mockAlbums = [
    'OK Computer', 'High Violet', 'Bon Iver', 'Funeral', 'Fleet Foxes',
    'Illinois', 'Sound of Silver', 'Contra', 'Is This It', '7',
    'Currents', 'Oracular Spectacular', 'Stranger in the Alps', 'Midnights',
    'DAMN.', 'Blonde', 'SOS', 'IGOR', 'Lonerism', 'Hot Fuss'
  ];

  const plays: SpotifyPlayHistory[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Generate 200 plays over the last 90 days
  for (let i = 0; i < 200; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const timestamp = now - (daysAgo * dayMs);
    const playedAt = new Date(timestamp).toISOString();

    const artistIndex = Math.floor(Math.random() * mockArtists.length);
    const trackIndex = Math.floor(Math.random() * mockTracks.length);
    const albumIndex = Math.floor(Math.random() * mockAlbums.length);

    plays.push({
      track: {
        id: `mock_track_${i}`,
        name: mockTracks[trackIndex],
        artists: [{
          id: `mock_artist_${artistIndex}`,
          name: mockArtists[artistIndex],
        }],
        album: {
          id: `mock_album_${albumIndex}`,
          name: mockAlbums[albumIndex],
          release_date: '2020-01-01',
        },
        duration_ms: 180000 + Math.floor(Math.random() * 120000), // 3-5 minutes
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${i}`,
        },
      },
      played_at: playedAt,
    });
  }

  // Sort by timestamp
  plays.sort((a, b) =>
    new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  );

  console.log(`Generated ${plays.length} mock plays`);
  return plays;
}

/**
 * Transform Spotify play to Memory Shack format
 */
function transformPlay(play: SpotifyPlayHistory, source: 'api' | 'export' | 'mock'): CachedPlay | null {
  const timestamp = new Date(play.played_at).getTime();

  if (isNaN(timestamp)) {
    console.warn(`Invalid timestamp for play: ${play.played_at}`);
    return null;
  }

  const artistName = play.track.artists[0]?.name || 'Unknown Artist';
  const trackName = play.track.name;
  const albumName = play.track.album.name;

  return {
    id: `spotify_${play.played_at}_${play.track.id}`,
    timestamp,
    type: 'spotify_play',
    title: `${artistName} - ${trackName}`,
    metadata: {
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
      duration_ms: play.track.duration_ms,
      played_at: play.played_at,
      spotify_url: play.track.external_urls?.spotify,
      source: source === 'api' ? 'spotify_api' : 'spotify_export',
    },
    original: play,
  };
}

/**
 * Extract unique artists and albums
 */
function extractEntities(plays: CachedPlay[]): { artists: Set<string>; albums: Set<string> } {
  const artists = new Set<string>();
  const albums = new Set<string>();

  plays.forEach(play => {
    artists.add(play.metadata.artist_name);
    albums.add(play.metadata.album_name);
  });

  return { artists, albums };
}

/**
 * Validate cached data
 */
function validateCachedData(plays: CachedPlay[]): string[] {
  const errors: string[] = [];
  const playIds = new Set<string>();

  plays.forEach((play, index) => {
    // Check for valid timestamp
    if (!play.timestamp || isNaN(play.timestamp)) {
      errors.push(`Play ${index}: Invalid timestamp`);
    }

    // Check for duplicate IDs
    if (playIds.has(play.id)) {
      errors.push(`Play ${index}: Duplicate ID ${play.id}`);
    }
    playIds.add(play.id);

    // Check for reasonable timestamp (not in future, not before Spotify existed - 2006)
    const playDate = new Date(play.timestamp);
    const spotifyLaunch = new Date('2006-10-01');
    const now = new Date();

    if (playDate < spotifyLaunch) {
      errors.push(`Play ${index}: Date before Spotify launch (${playDate.toISOString()})`);
    }

    if (playDate > now) {
      errors.push(`Play ${index}: Date in future (${playDate.toISOString()})`);
    }

    // Check for required metadata
    if (!play.metadata.track_name || !play.metadata.artist_name) {
      errors.push(`Play ${index}: Missing track or artist name`);
    }
  });

  return errors;
}

/**
 * Main preparation function
 */
async function main() {
  console.log('=== Spotify Import Preparation ===\n');

  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let rawPlays: SpotifyPlayHistory[];
    let dataSource: 'api' | 'export' | 'mock' = 'mock';
    const limitations: string[] = [];

    // Try to fetch from Spotify API
    try {
      console.log('Step 1: Attempting to fetch from Spotify API...');
      const accessToken = await getAccessToken();
      rawPlays = await fetchRecentlyPlayed(accessToken);
      dataSource = 'api';

      // Document API limitations
      limitations.push('Spotify API only provides last 50 recently played tracks');
      limitations.push('No historical data beyond ~24 hours available via API');
      limitations.push('For full listening history, user must request Spotify data export');

    } catch (error) {
      console.warn(`\nAPI access failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log('Falling back to mock data generation...\n');

      rawPlays = generateMockData();
      dataSource = 'mock';

      limitations.push('Using mock data - API authentication not available');
      limitations.push('Real data requires OAuth setup or Spotify data export');
    }

    // Transform plays
    console.log('\nStep 2: Transforming plays to Memory Shack format...');
    const cachedPlays = rawPlays
      .map(play => transformPlay(play, dataSource))
      .filter((p): p is CachedPlay => p !== null);

    console.log(`Transformed ${cachedPlays.length} valid plays`);

    // Extract entities
    console.log('\nStep 3: Extracting unique artists and albums...');
    const { artists, albums } = extractEntities(cachedPlays);
    console.log(`Found ${artists.size} unique artists`);
    console.log(`Found ${albums.size} unique albums`);

    // Validate data
    console.log('\nStep 4: Validating cached data...');
    const validationErrors = validateCachedData(cachedPlays);

    if (validationErrors.length > 0) {
      console.warn(`\nValidation warnings (${validationErrors.length}):`);
      validationErrors.slice(0, 10).forEach(err => console.warn(`  - ${err}`));
      if (validationErrors.length > 10) {
        console.warn(`  ... and ${validationErrors.length - 10} more`);
      }
    }

    // Save cache file
    console.log('\nStep 5: Saving cache file...');
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedPlays, null, 2));
    console.log(`Cache saved to ${CACHE_FILE}`);

    // Calculate date range
    const timestamps = cachedPlays.map(p => p.timestamp);
    const startDate = new Date(Math.min(...timestamps)).toISOString();
    const endDate = new Date(Math.max(...timestamps)).toISOString();

    // Create import plan
    console.log('\nStep 6: Creating import plan...');
    const plan: ImportPlan = {
      ready: validationErrors.length === 0,
      totalPlays: cachedPlays.length,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      uniqueArtists: artists.size,
      uniqueAlbums: albums.size,
      dataSource,
      cacheFile: 'data/spotify-cache.json',
      errors: validationErrors,
      limitations,
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
    console.log(`Import plan saved to ${PLAN_FILE}`);

    // Summary
    console.log('\n=== Preparation Complete ===');
    console.log(`Data source: ${dataSource.toUpperCase()}`);
    console.log(`Total plays: ${plan.totalPlays}`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    console.log(`Unique artists: ${plan.uniqueArtists}`);
    console.log(`Unique albums: ${plan.uniqueAlbums}`);
    console.log(`Validation errors: ${validationErrors.length}`);
    console.log(`Ready for import: ${plan.ready ? 'YES' : 'NO'}`);

    if (limitations.length > 0) {
      console.log('\nLimitations:');
      limitations.forEach(limit => console.log(`  - ${limit}`));
    }

    if (plan.ready) {
      console.log('\nNext step: Run import script to write plays to database (Wave 2A)');
    } else {
      console.log('\nPlease fix validation errors before proceeding');
    }

  } catch (error) {
    console.error('\nError during preparation:', error);

    // Create error plan
    const errorPlan: ImportPlan = {
      ready: false,
      totalPlays: 0,
      dateRange: { start: '', end: '' },
      uniqueArtists: 0,
      uniqueAlbums: 0,
      dataSource: 'mock',
      cacheFile: 'data/spotify-cache.json',
      errors: [error instanceof Error ? error.message : String(error)],
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(PLAN_FILE, JSON.stringify(errorPlan, null, 2));
    console.log(`Error plan saved to ${PLAN_FILE}`);

    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

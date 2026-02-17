/**
 * Phase 5 Wave 2A: Real Spotify Import Preparation
 *
 * Parses real Spotify Extended Streaming History data export
 * and prepares it for import into Memory Shack.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Spotify export data location (Windows path, accessed via WSL)
const SPOTIFY_EXPORT_DIR = '/mnt/c/Users/bette/Downloads/spotify_extracted/Spotify Extended Streaming History';

// Output paths
const DATA_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(DATA_DIR, 'spotify-cache-real.json');
const PLAN_FILE = path.join(DATA_DIR, 'spotify-import-plan-real.json');

// Minimum play duration to count as a valid play (30 seconds)
const MIN_PLAY_DURATION_MS = 30000;

/**
 * Spotify Extended Streaming History schema
 */
interface SpotifyExportPlay {
  ts: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr?: string;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  audiobook_title: string | null;
  audiobook_uri: string | null;
  audiobook_chapter_uri: string | null;
  audiobook_chapter_title: string | null;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: string | null;
  incognito_mode: boolean;
}

/**
 * Memory Shack cached play format
 */
interface CachedPlay {
  id: string;
  timestamp: number;
  type: 'spotify_play';
  title: string;
  metadata: {
    track_name: string;
    artist_name: string;
    album_name: string;
    duration_ms: number;
    played_at: string;
    spotify_track_uri: string;
    platform: string;
    country: string;
    shuffle: boolean;
    skipped: boolean;
    offline: boolean;
    source: 'spotify_export';
  };
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
  dataSource: 'spotify_export';
  filesParsed: number;
  errors: string[];
  generatedAt: string;
  statistics: {
    totalDurationHours: number;
    avgPlayDurationMs: number;
    playsFiltered: {
      tooShort: number;
      missingMetadata: number;
      podcasts: number;
      audiobooks: number;
    };
  };
}

/**
 * Get list of audio streaming history files (skip video)
 */
function getAudioFiles(): string[] {
  const files = fs.readdirSync(SPOTIFY_EXPORT_DIR);

  return files
    .filter(f => f.startsWith('Streaming_History_Audio_') && f.endsWith('.json'))
    .sort(); // Sort to ensure consistent order
}

/**
 * Transform Spotify export play to Memory Shack format
 */
function transformPlay(play: SpotifyExportPlay): CachedPlay | null {
  // Filter out podcasts and audiobooks (we only want music)
  if (play.episode_name || play.audiobook_title) {
    return null;
  }

  // Filter out plays with missing metadata
  if (!play.master_metadata_track_name || !play.master_metadata_album_artist_name) {
    return null;
  }

  // Filter out very short plays (likely skips or accidental plays)
  if (play.ms_played < MIN_PLAY_DURATION_MS) {
    return null;
  }

  const timestamp = new Date(play.ts).getTime();

  if (isNaN(timestamp)) {
    console.warn(`Invalid timestamp: ${play.ts}`);
    return null;
  }

  const trackName = play.master_metadata_track_name;
  const artistName = play.master_metadata_album_artist_name;
  const albumName = play.master_metadata_album_album_name || 'Unknown Album';
  const trackUri = play.spotify_track_uri || 'unknown';

  return {
    id: `spotify_${play.ts}_${trackUri.replace(/:/g, '_')}`,
    timestamp,
    type: 'spotify_play',
    title: `${artistName} - ${trackName}`,
    metadata: {
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
      duration_ms: play.ms_played,
      played_at: play.ts,
      spotify_track_uri: trackUri,
      platform: play.platform,
      country: play.conn_country,
      shuffle: play.shuffle,
      skipped: play.skipped,
      offline: play.offline,
      source: 'spotify_export',
    },
  };
}

/**
 * Parse all Spotify export files
 */
function parseSpotifyFiles(): {
  plays: CachedPlay[];
  stats: {
    totalRaw: number;
    tooShort: number;
    missingMetadata: number;
    podcasts: number;
    audiobooks: number;
  };
} {
  const files = getAudioFiles();
  console.log(`Found ${files.length} audio streaming history files\n`);

  const allPlays: CachedPlay[] = [];
  const seenIds = new Set<string>();

  let totalRaw = 0;
  let tooShort = 0;
  let missingMetadata = 0;
  let podcasts = 0;
  let audiobooks = 0;

  for (const file of files) {
    const filePath = path.join(SPOTIFY_EXPORT_DIR, file);
    console.log(`Parsing ${file}...`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const rawPlays = JSON.parse(content) as SpotifyExportPlay[];

      totalRaw += rawPlays.length;
      console.log(`  Read ${rawPlays.length} raw plays`);

      let fileValidPlays = 0;

      for (const rawPlay of rawPlays) {
        // Track filtering reasons
        if (rawPlay.episode_name || rawPlay.spotify_episode_uri) {
          podcasts++;
          continue;
        }

        if (rawPlay.audiobook_title || rawPlay.audiobook_uri) {
          audiobooks++;
          continue;
        }

        if (!rawPlay.master_metadata_track_name || !rawPlay.master_metadata_album_artist_name) {
          missingMetadata++;
          continue;
        }

        if (rawPlay.ms_played < MIN_PLAY_DURATION_MS) {
          tooShort++;
          continue;
        }

        const transformed = transformPlay(rawPlay);
        if (transformed) {
          // Check for duplicates
          if (seenIds.has(transformed.id)) {
            continue;
          }

          seenIds.add(transformed.id);
          allPlays.push(transformed);
          fileValidPlays++;
        }
      }

      console.log(`  Extracted ${fileValidPlays} valid plays\n`);
    } catch (error) {
      console.error(`  Error parsing ${file}:`, error);
    }
  }

  console.log(`\n=== Parsing Summary ===`);
  console.log(`Total raw plays: ${totalRaw}`);
  console.log(`Valid plays: ${allPlays.length}`);
  console.log(`Filtered out: ${totalRaw - allPlays.length}`);
  console.log(`  - Too short (<30s): ${tooShort}`);
  console.log(`  - Missing metadata: ${missingMetadata}`);
  console.log(`  - Podcasts: ${podcasts}`);
  console.log(`  - Audiobooks: ${audiobooks}`);

  return {
    plays: allPlays,
    stats: {
      totalRaw,
      tooShort,
      missingMetadata,
      podcasts,
      audiobooks,
    },
  };
}

/**
 * Extract unique artists and albums
 */
function extractEntities(plays: CachedPlay[]): {
  artists: Map<string, { playCount: number; albums: Set<string> }>;
  albums: Set<string>;
} {
  const artists = new Map<string, { playCount: number; albums: Set<string> }>();
  const albums = new Set<string>();

  plays.forEach(play => {
    const artistName = play.metadata.artist_name;
    const albumName = play.metadata.album_name;

    // Track artist stats
    if (!artists.has(artistName)) {
      artists.set(artistName, { playCount: 0, albums: new Set() });
    }
    const artistData = artists.get(artistName)!;
    artistData.playCount++;
    artistData.albums.add(albumName);

    // Track albums
    albums.add(albumName);
  });

  return { artists, albums };
}

/**
 * Validate cached data
 */
function validateCachedData(plays: CachedPlay[]): string[] {
  const errors: string[] = [];
  const playIds = new Set<string>();

  const spotifyLaunch = new Date('2006-10-01').getTime();
  const now = Date.now();

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

    // Check for reasonable timestamp
    if (play.timestamp < spotifyLaunch) {
      errors.push(`Play ${index}: Date before Spotify launch (${new Date(play.timestamp).toISOString()})`);
    }

    if (play.timestamp > now) {
      errors.push(`Play ${index}: Date in future (${new Date(play.timestamp).toISOString()})`);
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
  console.log('=== Real Spotify Import Preparation ===\n');

  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Check if export directory exists
    if (!fs.existsSync(SPOTIFY_EXPORT_DIR)) {
      throw new Error(`Spotify export directory not found: ${SPOTIFY_EXPORT_DIR}`);
    }

    // Parse all Spotify files
    console.log('Step 1: Parsing Spotify export files...\n');
    const { plays, stats } = parseSpotifyFiles();

    // Sort by timestamp
    plays.sort((a, b) => a.timestamp - b.timestamp);

    // Extract entities
    console.log('\nStep 2: Extracting unique artists and albums...');
    const { artists, albums } = extractEntities(plays);
    console.log(`Found ${artists.size} unique artists`);
    console.log(`Found ${albums.size} unique albums`);

    // Calculate statistics
    const totalDurationMs = plays.reduce((sum, play) => sum + play.metadata.duration_ms, 0);
    const totalDurationHours = Math.round((totalDurationMs / (1000 * 60 * 60)) * 100) / 100;
    const avgPlayDurationMs = Math.round(totalDurationMs / plays.length);

    console.log(`Total listening time: ${totalDurationHours} hours`);
    console.log(`Average play duration: ${Math.round(avgPlayDurationMs / 1000)} seconds`);

    // Validate data
    console.log('\nStep 3: Validating cached data...');
    const validationErrors = validateCachedData(plays);

    if (validationErrors.length > 0) {
      console.warn(`\nValidation errors (${validationErrors.length}):`);
      validationErrors.slice(0, 10).forEach(err => console.warn(`  - ${err}`));
      if (validationErrors.length > 10) {
        console.warn(`  ... and ${validationErrors.length - 10} more`);
      }
    } else {
      console.log('No validation errors!');
    }

    // Save cache file
    console.log('\nStep 4: Saving cache file...');
    fs.writeFileSync(CACHE_FILE, JSON.stringify(plays, null, 2));
    console.log(`Cache saved to ${CACHE_FILE}`);

    const cacheSizeMB = Math.round((fs.statSync(CACHE_FILE).size / (1024 * 1024)) * 100) / 100;
    console.log(`Cache file size: ${cacheSizeMB} MB`);

    // Calculate date range
    const startDate = new Date(plays[0].timestamp).toISOString().split('T')[0];
    const endDate = new Date(plays[plays.length - 1].timestamp).toISOString().split('T')[0];

    // Create import plan
    console.log('\nStep 5: Creating import plan...');
    const plan: ImportPlan = {
      ready: validationErrors.length === 0,
      totalPlays: plays.length,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      uniqueArtists: artists.size,
      uniqueAlbums: albums.size,
      dataSource: 'spotify_export',
      filesParsed: getAudioFiles().length,
      errors: validationErrors,
      generatedAt: new Date().toISOString(),
      statistics: {
        totalDurationHours,
        avgPlayDurationMs,
        playsFiltered: {
          tooShort: stats.tooShort,
          missingMetadata: stats.missingMetadata,
          podcasts: stats.podcasts,
          audiobooks: stats.audiobooks,
        },
      },
    };

    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
    console.log(`Import plan saved to ${PLAN_FILE}`);

    // Top artists
    const topArtists = Array.from(artists.entries())
      .sort((a, b) => b[1].playCount - a[1].playCount)
      .slice(0, 10);

    // Summary
    console.log('\n=== Preparation Complete ===');
    console.log(`Data source: Spotify Extended Streaming History`);
    console.log(`Total plays: ${plan.totalPlays.toLocaleString()}`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    console.log(`Unique artists: ${plan.uniqueArtists.toLocaleString()}`);
    console.log(`Unique albums: ${plan.uniqueAlbums.toLocaleString()}`);
    console.log(`Total listening time: ${totalDurationHours.toLocaleString()} hours`);
    console.log(`Validation errors: ${validationErrors.length}`);
    console.log(`Ready for import: ${plan.ready ? 'YES' : 'NO'}`);

    console.log('\nTop 10 Artists:');
    topArtists.forEach(([artist, data], index) => {
      console.log(`  ${index + 1}. ${artist}: ${data.playCount.toLocaleString()} plays (${data.albums.size} albums)`);
    });

    if (plan.ready) {
      console.log('\nNext step: Run import script to write plays to database');
      console.log('  pnpm run import:spotify:real');
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
      dataSource: 'spotify_export',
      filesParsed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      generatedAt: new Date().toISOString(),
      statistics: {
        totalDurationHours: 0,
        avgPlayDurationMs: 0,
        playsFiltered: {
          tooShort: 0,
          missingMetadata: 0,
          podcasts: 0,
          audiobooks: 0,
        },
      },
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

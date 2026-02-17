/**
 * Real Spotify Import Execution Script
 *
 * Executes the prepared Spotify import:
 * 1. Creates Artist entities
 * 2. Imports timeline events in batches
 * 3. Verifies data integrity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeTimelineEvent } from '../src/storage/timeline.js';
import { createEntity, getEntity } from '../src/storage/entity.js';
import { getStats, getDB } from '../src/storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SPOTIFY_CACHE_FILE = path.join(DATA_DIR, 'spotify-cache-real.json');
const SPOTIFY_PLAN_FILE = path.join(DATA_DIR, 'spotify-import-plan-real.json');

const BATCH_SIZE = 1000; // Larger batches for simpler schema

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

interface SpotifyImportPlan {
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
 * Load Spotify data
 */
function loadSpotifyData(): { plays: CachedPlay[]; plan: SpotifyImportPlan } {
  console.log('Loading Spotify data...');

  if (!fs.existsSync(SPOTIFY_CACHE_FILE)) {
    throw new Error(`Cache file not found: ${SPOTIFY_CACHE_FILE}. Run preparation script first.`);
  }

  if (!fs.existsSync(SPOTIFY_PLAN_FILE)) {
    throw new Error(`Import plan not found: ${SPOTIFY_PLAN_FILE}. Run preparation script first.`);
  }

  const plays = JSON.parse(fs.readFileSync(SPOTIFY_CACHE_FILE, 'utf-8')) as CachedPlay[];
  const plan = JSON.parse(fs.readFileSync(SPOTIFY_PLAN_FILE, 'utf-8')) as SpotifyImportPlan;

  console.log(`Loaded ${plays.length.toLocaleString()} plays`);
  console.log(`Import plan ready: ${plan.ready}`);

  return { plays, plan };
}

/**
 * Extract artist statistics from plays
 */
function extractArtistStats(plays: CachedPlay[]): Map<string, {
  playCount: number;
  totalDurationMs: number;
  firstPlayed: string;
  lastPlayed: string;
  albums: Set<string>;
}> {
  const artistStats = new Map<string, {
    playCount: number;
    totalDurationMs: number;
    firstPlayed: string;
    lastPlayed: string;
    albums: Set<string>;
  }>();

  plays.forEach(play => {
    const artist = play.metadata.artist_name;

    if (!artistStats.has(artist)) {
      artistStats.set(artist, {
        playCount: 0,
        totalDurationMs: 0,
        firstPlayed: play.metadata.played_at,
        lastPlayed: play.metadata.played_at,
        albums: new Set(),
      });
    }

    const stats = artistStats.get(artist)!;
    stats.playCount++;
    stats.totalDurationMs += play.metadata.duration_ms;
    stats.albums.add(play.metadata.album_name);

    // Update first/last played
    if (play.metadata.played_at < stats.firstPlayed) {
      stats.firstPlayed = play.metadata.played_at;
    }
    if (play.metadata.played_at > stats.lastPlayed) {
      stats.lastPlayed = play.metadata.played_at;
    }
  });

  return artistStats;
}

/**
 * Create Artist entities
 */
function createArtistEntities(plays: CachedPlay[]): void {
  console.log('\n=== Creating Artist Entities ===');

  const artistStats = extractArtistStats(plays);
  console.log(`Creating ${artistStats.size.toLocaleString()} artist entities...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Sort artists by play count for better logging
  const sortedArtists = Array.from(artistStats.entries())
    .sort((a, b) => b[1].playCount - a[1].playCount);

  for (const [artistName, stats] of sortedArtists) {
    try {
      createEntity({
        type: 'person',
        name: artistName,
        properties: {
          role: 'artist',
          play_count: stats.playCount,
          total_duration_ms: stats.totalDurationMs,
          total_duration_hours: Math.round((stats.totalDurationMs / (1000 * 60 * 60)) * 100) / 100,
          first_played: stats.firstPlayed,
          last_played: stats.lastPlayed,
          album_count: stats.albums.size,
          source: 'spotify_import',
        },
      }, 'spotify_importer');

      created++;

      // Log top 10 artists
      if (created <= 10) {
        console.log(`✓ Created artist: ${artistName} (${stats.playCount.toLocaleString()} plays, ${stats.albums.size} albums)`);
      }
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        skipped++;
      } else {
        console.error(`  Error creating ${artistName}:`, error.message);
        errors++;
      }
    }
  }

  console.log(`\nArtist entities summary:`);
  console.log(`  Created: ${created.toLocaleString()}`);
  if (skipped > 0) console.log(`  Skipped (already exist): ${skipped.toLocaleString()}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

/**
 * Import plays in batches
 */
function importPlays(plays: CachedPlay[]): number {
  console.log('\n=== Importing Timeline Events ===');

  const totalBatches = Math.ceil(plays.length / BATCH_SIZE);
  let importedCount = 0;
  let errorCount = 0;

  const startTime = Date.now();

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, plays.length);
    const batch = plays.slice(start, end);

    // Log progress every 10 batches
    if (batchNum % 10 === 0 || batchNum === totalBatches - 1) {
      const progress = ((end / plays.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Batch ${batchNum + 1}/${totalBatches}: Importing plays ${start + 1}-${end} (${progress}%, ${elapsed}s elapsed)`);
    }

    for (const play of batch) {
      try {
        storeTimelineEvent({
          timestamp: play.timestamp,
          type: 'spotify_play',
          title: play.title,
          namespace: 'spotify',
          metadata: play.metadata,
        });

        importedCount++;
      } catch (error: any) {
        console.error(`  Error importing play ${play.id}: ${error.message}`);
        errorCount++;
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const playsPerSecond = Math.round(importedCount / parseFloat(totalTime));

  console.log(`\n✓ Import complete in ${totalTime}s (${playsPerSecond} plays/sec)`);
  console.log(`  Imported: ${importedCount.toLocaleString()}`);
  if (errorCount > 0) console.log(`  Errors: ${errorCount}`);

  return importedCount;
}

/**
 * Create database indexes for better query performance
 */
function createIndexes(): void {
  console.log('\n=== Creating Database Indexes ===');

  const db = getDB();

  const indexes = [
    {
      name: 'idx_spotify_artist',
      sql: `CREATE INDEX IF NOT EXISTS idx_spotify_artist
            ON timeline_events(json_extract(metadata, '$.artist_name'))
            WHERE type = 'spotify_play'`,
    },
    {
      name: 'idx_spotify_date',
      sql: `CREATE INDEX IF NOT EXISTS idx_spotify_date
            ON timeline_events(date)
            WHERE type = 'spotify_play'`,
    },
    {
      name: 'idx_spotify_album',
      sql: `CREATE INDEX IF NOT EXISTS idx_spotify_album
            ON timeline_events(json_extract(metadata, '$.album_name'))
            WHERE type = 'spotify_play'`,
    },
  ];

  for (const index of indexes) {
    try {
      db.exec(index.sql);
      console.log(`✓ Created index: ${index.name}`);
    } catch (error: any) {
      console.error(`  Error creating ${index.name}:`, error.message);
    }
  }
}

/**
 * Verify import integrity
 */
function verifyImport(expectedPlays: number, expectedArtists: number): void {
  console.log('\n=== Verifying Import ===');

  const stats = getStats();

  console.log('Database statistics:');
  console.log(`  Events: ${stats.eventCount.toLocaleString()}`);
  console.log(`  Entities: ${stats.entityCount.toLocaleString()}`);
  console.log(`  Relations: ${stats.relationCount}`);

  // Check Spotify event count
  const db = getDB();
  const spotifyCountResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM timeline_events
    WHERE type = 'spotify_play'
  `).get() as { count: number };

  const spotifyCount = spotifyCountResult.count;

  console.log(`\nSpotify-specific counts:`);
  console.log(`  Spotify plays: ${spotifyCount.toLocaleString()}`);

  const eventsMismatch = spotifyCount !== expectedPlays;
  if (eventsMismatch) {
    console.log(`  ⚠️  Expected ${expectedPlays.toLocaleString()} plays, found ${spotifyCount.toLocaleString()}`);
  } else {
    console.log(`  ✓ Play count matches expected (${expectedPlays.toLocaleString()})`);
  }

  // Check artist entity count
  const artistCountResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM entities
    WHERE type = 'person' AND json_extract(properties, '$.role') = 'artist'
  `).get() as { count: number };

  const artistCount = artistCountResult.count;
  console.log(`  Artist entities: ${artistCount.toLocaleString()}`);

  const artistsMismatch = artistCount !== expectedArtists;
  if (artistsMismatch) {
    console.log(`  ⚠️  Expected ${expectedArtists.toLocaleString()} artists, found ${artistCount.toLocaleString()}`);
  } else {
    console.log(`  ✓ Artist count matches expected (${expectedArtists.toLocaleString()})`);
  }

  // Query insights
  console.log('\n=== Sample Insights ===');

  // Top artists
  const topArtists = db.prepare(`
    SELECT
      json_extract(metadata, '$.artist_name') as artist,
      COUNT(*) as plays,
      ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as hours
    FROM timeline_events
    WHERE type = 'spotify_play'
    GROUP BY artist
    ORDER BY plays DESC
    LIMIT 5
  `).all() as Array<{ artist: string; plays: number; hours: number }>;

  console.log('\nTop 5 Artists:');
  topArtists.forEach((artist, index) => {
    console.log(`  ${index + 1}. ${artist.artist}: ${artist.plays.toLocaleString()} plays, ${artist.hours} hours`);
  });

  // Listening by year
  const byYear = db.prepare(`
    SELECT
      strftime('%Y', date) as year,
      COUNT(*) as plays,
      ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as hours
    FROM timeline_events
    WHERE type = 'spotify_play'
    GROUP BY year
    ORDER BY year ASC
  `).all() as Array<{ year: string; plays: number; hours: number }>;

  console.log('\nListening by Year:');
  byYear.forEach(row => {
    console.log(`  ${row.year}: ${row.plays.toLocaleString()} plays, ${row.hours} hours`);
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('=== Spotify Import Execution ===\n');

  try {
    // Get initial stats
    const initialStats = getStats();
    console.log('Initial database state:');
    console.log(`  Events: ${initialStats.eventCount.toLocaleString()}`);
    console.log(`  Entities: ${initialStats.entityCount.toLocaleString()}`);
    console.log(`  Relations: ${initialStats.relationCount}\n`);

    // Load data
    const { plays, plan } = loadSpotifyData();

    if (!plan.ready) {
      throw new Error('Import plan is not ready. Please run preparation script first.');
    }

    console.log('\nImport plan summary:');
    console.log(`  Total plays: ${plan.totalPlays.toLocaleString()}`);
    console.log(`  Date range: ${plan.dateRange.start} to ${plan.dateRange.end}`);
    console.log(`  Unique artists: ${plan.uniqueArtists.toLocaleString()}`);
    console.log(`  Unique albums: ${plan.uniqueAlbums.toLocaleString()}`);
    console.log(`  Total listening time: ${plan.statistics.totalDurationHours.toLocaleString()} hours`);

    // Create artist entities
    createArtistEntities(plays);

    // Import timeline events
    const importedCount = importPlays(plays);

    // Create indexes for better performance
    createIndexes();

    // Verify import
    verifyImport(plan.totalPlays, plan.uniqueArtists);

    console.log('\n=== Import Complete ===');
    console.log(`Total plays imported: ${importedCount.toLocaleString()}`);
    console.log(`Date range: ${plan.dateRange.start} to ${plan.dateRange.end}`);
    console.log(`Total listening time: ${plan.statistics.totalDurationHours.toLocaleString()} hours`);

    const finalStats = getStats();
    console.log('\nFinal database state:');
    console.log(`  Events: ${finalStats.eventCount.toLocaleString()} (+${(finalStats.eventCount - initialStats.eventCount).toLocaleString()})`);
    console.log(`  Entities: ${finalStats.entityCount.toLocaleString()} (+${(finalStats.entityCount - initialStats.entityCount).toLocaleString()})`);
    console.log(`  Relations: ${finalStats.relationCount}`);

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

/**
 * Spotify Play Deduplication Script
 *
 * Removes duplicate Spotify plays from the database.
 * For each unique play (timestamp + track URI), keeps the event with the
 * earliest created_at timestamp and deletes all duplicates.
 *
 * Usage:
 *   pnpm dedupe:spotify           # Execute deduplication
 *   pnpm dedupe:spotify --dry-run # Preview changes without deleting
 */

import { getDB, initDB } from '../src/storage/db.js';

interface DuplicateGroup {
  play_key: string;
  total_count: number;
  ids: string[];
  created_at_timestamps: number[];
}

function deduplicateSpotify(dryRun: boolean = false): void {
  const db = initDB(false);

  console.log('=== Spotify Play Deduplication ===\n');

  // Get initial stats
  const initialCount = (db.prepare('SELECT COUNT(*) as count FROM timeline_events WHERE type = ?').get('spotify_play') as { count: number }).count;

  // Count unique plays by (played_at + spotify_track_uri)
  const uniqueCount = (db.prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT DISTINCT
        json_extract(metadata, '$.played_at') || ':' || json_extract(metadata, '$.spotify_track_uri') as play_key
      FROM timeline_events
      WHERE type = 'spotify_play'
        AND json_extract(metadata, '$.played_at') IS NOT NULL
        AND json_extract(metadata, '$.spotify_track_uri') IS NOT NULL
    )
  `).get() as { count: number }).count;

  console.log(`Initial state:`);
  console.log(`  Total Spotify plays: ${initialCount.toLocaleString()}`);
  console.log(`  Unique plays: ${uniqueCount.toLocaleString()}`);
  console.log(`  Duplicates to remove: ${(initialCount - uniqueCount).toLocaleString()}\n`);

  if (initialCount === uniqueCount) {
    console.log('No duplicates found. Exiting.');
    return;
  }

  // Find all duplicate groups
  const duplicateGroups = db.prepare(`
    SELECT
      json_extract(metadata, '$.played_at') || ':' || json_extract(metadata, '$.spotify_track_uri') as play_key,
      COUNT(*) as total_count
    FROM timeline_events
    WHERE type = 'spotify_play'
      AND json_extract(metadata, '$.played_at') IS NOT NULL
      AND json_extract(metadata, '$.spotify_track_uri') IS NOT NULL
    GROUP BY play_key
    HAVING total_count > 1
    ORDER BY total_count DESC
  `).all() as Array<{ play_key: string; total_count: number }>;

  console.log(`Found ${duplicateGroups.length.toLocaleString()} plays with duplicates:\n`);

  // Show sample of duplicates
  const sampleSize = Math.min(10, duplicateGroups.length);
  console.log(`Sample (showing first ${sampleSize}):`);
  duplicateGroups.slice(0, sampleSize).forEach((group, idx) => {
    // Extract track info from first few characters for display
    const playInfo = group.play_key.substring(0, 50);
    console.log(`  ${idx + 1}. ${playInfo}...: ${group.total_count} occurrences`);
  });
  console.log('');

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Process each duplicate group
  let totalDeleted = 0;
  const deleteStmt = db.prepare('DELETE FROM timeline_events WHERE id = ?');

  if (dryRun) {
    // In dry run mode, just count what would be deleted
    for (const group of duplicateGroups) {
      // Extract played_at and track_uri from play_key
      const [played_at, ...uriParts] = group.play_key.split(':');
      const track_uri = uriParts.join(':'); // Rejoin in case URI contains colons

      // Get all events for this unique play
      const events = db.prepare(`
        SELECT id, created_at, timestamp, date
        FROM timeline_events
        WHERE type = 'spotify_play'
          AND json_extract(metadata, '$.played_at') = ?
          AND json_extract(metadata, '$.spotify_track_uri') = ?
        ORDER BY created_at ASC
      `).all(played_at, track_uri) as Array<{
        id: string;
        created_at: number;
        timestamp: number;
        date: string;
      }>;

      // Would delete all except the first (oldest)
      totalDeleted += events.length - 1;
    }
  } else {
    // Use transaction for atomic operation
    const deduplicateTransaction = db.transaction(() => {
      let processed = 0;

      for (const group of duplicateGroups) {
        // Extract played_at and track_uri from play_key
        const [played_at, ...uriParts] = group.play_key.split(':');
        const track_uri = uriParts.join(':'); // Rejoin in case URI contains colons

        // Get all events for this unique play, ordered by created_at (oldest first)
        const events = db.prepare(`
          SELECT id, created_at, timestamp, date
          FROM timeline_events
          WHERE type = 'spotify_play'
            AND json_extract(metadata, '$.played_at') = ?
            AND json_extract(metadata, '$.spotify_track_uri') = ?
          ORDER BY created_at ASC
        `).all(played_at, track_uri) as Array<{
          id: string;
          created_at: number;
          timestamp: number;
          date: string;
        }>;

        // Keep the first one (oldest), delete the rest
        const toKeep = events[0];
        const toDelete = events.slice(1);

        for (const event of toDelete) {
          deleteStmt.run(event.id);
          totalDeleted++;
        }

        processed++;

        // Show progress every 1000 plays
        if (processed % 1000 === 0) {
          process.stdout.write(`\rProcessing... ${totalDeleted.toLocaleString()} duplicates removed (${processed.toLocaleString()}/${duplicateGroups.length.toLocaleString()} groups)`);
        }
      }
    });

    console.log('Executing deduplication...');
    const startTime = Date.now();
    deduplicateTransaction();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nCompleted in ${elapsed}s\n`);
  }

  // Get final stats
  const finalCount = (db.prepare('SELECT COUNT(*) as count FROM timeline_events WHERE type = ?').get('spotify_play') as { count: number }).count;
  const finalUnique = (db.prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT DISTINCT
        json_extract(metadata, '$.played_at') || ':' || json_extract(metadata, '$.spotify_track_uri') as play_key
      FROM timeline_events
      WHERE type = 'spotify_play'
        AND json_extract(metadata, '$.played_at') IS NOT NULL
        AND json_extract(metadata, '$.spotify_track_uri') IS NOT NULL
    )
  `).get() as { count: number }).count;

  console.log('=== Summary ===');
  if (dryRun) {
    console.log('DRY RUN - No changes were made\n');
    console.log('Would delete:');
    console.log(`  ${totalDeleted.toLocaleString()} duplicate events`);
    console.log('\nFinal state (predicted):');
    console.log(`  Total Spotify plays: ${initialCount.toLocaleString()} -> ${(initialCount - totalDeleted).toLocaleString()}`);
    console.log(`  Unique plays: ${uniqueCount.toLocaleString()} (unchanged)`);
  } else {
    console.log(`Deleted: ${totalDeleted.toLocaleString()} duplicate events\n`);
    console.log('Final state:');
    console.log(`  Total Spotify plays: ${initialCount.toLocaleString()} -> ${finalCount.toLocaleString()}`);
    console.log(`  Unique plays: ${uniqueCount.toLocaleString()} -> ${finalUnique.toLocaleString()}`);

    if (finalCount === finalUnique) {
      console.log('\n✓ Success! All duplicates removed.');
    } else {
      console.log(`\n⚠ Warning: Still have ${(finalCount - finalUnique).toLocaleString()} duplicates remaining.`);
    }

    // Recommend VACUUM
    console.log('\nRecommendation: Run VACUUM to reclaim disk space:');
    console.log('  sqlite3 data/memory.db "VACUUM;"');
  }

  db.close();
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run deduplication
deduplicateSpotify(dryRun);

/**
 * Fast Spotify Deduplication Script
 * Uses single bulk DELETE with ROW_NUMBER window function
 *
 * Strategy: Keep the oldest record (earliest created_at) for each unique play
 * Unique play = combination of (played_at timestamp, spotify_track_uri)
 */

import { getDB } from '../src/storage/db.js';

async function main() {
  console.log('=== Fast Spotify Deduplication ===\n');

  const db = getDB();

  // Get initial counts
  const initialCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM timeline_events
    WHERE type = 'spotify_play'
  `).get() as { count: number };

  const uniqueCount = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT DISTINCT
        json_extract(metadata, '$.played_at') || ':' || json_extract(metadata, '$.spotify_track_uri') as play_key
      FROM timeline_events
      WHERE type = 'spotify_play'
    )
  `).get() as { count: number };

  console.log('Initial state:');
  console.log(`  Total Spotify plays: ${initialCount.count.toLocaleString()}`);
  console.log(`  Unique plays: ${uniqueCount.count.toLocaleString()}`);
  console.log(`  Duplicates to remove: ${(initialCount.count - uniqueCount.count).toLocaleString()}\n`);

  if (initialCount.count === uniqueCount.count) {
    console.log('✓ No duplicates found. Database is already clean.\n');
    return;
  }

  console.log('Executing bulk DELETE with window function...');
  const startTime = Date.now();

  // Use ROW_NUMBER window function to identify duplicates
  // Keep row_num = 1 (oldest created_at), delete all others
  const deleteQuery = `
    DELETE FROM timeline_events
    WHERE id IN (
      SELECT id FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY
              json_extract(metadata, '$.played_at'),
              json_extract(metadata, '$.spotify_track_uri')
            ORDER BY created_at ASC
          ) as row_num
        FROM timeline_events
        WHERE type = 'spotify_play'
      )
      WHERE row_num > 1
    )
  `;

  const result = db.prepare(deleteQuery).run();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`✓ Deduplication complete in ${elapsed}s`);
  console.log(`  Deleted: ${result.changes.toLocaleString()} duplicate events\n`);

  // Verify results
  const finalCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM timeline_events
    WHERE type = 'spotify_play'
  `).get() as { count: number };

  const finalUnique = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT DISTINCT
        json_extract(metadata, '$.played_at') || ':' || json_extract(metadata, '$.spotify_track_uri') as play_key
      FROM timeline_events
      WHERE type = 'spotify_play'
    )
  `).get() as { count: number };

  console.log('Final state:');
  console.log(`  Total Spotify plays: ${finalCount.count.toLocaleString()}`);
  console.log(`  Unique plays: ${finalUnique.count.toLocaleString()}`);

  if (finalCount.count === finalUnique.count) {
    console.log('  ✓ Database is now clean (no duplicates)\n');
  } else {
    console.log(`  ⚠️  Still ${(finalCount.count - finalUnique.count).toLocaleString()} duplicates remaining\n`);
  }

  // Show overall stats
  const allStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM timeline_events) as total_events,
      (SELECT COUNT(*) FROM timeline_events WHERE type = 'jira_ticket') as jira_tickets,
      (SELECT COUNT(*) FROM timeline_events WHERE type = 'spotify_play') as spotify_plays
  `).get() as { total_events: number; jira_tickets: number; spotify_plays: number };

  console.log('Database summary:');
  console.log(`  Total events: ${allStats.total_events.toLocaleString()}`);
  console.log(`  JIRA tickets: ${allStats.jira_tickets.toLocaleString()}`);
  console.log(`  Spotify plays: ${allStats.spotify_plays.toLocaleString()}\n`);

  console.log('✓ Deduplication successful!\n');
  console.log('Next step: Run VACUUM to reclaim disk space:');
  console.log('  pnpm exec tsx -e "import Database from \'better-sqlite3\'; const db = new Database(\'data/memory.db\'); db.exec(\'VACUUM\'); console.log(\'✓ Database vacuumed\'); db.close();"\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Deduplication failed:', error);
    process.exit(1);
  });
}

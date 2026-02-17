/**
 * Deduplicate Spotify plays based on played_at timestamp and track URI
 */
import { getDB } from './src/storage/db.js';

const db = getDB();

console.log('=== Deduplicating Spotify Plays ===\n');

// Get initial count
const initialCount = db.prepare(`
  SELECT COUNT(*) as count FROM timeline_events WHERE type = 'spotify_play'
`).get() as { count: number };

console.log(`Initial Spotify plays: ${initialCount.count.toLocaleString()}\n`);

// Find duplicates
const duplicates = db.prepare(`
  SELECT
    json_extract(metadata, '$.played_at') as played_at,
    json_extract(metadata, '$.spotify_track_uri') as track_uri,
    COUNT(*) as count,
    MIN(id) as keep_id
  FROM timeline_events
  WHERE type = 'spotify_play'
  GROUP BY played_at, track_uri
  HAVING count > 1
`).all() as Array<{ played_at: string; track_uri: string; count: number; keep_id: number }>;

console.log(`Found ${duplicates.length.toLocaleString()} duplicate groups\n`);

if (duplicates.length === 0) {
  console.log('✓ No duplicates to remove');
  process.exit(0);
}

// Show sample duplicates
console.log('Sample duplicates:');
duplicates.slice(0, 5).forEach(dup => {
  console.log(`  ${dup.played_at}: ${dup.count} copies (keeping ID ${dup.keep_id})`);
});
console.log('');

// Start transaction
db.exec('BEGIN TRANSACTION');

let totalDeleted = 0;

try {
  // For each duplicate group, delete all except the one with MIN(id)
  for (const dup of duplicates) {
    const deleted = db.prepare(`
      DELETE FROM timeline_events
      WHERE type = 'spotify_play'
        AND json_extract(metadata, '$.played_at') = ?
        AND json_extract(metadata, '$.spotify_track_uri') = ?
        AND id != ?
    `).run(dup.played_at, dup.track_uri, dup.keep_id);

    totalDeleted += deleted.changes;
  }

  // Commit transaction
  db.exec('COMMIT');

  console.log(`✓ Deleted ${totalDeleted.toLocaleString()} duplicate plays\n`);

  // Get final count
  const finalCount = db.prepare(`
    SELECT COUNT(*) as count FROM timeline_events WHERE type = 'spotify_play'
  `).get() as { count: number };

  console.log(`Final Spotify plays: ${finalCount.count.toLocaleString()}`);
  console.log(`Removed: ${(initialCount.count - finalCount.count).toLocaleString()} duplicates`);

  // Verify no duplicates remain
  const remainingDuplicates = db.prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT
        json_extract(metadata, '$.played_at') as played_at,
        json_extract(metadata, '$.spotify_track_uri') as track_uri,
        COUNT(*) as cnt
      FROM timeline_events
      WHERE type = 'spotify_play'
      GROUP BY played_at, track_uri
      HAVING cnt > 1
    )
  `).get() as { count: number };

  if (remainingDuplicates.count === 0) {
    console.log('\n✓ Deduplication complete - no duplicates remain');
  } else {
    console.log(`\n⚠️  Warning: ${remainingDuplicates.count} duplicate groups still remain`);
  }

} catch (error) {
  db.exec('ROLLBACK');
  console.error('Error during deduplication:', error);
  process.exit(1);
}

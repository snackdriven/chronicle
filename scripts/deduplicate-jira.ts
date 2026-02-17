/**
 * JIRA Ticket Deduplication Script
 *
 * Removes duplicate JIRA tickets from the database.
 * For each ticket_key, keeps the event with the earliest created_at timestamp
 * and deletes all duplicates.
 *
 * Usage:
 *   pnpm dedupe:jira           # Execute deduplication
 *   pnpm dedupe:jira --dry-run # Preview changes without deleting
 */

import { getDB, initDB } from '../src/storage/db.js';

interface DuplicateGroup {
  ticket_key: string;
  total_count: number;
  ids: string[];
  created_at_timestamps: number[];
}

function deduplicateJIRA(dryRun: boolean = false): void {
  const db = initDB(false);

  console.log('=== JIRA Ticket Deduplication ===\n');

  // Get initial stats
  const initialCount = (db.prepare('SELECT COUNT(*) as count FROM timeline_events WHERE type = ?').get('jira_ticket') as { count: number }).count;
  const uniqueCount = (db.prepare(`
    SELECT COUNT(DISTINCT json_extract(metadata, '$.ticket_key')) as count
    FROM timeline_events
    WHERE type = 'jira_ticket'
  `).get() as { count: number }).count;

  console.log(`Initial state:`);
  console.log(`  Total JIRA events: ${initialCount}`);
  console.log(`  Unique tickets: ${uniqueCount}`);
  console.log(`  Duplicates to remove: ${initialCount - uniqueCount}\n`);

  if (initialCount === uniqueCount) {
    console.log('No duplicates found. Exiting.');
    return;
  }

  // Find all duplicate groups
  const duplicateGroups = db.prepare(`
    SELECT
      json_extract(metadata, '$.ticket_key') as ticket_key,
      COUNT(*) as total_count
    FROM timeline_events
    WHERE type = 'jira_ticket' AND json_extract(metadata, '$.ticket_key') IS NOT NULL
    GROUP BY ticket_key
    HAVING total_count > 1
    ORDER BY total_count DESC
  `).all() as Array<{ ticket_key: string; total_count: number }>;

  console.log(`Found ${duplicateGroups.length} tickets with duplicates:\n`);

  // Show sample of duplicates
  const sampleSize = Math.min(10, duplicateGroups.length);
  console.log(`Sample (showing first ${sampleSize}):`);
  duplicateGroups.slice(0, sampleSize).forEach(group => {
    console.log(`  ${group.ticket_key}: ${group.total_count} occurrences`);
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
      // Get all events for this ticket_key
      const events = db.prepare(`
        SELECT id, created_at, timestamp, date
        FROM timeline_events
        WHERE type = 'jira_ticket'
          AND json_extract(metadata, '$.ticket_key') = ?
        ORDER BY created_at ASC
      `).all(group.ticket_key) as Array<{
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
      for (const group of duplicateGroups) {
        // Get all events for this ticket_key, ordered by created_at (oldest first)
        const events = db.prepare(`
          SELECT id, created_at, timestamp, date
          FROM timeline_events
          WHERE type = 'jira_ticket'
            AND json_extract(metadata, '$.ticket_key') = ?
          ORDER BY created_at ASC
        `).all(group.ticket_key) as Array<{
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

        // Show progress every 100 tickets
        if (totalDeleted % 100 === 0 || group === duplicateGroups[duplicateGroups.length - 1]) {
          process.stdout.write(`\rProcessing... ${totalDeleted} duplicates removed`);
        }
      }
    });

    console.log('Executing deduplication...');
    deduplicateTransaction();
    console.log('\n');
  }

  // Get final stats
  const finalCount = (db.prepare('SELECT COUNT(*) as count FROM timeline_events WHERE type = ?').get('jira_ticket') as { count: number }).count;
  const finalUnique = (db.prepare(`
    SELECT COUNT(DISTINCT json_extract(metadata, '$.ticket_key')) as count
    FROM timeline_events
    WHERE type = 'jira_ticket'
  `).get() as { count: number }).count;

  console.log('=== Summary ===');
  if (dryRun) {
    console.log('DRY RUN - No changes were made\n');
    console.log('Would delete:');
    console.log(`  ${totalDeleted} duplicate events`);
    console.log('\nFinal state (predicted):');
    console.log(`  Total JIRA events: ${initialCount} -> ${initialCount - totalDeleted}`);
    console.log(`  Unique tickets: ${uniqueCount} (unchanged)`);
  } else {
    console.log(`Deleted: ${totalDeleted} duplicate events\n`);
    console.log('Final state:');
    console.log(`  Total JIRA events: ${initialCount} -> ${finalCount}`);
    console.log(`  Unique tickets: ${uniqueCount} -> ${finalUnique}`);

    if (finalCount === finalUnique) {
      console.log('\nSuccess! All duplicates removed.');
    } else {
      console.log(`\nWarning: Still have ${finalCount - finalUnique} duplicates remaining.`);
    }
  }

  db.close();
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run deduplication
deduplicateJIRA(dryRun);

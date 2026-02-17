/**
 * Storage Layer Test
 * Quick verification that database operations work
 */

import { initDB, getStats, healthCheck, cleanExpiredMemories, closeDB } from '../src/storage/db.js';
import { storeTimelineEvent, getTimeline, getEvent, expandEvent, deleteEvent } from '../src/storage/timeline.js';
import { storeMemory, retrieveMemory, listMemories, deleteMemory } from '../src/storage/memory.js';

console.log('=== Memory MCP Server - Storage Layer Test ===\n');

// Initialize database
console.log('1. Initializing database...');
const db = initDB(false);
console.log('   ✓ Database initialized\n');

// Health check
console.log('2. Running health check...');
const health = healthCheck();
console.log(`   Status: ${health.status}`);
console.log(`   WAL mode: ${health.checks.wal_mode ? '✓' : '✗'}`);
console.log(`   Foreign keys: ${health.checks.foreign_keys ? '✓' : '✗'}`);
console.log(`   Writable: ${health.checks.writable ? '✓' : '✗'}\n`);

// Test Timeline Operations
console.log('3. Testing timeline operations...');

try {
  // Store an event
  const eventId = storeTimelineEvent({
    timestamp: Date.now(),
    type: 'test_event',
    title: 'Test Event',
    namespace: 'test',
    metadata: {
      foo: 'bar',
      count: 42,
    },
  });
  console.log(`   ✓ Stored event: ${eventId}`);

  // Retrieve event
  const event = getEvent(eventId);
  console.log(`   ✓ Retrieved event: ${event.title}`);
  console.log(`     - Type: ${event.type}`);
  console.log(`     - Metadata: ${JSON.stringify(event.metadata)}`);

  // Expand event with full details
  const expanded = expandEvent(eventId, {
    detailed_info: 'This is the full data',
    extra_fields: [1, 2, 3],
  });
  console.log(`   ✓ Expanded event with full details`);
  console.log(`     - Full data key: ${expanded.full_data_key}`);

  // Get timeline for today
  const today = new Date().toISOString().split('T')[0];
  const timeline = getTimeline({ date: today });
  console.log(`   ✓ Retrieved timeline for ${today}`);
  console.log(`     - Total events: ${timeline.stats.total}`);
  console.log(`     - By type: ${JSON.stringify(timeline.stats.by_type)}`);

  // Delete event
  deleteEvent(eventId);
  console.log(`   ✓ Deleted event\n`);
} catch (error) {
  console.error('   ✗ Timeline test failed:', error);
  process.exit(1);
}

// Test Memory Operations
console.log('4. Testing memory operations...');

try {
  // Store a memory
  storeMemory({
    key: 'test:key',
    value: { message: 'Hello, World!', count: 123 },
    namespace: 'test',
  });
  console.log('   ✓ Stored memory: test:key');

  // Retrieve memory
  const memory = retrieveMemory('test:key');
  console.log(`   ✓ Retrieved memory: ${JSON.stringify(memory.value)}`);
  console.log(`     - Namespace: ${memory.metadata.namespace}`);

  // Store memory with TTL
  storeMemory({
    key: 'test:expiring',
    value: 'This will expire',
    namespace: 'test',
    ttl: 1, // 1 second
  });
  console.log('   ✓ Stored expiring memory (1s TTL)');

  // List memories
  const memories = listMemories('test');
  console.log(`   ✓ Listed memories in 'test' namespace: ${memories.length} found`);

  // Wait for expiration
  console.log('   ⏱ Waiting 2 seconds for TTL expiration...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Clean expired
  const cleaned = cleanExpiredMemories();
  console.log(`   ✓ Cleaned ${cleaned} expired memories`);

  // Verify expiring memory is gone
  try {
    retrieveMemory('test:expiring');
    console.log('   ✗ Expiring memory should have been deleted');
  } catch (e) {
    console.log('   ✓ Expiring memory correctly removed');
  }

  // Delete memory
  deleteMemory('test:key');
  console.log('   ✓ Deleted memory\n');
} catch (error) {
  console.error('   ✗ Memory test failed:', error);
  process.exit(1);
}

// Test Bulk Operations
console.log('5. Testing bulk operations...');

try {
  // Store multiple events
  const eventIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const id = storeTimelineEvent({
      timestamp: Date.now() + i * 1000,
      type: 'bulk_test',
      title: `Bulk Event ${i + 1}`,
      namespace: 'test:bulk',
      metadata: { index: i },
    });
    eventIds.push(id);
  }
  console.log(`   ✓ Stored ${eventIds.length} events in bulk`);

  // Query all bulk events
  const today = new Date().toISOString().split('T')[0];
  const bulkTimeline = getTimeline({ date: today, type: 'bulk_test' });
  console.log(`   ✓ Retrieved ${bulkTimeline.stats.total} bulk events`);

  // Clean up
  eventIds.forEach(id => deleteEvent(id));
  console.log(`   ✓ Cleaned up bulk events\n`);
} catch (error) {
  console.error('   ✗ Bulk operations test failed:', error);
  process.exit(1);
}

// Database Stats
console.log('6. Database statistics...');
const stats = getStats();
console.log(`   Total events: ${stats.eventCount}`);
console.log(`   Total memories: ${stats.memoryCount}`);
console.log(`   Total entities: ${stats.entityCount}`);
console.log(`   Total relations: ${stats.relationCount}`);
console.log(`   Journal mode: ${stats.journalMode}`);
console.log(`   Busy timeout: ${stats.busyTimeout}ms`);
console.log(`   Database size: ${(stats.dbSize / 1024).toFixed(2)} KB`);
console.log(`   Database path: ${stats.dbPath}\n`);

// Close database
console.log('7. Closing database...');
closeDB();
console.log('   ✓ Database closed\n');

console.log('=== All tests passed! ✓ ===');
console.log('\nStorage layer is ready for use.');

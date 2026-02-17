/**
 * Usage Example for Memory MCP Server
 * Demonstrates how to use the MCP tools and direct API
 */

import {
  initMemoryServer,
  timeline,
  memory,
  type TimelineEvent,
  type Memory,
} from '../src/index.js';

async function demonstrateUsage() {
  console.log('=== Memory MCP Server Usage Example ===\n');

  // Initialize the server
  const { db, tools, handlers } = initMemoryServer(true);

  console.log(`Initialized with ${tools.length} MCP tools\n`);

  // ========================================================================
  // Timeline Operations (Direct API)
  // ========================================================================

  console.log('--- Timeline Operations ---');

  // Store a timeline event
  const eventId = timeline.storeTimelineEvent({
    timestamp: Date.now(),
    type: 'jira_ticket',
    title: 'Implement MCP tools',
    metadata: {
      project: 'CP',
      priority: 'high',
      assignee: 'kayla',
    },
  });

  console.log(`Stored event: ${eventId}`);

  // Get events for today
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = timeline.getTimeline({ date: today });
  console.log(`Events today: ${todayEvents.stats.total}`);
  console.log(`By type:`, todayEvents.stats.by_type);

  // Expand event with full details
  const expandedEvent = timeline.expandEvent(eventId, {
    description: 'Full implementation of MCP tools for timeline and memory operations',
    comments: ['Started implementation', 'Completed validation layer'],
    attachments: [],
  });

  console.log(`Expanded event with full data: ${expandedEvent.full_data_key}\n`);

  // ========================================================================
  // Memory Operations (Direct API)
  // ========================================================================

  console.log('--- Memory Operations ---');

  // Store a memory
  memory.storeMemory({
    key: 'dev:current_context',
    value: {
      working_on: 'memory-mcp-server',
      branch: 'main',
      last_task: 'implementing MCP tools',
    },
    namespace: 'dev',
  });

  console.log('Stored development context');

  // Retrieve memory
  const context = memory.retrieveMemory('dev:current_context');
  console.log('Retrieved context:', context.value);

  // Store with TTL (expires in 1 hour)
  memory.storeMemory({
    key: 'temp:session_token',
    value: 'abc123xyz',
    ttl: 3600, // 1 hour in seconds
  });

  console.log('Stored temporary memory with TTL');

  // List all memories in namespace
  const devMemories = memory.listMemories('dev');
  console.log(`Memories in 'dev' namespace: ${devMemories.length}\n`);

  // ========================================================================
  // MCP Tool Handlers
  // ========================================================================

  console.log('--- MCP Tool Handlers ---');

  // Call a timeline tool handler
  const timelineResult = await handlers.store_timeline_event({
    timestamp: Date.now(),
    type: 'calendar_event',
    title: 'Team standup',
    metadata: { duration: 30, attendees: 5 },
  });

  console.log('Timeline tool result:', timelineResult);

  // Call a memory tool handler
  const memoryResult = await handlers.retrieve_memory({
    key: 'dev:current_context',
  });

  console.log('Memory tool result:', memoryResult);

  // Get memory stats
  const statsResult = await handlers.get_memory_stats({});
  console.log('Memory stats:', statsResult.data);

  // Get event types
  const typesResult = await handlers.get_event_types({});
  console.log('Event types:', typesResult.data, '\n');

  // ========================================================================
  // Search and Query
  // ========================================================================

  console.log('--- Search and Query ---');

  // Search memories
  const searchResults = memory.searchMemories('memory-mcp-server');
  console.log(`Found ${searchResults.length} memories matching search`);

  // Get timeline range
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const startDate = lastWeek.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const rangeEvents = timeline.getTimelineRange(startDate, endDate);
  console.log(`Events in last week: ${rangeEvents.stats.total}`);

  // Get timeline summary
  const summary = timeline.getTimelineSummary(today);
  console.log('Today summary:', summary, '\n');

  // ========================================================================
  // Cleanup
  // ========================================================================

  console.log('--- Cleanup ---');

  // Clean expired memories
  const expiredCount = memory.cleanExpiredMemories();
  console.log(`Cleaned up ${expiredCount} expired memories`);

  console.log('\n=== Example Complete ===');
}

// Run the example
demonstrateUsage().catch(console.error);

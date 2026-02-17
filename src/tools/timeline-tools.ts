/**
 * MCP Tools for Timeline Operations
 * Exposes timeline event storage and querying to Claude via MCP protocol
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as timeline from '../storage/timeline.js';
import {
  storeTimelineEventSchema,
  getTimelineSchema,
  getEventSchema,
  expandEventSchema,
  getTimelineRangeSchema,
  deleteEventSchema,
  updateEventSchema,
  getTimelineSummarySchema,
  getEventTypesSchema,
  toJsonSchema,
  validateInput,
  errorResponse,
  successResponse,
} from '../utils/validation.js';

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool: store_timeline_event
 * Store a new timeline event with optional metadata
 */
export const storeTimelineEventTool: Tool = {
  name: 'store_timeline_event',
  description: 'Store a new timeline event (e.g., JIRA ticket, Spotify play, calendar event, journal entry). Events are indexed by timestamp and date for efficient querying.',
  inputSchema: toJsonSchema(storeTimelineEventSchema),
};

/**
 * Tool: get_timeline
 * Retrieve all events for a specific date
 */
export const getTimelineTool: Tool = {
  name: 'get_timeline',
  description: 'Get all timeline events for a specific date. Returns events sorted by timestamp with stats by type.',
  inputSchema: toJsonSchema(getTimelineSchema),
};

/**
 * Tool: get_event
 * Retrieve a single event by ID
 */
export const getEventTool: Tool = {
  name: 'get_event',
  description: 'Retrieve a single timeline event by its ID. Returns the event with metadata but not full details (use expand_event for that).',
  inputSchema: toJsonSchema(getEventSchema),
};

/**
 * Tool: expand_event
 * Store full event data and link it to an event
 */
export const expandEventTool: Tool = {
  name: 'expand_event',
  description: 'Store full event data (large payload) and link it to a timeline event. This enables lazy-loading of detailed information.',
  inputSchema: toJsonSchema(expandEventSchema),
};

/**
 * Tool: get_timeline_range
 * Retrieve events across a date range
 */
export const getTimelineRangeTool: Tool = {
  name: 'get_timeline_range',
  description: 'Get timeline events across a date range. Useful for weekly/monthly summaries.',
  inputSchema: toJsonSchema(getTimelineRangeSchema),
};

/**
 * Tool: delete_event
 * Delete a timeline event
 */
export const deleteEventTool: Tool = {
  name: 'delete_event',
  description: 'Delete a timeline event and its associated full details.',
  inputSchema: toJsonSchema(deleteEventSchema),
};

/**
 * Tool: update_event
 * Update an existing timeline event
 */
export const updateEventTool: Tool = {
  name: 'update_event',
  description: 'Update fields of an existing timeline event (title, metadata, namespace, timestamp).',
  inputSchema: toJsonSchema(updateEventSchema),
};

/**
 * Tool: get_timeline_summary
 * Get event count statistics for a date
 */
export const getTimelineSummaryTool: Tool = {
  name: 'get_timeline_summary',
  description: 'Get timeline summary statistics for a specific date (event counts by type) without loading full event data.',
  inputSchema: toJsonSchema(getTimelineSummarySchema),
};

/**
 * Tool: get_event_types
 * Get all event types with counts
 */
export const getEventTypesTool: Tool = {
  name: 'get_event_types',
  description: 'Get a list of all event types across the entire timeline with their counts.',
  inputSchema: toJsonSchema(getEventTypesSchema),
};

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle store_timeline_event
 */
export async function handleStoreTimelineEvent(args: unknown): Promise<any> {
  try {
    const input = validateInput(storeTimelineEventSchema, args);
    const eventId = timeline.storeTimelineEvent(input);
    return successResponse({ event_id: eventId });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle get_timeline
 */
export async function handleGetTimeline(args: unknown): Promise<any> {
  try {
    const input = validateInput(getTimelineSchema, args);
    const result = timeline.getTimeline({
      date: input.date,
      type: input.type,
      limit: input.limit,
    });
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle get_event
 */
export async function handleGetEvent(args: unknown): Promise<any> {
  try {
    const input = validateInput(getEventSchema, args);
    const event = timeline.getEvent(input.event_id);
    return successResponse(event);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle expand_event
 */
export async function handleExpandEvent(args: unknown): Promise<any> {
  try {
    const input = validateInput(expandEventSchema, args);
    const event = timeline.expandEvent(input.event_id, input.full_data);
    return successResponse(event);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle get_timeline_range
 */
export async function handleGetTimelineRange(args: unknown): Promise<any> {
  try {
    const input = validateInput(getTimelineRangeSchema, args);
    const result = timeline.getTimelineRange(
      input.start_date,
      input.end_date,
      input.type,
      input.limit
    );
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle delete_event
 */
export async function handleDeleteEvent(args: unknown): Promise<any> {
  try {
    const input = validateInput(deleteEventSchema, args);
    const success = timeline.deleteEvent(input.event_id);
    return successResponse({ deleted: success });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle update_event
 */
export async function handleUpdateEvent(args: unknown): Promise<any> {
  try {
    const input = validateInput(updateEventSchema, args);
    const event = timeline.updateEvent(input.event_id, input.updates);
    return successResponse(event);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle get_timeline_summary
 */
export async function handleGetTimelineSummary(args: unknown): Promise<any> {
  try {
    const input = validateInput(getTimelineSummarySchema, args);
    const summary = timeline.getTimelineSummary(input.date);
    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle get_event_types
 */
export async function handleGetEventTypes(_args: unknown): Promise<any> {
  try {
    const types = timeline.getEventTypes();
    return successResponse(types);
  } catch (error) {
    return errorResponse(error);
  }
}

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * All timeline tools
 */
export const timelineTools: Tool[] = [
  storeTimelineEventTool,
  getTimelineTool,
  getEventTool,
  expandEventTool,
  getTimelineRangeTool,
  deleteEventTool,
  updateEventTool,
  getTimelineSummaryTool,
  getEventTypesTool,
];

/**
 * Timeline tool handlers mapped by name
 */
export const timelineHandlers: Record<string, (args: unknown) => Promise<any>> = {
  store_timeline_event: handleStoreTimelineEvent,
  get_timeline: handleGetTimeline,
  get_event: handleGetEvent,
  expand_event: handleExpandEvent,
  get_timeline_range: handleGetTimelineRange,
  delete_event: handleDeleteEvent,
  update_event: handleUpdateEvent,
  get_timeline_summary: handleGetTimelineSummary,
  get_event_types: handleGetEventTypes,
};
